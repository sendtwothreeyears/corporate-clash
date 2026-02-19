import type { CorporateWorld, Manager } from './types.js';
import {
  getEmployeeCategory,
  OFFICE_EMPLOYEE_CONFIG,
  LAWFIRM_EMPLOYEE_CONFIG,
  type OfficeEmployeeType,
  type LawfirmEmployeeType,
  type OfficeType,
} from './types.js';

export class EconomyManager implements Manager {
  calculateProfit(
    employeeCategory: OfficeType,
    employee: OfficeEmployeeType | LawfirmEmployeeType,
  ): number {
    if (employeeCategory === 'office') {
      return OFFICE_EMPLOYEE_CONFIG[employee as OfficeEmployeeType]
        .profitPerTick;
    } else if (employeeCategory === 'lawfirm') {
      return LAWFIRM_EMPLOYEE_CONFIG[employee as LawfirmEmployeeType]
        .profitPerTick;
    } else {
      return 0;
    }
  }
  update(world: CorporateWorld): void {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          for (const employee of tile.building.employees) {
            const employeeCategory: OfficeType = getEmployeeCategory(
              employee.type,
            );
            world.funds += this.calculateProfit(
              employeeCategory,
              employee.type,
            );
          }
        }
      }
    }
  }
}
