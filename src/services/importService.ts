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

export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn?: string;
  creditColumn?: string;
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

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
};

// Parses a date string in DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD format.
// Returns undefined (with no guess) if the format is ambiguous (e.g. both
// segments could be day or month, like 03/04/2024).
const parseDate = (raw: string): { date?: Date; error?: string } => {
  const value = raw.trim();

  // YYYY-MM-DD (unambiguous)
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return { date };
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
  const { headers, rows } = rawRows;
  const columnIndex = (name?: string) => (name ? headers.indexOf(name) : -1);

  const dateIdx = columnIndex(mapping.dateColumn);
  const descriptionIdx = columnIndex(mapping.descriptionColumn);
  const amountIdx = columnIndex(mapping.amountColumn);
  const debitIdx = columnIndex(mapping.debitColumn);
  const creditIdx = columnIndex(mapping.creditColumn);

  return rows.map((row, index) => {
    const rawDate = dateIdx >= 0 ? row[dateIdx] || '' : '';
    const rawDescription = descriptionIdx >= 0 ? row[descriptionIdx] || '' : '';

    let rawAmount = amountIdx >= 0 ? row[amountIdx] || '' : '';
    const debitValue = debitIdx >= 0 ? row[debitIdx] || '' : '';
    const creditValue = creditIdx >= 0 ? row[creditIdx] || '' : '';
    if (!rawAmount && (debitValue || creditValue)) {
      rawAmount = debitValue || creditValue;
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
    } else {
      importRow.parsedAmount = Math.abs(numericAmount);

      let inferredType: 'expense' | 'income';
      if (debitValue) {
        inferredType = 'expense';
      } else if (creditValue) {
        inferredType = 'income';
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

