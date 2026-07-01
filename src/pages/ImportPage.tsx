import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiArrowLeft, HiUpload, HiExclamation } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { getTags, matchTagByKeywords } from '../services/tagService';
import { bulkCreateTransactions } from '../services/transactionService';
import {
  parseCSV,
  mapRowsToImportRows,
  detectDuplicates,
} from '../services/importService';
import type { ImportRow, ColumnMapping } from '../services/importService';
import type { Tag } from '../types';
import { toast } from '../components/common/Toast';

type Step = 1 | 2 | 3;

const emptyMapping: ColumnMapping = {
  dateColumn: '',
  descriptionColumn: '',
  amountColumn: '',
  debitColumn: '',
  creditColumn: '',
};

const ImportPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const [step, setStep] = useState<Step>(1);
  const [accountId, setAccountId] = useState('');

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [fileName, setFileName] = useState('');

  const [importRows, setImportRows] = useState<ImportRow[]>([]);

  const [tags, setTags] = useState<Tag[]>([]);
  const [bulkTagId, setBulkTagId] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [rowTagOverrides, setRowTagOverrides] = useState<Record<number, { tagId: string; categoryId?: string }>>({});

  const [confirming, setConfirming] = useState(false);

  const activeAccounts = accounts.filter((a) => a.active);
  const expenseCategories = categories.filter((c) => c.active && c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.active && c.type === 'income');
  const allCategories = [...expenseCategories, ...incomeCategories];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);

    // Best-effort auto-guess of column mapping by header name, user can still change it
    const guess = (candidates: string[]) =>
      parsed.headers.find((h) => candidates.includes(h.toLowerCase().trim())) || '';
    setMapping({
      dateColumn: guess(['date', 'transaction date']),
      descriptionColumn: guess(['description', 'narration', 'details']),
      amountColumn: guess(['amount']),
      debitColumn: guess(['debit', 'withdrawal']),
      creditColumn: guess(['credit', 'deposit']),
    });
  };

  const handleBuildPreview = async () => {
    if (!currentUser) return;
    const rows = mapRowsToImportRows({ headers, rows: rawRows }, mapping, accountId);
    const withDuplicates = detectDuplicates(rows, transactions, accountId);
    const finalRows = withDuplicates.map((row) => ({
      ...row,
      excluded: row.isDuplicate || !!row.error,
    }));
    setImportRows(finalRows);

    try {
      const tagsData = await getTags(currentUser.uid);
      setTags(tagsData);
    } catch {
      // tags are optional for preview; ignore failures
    }

    setStep(3);
  };

  const toggleRowIncluded = (rowIndex: number) => {
    setImportRows((prev) =>
      prev.map((row) => (row.rowIndex === rowIndex ? { ...row, excluded: !row.excluded } : row))
    );
  };

  const updateRowField = (rowIndex: number, field: 'rawDescription' | 'date' | 'amount', value: string) => {
    setImportRows((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        if (field === 'rawDescription') {
          return { ...row, rawDescription: value };
        }
        if (field === 'date') {
          if (!value) return row;
          const [year, month, day] = value.split('-').map(Number);
          return { ...row, parsedDate: new Date(year, month - 1, day), error: undefined };
        }
        const numericAmount = Number(value);
        if (Number.isNaN(numericAmount)) return row;
        return { ...row, parsedAmount: numericAmount, error: undefined };
      })
    );
  };

  const toggleRowSelected = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleApplyBulkTag = () => {
    if (!bulkTagId || selectedRows.size === 0) return;
    const tag = tags.find((t) => t.id === bulkTagId);
    if (!tag) return;

    setRowTagOverrides((prev) => {
      const next = { ...prev };
      for (const row of importRows) {
        if (!selectedRows.has(row.rowIndex) || row.excluded) continue;
        next[row.rowIndex] = { tagId: tag.id, categoryId: tag.defaultCategoryId };
      }
      return next;
    });
  };

  const checkedRows = importRows.filter((row) => !row.excluded);
  const canConfirm = checkedRows.length > 0 && !confirming;

  const handleConfirmImport = async () => {
    if (!currentUser || !accountId) return;
    setConfirming(true);
    try {
      const rowsToImport = importRows.filter((row) => !row.excluded && !row.error);
      const duplicateCount = importRows.filter((row) => row.isDuplicate).length;
      const excludedCount = importRows.filter((row) => row.excluded && !row.isDuplicate).length;

      const payloads = rowsToImport.map((row) => {
        const description = row.rawDescription;
        const override = rowTagOverrides[row.rowIndex];
        const matchedTag = override ? undefined : matchTagByKeywords(description, tags);
        const tagId = override?.tagId || matchedTag?.id;
        const categoryId = override?.categoryId || matchedTag?.defaultCategoryId;

        return {
          type: row.inferredType || 'expense',
          date: row.parsedDate as Date,
          amount: row.parsedAmount as number,
          accountId,
          categoryId,
          notes: description,
          tags: tagId ? [tagId] : undefined,
        };
      });

      const result = await bulkCreateTransactions(currentUser.uid, payloads);

      toast.success(
        `Imported ${result.length} transactions, skipped ${duplicateCount} duplicates, ${excludedCount} excluded`
      );
      navigate('/transactions');
    } catch (err) {
      console.error('Error confirming import:', err);
      toast.error('Failed to import transactions');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/transactions" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <HiArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Import from a CSV export of your bank statement</p>
        </div>
      </div>

      {/* Step 1: account selection */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Step 1 — Target account
        </h2>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="form-input"
        >
          <option value="">Select account</option>
          {activeAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
        {step === 1 && (
          <button
            type="button"
            disabled={!accountId}
            onClick={() => setStep(2)}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Continue
          </button>
        )}
      </div>

      {/* Step 2: upload + column mapping */}
      {step >= 2 && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Step 2 — Upload CSV &amp; map columns
          </h2>

          <label className="flex items-center gap-2 btn-secondary text-sm w-fit cursor-pointer">
            <HiUpload className="w-4 h-4" />
            {fileName || 'Choose CSV file'}
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {headers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Date column</label>
                <select
                  value={mapping.dateColumn}
                  onChange={(e) => setMapping((prev) => ({ ...prev, dateColumn: e.target.value }))}
                  className="form-input"
                >
                  <option value="">— Select —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Description column</label>
                <select
                  value={mapping.descriptionColumn}
                  onChange={(e) => setMapping((prev) => ({ ...prev, descriptionColumn: e.target.value }))}
                  className="form-input"
                >
                  <option value="">— Select —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Amount column <span className="text-gray-400 font-normal">(optional if debit/credit used)</span></label>
                <select
                  value={mapping.amountColumn}
                  onChange={(e) => setMapping((prev) => ({ ...prev, amountColumn: e.target.value }))}
                  className="form-input"
                >
                  <option value="">— Select —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label className="form-label">Debit column <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={mapping.debitColumn}
                  onChange={(e) => setMapping((prev) => ({ ...prev, debitColumn: e.target.value }))}
                  className="form-input"
                >
                  <option value="">— None —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Credit column <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={mapping.creditColumn}
                  onChange={(e) => setMapping((prev) => ({ ...prev, creditColumn: e.target.value }))}
                  className="form-input"
                >
                  <option value="">— None —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          )}

          {headers.length > 0 && (
            <button
              type="button"
              disabled={!mapping.dateColumn || !mapping.descriptionColumn || (!mapping.amountColumn && !mapping.debitColumn && !mapping.creditColumn)}
              onClick={handleBuildPreview}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Preview import
            </button>
          )}
        </div>
      )}

      {/* Step 3: preview table */}
      {step === 3 && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Step 3 — Preview &amp; confirm
          </h2>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">Bulk apply tag to {selectedRows.size} selected row(s):</span>
              <select
                value={bulkTagId}
                onChange={(e) => setBulkTagId(e.target.value)}
                className="form-input w-auto text-sm"
              >
                <option value="">Select tag</option>
                {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
              <button
                type="button"
                onClick={handleApplyBulkTag}
                disabled={!bulkTagId || selectedRows.size === 0}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-2"><span className="sr-only">Select</span></th>
                  <th className="p-2">Import?</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Tag</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      row.error
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : row.isDuplicate
                          ? 'bg-amber-50 dark:bg-amber-900/20'
                          : ''
                    }`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.rowIndex)}
                        onChange={() => toggleRowSelected(row.rowIndex)}
                        disabled={row.excluded}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={!row.excluded}
                        onChange={() => toggleRowIncluded(row.rowIndex)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="date"
                        className="form-input py-1 text-xs"
                        value={row.parsedDate ? row.parsedDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => updateRowField(row.rowIndex, 'date', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        className="form-input py-1 text-xs"
                        value={row.rawDescription}
                        onChange={(e) => updateRowField(row.rowIndex, 'rawDescription', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="form-input py-1 text-xs w-24"
                        value={row.parsedAmount ?? ''}
                        onChange={(e) => updateRowField(row.rowIndex, 'amount', e.target.value)}
                      />
                    </td>
                    <td className="p-2 capitalize">{row.inferredType || '—'}</td>
                    <td className="p-2 text-xs text-gray-500 dark:text-gray-400">
                      {rowTagOverrides[row.rowIndex]
                        ? tags.find((t) => t.id === rowTagOverrides[row.rowIndex].tagId)?.name || '—'
                        : '—'}
                    </td>
                    <td className="p-2">
                      {row.error && (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                          <HiExclamation className="w-3.5 h-3.5" /> {row.error}
                        </span>
                      )}
                      {!row.error && row.isDuplicate && (
                        <span className="text-amber-600 dark:text-amber-400 text-xs">Possible duplicate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {checkedRows.length} of {importRows.length} rows will be imported
            </span>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirmImport}
              className="btn-primary text-sm disabled:opacity-50 ml-auto"
            >
              {confirming ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>
        </div>
      )}

      {/* Category list kept in scope for future per-row category editing */}
      {allCategories.length === 0 && null}
    </div>
  );
};

export default ImportPage;
