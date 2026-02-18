import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  type CorporateWorld,
  type GridPos,
  type Manager,
} from './types.js';

export class EmployeeManager implements Manager {
  onLeftClick(world: CorporateWorld, gridPos: GridPos): void {
    if (
      world.uiMode.kind === 'employeePanel' ||
      world.uiMode.kind === 'buildingPanel'
    ) {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];
      if (tile.building) {
        world.uiMode = { kind: 'employeePanel', tile: gridPos };
        return;
      } else {
        world.uiMode = { kind: 'buildingPanel', tile: gridPos };
      }
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'employeePanel') {
      const index = parseInt(key) - 1;
      const type = EMPLOYEE_TYPES[index];

      if (!type) return;

      const { row, col } = world.uiMode.tile;
      const tile = world.grid[row][col];
      const building = tile.building;

      if (!building) return;

      const config = EMPLOYEE_CONFIG[type];
      const capacity = BUILDING_CONFIG[building.type].capacity;

      if (world.funds >= config.cost && building.employees.length < capacity) {
        world.funds -= config.cost;
        building.employees.push({ type });
      }
    }

    if (world.uiMode.kind === 'buildingPanel') {
      const index = parseInt(key) - 1;
      const type = BUILDING_TYPES[index];

      if (!type) return;

      const { row, col } = world.uiMode.tile;
      const tile = world.grid[row][col];
      if (tile.building) return;

      const config = BUILDING_CONFIG[type];

      if (world.funds >= config.cost) {
        world.funds -= config.cost;
        tile.building = { type, employees: [] };
      }
    }
  }
}
