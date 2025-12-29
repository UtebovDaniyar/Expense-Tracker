/**
 * Export Service
 * Handles data export to CSV format with file system operations
 */

import { Paths, File } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Transaction, RecurringTransaction, Goal, Budget, CategoryBudget } from '@/types/models';
import { generateCSV, formatDateForCsv, formatNumberForCsv } from '@/utils/csvGenerator';

export interface ExportResult {
  success: boolean;
  fileUri?: string;
  recordCount: number;
  error?: string;
}

export interface ExportOptions {
  includeTransactions?: boolean;
  includeRecurringTransactions?: boolean;
  includeGoals?: boolean;
  includeBudgets?: boolean;
}

class ExportServiceClass {
  /**
   * Export transactions to CSV
   */
  async exportTransactions(transactions: Transaction[]): Promise<ExportResult> {
    try {
      if (transactions.length === 0) {
        return {
          success: false,
          recordCount: 0,
          error: 'No transactions to export',
        };
      }

      // Define CSV headers
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Created At'];

      // Generate CSV rows
      const rows = transactions.map((t) => [
        formatDateForCsv(t.date),
        t.type,
        t.category,
        formatNumberForCsv(t.amount),
        t.description || '',
        formatDateForCsv(t.createdAt),
      ]);

      // Generate CSV content
      const csvContent = generateCSV(headers, rows);

      // Save file
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = await this.saveFile(csvContent, filename);

      return {
        success: true,
        fileUri,
        recordCount: transactions.length,
      };
    } catch (error: any) {
      console.error('Export transactions error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error.message || 'Failed to export transactions',
      };
    }
  }

  /**
   * Export all data (transactions, goals, budgets, recurring transactions)
   */
  async exportAllData(
    transactions: Transaction[],
    recurringTransactions: RecurringTransaction[],
    goals: Goal[],
    budget: Budget | null,
    categoryBudgets: CategoryBudget[]
  ): Promise<ExportResult> {
    try {
      let csvContent = '';
      let totalRecords = 0;

      // Add metadata header
      csvContent += `PennyWise Data Export\n`;
      csvContent += `Export Date: ${new Date().toISOString()}\n`;
      csvContent += `\n`;

      // Export Transactions
      if (transactions.length > 0) {
        csvContent += `TRANSACTIONS\n`;
        const transactionHeaders = [
          'Date',
          'Type',
          'Category',
          'Amount',
          'Description',
          'Created At',
        ];
        const transactionRows = transactions.map((t) => [
          formatDateForCsv(t.date),
          t.type,
          t.category,
          formatNumberForCsv(t.amount),
          t.description || '',
          formatDateForCsv(t.createdAt),
        ]);
        csvContent += generateCSV(transactionHeaders, transactionRows);
        csvContent += `\n\n`;
        totalRecords += transactions.length;
      }

      // Export Recurring Transactions
      if (recurringTransactions.length > 0) {
        csvContent += `RECURRING TRANSACTIONS\n`;
        const recurringHeaders = [
          'Type',
          'Category',
          'Amount',
          'Description',
          'Frequency',
          'Start Date',
          'End Date',
          'Last Created',
          'Is Active',
        ];
        const recurringRows = recurringTransactions.map((r) => [
          r.type,
          r.category,
          formatNumberForCsv(r.amount),
          r.description || '',
          r.frequency,
          formatDateForCsv(r.startDate),
          r.endDate ? formatDateForCsv(r.endDate) : '',
          formatDateForCsv(r.lastCreated),
          r.isActive ? 'Yes' : 'No',
        ]);
        csvContent += generateCSV(recurringHeaders, recurringRows);
        csvContent += `\n\n`;
        totalRecords += recurringTransactions.length;
      }

      // Export Goals
      if (goals.length > 0) {
        csvContent += `GOALS\n`;
        const goalHeaders = [
          'Name',
          'Target Amount',
          'Current Amount',
          'Target Date',
          'Status',
          'Icon',
          'Created At',
        ];
        const goalRows = goals.map((g) => [
          g.name,
          formatNumberForCsv(g.targetAmount),
          formatNumberForCsv(g.currentAmount),
          formatDateForCsv(g.targetDate),
          g.status,
          g.icon || '',
          formatDateForCsv(g.createdAt),
        ]);
        csvContent += generateCSV(goalHeaders, goalRows);
        csvContent += `\n\n`;
        totalRecords += goals.length;
      }

      // Export Budget
      if (budget) {
        csvContent += `BUDGET\n`;
        const budgetHeaders = ['Amount', 'Period', 'Start Date', 'Created At'];
        const budgetRows = [
          [
            formatNumberForCsv(budget.amount),
            budget.period,
            formatDateForCsv(budget.startDate),
            formatDateForCsv(budget.createdAt),
          ],
        ];
        csvContent += generateCSV(budgetHeaders, budgetRows);
        csvContent += `\n\n`;
        totalRecords += 1;
      }

      // Export Category Budgets
      if (categoryBudgets.length > 0) {
        csvContent += `CATEGORY BUDGETS\n`;
        const categoryBudgetHeaders = ['Category', 'Amount', 'Period', 'Created At'];
        const categoryBudgetRows = categoryBudgets.map((cb) => [
          cb.category,
          formatNumberForCsv(cb.amount),
          cb.period,
          formatDateForCsv(cb.createdAt),
        ]);
        csvContent += generateCSV(categoryBudgetHeaders, categoryBudgetRows);
        csvContent += `\n\n`;
        totalRecords += categoryBudgets.length;
      }

      if (totalRecords === 0) {
        return {
          success: false,
          recordCount: 0,
          error: 'No data to export',
        };
      }

      // Save file
      const filename = `pennywise_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = await this.saveFile(csvContent, filename);

      return {
        success: true,
        fileUri,
        recordCount: totalRecords,
      };
    } catch (error: any) {
      console.error('Export all data error:', error);
      return {
        success: false,
        recordCount: 0,
        error: error.message || 'Failed to export data',
      };
    }
  }

  /**
   * Save CSV content to file
   */
  private async saveFile(content: string, filename: string): Promise<string> {
    try {
      // Create file in document directory
      const file = new File(Paths.document, filename);

      // Write content to file
      await file.write(content);

      return file.uri;
    } catch (error: any) {
      console.error('Save file error:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  /**
   * Share exported file using native sharing
   */
  async shareFile(fileUri: string): Promise<void> {
    try {
      // Check if sharing is available
      const isAvailable = await isAvailableAsync();

      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Share the file
      await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export PennyWise Data',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error: any) {
      console.error('Share file error:', error);
      throw new Error(`Failed to share file: ${error.message}`);
    }
  }

  /**
   * Delete exported file
   */
  async deleteFile(fileUri: string): Promise<void> {
    try {
      const file = new File(fileUri);
      if (file.exists) {
        await file.delete();
      }
    } catch (error: any) {
      console.error('Delete file error:', error);
      // Don't throw error, just log it
    }
  }
}

export const ExportService = new ExportServiceClass();
