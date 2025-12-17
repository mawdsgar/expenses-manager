import React, { useState, useEffect } from 'react';
import type { SavingsAccount } from '../types/expense';

interface AddSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (savings: Omit<SavingsAccount, 'id'>) => void;
  editingSavings?: SavingsAccount;
  onEdit?: (savings: SavingsAccount) => void;
}

const accountTypes = ['Easy Access', 'Cash ISA', 'Stocks & Shares ISA'];

export const AddSavingsModal: React.FC<AddSavingsModalProps> = ({ isOpen, onClose, onAdd, editingSavings, onEdit }) => {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountType, setAccountType] = useState(accountTypes[0]);
  const [interestRate, setInterestRate] = useState('');
  const [isVariableRate, setIsVariableRate] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingSavings) {
      setName(editingSavings.name);
      setBalance(editingSavings.balance.toString());
      setAccountType(editingSavings.accountType);
      setIsVariableRate(editingSavings.isVariableRate);
      setInterestRate(editingSavings.interestRate?.toString() || '');
    } else {
      // Reset form when not editing
      setName('');
      setBalance('');
      setAccountType(accountTypes[0]);
      setInterestRate('');
      setIsVariableRate(false);
    }
  }, [editingSavings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !balance) return;

    const savingsData = {
      name,
      balance: parseFloat(balance),
      accountType,
      interestRate: isVariableRate ? null : parseFloat(interestRate) || 0,
      isVariableRate,
    };

    if (editingSavings && onEdit) {
      onEdit({ ...savingsData, id: editingSavings.id });
    } else {
      onAdd(savingsData);
    }

    // Reset form
    setName('');
    setBalance('');
    setAccountType(accountTypes[0]);
    setInterestRate('');
    setIsVariableRate(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingSavings ? 'Edit Savings Account' : 'Add Savings Account'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Balance</label>
            <div className="input-with-icon">
              <span className="input-icon">£</span>
              <input
                type="number"
                className="form-input"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Type *</label>
            <div className="select-with-add">
              <select
                className="form-select"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <option value="">Select account type</option>
                {accountTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button type="button" className="btn-add-option">+</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Interest Rate *</label>
            <div className="input-with-icon">
              <input
                type="number"
                className="form-input with-suffix"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="e.g. 3.75"
                step="0.01"
                min="0"
                disabled={isVariableRate}
                style={{ paddingRight: '2.5rem' }}
              />
              <span className="input-suffix">%</span>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isVariableRate"
                checked={isVariableRate}
                onChange={(e) => setIsVariableRate(e.target.checked)}
              />
              <label htmlFor="isVariableRate">
                Variable returns (market-dependent, e.g. Stocks & Shares ISA)
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingSavings ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
