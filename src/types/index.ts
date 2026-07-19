export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountGroup = 'asset' | 'liability';

export type AccountType =
  | 'savings'
  | 'current'
  | 'credit'
  | 'cash'
  | 'upi';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  accountGroup: AccountGroup;
  openingBalance: number;
  openingDate: Date;
  active: boolean;
  creditLimit?: number;
  statementDate?: number;
  dueDate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  defaultAccountId?: string;
  defaultCategoryId?: string;
  importKeywords?: string[];
  excludeFromBudget: boolean;
  createdAt: Date;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  date: Date;
  amount: number;
  categoryId?: string;
  accountId: string;
  fromAccountId?: string;
  toAccountId?: string;
  notes?: string;
  tags?: string[];
  attachments?: Attachment[];
  /** Google Drive file ID of an attached receipt photo/screenshot, if any.
   * Image bytes live in Drive (dedicated "ExpenseTracker Receipts" folder),
   * never stored as base64 in Firestore. */
  receiptDriveFileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  transactionId: string;
  userId: string;
}

export interface BudgetAllocation {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  userId: string;
  month: number;
  year: number;
  amount: number;
  allocations: BudgetAllocation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  userId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  data: {
    income: number;
    expenses: number;
    savings: number;
    categoryBreakdown: Record<string, number>;
    topCategories: Array<{ category: string; amount: number }>;
  };
  generatedAt: Date;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Only meaningful when frequency === 'monthly' and weekOfMonth is set. */
export type MonthlyWeekPosition = 'first' | 'second' | 'third' | 'fourth' | 'last';

export interface RecurringRule {
  id: string;
  userId: string;
  templateTransaction: {
    type: TransactionType;
    amount: number;
    /** For expense/income: the account. For transfer: same as fromAccountId. */
    accountId: string;
    categoryId: string;
    description: string;
    tags?: string[];
    /** Only set (both) when type === 'transfer'. */
    fromAccountId?: string;
    toAccountId?: string;
  };
  frequency: RecurringFrequency;
  // Monthly sub-modes are mutually exclusive:
  //   "Specific date"  → dayOfMonth is set, weekOfMonth is absent.
  //   "Nth weekday"    → weekOfMonth + dayOfWeek are both set, dayOfMonth is absent.
  dayOfMonth?: number;
  /** Which week of the month. Only meaningful when frequency === 'monthly'. */
  weekOfMonth?: MonthlyWeekPosition;
  /**
   * 0-6, Sunday-Saturday (matches date-fns/native Date.getDay(), not ISO week).
   * Dual-use field:
   *   - frequency === 'weekly'  → "recur on this weekday every week"
   *   - frequency === 'monthly' + weekOfMonth set → "Nth occurrence of this weekday in the month"
   */
  dayOfWeek?: number;
  startDate: string;
  nextDueDate: string;
  lastCreatedDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Backup {
  id: string;
  userId: string;
  driveFileId: string;
  fileName: string;
  createdAt: Date;
  size: number;
}