import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useReports } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';
import { generateReport, saveReport, deleteSavedReport } from '../services/reportService';
import { formatDateRange, getDateRange } from '../utils/dateUtils';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import type { TimeView } from '../utils/dateUtils';
import type { Report } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { toast } from '../components/common/Toast';
import ExpenseByCategoryChart from '../components/dashboard/ExpenseByCategoryChart';
import {
  HiCalendar, HiDownload, HiShare, HiDocumentText,
  HiTrash, HiChartBar,
} from 'react-icons/hi';

const PERIODS = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
];

// Report period labels ('weekly' etc.) don't match TimeView keys ('week' etc.).
// getDateRange falls through to its default (today) for any unrecognised key.
const PERIOD_TO_VIEW: Record<string, TimeView> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

const ReportsPage = () => {
  const formatCurrency = useFormatCurrency();
  const { currentUser } = useAuth();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { savedReports, loading: savedLoading } = useReports();
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleGenerate = () => {
    const view = PERIOD_TO_VIEW[selectedPeriod] ?? 'month';
    const now = new Date();
    const { start, end } = getDateRange(view, now);
    const reportData = generateReport(
      transactions, categories,
      selectedPeriod as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
      start, end
    );
    setCurrentReport({
      id: 'temp',
      userId: currentUser?.uid || '',
      period: selectedPeriod as any,
      startDate: start,
      endDate: end,
      data: reportData.data,
      generatedAt: new Date(),
    });
  };

  const handleSave = async () => {
    if (!currentUser || !currentReport) return;
    setIsSaving(true);
    try {
      const { id, ...rest } = currentReport;
      await saveReport(currentUser.uid, {
        period: rest.period, startDate: rest.startDate, endDate: rest.endDate, data: rest.data,
      });
      toast.success('Report saved!');
    } catch {
      toast.error('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!currentReport) return;
    const { income, expenses, savings } = currentReport.data;
    const text = `${currentReport.period.toUpperCase()} Report\n${formatDateRange(currentReport.startDate, currentReport.endDate)}\n\nIncome: ₹${income.toFixed(2)}\nExpenses: ₹${expenses.toFixed(2)}\nSavings: ₹${savings.toFixed(2)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${currentReport.period} Report`, text }); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Report copied to clipboard!');
    }
  };

  const handleExportCSV = () => {
    if (!currentReport) return;
    const { income, expenses, savings, categoryBreakdown, topCategories } = currentReport.data;
    let csv = 'Metric,Amount\nIncome,' + income + '\nExpenses,' + expenses + '\nSavings,' + savings + '\n\nCategory,Amount\n';
    Object.entries(categoryBreakdown).forEach(([name, amount]) => { csv += `${name},${amount}\n`; });
    csv += '\nTop Categories\n';
    topCategories.forEach((item) => { csv += `${item.category},${item.amount}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentReport.period}-report.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedReport(id);
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete report');
    }
  };

  if (savedLoading) return <LoadingSpinner message="Loading reports..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{savedReports.length} saved report{savedReports.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Generator */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <HiChartBar className="w-5 h-5 text-primary-500" /> Generate Report
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-lg p-1 gap-0.5 flex-wrap">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedPeriod(value)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-150 ${
                  selectedPeriod === value
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleGenerate} className="btn-primary text-sm">
            <HiCalendar className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {/* Report Output */}
      {currentReport && (() => {
        const { income, expenses, savings, categoryBreakdown } = currentReport.data;
        const isOverspend = savings < 0;

        // Build name→{color,icon} lookup from the categories hook
        const catMeta = new Map<string, { color: string; icon: string }>();
        categories.forEach((c) => {
          catMeta.set(c.name, { color: c.color || '#94a3b8', icon: c.icon || '📦' });
        });

        // ── CHANGE 3: stacked proportional bar data ─────────────────────────
        const FALLBACK_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#6C5CE7', '#FD79A8', '#00B894'];
        const MAX_SEGMENTS = 7;
        const sortedBreakdown = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
        const topSegments = sortedBreakdown.slice(0, MAX_SEGMENTS);
        const otherAmount = sortedBreakdown.slice(MAX_SEGMENTS).reduce((s, [, a]) => s + a, 0);
        const stackSegments = [
          ...topSegments.map(([name, amount], i) => ({
            name,
            amount,
            color: catMeta.get(name)?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          })),
          ...(otherAmount > 0 ? [{ name: 'Other', amount: otherAmount, color: '#94a3b8' }] : []),
        ];
        const stackTotal = stackSegments.reduce((s, seg) => s + seg.amount, 0);

        // ── CHANGE 2: ExpenseByCategoryChart data ────────────────────────────
        const expenseByCatData = Object.entries(categoryBreakdown).map(([name, amount], i) => {
          const meta = catMeta.get(name);
          return {
            categoryId: name,
            name,
            icon: meta?.icon ?? '📦',
            value: amount,
            color: meta?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          };
        });

        return (
          <div className="space-y-4">
            {/* Header + action buttons */}
            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white capitalize">
                    {currentReport.period} Report
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateRange(currentReport.startDate, currentReport.endDate)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleSave} disabled={isSaving} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">
                    <HiDocumentText className="w-3.5 h-3.5" /> {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={handleShare} className="btn-secondary text-xs py-1.5 px-3">
                    <HiShare className="w-3.5 h-3.5" /> Share
                  </button>
                  <button onClick={handleExportCSV} className="btn-secondary text-xs py-1.5 px-3">
                    <HiDownload className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>
            </div>

            {/* CHANGE 1: Summary cards — .card + gradient, matching SummaryCards style */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Income</span>
                  <span className="text-lg">💰</span>
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-400 truncate">
                  {formatCurrency(income)}
                </div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Expenses</span>
                  <span className="text-lg">💳</span>
                </div>
                <div className="text-xl font-bold text-red-700 dark:text-red-400 truncate">
                  {formatCurrency(expenses)}
                </div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Savings</span>
                  <span className="text-lg">🎯</span>
                </div>
                <div className={`text-xl font-bold truncate ${isOverspend ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                  {formatCurrency(Math.abs(savings))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isOverspend ? 'Overspend this period' : 'Income − Expenses'}
                </div>
              </div>
            </div>

            {/* CHANGE 3: Stacked proportional bar — all categories in one view */}
            {stackSegments.length > 0 && stackTotal > 0 && (
              <div className="card p-5">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Spending Categories</h4>
                {/* Stacked bar */}
                <div className="flex w-full h-5 rounded-lg overflow-hidden gap-px mb-4">
                  {stackSegments.map((seg) => (
                    <div
                      key={seg.name}
                      title={`${seg.name}: ${((seg.amount / stackTotal) * 100).toFixed(1)}%`}
                      style={{
                        width: `${(seg.amount / stackTotal) * 100}%`,
                        backgroundColor: seg.color,
                        minWidth: seg.amount / stackTotal > 0.005 ? '2px' : undefined,
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-1.5">
                  {stackSegments.map((seg) => {
                    const pct = ((seg.amount / stackTotal) * 100).toFixed(1);
                    return (
                      <div key={seg.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="flex-1 text-gray-700 dark:text-gray-300 min-w-0 truncate" title={seg.name}>
                          {seg.name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums text-xs w-8 text-right flex-shrink-0">
                          {pct}%
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0">
                          {formatCurrency(seg.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHANGE 2: Category breakdown — reuse ExpenseByCategoryChart (handles truncation + show more) */}
            {expenseByCatData.length > 0 && (
              <div className="card p-5">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Category Breakdown</h4>
                <ExpenseByCategoryChart data={expenseByCatData} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Saved Reports</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {savedReports.map((report) => (
              <div key={report.id} className="card p-4 flex justify-between items-start group">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white capitalize">{report.period} Report</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateRange(new Date(report.startDate), new Date(report.endDate))}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Saved {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                  {report.data && (
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-green-600 dark:text-green-400">+{formatCurrency(report.data.income)}</span>
                      <span className="text-red-600 dark:text-red-400">−{formatCurrency(report.data.expenses)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setDeleteTarget(report.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <HiTrash className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete saved report"
        message="This report will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
};

export default ReportsPage;
