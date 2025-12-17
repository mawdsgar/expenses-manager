import React from 'react';
import type { Expense } from '../types/expense';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ expenses }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalPaid = expenses
    .filter((e) => e.paid)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalUnpaid = expenses
    .filter((e) => !e.paid)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const paidCount = expenses.filter((e) => e.paid).length;
  const unpaidCount = expenses.filter((e) => !e.paid).length;

  return (
    <div className="expense-summary">
      <h2>Summary</h2>
      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-label">Total Monthly Expenses</div>
          <div className="card-value">{formatCurrency(total)}</div>
          <div className="card-subtitle">{expenses.length} expenses</div>
        </div>
        
        <div className="summary-card paid">
          <div className="card-label">Paid</div>
          <div className="card-value">{formatCurrency(totalPaid)}</div>
          <div className="card-subtitle">{paidCount} expenses</div>
        </div>
        
        <div className="summary-card unpaid">
          <div className="card-label">Unpaid</div>
          <div className="card-value">{formatCurrency(totalUnpaid)}</div>
          <div className="card-subtitle">{unpaidCount} expenses</div>
        </div>
      </div>
    </div>
  );
};
