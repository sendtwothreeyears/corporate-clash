import type { Renderer } from '../../engine/types.js';
import {
  CELL_SIZE,
  GRID_SIZE,
  ISO_TILE_W,
  ISO_TILE_H,
} from '../../engine/types.js';
import {
  BUILDING_TYPES,
  type EmployeeBuildingType,
  OFFICE_EMPLOYEE_TYPES,
  LAWFIRM_EMPLOYEE_TYPES,
  type CorporateWorld,
  type GameAction,
  type GridPos,
  type Manager,
} from './types.js';
import { Assets, Texture } from 'pixi.js';

const HALF_W = ISO_TILE_W / 2;
const HALF_H = ISO_TILE_H / 2;
const MAP_AREA_W = GRID_SIZE * CELL_SIZE;
const MAP_AREA_H = GRID_SIZE * CELL_SIZE;
const ISO_ORIGIN_X = MAP_AREA_W / 2;
const ISO_ORIGIN_Y = (MAP_AREA_H - GRID_SIZE * ISO_TILE_H) / 2 + HALF_H;

export class MapManager implements Manager {
  private buildingTextures = new Map<string, Texture>();

  private gridToIso(row: number, col: number): { x: number; y: number } {
    return {
      x: (col - row) * HALF_W + ISO_ORIGIN_X,
      y: (col + row) * HALF_H + ISO_ORIGIN_Y,
    };
  }

  private pixelToGrid(pixelX: number, pixelY: number): GridPos {
    const relX = pixelX - ISO_ORIGIN_X;
    const relY = pixelY - ISO_ORIGIN_Y;
    return {
      col: Math.round((relX / HALF_W + relY / HALF_H) / 2),
      row: Math.round((relY / HALF_H - relX / HALF_W) / 2),
    };
  }

  private isInBounds(world: CorporateWorld, gridPos: GridPos): boolean {
    return (
      gridPos.row >= 0 &&
      gridPos.row < world.grid.length &&
      gridPos.col >= 0 &&
      gridPos.col < world.grid[0].length
    );
  }

  onRightClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    console.log('Right click at', { pixelX, pixelY }, gridPos);
  }

  onLeftClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    if (!this.isInBounds(world, gridPos)) return;

    if (
      world.uiMode.kind === 'buildingPanel' ||
      world.uiMode.kind === 'officeEmployeePanel' ||
      world.uiMode.kind === 'lawfirmEmployeePanel'
    ) {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];

      if (!tile.building) {
        world.uiMode = { kind: 'buildingPanel', tile: gridPos };
      } else if (tile.building.type === 'lawfirm') {
        world.uiMode = { kind: 'lawfirmEmployeePanel', tile: gridPos };
      } else {
        world.uiMode = { kind: 'officeEmployeePanel', tile: gridPos };
      }
    }
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    if (world.uiMode.kind === 'alert') return;
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    world.hoveredTile = gridPos;
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind === 'alert') {
      return;
    } else if (world.uiMode.kind === 'buildingPanel') {
      this.handleBuildingKey(world, key);
    } else if (world.uiMode.kind === 'officeEmployeePanel') {
      this.handleEmployeeKey(world, 'office', key);
    } else if (world.uiMode.kind === 'lawfirmEmployeePanel') {
      this.handleEmployeeKey(world, 'lawfirm', key);
    }
  }

  private handleBuildingKey(world: CorporateWorld, key: string): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind !== 'buildingPanel') return;

    const index = parseInt(key.replace('Digit', '')) - 1;
    const buildingType = BUILDING_TYPES[index];
    if (!buildingType) return;

    const { row, col } = world.uiMode.tile;
    this.sendAction({ kind: 'build', row, col, buildingType });
  }

  private handleEmployeeKey(
    world: CorporateWorld,
    buildingType: EmployeeBuildingType,
    key: string,
  ): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (
      world.uiMode.kind !== 'officeEmployeePanel' &&
      world.uiMode.kind !== 'lawfirmEmployeePanel'
    )
      return;

    const index = parseInt(key.replace('Digit', '')) - 1;

    const employeeType =
      buildingType === 'office'
        ? OFFICE_EMPLOYEE_TYPES[index]
        : LAWFIRM_EMPLOYEE_TYPES[index];
    if (!employeeType) return;

    const { row, col } = world.uiMode.tile;
    this.sendAction({ kind: 'hire', row, col, employeeType });
  }

  private sendAction(action: GameAction): void {
    fetch('/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    // Load textures if not loaded
    if (this.buildingTextures.size === 0) {
      Assets.load([
        '/assets/buildings/smallOffice.png',
        '/assets/buildings/mediumOffice.png',
        '/assets/buildings/largeOffice.png',
        '/assets/buildings/lawfirm.png',
      ]).then((textures) => {
        for (const texture of Object.values(textures) as Texture[]) {
          texture.source.scaleMode = 'nearest';
        }
        this.buildingTextures.set(
          'smallOffice',
          textures['/assets/buildings/smallOffice.png'],
        );
        this.buildingTextures.set(
          'mediumOffice',
          textures['/assets/buildings/mediumOffice.png'],
        );
        this.buildingTextures.set(
          'largeOffice',
          textures['/assets/buildings/largeOffice.png'],
        );
        this.buildingTextures.set(
          'lawfirm',
          textures['/assets/buildings/lawfirm.png'],
        );
      });
    }

    // Pass 1: draw all ground tiles
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const { x, y } = this.gridToIso(row, col);
        renderer.drawDiamond(
          x,
          y,
          ISO_TILE_W,
          ISO_TILE_H,
          (row + col) % 2 === 0 ? 0x333333 : 0x222222,
        );
      }
    }

    // Pass 2: draw buildings back-to-front, fading non-hovered buildings
    const hovered = world.hoveredTile;
    const isHovering = hovered && this.isInBounds(world, hovered);

    for (let depth = 0; depth < world.grid.length * 2 - 1; depth++) {
      for (let row = 0; row < world.grid.length; row++) {
        const col = depth - row;
        if (col < 0 || col >= world.grid[0].length) continue;

        const tile = world.grid[row][col];
        if (!tile.building) continue;

        const texture = this.buildingTextures.get(tile.building.type);
        if (!texture) continue;

        const isThisHovered = isHovering && hovered.row === row && hovered.col === col;

        const { x, y } = this.gridToIso(row, col);
        const scale = ISO_TILE_W / texture.width;
        const spriteW = ISO_TILE_W;
        const spriteH = texture.height * scale;
        renderer.drawSprite(texture, x - spriteW / 2, y + HALF_H - spriteH, {
          width: spriteW,
          height: spriteH,
          alpha: isHovering && !isThisHovered ? 0.3 : 1,
        });
      }
    }

    if (world.hoveredTile) {
      const { row, col } = world.hoveredTile;
      const { x, y } = this.gridToIso(row, col);
      renderer.drawDiamond(x, y, ISO_TILE_W, ISO_TILE_H, 0xffffff, {
        alpha: 0.3,
      });
    }
  }
}
