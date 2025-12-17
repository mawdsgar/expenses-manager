import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Expense } from '../types/expense';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch expenses from Supabase
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Transform snake_case from DB to camelCase for app
      const transformedExpenses: Expense[] = (data || []).map((item) => ({
        id: item.id,
        payee: item.payee,
        amount: item.amount,
        dueDate: item.due_date,
        category: item.category,
        paid: item.paid,
        account: item.account,
        frequency: item.frequency || 'Monthly',
      }));

      setExpenses(transformedExpenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new expense
  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            payee: expense.payee,
            amount: expense.amount,
            due_date: expense.dueDate,
            category: expense.category,
            paid: expense.paid,
            account: expense.account,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newExpense: Expense = {
        id: data.id,
        payee: data.payee,
        amount: data.amount,
        dueDate: data.due_date,
        category: data.category,
        paid: data.paid,
        account: data.account,
        frequency: data.frequency || 'Monthly',
      };

      setExpenses([...expenses, newExpense]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
      console.error('Error adding expense:', err);
    }
  };

  // Delete expense
  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);

      if (error) throw error;

      setExpenses(expenses.filter((expense) => expense.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      console.error('Error deleting expense:', err);
    }
  };

  // Toggle paid status
  const togglePaid = async (id: string) => {
    try {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return;

      const { error } = await supabase
        .from('expenses')
        .update({ paid: !expense.paid })
        .eq('id', id);

      if (error) throw error;

      setExpenses(
        expenses.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      console.error('Error toggling paid:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    expenses,
    loading,
    error,
    addExpense,
    deleteExpense,
    togglePaid,
  };
};
