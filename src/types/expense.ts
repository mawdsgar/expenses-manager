export interface Expense {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  frequency: Frequency;
  category: string;
  account: string;
  paid: boolean;
}

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
