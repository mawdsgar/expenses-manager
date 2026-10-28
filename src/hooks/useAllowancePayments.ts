import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type PersonalPayment = { person: number; period_start: string; amount: number };
type HouseholdPayment = { transferred_on: string; amount: number };
export function useAllowancePayments(start: string, end: string, cloudEnabled: boolean, revision: number) {
  const [state, setState] = useState({ key: '', personal1: 0, personal2: 0, household: 0, loading: true, error: '' });
  const key = `${start}/${end}`;
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState(previous => ({ ...previous, loading: true, error: '' }));
      if (!start || !end) {
        setState({ key, personal1: 0, personal2: 0, household: 0, loading: false, error: '' });
        return;
      }
      try {
        let personal: PersonalPayment[];
        let household: HouseholdPayment[];
        if (cloudEnabled) {
          const [payments, transfers] = await Promise.all([
            supabase.from('personal_allowance_payments').select('person, period_start, amount').eq('period_start', start),
            supabase.from('household_transfers').select('transferred_on, amount').gte('transferred_on', start).lt('transferred_on', end),
          ]);
          if (payments.error) throw payments.error;
          if (transfers.error) throw transfers.error;
          personal = payments.data ?? [];
          household = transfers.data ?? [];
        } else {
          personal = (JSON.parse(localStorage.getItem('personalAllowancePayments') || '[]') as PersonalPayment[]).filter(p => p.period_start === start);
          household = (JSON.parse(localStorage.getItem('householdSpendingTransfers') || '[]') as HouseholdPayment[]).filter(p => p.transferred_on >= start && p.transferred_on < end);
        }
        const sum = (rows: { amount: number }[]) => rows.reduce((total, p) => total + Math.round(Number(p.amount) * 100), 0) / 100;
        if (!cancelled) setState({ key, personal1: sum(personal.filter(p => p.person === 1)), personal2: sum(personal.filter(p => p.person === 2)), household: sum(household), loading: false, error: '' });
      } catch {
        if (!cancelled) setState(previous => ({ ...previous, key, loading: false, error: 'Could not load remaining allowances.' }));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [start, end, key, cloudEnabled, revision]);
  return { ...state, loading: state.loading || state.key !== key };
}
