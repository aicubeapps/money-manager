export interface BudgetTemplateItem {
  label: string;
  // A category matches if its name contains any of these (case-insensitive)
  keywords: string[];
  percent: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  items: BudgetTemplateItem[];
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'basic',
    name: 'Basic household',
    description: 'Simple split across everyday expense categories',
    items: [
      { label: 'Housing / Rent', keywords: ['rent', 'housing', 'home'], percent: 30 },
      { label: 'Food & Groceries', keywords: ['food', 'grocer', 'dining'], percent: 20 },
      { label: 'Transport', keywords: ['transport', 'fuel', 'travel', 'commute'], percent: 10 },
      { label: 'Bills & Utilities', keywords: ['bill', 'utilit', 'electric', 'internet', 'mobile'], percent: 10 },
      { label: 'Shopping', keywords: ['shopping', 'clothes'], percent: 8 },
      { label: 'Entertainment', keywords: ['entertain', 'movie', 'leisure'], percent: 7 },
      { label: 'Health', keywords: ['health', 'medic'], percent: 5 },
    ],
  },
  {
    id: 'lean',
    name: 'Lean essentials',
    description: 'Only the essentials, tighter limits',
    items: [
      { label: 'Housing / Rent', keywords: ['rent', 'housing', 'home'], percent: 35 },
      { label: 'Food & Groceries', keywords: ['food', 'grocer', 'dining'], percent: 25 },
      { label: 'Transport', keywords: ['transport', 'fuel', 'travel', 'commute'], percent: 10 },
      { label: 'Bills & Utilities', keywords: ['bill', 'utilit', 'electric', 'internet', 'mobile'], percent: 10 },
    ],
  },
];
