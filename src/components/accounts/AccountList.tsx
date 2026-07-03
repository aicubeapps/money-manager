import { useMemo, useState } from 'react';
import {
  HiPencil,
  HiArchive,
  HiRefresh,
  HiTrash,
  HiPlus,
  HiInformationCircle,
  HiStar,
  HiX,
} from 'react-icons/hi';
import { FaWallet, FaCreditCard, FaUniversity } from 'react-icons/fa';
import type { Account, Transaction } from '../../types';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { getAccountIcon, getAccountColor } from '../../utils/accountHelpers';
import { calculateAccountBalance } from '../../utils/accountBalance';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import FilteredTransactionView, { type TransactionFilterDescriptor } from '../common/FilteredTransactionView';
import QuickAddModal from '../common/QuickAddModal';
import SwipeableAccountCard from './SwipeableAccountCard';
import { toast } from '../common/Toast';

interface AccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  onEdit: (account: Account) => void;
  onArchive: (id: string) => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings: 'Savings',
  current: 'Current',
  credit: 'Credit Card',
  cash: 'Cash Wallet',
  upi: 'UPI Wallet',
  loan: 'Loan',
  investment: 'Investment',
};

const AccountList = ({
  accounts,
  transactions,
  onEdit,
  onArchive,
  onReactivate,
  onDelete,
  onAdd,
}: AccountListProps) => {
  const formatCurrency = useFormatCurrency();
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<{ title: string; filter: TransactionFilterDescriptor } | null>(null);
  const [quickAddAccountId, setQuickAddAccountId] = useState<string | null>(null);
  const [contextMenuAccount, setContextMenuAccount] = useState<Account | null>(null);

  const handleSetDefaultQuickAdd = (account: Account) => {
    localStorage.setItem('lastExpenseAccount', account.id);
    toast.success(`${account.name} set as default for Quick Add`);
  };

  const deleteTargetTxCount = useMemo(() => {
    if (!deleteTarget) return 0;
    return transactions.filter(
      (t) =>
        t.accountId === deleteTarget ||
        t.fromAccountId === deleteTarget ||
        t.toAccountId === deleteTarget
    ).length;
  }, [deleteTarget, transactions]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.active),
    [accounts]
  );

  const filtered = useMemo(
    () =>
      accounts.filter((acc) =>
        filter === 'active' ? acc.active : !acc.active
      ),
    [accounts, filter]
  );

  const assetAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type !== 'credit'),
    [activeAccounts]
  );

  const creditAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type === 'credit'),
    [activeAccounts]
  );

  const totalAssetBalance = useMemo(
    () =>
      assetAccounts.reduce(
        (sum, acc) => sum + calculateAccountBalance(acc, transactions),
        0
      ),
    [assetAccounts, transactions]
  );

  const totalCreditLimit = useMemo(
    () =>
      creditAccounts.reduce(
        (sum, acc) => sum + (Number(acc.creditLimit) || 0),
        0
      ),
    [creditAccounts]
  );

  const totalAvailableCredit = useMemo(
    () =>
      creditAccounts.reduce(
        (sum, acc) => sum + calculateAccountBalance(acc, transactions),
        0
      ),
    [creditAccounts, transactions]
  );

  const totalAmountOwed = Math.max(totalCreditLimit - totalAvailableCredit, 0);

  const usedPercent =
    totalCreditLimit > 0
      ? Math.min((totalAmountOwed / totalCreditLimit) * 100, 100)
      : 0;

  const availablePercent =
    totalCreditLimit > 0
      ? Math.min((totalAvailableCredit / totalCreditLimit) * 100, 100)
      : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Accounts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeAccounts.length} active accounts
          </p>
        </div>

        <button onClick={onAdd} className="btn-primary text-sm">
          <HiPlus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Summary Cards */}
      {activeAccounts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* LEFT: Savings & Assets */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-[#0b1f18] shadow-[0_10px_30px_rgba(0,0,0,0.28)] min-h-[210px]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/35 via-emerald-500/18 to-teal-500/10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_32%)]" />
            <div className="absolute -right-10 top-0 h-[180px] w-[180px] rounded-full bg-emerald-400/10 blur-2xl" />
            <div className="absolute right-6 top-10 opacity-[0.08]">
              <FaUniversity className="w-20 h-20 text-emerald-200" />
            </div>

            <div className="relative z-10 flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/25 ring-1 ring-emerald-300/20 backdrop-blur">
                  <FaWallet className="h-5 w-5 text-white" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Savings &amp; Assets
                  </h2>
                  <p className="mt-0.5 text-sm text-emerald-50/80">
                    {assetAccounts.length} account
                    {assetAccounts.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-3xl sm:text-4xl leading-none font-bold tracking-tight text-white">
                  {formatCurrency(totalAssetBalance)}
                </div>
                <div className="mt-2 text-sm text-emerald-50/75">
                  Total Balance
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Credit Cards */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1b2230] shadow-[0_10px_30px_rgba(0,0,0,0.28)] min-h-[210px]">
            <div className="relative z-10 p-5 flex flex-col h-full">
              {/* Top header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/20">
                    <FaCreditCard className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Credit Cards</h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                      {creditAccounts.length} card{creditAccounts.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Total Limit
                  </div>
                  <div className="mt-1 text-base font-semibold text-gray-200">
                    {formatCurrency(totalCreditLimit)}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Amount Owed</div>
                  <div className="text-lg font-semibold text-slate-200">{formatCurrency(totalAmountOwed)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">approx.</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Available</div>
                  <div className="text-lg font-semibold text-indigo-300">{formatCurrency(totalAvailableCredit)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">of {formatCurrency(totalCreditLimit)}</div>
                </div>
              </div>

              {/* Progress bar — fill = available credit */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-slate-700/80 overflow-hidden">
                  {availablePercent > 0 && (
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${availablePercent}%`,
                        background: 'linear-gradient(90deg, #4338ca 0%, #6366f1 100%)',
                      }}
                    />
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{Math.round(usedPercent)}% used</span>
                  <span>{Math.round(availablePercent)}% available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approximation note */}
      {creditAccounts.length > 0 && (
        <div className="rounded-2xl border border-indigo-400/10 bg-[#0e1626] px-5 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-400/20">
                <HiInformationCircle className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-sm sm:text-[15px] text-gray-300 leading-relaxed">
              Credit card amounts are approximate. Interest, taxes, fees, and
              issuer adjustments are not automatically calculated.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 gap-1 self-start w-fit">
        {(['active', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 text-sm rounded-xl font-semibold transition-all duration-150 ${
              filter === f
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} (
            {accounts.filter((a) => (f === 'active' ? a.active : !a.active)).length}
            )
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🏦"
          title={filter === 'active' ? 'No accounts yet' : 'No archived accounts'}
          description={
            filter === 'active'
              ? 'Add your bank accounts, wallets, and credit cards to get started.'
              : 'Archived accounts will appear here.'
          }
          action={
            filter === 'active' ? (
              <button onClick={onAdd} className="btn-primary text-sm">
                <HiPlus className="w-4 h-4" /> Add Account
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account) => {
            const Icon = getAccountIcon(account.type);
            const color = getAccountColor(account.type);

            const isCredit = account.type === 'credit';
            const currentBalance = calculateAccountBalance(account, transactions);
            const availableCredit = isCredit ? currentBalance : null;
            const totalLimit = isCredit ? Number(account.creditLimit) || 0 : null;
            const amountOwed =
              isCredit && totalLimit !== null && availableCredit !== null
                ? Math.max(totalLimit - availableCredit, 0)
                : null;

            return (
              <SwipeableAccountCard
                key={account.id}
                onTap={() => setDrillDown({
                  title: `${account.name} · Recent Transactions`,
                  filter: { kind: 'account', accountId: account.id, limit: 10 },
                })}
                onEdit={() => onEdit(account)}
                onDelete={() => setDeleteTarget(account.id)}
                onSwipeRightQuickAdd={() => setQuickAddAccountId(account.id)}
                onLongPress={() => setContextMenuAccount(account)}
              >
              <div
                className={`card p-4 border-l-4 ${color.border} transition-all duration-150 hover:shadow-md group flex flex-col min-h-[130px] cursor-pointer ${
                  !account.active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <Icon className={`w-5 h-5 ${color.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                        {account.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {account.active ? (
                      <>
                        <button
                          onClick={() => onEdit(account)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <HiPencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button
                          onClick={() => setArchiveTarget(account.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <HiArchive className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onReactivate(account.id)}
                        className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Reactivate"
                      >
                        <HiRefresh className="w-3.5 h-3.5 text-green-500" />
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteTarget(account.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <HiTrash className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between mt-1">
                {!isCredit ? (
                  <>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatCurrency(currentBalance)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Opened {new Date(account.openingDate).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Available Credit
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(availableCredit ?? 0)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Owed
                        </div>
                        <div className="text-sm font-medium text-red-500">
                          {formatCurrency(amountOwed ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Limit
                        </div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(totalLimit ?? 0)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Opened {new Date(account.openingDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                </div>

                {!account.active && (
                  <span className="inline-block mt-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    Archived
                  </span>
                )}
              </div>
              </SwipeableAccountCard>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive account"
        message="The account will be hidden from active views but its transactions will be preserved."
        confirmLabel="Archive"
        onConfirm={() => {
          if (archiveTarget) onArchive(archiveTarget);
        }}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete account"
        message={
          deleteTargetTxCount > 0
            ? `This account has ${deleteTargetTxCount} transaction${deleteTargetTxCount === 1 ? '' : 's'}. Deleting it will leave them unassigned. Consider archiving instead, which preserves transactions and can be undone.`
            : 'This will permanently delete the account. This action cannot be undone.'
        }
        confirmLabel="Delete anyway"
        alternativeLabel={deleteTargetTxCount > 0 ? '🗄️ Archive instead (recommended)' : undefined}
        onAlternative={
          deleteTargetTxCount > 0
            ? () => { if (deleteTarget) onArchive(deleteTarget); setDeleteTarget(null); }
            : undefined
        }
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {drillDown && (
        <FilteredTransactionView
          isOpen
          title={drillDown.title}
          filter={drillDown.filter}
          onClose={() => setDrillDown(null)}
        />
      )}

      <QuickAddModal
        isOpen={quickAddAccountId !== null}
        presetAccountId={quickAddAccountId ?? undefined}
        onClose={() => setQuickAddAccountId(null)}
      />

      {contextMenuAccount && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={() => setContextMenuAccount(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-3">{contextMenuAccount.name}</h3>
              <button
                onClick={() => setContextMenuAccount(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <HiX className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => { onEdit(contextMenuAccount); setContextMenuAccount(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <HiPencil className="w-4 h-4 text-gray-400" /> Edit
              </button>
              <button
                onClick={() => { handleSetDefaultQuickAdd(contextMenuAccount); setContextMenuAccount(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <HiStar className="w-4 h-4 text-gray-400" /> Set as default for Quick Add
              </button>
              <button
                onClick={() => { setDeleteTarget(contextMenuAccount.id); setContextMenuAccount(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <HiTrash className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountList;