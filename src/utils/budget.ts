import type { BudgetAllocation } from '../types';

export const sumAllocations = (allocations: BudgetAllocation[]) =>
  allocations.reduce((sum, a) => sum + (a.amount || 0), 0);

export const getMiscAmount = (overallAmount: number, allocations: BudgetAllocation[]) =>
  overallAmount - sumAllocations(allocations);

// Upserts `incoming` allocations into `existing` by categoryId — incoming
// amounts win for categories present in both, existing allocations not
// touched by this save are preserved, and new categoryIds are appended.
// Used as a safety net when saving a budget for a month/year that already
// has a doc, so a fresh "Add Budget" submission merges into it instead of
// silently dropping the existing allocations.
export const mergeAllocations = (
  existing: BudgetAllocation[],
  incoming: BudgetAllocation[]
): BudgetAllocation[] => {
  const merged = new Map(existing.map((a) => [a.categoryId, a]));
  for (const allocation of incoming) {
    merged.set(allocation.categoryId, allocation);
  }
  return Array.from(merged.values());
};
