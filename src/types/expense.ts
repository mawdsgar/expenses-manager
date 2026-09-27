export interface Expense {
  id: string;
  payee: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  frequency: Frequency;
  category: string;
  account: string;
  paid: boolean;
}

export const getExpensePaidAmount = (expense: Pick<Expense, 'amount' | 'paid' | 'paidAmount'>) => {
  const recordedAmount = Number.isFinite(expense.paidAmount)
    ? expense.paidAmount
    : expense.paid
      ? expense.amount
      : 0;

  return Math.min(Math.max(recordedAmount, 0), expense.amount);
};

export const getExpenseRemainingAmount = (expense: Pick<Expense, 'amount' | 'paid' | 'paidAmount'>) =>
  Math.max(expense.amount - getExpensePaidAmount(expense), 0);

export const normaliseExpense = (
  expense: Omit<Expense, 'paidAmount'> & { paidAmount?: number },
): Expense => {
  const amount = Math.max(Number(expense.amount) || 0, 0);
  const recordedAmount = Number.isFinite(expense.paidAmount)
    ? expense.paidAmount ?? 0
    : expense.paid
      ? amount
      : 0;
  const paidAmount = Math.min(Math.max(recordedAmount, 0), amount);

  return {
    ...expense,
    amount,
    paidAmount,
    paid: amount > 0 && paidAmount >= amount,
  };
};

export interface Income {
  id: string;
  amount: number;
  frequency: Frequency;
  from: string;
  dueDate: string;
  isPrimary: boolean;
}

export interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  accountType: string;
  interestRate: number | null;
  isVariableRate: boolean;
}

export type Frequency = 'Monthly' | 'Weekly' | 'Yearly' | 'One-time';

export const frequencies: Frequency[] = ['Monthly', 'Weekly', 'Yearly', 'One-time'];

export type Category = 
  | 'Essential Household'
  | 'Bills'
  | 'Utilities'
  | 'Housing'
  | 'Subscriptions'
  | 'Insurance'
  | 'Entertainment'
  | 'Motoring'
  | 'Kids'
  | 'Debt'
  | 'Health'
  | 'Shopping'
  | 'Savings'
  | 'Mobiles, TV & Internet'
  | 'Charity'
  | 'Other';

export const categories: Category[] = [
  'Essential Household',
  'Bills',
  'Utilities',
  'Housing',
  'Subscriptions',
  'Insurance',
  'Entertainment',
  'Motoring',
  'Kids',
  'Debt',
  'Health',
  'Shopping',
  'Savings',
  'Mobiles, TV & Internet',
  'Charity',
  'Other',
];
