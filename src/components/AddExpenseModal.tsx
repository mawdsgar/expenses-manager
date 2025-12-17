import React, { useState, useEffect } from 'react';
import type { Expense, Frequency } from '../types/expense';
import { categories, frequencies } from '../types/expense';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  accounts: string[];
  onAddAccount: (account: string) => void;
  editingExpense?: Expense;
  onEdit?: (expense: Expense) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onAdd, accounts, onAddAccount, editingExpense, onEdit }) => {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [account, setAccount] = useState(accounts[0] || '');
  const [category, setCategory] = useState<string>(categories[0]);
  const [showAccountInput, setShowAccountInput] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('customCategories');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const allCategories = [
    ...categories,
    ...customCategories.filter(
      (c) => !categories.some((base) => base.toLowerCase() === c.toLowerCase())
    ),
  ];

  useEffect(() => {
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Populate form when editing
  useEffect(() => {
    if (editingExpense) {
      setPayee(editingExpense.payee);
      setAmount(editingExpense.amount.toString());
      setDueDate(editingExpense.dueDate);
      setFrequency(editingExpense.frequency);
      setAccount(editingExpense.account);
      setCategory(editingExpense.category);
    } else {
      // Reset form when not editing
      setPayee('');
      setAmount('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setFrequency('Monthly');
      setAccount(accounts[0] || '');
      setCategory(categories[0]);
      setShowCategoryInput(false);
      setNewCategoryName('');
    }
  }, [editingExpense, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payee || !amount) return;

    if (editingExpense && onEdit) {
      // Edit mode
      onEdit({
        ...editingExpense,
        payee,
        amount: parseFloat(amount),
        dueDate,
        frequency,
        account,
        category,
      });
    } else {
      // Add mode
      onAdd({
        payee,
        amount: parseFloat(amount),
        dueDate,
        frequency,
        account,
        category,
        paid: false,
      });
    }

    // Reset form
    setPayee('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setFrequency('Monthly');
    setAccount(accounts[0] || '');
    setCategory(categories[0]);
    setShowAccountInput(false);
    setNewAccountName('');
    onClose();
  };

  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      onAddAccount(newAccountName.trim());
      setAccount(newAccountName.trim());
      setNewAccountName('');
      setShowAccountInput(false);
    }
  };

  const handleAddCategory = () => {
    const next = newCategoryName.trim();
    if (!next) return;
    const exists = allCategories.some((c) => c.toLowerCase() === next.toLowerCase());
    if (!exists) {
      setCustomCategories([...customCategories, next]);
    }
    setCategory(next);
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Payee</label>
            <input
              type="text"
              className="form-input"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="e.g., Electric Company"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="input-with-icon">
              <span className="input-icon">£</span>
              <input
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Next Due Date</label>
            <div className="input-with-icon">
              <span className="input-icon">📅</span>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Frequency</label>
            <select
              className="form-select"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              {frequencies.map((freq) => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Account</label>
            {showAccountInput ? (
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Enter account name"
                  autoFocus
                />
                <button type="button" className="btn-add-option" onClick={handleAddAccount}>
                  ✓
                </button>
                <button type="button" className="btn-add-option" onClick={() => setShowAccountInput(false)}>
                  ✕
                </button>
              </div>
            ) : (
              <div className="select-with-add">
                <select
                  className="form-select"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                >
                  {accounts.map((acc) => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
                <button type="button" className="btn-add-option" onClick={() => setShowAccountInput(true)}>+</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            {showCategoryInput ? (
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  autoFocus
                />
                <button type="button" className="btn-add-option" onClick={handleAddCategory}>
                  ✓
                </button>
                <button type="button" className="btn-add-option" onClick={() => setShowCategoryInput(false)}>
                  ✕
                </button>
              </div>
            ) : (
              <div className="select-with-add">
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button type="button" className="btn-add-option" onClick={() => setShowCategoryInput(true)}>+</button>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingExpense ? 'Save' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
