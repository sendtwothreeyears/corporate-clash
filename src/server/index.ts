import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { GRID_SIZE } from '../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  createWorld,
  type CorporateWorld,
  type GameAction,
  type GameState,
  type PlayerInfo,
} from '../scenes/corporate-clash/types.js';
import { EconomyManager } from '../scenes/corporate-clash/EconomyManager.js';

const TICK_RATE_MS = 150;
const MAX_PLAYERS = 20;

const app = new Hono();

interface SSEClient {
  resolve: (tick: { data: string; id: number }) => void;
}

interface PlayerState {
  id: string;
  name: string;
  world: CorporateWorld;
  client: SSEClient | null;
  attackCooldown: number;
}

const players = new Map<string, PlayerState>();
const economyManager = new EconomyManager();

let tickId = 0;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toGameState(player: PlayerState): GameState {
  const { phase, funds, mapDefense, grid, attackActive, attackTimer } =
    player.world;

  const scoreboard: PlayerInfo[] = [];
  for (const p of players.values()) {
    let buildingCount = 0;
    let employeeCount = 0;
    for (const row of p.world.grid) {
      for (const tile of row) {
        if (tile.building) {
          buildingCount++;
          employeeCount += tile.building.employees.length;
        }
      }
    }
    scoreboard.push({
      id: p.id,
      name: p.name,
      funds: p.world.funds,
      buildingCount,
      employeeCount,
    });
  }

  return {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    attackTimer,
    attackCooldown: player.attackCooldown,
    players: scoreboard,
  };
}

// Game loop: iterate all players
setInterval(() => {
  tickId++;

  for (const player of players.values()) {
    player.world.attackActive = null;
    economyManager.update(player.world);
    if (player.attackCooldown > 0) {
      player.attackCooldown--;
    }
  }

  // Broadcast to each player's client
  for (const player of players.values()) {
    if (player.client) {
      const data = JSON.stringify(toGameState(player));
      player.client.resolve({ data, id: tickId });
    }
  }
}, TICK_RATE_MS);

// POST /game/join — register a new player
app.post('/game/join', async (c) => {
  const body = await c.req.json<{ name?: string }>();

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({ error: 'name is required' }, 400);
  }

  const name = body.name.trim().slice(0, 20);

  // Reject duplicate names
  for (const p of players.values()) {
    if (p.name === name) {
      return c.json({ error: 'name already taken' }, 400);
    }
  }

  if (players.size >= MAX_PLAYERS) {
    return c.json({ error: 'server is full' }, 400);
  }

  const playerId = generateId();
  const world = createWorld(GRID_SIZE);

  const player: PlayerState = {
    id: playerId,
    name,
    world,
    client: null,
    attackCooldown: 0,
  };

  players.set(playerId, player);

  return c.json({ playerId });
});

// GET /api?playerId=xxx — return that player's game state
app.get('/api', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) {
    return c.json({ error: 'playerId query param required' }, 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.json({ error: 'player not found' }, 404);
  }

  return c.json(toGameState(player));
});

// POST /game/action — apply action to a player's world
app.post('/game/action', async (c) => {
  const action = await c.req.json<GameAction>();
  const { playerId } = action;

  if (!playerId) {
    return c.json({ error: 'playerId is required' }, 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.json({ error: 'player not found' }, 404);
  }

  const world = player.world;

  if (action.kind === 'attack') {
    return c.json({ error: 'attack not yet implemented' }, 501);
  }

  const { row, col } = action;

  if (
    row < 0 ||
    row >= world.grid.length ||
    col < 0 ||
    col >= world.grid[0].length
  ) {
    return c.json({ error: 'out of bounds' }, 400);
  }

  const tile = world.grid[row][col];

  if (action.kind === 'build') {
    if (!BUILDING_TYPES.includes(action.buildingType)) {
      return c.json({ error: 'invalid building type' }, 400);
    }
    if (tile.building) {
      return c.json({ error: 'tile already has a building' }, 400);
    }
    const config = BUILDING_CONFIG[action.buildingType];
    if (world.funds < config.cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= config.cost;
    tile.building = { type: action.buildingType, employees: [] };
    return c.json({ ok: true });
  }

  if (action.kind === 'hire') {
    if (!EMPLOYEE_TYPES.includes(action.employeeType)) {
      return c.json({ error: 'invalid employee type' }, 400);
    }
    if (!tile.building) {
      return c.json({ error: 'no building on tile' }, 400);
    }
    const config = EMPLOYEE_CONFIG[action.employeeType];
    const capacity = BUILDING_CONFIG[tile.building.type].capacity;
    if (tile.building.employees.length >= capacity) {
      return c.json({ error: 'building at capacity' }, 400);
    }
    if (world.funds < config.cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= config.cost;
    tile.building.employees.push({ type: action.employeeType });
    world.mapDefense += config.defenseBoost;
    return c.json({ ok: true });
  }

  return c.json({ error: 'unknown action' }, 400);
});

// GET /game/stream?playerId=xxx — scoped SSE for a single player
app.get('/game/stream', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) {
    return c.text('playerId query param required', 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.text('player not found', 404);
  }

  return streamSSE(c, async (stream) => {
    const client: SSEClient = { resolve: () => {} };
    player.client = client;

    stream.onAbort(() => {
      if (player.client === client) {
        player.client = null;
      }
    });

    while (true) {
      const tick = await new Promise<{ data: string; id: number }>(
        (resolve) => {
          client.resolve = resolve;
        },
      );

      await stream.writeSSE({
        data: tick.data,
        event: 'tick',
        id: String(tick.id),
      });
    }
  });
});

export default app;
