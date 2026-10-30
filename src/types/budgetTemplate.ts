import type { BudgetAllocation } from './index';

export interface BudgetTemplate {
  id: string;
  userId: string;
  name: string;
  amount: number;
  allocations: BudgetAllocation[];
  createdAt: Date;
  updatedAt: Date;
}
