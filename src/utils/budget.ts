import type { BudgetAllocation } from '../types';

export const sumAllocations = (allocations: BudgetAllocation[]) =>
  allocations.reduce((sum, a) => sum + (a.amount || 0), 0);

export const getMiscAmount = (overallAmount: number, allocations: BudgetAllocation[]) =>
  overallAmount - sumAllocations(allocations);
