import { parse, isValid } from 'date-fns';
import type { Transaction } from '../types';

export interface ImportRow {
  rowIndex: number;
  rawDate: string;
  rawDescription: string;
  rawAmount: string;
  parsedDate?: Date;
  parsedAmount?: number;
  inferredType?: 'expense' | 'income';
  isDuplicate: boolean;
  duplicateOfTransactionId?: string;
  excluded: boolean;
  error?: string;
}

// Columns are identified by their index in the parsed header row, not by
// name — some bank exports reuse the same header text for multiple columns
// (e.g. Kotak's two "Dr / Cr" columns), which would make a name-based
// mapping unable to tell them apart. -1 means "not selected".
export interface ColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  debitColumn?: number;
  creditColumn?: number;
  // Alternative to debitColumn/creditColumn: a single amountColumn paired
  // with a flag-style column indicating debit vs credit (e.g. Kotak's
  // "Dr / Cr" column). Only consulted when debitColumn/creditColumn aren't
  // mapped — see mapRowsToImportRows.
  directionColumn?: number;
}

// Basic CSV parsing that handles quoted fields (including embedded commas and escaped quotes "")
export const parseCSV = (fileContent: string): { headers: string[]; rows: string[][] } => {
  const lines = fileContent.split(/\r\n|\r|\n/).filter((line) => line.length > 0);

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    fields.push(current);
    return fields.map((f) => f.trim());
  };

  if (lines.length === 0) return { headers: [], rows: [] };

  const parsedLines = lines.map(parseLine);

  // Bank CSV exports often prepend several metadata/letterhead rows (account
  // holder address, IFSC, MICR, etc.) before the real column-header row, so
  // we can't just trust line 0. Scan for the first line that looks like a
  // genuine header: every field is filled in (unlike the label/value
  // preamble rows above it, which have several blank cells), it has more
  // than one column, its field count roughly matches the very next line,
  // and that next line has at least one field that looks like a date or a
  // number — a light signal that it's actual transaction data, not more
  // preamble. Falls back to line 0 if nothing matches within the first 30
  // lines, so existing working imports don't regress.
  const looksLikeDateOrNumber = (value: string) =>
    /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value) || /^-?[\d,]+(\.\d+)?$/.test(value.trim());

  const MAX_PREAMBLE_SCAN = 30;
  let headerIndex = 0;

  for (let i = 0; i < Math.min(parsedLines.length - 1, MAX_PREAMBLE_SCAN); i++) {
    const candidate = parsedLines[i];
    const next = parsedLines[i + 1];

    const isFullyPopulated = candidate.length > 1 && candidate.every((f) => f.trim() !== '');
    const fieldCountClose = Math.abs(candidate.length - next.length) <= 1;
    const nextLooksLikeData = next.some(looksLikeDateOrNumber);

    if (isFullyPopulated && fieldCountClose && nextLooksLikeData) {
      headerIndex = i;
      break;
    }
  }

  const headers = parsedLines[headerIndex];
  const rows = parsedLines.slice(headerIndex + 1);

  return { headers, rows };
};

// Known unambiguous date/time formats seen in bank CSV exports, tried in
// order until one parses successfully (Kotak Mahindra Bank uses the first
// two; ISO is kept as a fallback for non-Indian-bank CSVs). Add new bank
// formats to this list as they come up.
const KNOWN_DATE_FORMATS = ['dd-MM-yyyy HH:mm:ss', 'dd-MM-yyyy', 'yyyy-MM-dd'];

// Parses a date string against KNOWN_DATE_FORMATS first, falling back to the
// ambiguity-aware DD/MM/YYYY vs MM/DD/YYYY slash handling below. Returns
// undefined (with no guess) if the format is ambiguous (e.g. both segments
// could be day or month, like 03/04/2024) or doesn't match anything known.
const parseDate = (raw: string): { date?: Date; error?: string } => {
  const value = raw.trim();

  for (const formatString of KNOWN_DATE_FORMATS) {
    const parsed = parse(value, formatString, new Date());
    if (isValid(parsed)) {
      return { date: parsed };
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const a = Number(first);
    const b = Number(second);

    const aCouldBeDay = a >= 1 && a <= 31;
    const bCouldBeDay = b >= 1 && b <= 31;
    const aCouldBeMonth = a >= 1 && a <= 12;
    const bCouldBeMonth = b >= 1 && b <= 12;

    // Unambiguous: first segment can't be a month (> 12), so it must be DD/MM/YYYY
    if (aCouldBeDay && !aCouldBeMonth && bCouldBeMonth) {
      return { date: new Date(Number(year), b - 1, a) };
    }
    // Unambiguous: second segment can't be a month, so it must be MM/DD/YYYY
    if (bCouldBeDay && !bCouldBeMonth && aCouldBeMonth) {
      return { date: new Date(Number(year), a - 1, b) };
    }
    // Both segments are <= 12, so it could be either DD/MM or MM/DD — ambiguous
    if (aCouldBeMonth && bCouldBeMonth) {
      return { error: 'ambiguous date format' };
    }
    return { error: 'invalid date' };
  }

  return { error: 'unrecognized date format' };
};

export const mapRowsToImportRows = (
  rawRows: { headers: string[]; rows: string[][] },
  mapping: ColumnMapping,
  _accountId: string
): ImportRow[] => {
  const { rows } = rawRows;

  const dateIdx = mapping.dateColumn;
  const descriptionIdx = mapping.descriptionColumn;
  const amountIdx = mapping.amountColumn;
  const debitIdx = mapping.debitColumn ?? -1;
  const creditIdx = mapping.creditColumn ?? -1;
  const directionIdx = mapping.directionColumn ?? -1;

  // Flag-style Dr/Cr indicator values recognized when amountColumn is paired
  // with directionColumn instead of separate debit/credit amount columns.
  const CREDIT_INDICATORS = new Set(['cr', 'credit', 'c']);
  const DEBIT_INDICATORS = new Set(['dr', 'debit', 'd']);

  return rows.map((row, index) => {
    const rawDate = dateIdx >= 0 ? row[dateIdx] || '' : '';
    const rawDescription = descriptionIdx >= 0 ? row[descriptionIdx] || '' : '';

    let rawAmount = amountIdx >= 0 ? row[amountIdx] || '' : '';
    const debitValue = debitIdx >= 0 ? row[debitIdx] || '' : '';
    const creditValue = creditIdx >= 0 ? row[creditIdx] || '' : '';
    if (!rawAmount && (debitValue || creditValue)) {
      rawAmount = debitValue || creditValue;
    }

    // Flag-style Dr/Cr column: only consulted when no separate debit/credit
    // amount columns are mapped — those take priority (see inferredType
    // below), matching how debit/credit amount columns already take
    // priority over sign-based inference.
    let directionType: 'expense' | 'income' | undefined;
    let directionError: string | undefined;
    if (debitIdx < 0 && creditIdx < 0 && directionIdx >= 0) {
      const directionValue = (row[directionIdx] || '').trim().toLowerCase();
      if (CREDIT_INDICATORS.has(directionValue)) {
        directionType = 'income';
      } else if (DEBIT_INDICATORS.has(directionValue)) {
        directionType = 'expense';
      } else {
        directionError = 'unrecognized debit/credit indicator';
      }
    }

    const importRow: ImportRow = {
      rowIndex: index,
      rawDate,
      rawDescription,
      rawAmount,
      isDuplicate: false,
      excluded: false,
    };

    const { date, error: dateError } = parseDate(rawDate);
    if (dateError) {
      importRow.error = dateError;
    } else {
      importRow.parsedDate = date;
    }

    const numericAmount = Number(rawAmount.replace(/[^0-9.-]/g, ''));
    if (rawAmount === '' || Number.isNaN(numericAmount)) {
      importRow.error = importRow.error || 'invalid amount';
    } else if (directionError) {
      importRow.error = importRow.error || directionError;
    } else {
      importRow.parsedAmount = Math.abs(numericAmount);

      let inferredType: 'expense' | 'income';
      if (debitValue) {
        inferredType = 'expense';
      } else if (creditValue) {
        inferredType = 'income';
      } else if (directionType) {
        inferredType = directionType;
      } else {
        inferredType = numericAmount < 0 ? 'expense' : 'income';
      }
      importRow.inferredType = inferredType;
    }

    return importRow;
  });
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const detectDuplicates = (
  importRows: ImportRow[],
  existingTransactions: Transaction[],
  accountId: string
): ImportRow[] => {
  const candidates = existingTransactions.filter((t) => t.accountId === accountId);

  return importRows.map((row) => {
    if (!row.parsedDate || row.parsedAmount === undefined) return row;

    const match = candidates.find(
      (t) => isSameDay(t.date, row.parsedDate!) && t.amount === row.parsedAmount
    );

    if (match) {
      return { ...row, isDuplicate: true, duplicateOfTransactionId: match.id };
    }
    return row;
  });
};

