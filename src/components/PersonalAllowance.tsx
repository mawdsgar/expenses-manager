import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatPayDate, toDateKey } from '../utils/payday';

type Payment = { id: string; person: number; period_start: string; paid_on: string; amount: number };
const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
const localKey = 'personalAllowancePayments';

export function PersonalAllowance({ person, name, onNameChange, onSaveName, nameSaving, nameSaveDisabled, nameDirty, nameError, onSaveAmount, amountSaving, amountSaveDisabled, amountDirty, amountError, allowance, onChange, periodStart, periodEnd, cloudEnabled, budgetSaved }: {
  onSaveAmount: () => void; amountSaving: boolean; amountSaveDisabled: boolean; amountDirty: boolean; amountError: string;
  onSaveName: () => void; nameSaving: boolean; nameSaveDisabled: boolean; nameDirty: boolean; nameError: string;
  person: number; name: string; onNameChange: (value: string) => void; allowance: string; onChange: (value: string) => void;
  periodStart: string; periodEnd: string; cloudEnabled: boolean; budgetSaved: boolean;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(toDateKey(new Date()));
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let rows: Payment[];
        if (cloudEnabled) {
          const { data, error } = await supabase.from('personal_allowance_payments').select('*')
            .eq('person', person).eq('period_start', periodStart).order('paid_on', { ascending: false }).order('created_at', { ascending: false });
          if (error) throw error;
          rows = data ?? [];
        } else {
          rows = (JSON.parse(localStorage.getItem(localKey) || '[]') as Payment[])
            .filter(p => p.person === person && p.period_start === periodStart);
        }
        if (!cancelled) setPayments(rows.map(p => ({ ...p, amount: Number(p.amount) })));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load payments. Please retry.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [cloudEnabled, person, periodStart, reload]);
  const entitlement = Math.round((Number(allowance) || 0) * 100);
  const paid = payments.reduce((sum, p) => sum + Math.round(p.amount * 100), 0);
  const remaining = entitlement - paid;
  const validAmount = Number(amount) > 0 && Number.isFinite(Number(amount)) && Math.round(Number(amount) * 100) <= remaining;
  const record = async () => {
    if (inFlight.current || !validAmount || !budgetSaved || !paidOn || paidOn > toDateKey(new Date())) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const payment: Payment = { id: crypto.randomUUID(), person, period_start: periodStart, paid_on: paidOn, amount: Math.round(Number(amount) * 100) / 100 };
      if (cloudEnabled) {
        const { data, error } = await supabase.from('personal_allowance_payments').insert(payment).select().single();
        if (error) throw error;
        payment.amount = Number(data.amount);
      } else {
        const rows = JSON.parse(localStorage.getItem(localKey) || '[]') as Payment[];
        localStorage.setItem(localKey, JSON.stringify([...rows, payment]));
      }
      setPayments(previous => [payment, ...previous]);
      setAmount('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be saved. Please retry.');
    } finally { setBusy(false); inFlight.current = false; }
  };
  const remove = async (id: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      if (cloudEnabled) {
        const { data, error } = await supabase.from('personal_allowance_payments').delete().eq('id', id).select('id').single();
        if (error || !data) throw error || new Error('Payment was not removed. Please reload.');
      } else {
        const rows = JSON.parse(localStorage.getItem(localKey) || '[]') as Payment[];
        localStorage.setItem(localKey, JSON.stringify(rows.filter(p => p.id !== id)));
      }
      setPayments(previous => previous.filter(p => p.id !== id));
      setRemoveId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be removed. Please retry.');
    } finally { setBusy(false); inFlight.current = false; }
  };
  return <section className="personal-allowance-card" aria-label={name.trim() || `Personal Allowance ${person}`}>
    <form className="allowance-name-form" onSubmit={e => { e.preventDefault(); if (nameDirty && !nameSaveDisabled) onSaveName(); }}>
      <label className="allowance-name-field" htmlFor={`allowance-name-${person}`}>Allowance name
        <input id={`allowance-name-${person}`} type="text" maxLength={60} placeholder={`Personal Allowance ${person}`} value={name} onChange={e => onNameChange(e.target.value)} />
      </label>
      <button type="submit" className="btn-control" disabled={nameSaveDisabled || !nameDirty}>{nameSaving ? 'Saving…' : 'Save name'}</button>
      <span className={nameError ? 'allowance-status-error' : 'allowance-status'} role="status">{nameError || (nameDirty ? 'Unsaved name' : 'Name saved')}</span>
    </form>
    <form className="allowance-amount-form" onSubmit={e => { e.preventDefault(); if (amountDirty && !amountSaveDisabled) onSaveAmount(); }}>
      <div className="allowance-item">
        <label htmlFor={`allowance-${person}`}>Monthly amount<small>Yours to spend as you wish</small></label>
        <div className="currency-input"><span className="currency-symbol">£</span><input id={`allowance-${person}`} type="number" min="0" max="9999999999.99" step="0.01" required placeholder="0.00" value={allowance} onChange={e => onChange(e.target.value)} /></div>
      </div>
      <div className="allowance-amount-actions">
        <button type="submit" className="btn-control" disabled={amountSaveDisabled || !amountDirty || allowance.trim() === '' || !Number.isFinite(Number(allowance)) || Number(allowance) < 0 || Number(allowance) > 9999999999.99}>{amountSaving ? 'Saving…' : 'Save amount'}</button>
        <span className={amountError ? 'allowance-status-error' : 'allowance-status'} role="status">{amountError || (amountDirty ? 'Unsaved amount' : 'Amount saved')}</span>
      </div>
    </form>
    <div className="personal-payment-summary" aria-live="polite">
      <div><span>Paid out</span><strong>{loading ? 'Loading…' : error ? 'Unavailable' : money(paid / 100)}</strong></div>
      <div><span>{remaining < 0 ? 'Over allowance' : 'Still to pay'}</span><strong>{loading ? 'Loading…' : error ? 'Unavailable' : money(Math.abs(remaining) / 100)}</strong></div>
      {!loading && !error && remaining === 0 && entitlement > 0 && <span className="personal-paid-badge">Fully paid</span>}
    </div>
    <progress aria-label={`${name.trim() || `Personal Allowance ${person}`} paid out`} value={Math.max(0, Math.min(paid, entitlement))} max={Math.max(entitlement, 1)} />
    <form className="personal-payment-form" onSubmit={e => { e.preventDefault(); void record(); }}>
      <label>Amount paid (£)<input type="number" min="0.01" max={Math.max(0, remaining / 100)} step="0.01" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label>Payment date<input type="date" required max={toDateKey(new Date())} value={paidOn} onChange={e => setPaidOn(e.target.value)} /></label>
      <button className="btn-control" disabled={busy || loading || !!error || !budgetSaved || !validAmount || !paidOn || paidOn > toDateKey(new Date())}>{busy ? 'Saving…' : 'Record payment'}</button>
    </form>
    {!budgetSaved && <p className="allowance-hint">Save any edited name or monthly amount before recording a payment. Other unsaved allowance changes can be saved with Save allowances below.</p>}
    {Number(amount) * 100 > remaining && <p className="allowance-status-error">Amount exceeds the allowance still to pay.</p>}
    {error && <p role="alert" className="allowance-status-error">{error} <button type="button" className="btn-control" onClick={() => setReload(n => n + 1)}>Retry</button></p>}
    <details className="personal-payment-history"><summary>Payment history ({payments.length})</summary>
      <p className="allowance-hint">For {formatPayDate(new Date(`${periodStart}T00:00:00`))} – {formatPayDate(new Date(`${periodEnd}T00:00:00`))}</p>
      {!loading && payments.length === 0 && <p className="allowance-hint">No payments recorded for this pay month.</p>}
      {payments.map(p => <div className="personal-payment-row" key={p.id}>
        <span>{formatPayDate(new Date(`${p.paid_on}T00:00:00`))}</span><strong>{money(p.amount)}</strong>
        {removeId === p.id ? <span className="personal-remove-confirm">Remove this record? <button type="button" className="btn-control" disabled={busy} onClick={() => void remove(p.id)}>Confirm</button><button type="button" className="btn-control" disabled={busy} onClick={() => setRemoveId(null)}>Cancel</button></span>
          : <button type="button" className="btn-control" disabled={busy} onClick={() => setRemoveId(p.id)}>Remove</button>}
      </div>)}
    </details>
  </section>;
}
