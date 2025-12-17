import React from 'react';
import type { Expense } from '../types/expense';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onTogglePaid: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ 
  expenses, 
  onDeleteExpense,
  onTogglePaid 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (expenses.length === 0) {
    return (
      <div className="expense-list empty">
        <p>No expenses yet. Add your first expense above!</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <h2>Monthly Expenses</h2>
      <div className="table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Payee</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Category</th>
              <th>Paid</th>
              <th>Account</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="payee-cell">{expense.payee}</td>
                <td className="amount-cell">{formatCurrency(expense.amount)}</td>
                <td className="date-cell">{formatDate(expense.dueDate)}</td>
                <td className="category-cell">
                  <span className="category-badge">{expense.category}</span>
                </td>
                <td className="paid-cell">
                  <input
                    type="checkbox"
                    checked={expense.paid}
                    onChange={() => onTogglePaid(expense.id)}
                    className="paid-checkbox"
                  />
                </td>
                <td className="account-cell">
                  <span className={`account-badge ${expense.account.toLowerCase()}`}>
                    {expense.account}
                  </span>
                </td>
                <td className="action-cell">
                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    className="btn-delete"
                    aria-label="Delete expense"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
