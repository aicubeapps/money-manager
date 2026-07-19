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
import {
  HiCalendar, HiDownload, HiShare, HiDocumentText,
  HiTrash, HiChartBar, HiTrendingUp, HiTrendingDown,
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
        const { income, expenses, savings, categoryBreakdown, topCategories } = currentReport.data;
        const maxCatAmount = Math.max(...topCategories.map(c => c.amount), 1);
        const isOverspend = savings < 0;

        // Per-category gradient colors — index-based since category color data
        // isn't reliably stored on all rules.
        const CAT_GRADIENTS = [
          { from: '#8b5cf6', to: '#c4b5fd' }, // violet
          { from: '#3b82f6', to: '#93c5fd' }, // blue
          { from: '#10b981', to: '#6ee7b7' }, // emerald
          { from: '#f59e0b', to: '#fcd34d' }, // amber
          { from: '#f43f5e', to: '#fda4af' }, // rose
        ];

        return (
          <div className="card p-5 space-y-5">
            {/* Header */}
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

            {/* A1: Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 flex flex-col gap-1">
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <HiTrendingUp className="w-3.5 h-3.5" /> Income
                </div>
                <div className="text-base font-bold text-green-700 dark:text-green-300 leading-tight">
                  {formatCurrency(income)}
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 flex flex-col gap-1">
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                  <HiTrendingDown className="w-3.5 h-3.5" /> Expenses
                </div>
                <div className="text-base font-bold text-red-700 dark:text-red-300 leading-tight">
                  {formatCurrency(expenses)}
                </div>
              </div>

              <div className={`rounded-xl p-3 flex flex-col gap-1 ${isOverspend ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'}`}>
                <div className={`text-xs font-medium flex items-center gap-1 ${isOverspend ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>
                  {isOverspend ? <HiTrendingDown className="w-3.5 h-3.5" /> : '💰'}
                  {isOverspend ? 'Overspend' : 'Savings'}
                </div>
                <div className={`text-base font-bold leading-tight ${isOverspend ? 'text-red-700 dark:text-red-300' : 'text-teal-700 dark:text-teal-300'}`}>
                  {formatCurrency(Math.abs(savings))}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">Income − Expenses</div>
              </div>
            </div>

            {/* A3: Top categories — per-category gradient bars */}
            {topCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Spending Categories</h4>
                <div className="space-y-2.5">
                  {topCategories.map((item, i) => {
                    const grad = CAT_GRADIENTS[i % CAT_GRADIENTS.length];
                    return (
                      <div key={item.category}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{i + 1}. {item.category}</span>
                          <span className="text-gray-500 dark:text-gray-400 tabular-nums">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{
                              width: `${(item.amount / maxCatAmount) * 100}%`,
                              background: `linear-gradient(to right, ${grad.from}, ${grad.to})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* A2: Category breakdown — single column to prevent text cutoff */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Category Breakdown</h4>
                <div className="space-y-1.5">
                  {Object.entries(categoryBreakdown).map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span
                        className="text-sm text-gray-700 dark:text-gray-300 min-w-0 truncate"
                        title={name}
                      >
                        {name}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0 tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
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
