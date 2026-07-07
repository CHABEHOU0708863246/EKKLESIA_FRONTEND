// src/app/core/models/finances/finance-summary.model.ts
import { Offering, OfferingType } from './offering.model';
import { Expense, ExpenseCategory } from './expense.model';
import { Budget } from './budget.model';

export interface FinanceSummary {
  // Offrandes
  totalOfferings: number;
  pendingOfferings: number;
  verifiedOfferings: number;
  validatedOfferings: number;
  totalOfferingAmount: number;
  offeringsByType: Record<OfferingType, number>;

  // Dépenses
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  paidExpenses: number;
  totalExpenseAmount: number;
  expensesByCategory: Record<ExpenseCategory, number>;

  // Budgets
  totalBudgets: number;
  approvedBudgets: number;
  pendingBudgets: number;
  totalBudgetAmount: number;
  totalBudgetSpent: number;

  // Synthèse
  balance: number;
  budgetUtilizationRate: number;
  recentOfferings: Offering[];
  recentExpenses: Expense[];
  activeBudgets: Budget[];
}
