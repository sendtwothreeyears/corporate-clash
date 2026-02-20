import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Renderer,
} from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';

export class AlertManager implements Manager {
  update(world: CorporateWorld): void {
    if (world.attackActive && world.uiMode.kind !== 'alert') {
      world.uiMode = { kind: 'alert' };
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'alert') return;
    if (key === 'Space') {
      world.uiMode = { kind: 'none' };
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'alert') return;
    renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, {
      alpha: 0.3,
    });

    const alertWidth = 450;
    const alertHeight = 200;
    renderer.drawRect(
      CANVAS_WIDTH / 2 - alertWidth / 2,
      CANVAS_HEIGHT / 2 - alertHeight / 2,
      alertWidth,
      alertHeight,
      0x000000,
      { alpha: 0.9 },
    );

    const alertTitle = 'Attack!';
    renderer.drawText(alertTitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 85, {
      fontSize: 24,
      color: 0xffffff,
      anchor: 0.5,
    });

    renderer.drawText(
      'You have been attacked by a rival company!',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 30,
      { fontSize: 14, color: 0xffffff, anchor: 0.5 },
    );
    renderer.drawText(
      `Employees Lost: ${world.attackActive?.employeesLost}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      { fontSize: 14, color: 0xffffff, anchor: 0.5 },
    );
    renderer.drawText(
      `Buildings Lost: ${world.attackActive?.buildingsLost}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20,
      { fontSize: 14, color: 0xffffff, anchor: 0.5 },
    );

    const alertSubMessage = 'Space bar to continue...';
    renderer.drawText(
      alertSubMessage,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 60,
      { fontSize: 12, color: 0xffffff, anchor: 0.5 },
    );
  }
}
