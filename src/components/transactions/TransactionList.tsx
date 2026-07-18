import { useState, useMemo, useEffect } from 'react';
import { HiPencil, HiTrash, HiPlus, HiSearch, HiOutlinePaperClip } from 'react-icons/hi';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import type { Transaction, Account, Category, Tag } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getTags } from '../../services/tagService';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import ReceiptViewerModal from '../common/ReceiptViewerModal';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  /** Read-only, chromeless mode: hides the header/summary/filters/add button
   * and per-row edit/delete actions. Used by FilteredTransactionView so it
   * can reuse this component's row rendering without its page-level chrome. */
  compact?: boolean;
}

const TYPE_FILTERS = ['all', 'expense', 'income', 'transfer'] as const;
type FilterType = typeof TYPE_FILTERS[number];

const TYPE_STYLES: Record<string, { text: string; bg: string; label: string; prefix: string }> = {
  expense: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Expense', prefix: '−' },
  income: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Income', prefix: '+' },
  transfer: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Transfer', prefix: '↔' },
};

const TransactionList = ({ transactions, accounts, categories, onEdit, onDelete, onAdd, compact = false }: TransactionListProps) => {
  const formatCurrency = useFormatCurrency();
  const { currentUser } = useAuth();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [viewingReceiptFileId, setViewingReceiptFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    getTags(currentUser.uid).then(setAllTags).catch(() => {});
  }, [currentUser]);

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Unknown';
  const getCategoryName = (id?: string) => {
    if (!id) return null;
    const cat = categories.find((c) => c.id === id);
    return cat ? { name: cat.name, icon: cat.icon || '📌', color: cat.color } : null;
  };
  const getTagName = (id: string) => allTags.find((t) => t.id === id)?.name;

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      const txDate = new Date(t.date);
      if (from && txDate < from) return false;
      if (to && txDate > to) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const cat = getCategoryName(t.categoryId);
      return (
        t.notes?.toLowerCase().includes(q) ||
        cat?.name.toLowerCase().includes(q) ||
        getAccountName(t.accountId).toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [transactions, filterType, searchTerm, dateFrom, dateTo]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const totalIncome = useMemo(() => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalExpense = useMemo(() => filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filtered]);

  return (
    <div className="space-y-4 animate-fade-in">
      {!compact && (
        <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onAdd} className="btn-primary text-sm">
          <HiPlus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Income</div>
            <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Expense</div>
            <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-lg p-1 gap-0.5">
          {TYPE_FILTERS.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-150 ${
                filterType === type
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[160px] relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by category, account, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 py-1.5 text-sm"
          />
        </div>
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">
            Clear
          </button>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-input py-1.5 text-sm w-[140px]"
            title="From date"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-input py-1.5 text-sm w-[140px]"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>
        </>
      )}

      {/* List */}
      {grouped.length === 0 ? (
        <EmptyState
          icon="💸"
          title="No transactions yet"
          description={searchTerm ? 'No transactions match your search.' : compact ? 'No transactions match this filter.' : 'Start recording your income and expenses.'}
          action={!searchTerm && !compact ? (
            <button onClick={onAdd} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Add your first transaction
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, txns]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {format(new Date(dateKey), 'EEE, d MMM yyyy')}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/60" />
                <span className="text-xs text-gray-400">
                  {txns.length} txn{txns.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {txns.map((transaction) => {
                  const style = TYPE_STYLES[transaction.type];
                  const cat = getCategoryName(transaction.categoryId);

                  return (
                    <div
                      key={transaction.id}
                      onClick={compact ? () => onEdit?.(transaction) : undefined}
                      role={compact ? 'button' : undefined}
                      tabIndex={compact ? 0 : undefined}
                      className={`card p-3 flex items-center gap-3 hover:shadow-md transition-all duration-150 group ${compact ? 'cursor-pointer' : ''}`}
                    >
                      {/* Category icon — rendered plainly, no background chip */}
                      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-2xl">
                        {cat?.icon || style.prefix}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                            {cat ? cat.name : style.label}
                          </span>
                          <span className={`badge ${style.bg} ${style.text} text-xs`}>{style.label}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
                          <span>{getAccountName(transaction.accountId)}</span>
                          {transaction.type === 'transfer' && transaction.fromAccountId && (
                            <span>{getAccountName(transaction.fromAccountId)} → {getAccountName(transaction.toAccountId || '')}</span>
                          )}
                          {transaction.notes && <span>· {transaction.notes}</span>}
                          {transaction.tags?.map((tagId) => {
                            const name = getTagName(tagId);
                            if (!name) return null;
                            return (
                              <span key={tagId} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                                #{name}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Amount + actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {transaction.receiptDriveFileId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingReceiptFileId(transaction.receiptDriveFileId!);
                            }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="View receipt"
                          >
                            <HiOutlinePaperClip className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                        <div className={`text-base font-bold ${style.text}`}>
                          {style.prefix !== '↔' ? style.prefix : ''}{formatCurrency(transaction.amount)}
                        </div>
                        {!compact && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEdit?.(transaction)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <HiPencil className="w-4 h-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(transaction.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <HiTrash className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete transaction"
        message="This action cannot be undone. The transaction will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) onDelete?.(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {viewingReceiptFileId && (
        <ReceiptViewerModal fileId={viewingReceiptFileId} onClose={() => setViewingReceiptFileId(null)} />
      )}
    </div>
  );
};

export default TransactionList;
