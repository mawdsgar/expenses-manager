import React, { useState } from 'react';
import type { Expense, Category, Frequency } from '../types/expense';
import { categories } from '../types/expense';

const defaultAccounts = ['Natwest', 'Monzo'];

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense }) => {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [paid, setPaid] = useState(false);
  const [account, setAccount] = useState<string>(defaultAccounts[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payee || !amount) return;

    onAddExpense({
      payee,
      amount: parseFloat(amount),
      dueDate,
      frequency,
      category,
      paid,
      account,
    });

    setPayee('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategory(categories[0]);
    setFrequency('Monthly');
    setPaid(false);
    setAccount(defaultAccounts[0]);
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <h2>Add New Expense</h2>
      
      <div className="form-group">
        <label htmlFor="payee">Payee</label>
        <input
          type="text"
          id="payee"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          placeholder="e.g., Council Tax, Energy Company"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">Amount (£)</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Due Date</label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="account">Account</label>
          <select
            id="account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            {defaultAccounts.map((acc: string) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          <span>Paid</span>
        </label>
      </div>

      <button type="submit" className="btn-primary">Add Expense</button>
    </form>
  );
};
