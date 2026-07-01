export interface TransactionSplit {
  id: string;
  category: string;
  amount: number; // Split amount
  description: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Positive for credit (income), negative for debit (expense)
  description: string;
  cleanDescription?: string; // AI cleaned/shortened description (e.g., "Uber" instead of "UBER *TRIP RIDE HELP.UBER.COM")
  category: string; // Category (e.g., Groceries)
  type: 'credit' | 'debit';
  reference?: string;
  counterparty?: string;
  isSplit?: boolean;
  splits?: TransactionSplit[];
  confidence?: number; // AI confidence score (0-1)
  originalCategory?: string; // Store original AI category in case of user overrides
  isRecurring?: boolean;
  recurringFrequency?: string; // e.g., 'Monthly' | 'Weekly' | 'Annually' | 'Quarterly' | 'Bi-weekly'
  isRecurringConfirmed?: boolean;
}

export interface CategoryBudget {
  category: string;
  spent: number;
  allocated: number;
}

export interface StatementSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number }[];
  dailyFlow: { date: string; income: number; expenses: number; balance: number }[];
  insights: {
    title: string;
    description: string;
    type: 'warning' | 'success' | 'info' | 'opportunity';
  }[];
}

export interface LedgerTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // Positive for credit/income, negative for debit/expense
  reference?: string;
}

export interface TransactionMatch {
  bankTransactionId: string;
  ledgerTransactionId: string;
  matchedAt: string;
  matchType: "auto" | "manual";
}

export interface FlaggedTransaction {
  id: string; // references bank transaction id or ledger transaction id
  source: "bank" | "ledger";
  reason: string;
  flaggedAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankOpeningBalance: number;
  ledgerOpeningBalance: number;
}

export const DEFAULT_CATEGORIES = [
  "Groceries",
  "Dining & Cafes",
  "Housing & Rent",
  "Utilities",
  "Shopping & Retail",
  "Transport & Fuel",
  "Salary & Income",
  "Health & Medical",
  "Entertainment & Leisure",
  "Subscriptions & Bills",
  "Transfer & Savings",
  "Education",
  "Others"
] as const;

export interface AutoCategorizationRule {
  id: string;
  keyword: string;
  category: string;
}

