import React, { useState, useEffect } from 'react';
import { CalendarDays, Check, Plus, X } from 'lucide-react';
import type { Expense, ExpensePayment, Frequency } from '../types/expense';
import { categories, frequencies, getExpensePaidAmount } from '../types/expense';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: Omit<Expense, 'id'>) => void | Promise<void>;
  accounts: string[];
  onAddAccount: (account: string) => void;
  editingExpense?: Expense;
  onEdit?: (expense: Expense) => void | Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onAdd, accounts, onAddAccount, editingExpense, onEdit }) => {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [intervalCount, setIntervalCount] = useState(6);
  const [intervalUnit, setIntervalUnit] = useState<'Weeks' | 'Months'>('Weeks');
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
      const entries = editingExpense.payments ?? [];
      const unrecorded = Math.round((getExpensePaidAmount(editingExpense) - entries.reduce((sum, entry) => sum + entry.amount, 0)) * 100) / 100;
      setPayments(unrecorded > 0 ? [...entries, { id: crypto.randomUUID(), amount: unrecorded, date: '', note: '' }] : entries);
      setSaveError('');
      setDueDate(editingExpense.dueDate);
      setFrequency(editingExpense.frequency);
      setIntervalCount(editingExpense.intervalCount ?? 6);
      setIntervalUnit(editingExpense.intervalUnit ?? 'Weeks');
      setAccount(editingExpense.account);
      setCategory(editingExpense.category);
    } else {
      // Reset form when not editing
      setPayee('');
      setAmount('');
      setPayments([]);
      setSaveError('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setFrequency('Monthly');
      setAccount(accounts[0] || '');
      setCategory(categories[0]);
      setShowCategoryInput(false);
      setNewCategoryName('');
    }
  }, [editingExpense, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payee || !amount) return;

    const totalAmount = parseFloat(amount);
    const recordedPaidAmount = Math.round(payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100;
    if (recordedPaidAmount > totalAmount) {
      setSaveError('Payments cannot exceed the total expense amount.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const isPaidInFull = totalAmount > 0 && recordedPaidAmount >= totalAmount;

      if (editingExpense && onEdit) {
        // Edit mode
        await onEdit({
          ...editingExpense,
          payee,
          amount: totalAmount,
          paidAmount: recordedPaidAmount,
          payments: payments.map(payment => ({ ...payment, note: payment.note.trim() })),
          paid: isPaidInFull,
          dueDate,
          frequency,
          intervalCount,
          intervalUnit,
          account,
          category,
        });
      } else {
        // Add mode
        await onAdd({
          payee,
          amount: totalAmount,
          paidAmount: recordedPaidAmount,
          payments: payments.map(payment => ({ ...payment, note: payment.note.trim() })),
          dueDate,
          frequency,
          intervalCount,
          intervalUnit,
          account,
          category,
          paid: isPaidInFull,
        });
      }

      // Reset form
      setPayee('');
      setAmount('');
      setPayments([]);
      setSaveError('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setFrequency('Monthly');
      setAccount(accounts[0] || '');
      setCategory(categories[0]);
      setShowAccountInput(false);
      setNewAccountName('');
      onClose();
    } catch {
      setSaveError('Could not save this expense. Your payment details are still here; please try again.');
    } finally {
      setSaving(false);
    }
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

  const totalAmount = parseFloat(amount) || 0;
  const recordedPaidAmount = Math.round(payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100;
  const remainingAmount = Math.max(totalAmount - recordedPaidAmount, 0);
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
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

          {frequency === 'Custom' && <div className="form-group">
            <label className="form-label">Repeat every</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-input" type="number" min="1" max="60" value={intervalCount} onChange={e => setIntervalCount(Math.max(1, Number(e.target.value)))} />
              <select className="form-select" value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as 'Weeks' | 'Months')}>
                <option value="Weeks">Weeks</option><option value="Months">Months</option>
              </select>
            </div>
          </div>}

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

          <section className="form-group payment-fields" aria-label="Part-payments">
            <div className="payment-totals">
              <div><span>Paid so far</span><strong>{formatCurrency(recordedPaidAmount)}</strong></div>
              <div><span>Remaining</span><strong>{formatCurrency(remainingAmount)}</strong></div>
            </div>
            {payments.map((payment, index) => (
              <fieldset className="payment-entry" key={payment.id}>
                <legend>Payment {index + 1}</legend>
                <div className="payment-entry-fields">
                  <label className="form-label">Amount (£)
                    <input className="form-input" type="number" min="0.01" step="0.01" required
                      value={payment.amount || ''} onChange={e => setPayments(current => current.map(p => p.id === payment.id ? { ...p, amount: Number(e.target.value) } : p))} />
                  </label>
                  <label className="form-label">Payment date
                    <input className="form-input" type="date" value={payment.date}
                      onChange={e => setPayments(current => current.map(p => p.id === payment.id ? { ...p, date: e.target.value } : p))} />
                  </label>
                </div>
                {!payment.date && <p className="form-hint">No date recorded. Add one when known.</p>}
                <label className="form-label">Note (optional)
                  <textarea className="form-input" rows={2} value={payment.note} placeholder="e.g. Deposit paid by bank transfer"
                    onChange={e => setPayments(current => current.map(p => p.id === payment.id ? { ...p, note: e.target.value } : p))} />
                </label>
                <button type="button" className="btn-secondary" onClick={() => setPayments(current => current.filter(p => p.id !== payment.id))}>Remove payment {index + 1}</button>
              </fieldset>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setPayments(current => [...current, {
              id: crypto.randomUUID(), amount: 0, date: new Date().toLocaleDateString('en-CA'), note: '',
            }])}><Plus size={16} /> Add part-payment</button>
            <p className="form-hint">Record each payment with its date and note. Payments apply to the current expense cycle.</p>
          </section>

          <div className="form-group">
            <label className="form-label">Next Due Date</label>
            <div className="input-with-icon">
              <span className="input-icon"><CalendarDays size={16} /></span>
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
                  <Check size={16} />
                </button>
                <button type="button" className="btn-add-option" onClick={() => setShowAccountInput(false)}>
                  <X size={16} />
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
                <button type="button" className="btn-add-option" onClick={() => setShowAccountInput(true)} aria-label="Add account"><Plus size={16} /></button>
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
                  <Check size={16} />
                </button>
                <button type="button" className="btn-add-option" onClick={() => setShowCategoryInput(false)}>
                  <X size={16} />
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
                <button type="button" className="btn-add-option" onClick={() => setShowCategoryInput(true)} aria-label="Add category"><Plus size={16} /></button>
              </div>
            )}
          </div>

          {saveError && <p role="alert" className="payment-error">{saveError}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingExpense ? 'Save' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
