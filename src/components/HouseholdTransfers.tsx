import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatPayDate, toDateKey } from '../utils/payday';
import { calculateHouseholdTransfers, type HouseholdTransfer, type HouseholdWeek } from '../utils/householdTransfers';

const money = (pennies: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pennies / 100);
const storageKey = 'householdSpendingTransfers';
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Please try again.';

export function HouseholdTransfers({ weeks, cloudEnabled, budgetSaved, onPaymentsChange }: {
  weeks: HouseholdWeek[]; cloudEnabled: boolean; budgetSaved: boolean; onPaymentsChange: () => void;
}) {
  const start = toDateKey(weeks[0].start);
  const end = toDateKey(weeks[weeks.length - 1].end);
  const [today, setToday] = useState(() => toDateKey(new Date()));
  const [transfers, setTransfers] = useState<HouseholdTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [reload, setReload] = useState(0);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => today < start ? start : today > end ? end : today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setToday(toDateKey(new Date()));
    const interval = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        let rows: HouseholdTransfer[];
        if (cloudEnabled) {
          const { data, error } = await supabase.from('household_transfers').select('id, transferred_on, amount')
            .gte('transferred_on', start).lte('transferred_on', end).order('transferred_on', { ascending: false }).order('created_at', { ascending: false });
          if (error) throw error;
          rows = data ?? [];
        } else {
          rows = (JSON.parse(localStorage.getItem(storageKey) || '[]') as HouseholdTransfer[])
            .filter(t => t.transferred_on >= start && t.transferred_on <= end);
        }
        if (!cancelled) setTransfers(rows.map(t => ({ ...t, amount: Number(t.amount) })));
      } catch (error) {
        if (!cancelled) setLoadError(`Could not load household transfers. ${errorMessage(error)}`);
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [cloudEnabled, start, end, reload]);
  const { rows, budget, totalUsed, remaining, shortfall } = calculateHouseholdTransfers(weeks, transfers, today);
  const unavailable = loading || !!loadError;
  const valid = Number.isFinite(Number(amount)) && Number(amount) >= 0.01 && Number(amount) <= 9999999999.99 && date >= start && date <= end && date <= today;
  const save = async () => {
    if (inFlight.current || !valid || unavailable || !budgetSaved) return;
    inFlight.current = true;
    setBusy(true); setSaveError(''); setNotice('');
    try {
      const transfer: HouseholdTransfer = { id: editingId || crypto.randomUUID(), amount: Math.round(Number(amount) * 100) / 100, transferred_on: date };
      if (cloudEnabled) {
        const query = editingId
          ? supabase.from('household_transfers').update({ amount: transfer.amount, transferred_on: date }).eq('id', editingId)
          : supabase.from('household_transfers').insert(transfer);
        const { error } = await query.select('id').single();
        if (error) throw error;
      } else {
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as HouseholdTransfer[];
        localStorage.setItem(storageKey, JSON.stringify([...existing.filter(t => t.id !== transfer.id), transfer]));
      }
      setTransfers(previous => [...previous.filter(t => t.id !== transfer.id), transfer]);
      onPaymentsChange();
      setNotice(editingId ? 'Transfer updated. Weekly allowances recalculated.' : 'Transfer recorded. Weekly allowances recalculated.');
      setEditingId(null); setAmount('');
    } catch (error) { setSaveError(`Transfer could not be saved. ${errorMessage(error)}`); }
    finally { setBusy(false); inFlight.current = false; }
  };
  const remove = async (id: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setSaveError(''); setNotice('');
    try {
      if (cloudEnabled) {
        const { error } = await supabase.from('household_transfers').delete().eq('id', id).select('id').single();
        if (error) throw error;
      } else {
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as HouseholdTransfer[];
        localStorage.setItem(storageKey, JSON.stringify(existing.filter(t => t.id !== id)));
      }
      setTransfers(previous => previous.filter(t => t.id !== id));
      if (editingId === id) { setEditingId(null); setAmount(''); }
      onPaymentsChange();
      setRemoveId(null); setNotice('Transfer removed. Weekly allowances recalculated.');
    } catch (error) { setSaveError(`Transfer could not be removed. ${errorMessage(error)}`); }
    finally { setBusy(false); inFlight.current = false; }
  };
  return <div className="weekly-allowance-schedule household-transfer-tracker" aria-label="Weekly household transfer schedule">
    <div className="weekly-allowance-heading"><strong>Weekly household spending transfers</strong><span>Payday to payday</span></div>
    <p className="allowance-hint">For Food, Kids, Eating Out and Fuel only · excludes personal money. Transfers count as budget used, not actual purchases.</p>
    <div className="household-transfer-totals" aria-live="polite">
      <div><span>Pay-month budget</span><strong>{money(budget)}</strong></div>
      <div><span>Transferred</span><strong>{unavailable ? 'Unavailable' : money(totalUsed)}</strong></div>
      <div><span>{shortfall ? 'Over monthly budget' : 'Budget remaining'}</span><strong>{unavailable ? 'Unavailable' : money(shortfall || remaining)}</strong></div>
    </div>
    <form ref={formRef} className="personal-payment-form household-transfer-form" onSubmit={e => { e.preventDefault(); void save(); }}>
      <label>Transfer amount (£)<input type="number" min="0.01" max="9999999999.99" step="0.01" required placeholder="0.00" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} /></label>
      <label>Transfer date<input type="date" required min={start} max={today < end ? today : end} value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></label>
      <button className="btn-control" disabled={busy || unavailable || !budgetSaved || !valid}>{busy ? 'Saving…' : editingId ? 'Save transfer' : 'Record transfer'}</button>
      {editingId && <button type="button" className="btn-control" disabled={busy} onClick={() => { setEditingId(null); setAmount(''); setSaveError(''); }}>Cancel edit</button>}
    </form>
    {!budgetSaved && <p className="allowance-hint">Save allowances below before recording transfers.</p>}
    {today < start && <p className="allowance-hint">This pay month has not started. Transfers can be recorded once their date is reached.</p>}
    {loadError && <p role="alert" className="allowance-status-error">{loadError} <button type="button" className="btn-control" onClick={() => setReload(value => value + 1)}>Retry loading transfers</button></p>}
    {saveError && <p role="alert" className="allowance-status-error">{saveError}</p>}
    {notice && <p role="status" className="allowance-status-saved">{notice}</p>}
    {!unavailable && shortfall > 0 && <p role="alert" className="household-budget-warning">Monthly budget exceeded by {money(shortfall)}. No household budget remains for future transfers.</p>}
    <p className="allowance-hint">Based on recorded transfers. Overspending reduces future allowances immediately; unused allowance carries forward when a week ends. Changes are spread by the number of days in each remaining week.</p>
    <div className="household-weeks">
      {rows.map(row => <section className={`household-week${row.current ? ' household-week-current' : ''}`} key={row.week} aria-label={`Household week ${row.week}`}>
        <div className="weekly-allowance-row"><span><b>Week {row.week}</b>{row.current && <em className="household-week-tag">Current week</em>}<small>{formatPayDate(row.start)} – {formatPayDate(row.end)}</small></span><span className="household-original">Original <strong>{money(row.original)}</strong></span></div>
        <div className="household-week-figures">
          <div><span>Adjusted allowance</span><strong>{unavailable ? '—' : money(row.target)}</strong></div>
          <div><span>Transferred</span><strong>{unavailable ? '—' : money(row.used)}</strong></div>
          <div><span>{row.over ? 'Over allowance' : row.closed ? (row.week < rows.length ? 'Carried forward' : 'Unused this month') : 'Left this week'}</span><strong>{unavailable ? '—' : money(row.over || row.remaining)}</strong></div>
        </div>
        {!unavailable && (row.over > 0
          ? <p role="alert" className="household-budget-warning">Week {row.week} is {money(row.over)} over its allowance. {row.week < rows.length ? 'This reduces later weeks’ adjusted allowances, shown below.' : 'No future weeks remain in this pay month to absorb the excess.'}</p>
          : <p className={`household-week-status${row.current || row.closed ? ' household-week-on-track' : ''}`}>{row.closed ? (row.remaining ? (row.week < rows.length ? `${money(row.remaining)} unused · carried into later weeks.` : `${money(row.remaining)} unused at the end of this pay month.`) : 'Within allowance.') : row.current ? `On track · ${money(row.remaining)} available for the rest of this week.` : row.target === row.original ? 'Original allowance unchanged.' : `${money(Math.abs(row.target - row.original))} ${row.target < row.original ? 'less' : 'extra'} than the original allowance.`}</p>)}
      </section>)}
    </div>
    <details className="personal-payment-history household-transfer-history"><summary>Household transfer history ({unavailable ? '…' : transfers.length})</summary>
      {!unavailable && !transfers.length && <p className="allowance-hint">No household transfers recorded for this pay month.</p>}
      {[...transfers].sort((a, b) => b.transferred_on.localeCompare(a.transferred_on) || a.id.localeCompare(b.id)).map(t => <div className="personal-payment-row" key={t.id}>
        <span>{formatPayDate(new Date(`${t.transferred_on}T00:00:00`))} · Week {weeks.find(w => t.transferred_on >= toDateKey(w.start) && t.transferred_on <= toDateKey(w.end))?.week}</span><strong>{money(Math.round(t.amount * 100))}</strong>
        <button type="button" className="btn-control" disabled={busy} onClick={() => { setEditingId(t.id); setAmount(String(t.amount)); setDate(t.transferred_on); setSaveError(''); setNotice(''); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); formRef.current?.querySelector('input')?.focus({ preventScroll: true }); }}>Edit</button>
        {removeId === t.id ? <span className="personal-remove-confirm">Remove this transfer? <button type="button" className="btn-control" disabled={busy} onClick={() => void remove(t.id)}>Confirm removal</button><button type="button" className="btn-control" disabled={busy} onClick={() => setRemoveId(null)}>Cancel</button></span>
          : <button type="button" className="btn-control" disabled={busy} onClick={() => setRemoveId(t.id)}>Remove</button>}
      </div>)}
    </details>
  </div>;
}
