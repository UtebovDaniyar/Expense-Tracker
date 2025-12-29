/**
 * CSV Generator Utility
 * Handles CSV generation with proper escaping and formatting
 */

/**
 * Escapes special characters in CSV fields
 * Handles quotes, commas, and newlines
 */
export function escapeCsvField(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

/**
 * Generates CSV content from headers and rows
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  // Generate header row
  const headerRow = headers.map(escapeCsvField).join(',');

  // Generate data rows
  const dataRows = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');

  return `${headerRow}\n${dataRows}`;
}

/**
 * Formats a date for CSV export (ISO format)
 */
export function formatDateForCsv(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
}

/**
 * Formats a number for CSV export (2 decimal places)
 */
export function formatNumberForCsv(num: number): string {
  return num.toFixed(2);
}
