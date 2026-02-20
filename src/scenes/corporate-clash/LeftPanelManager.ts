import type { Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import {
  CANVAS_HEIGHT,
  LEFT_PANEL_WIDTH,
  TICK_RATE_S,
} from '../../engine/types.js';

export class LeftPanelManager implements Manager {
  display(world: CorporateWorld) {
    let buildings = 0;
    let employees = 0;

    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          buildings++;
          employees += tile.building.employees.length;
        }
      }
    }

    return {
      funds: world.funds,
      mapDefense: world.mapDefense,
      buildings,
      employees,
    };
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase === 'playing') {
      renderer.drawRect(0, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT, 0x000000);

      const { funds, mapDefense, buildings, employees } = this.display(world);
      renderer.drawText(`$${funds.toLocaleString()}`, 10, 10, {
        fontSize: 20,
        color: 0x2ecc71,
      });

      renderer.drawText(`Defense: ${mapDefense.toLocaleString()}`, 10, 40, {
        fontSize: 20,
        color: 0x2ecc71,
      });
      renderer.drawText(`Buildings: ${buildings}`, 10, 76, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Employees: ${employees}`, 10, 106, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Players: ${world.players.length}`, 10, 136, {
        fontSize: 14,
        color: 0xcccccc,
      });

      if (world.attackCooldown > 0) {
        const cooldownSecs = Math.ceil(world.attackCooldown * TICK_RATE_S);
        renderer.drawText(`Attack cooldown: ${cooldownSecs}s`, 10, CANVAS_HEIGHT - 44, {
          fontSize: 14,
          color: 0xe74c3c,
        });
      }

      renderer.drawText('[A] Attack', 10, CANVAS_HEIGHT - 24, {
        fontSize: 14,
        color: 0xaaaaaa,
      });
    }
  }
}
