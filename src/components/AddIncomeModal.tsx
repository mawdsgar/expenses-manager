import React, { useState, useEffect } from 'react';
import type { Income, Frequency } from '../types/expense';
import { frequencies } from '../types/expense';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (income: Omit<Income, 'id'>) => void;
  editingIncome?: Income;
  onEdit?: (income: Income) => void;
  existingIncomes: Income[];
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose, onAdd, editingIncome, onEdit, existingIncomes }) => {
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [from, setFrom] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPrimary, setIsPrimary] = useState(false);
  const [primaryError, setPrimaryError] = useState('');

  // Populate form when editing
  useEffect(() => {
    setPrimaryError(''); // Clear error
    if (editingIncome) {
      setAmount(editingIncome.amount.toString());
      setFrequency(editingIncome.frequency);
      setFrom(editingIncome.from);
      setDueDate(editingIncome.dueDate);
      setIsPrimary(editingIncome.isPrimary);
    } else {
      // Reset form when not editing
      setAmount('');
      setFrequency('Monthly');
      setFrom('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setIsPrimary(false);
    }
  }, [editingIncome, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !from) return;

    // Check if trying to set as primary when another income is already primary
    if (isPrimary) {
      const otherPrimaryIncome = existingIncomes.find(
        income => income.isPrimary && income.id !== editingIncome?.id
      );
      
      if (otherPrimaryIncome) {
        setPrimaryError(`"${otherPrimaryIncome.from}" is already set as the primary income. Please uncheck that one first.`);
        return;
      }
    }

    const incomeData = {
      amount: parseFloat(amount),
      frequency,
      from,
      dueDate,
      isPrimary,
    };

    if (editingIncome && onEdit) {
      onEdit({ ...incomeData, id: editingIncome.id });
    } else {
      onAdd(incomeData);
    }

    // Reset form
    setAmount('');
    setFrequency('Monthly');
    setFrom('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsPrimary(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingIncome ? 'Edit Income' : 'Add Income'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label className="form-label">Frequency</label>
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
            <label className="form-label">From</label>
            <input
              type="text"
              className="form-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="e.g., Main Job, Freelance"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
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
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              <label htmlFor="isPrimary">Primary Income</label>
            </div>
            {primaryError && (
              <div className="error-message" style={{ 
                marginTop: '0.5rem', 
                padding: '0.75rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem'
              }}>
                {primaryError}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingIncome ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
