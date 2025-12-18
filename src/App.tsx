import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Expense, Income, SavingsAccount } from './types/expense';
import { supabase } from './lib/supabase';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddIncomeModal } from './components/AddIncomeModal';
import { AddSavingsModal } from './components/AddSavingsModal';
import './App.css';

const LogoGlyph = () => (
  <svg className="brand-icon" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="logo-frame" x1="10%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5CE1FF" />
        <stop offset="45%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <radialGradient id="logo-glow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#F8FAFF" stopOpacity="0.8" />
        <stop offset="65%" stopColor="#C7D2FE" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#111827" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="logo-mark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="logo-smile" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    <rect x="6" y="6" width="84" height="84" rx="22" fill="url(#logo-frame)" />
    <circle cx="48" cy="46" r="34" fill="url(#logo-glow)" />

    <path
      d="M22 64V30l12 18 10-16 10 16 12-18v34h-9V46l-8 12-9-14-9 14-9-12v18Z"
      fill="url(#logo-mark)"
      stroke="rgba(255,255,255,0.65)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    <path
      d="M26 68c8 8 32 10 44-1"
      fill="none"
      stroke="url(#logo-smile)"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M64 65l8 3-4 7"
      fill="none"
      stroke="url(#logo-smile)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem('incomes');
    return saved ? JSON.parse(saved) : [];
  });

  const [savings, setSavings] = useState<SavingsAccount[]>(() => {
    const saved = localStorage.getItem('savings');
    return saved ? JSON.parse(saved) : [];
  });

  const [accounts, setAccounts] = useState<string[]>(() => {
    const saved = localStorage.getItem('accounts');
    return saved ? JSON.parse(saved) : ['Natwest', 'Monzo'];
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showNewCycleConfirm, setShowNewCycleConfirm] = useState(false);
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
  const [expenseIdPendingDelete, setExpenseIdPendingDelete] = useState<string | null>(null);
  const [editingSavings, setEditingSavings] = useState<SavingsAccount | undefined>(undefined);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  // Table sorting state
  const [sortField, setSortField] = useState<keyof Expense | 'amount' | 'dueDate'>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // Date range filter state
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [undoExpenses, setUndoExpenses] = useState<Expense[] | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);
  const [undoIntervalId, setUndoIntervalId] = useState<number | null>(null);

  // Theme state (default to dark)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  // Dashboard roll-up (collapsing one collapses all)
  const [dashboardCollapsed, setDashboardCollapsed] = useState(() => {
    const saved = localStorage.getItem('dashboardCollapsed');
    if (saved === null) return true;
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dashboardCollapsed', String(dashboardCollapsed));
  }, [dashboardCollapsed]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleDashboardCollapsed = () => {
    setDashboardCollapsed((prev) => !prev);
  };

  // Allowances state (saved to localStorage)
  const [allowance1, setAllowance1] = useState(() => {
    const saved = localStorage.getItem('allowance1');
    return saved || '';
  });
  const [allowance2, setAllowance2] = useState(() => {
    const saved = localStorage.getItem('allowance2');
    return saved || '';
  });
  const [foodKidsFuel, setFoodKidsFuel] = useState(() => {
    const saved = localStorage.getItem('foodKidsFuel');
    return saved || '';
  });
  const [allowancesLastSaved, setAllowancesLastSaved] = useState(() => ({
    allowance1: localStorage.getItem('allowance1') || '',
    allowance2: localStorage.getItem('allowance2') || '',
    foodKidsFuel: localStorage.getItem('foodKidsFuel') || '',
  }));
  const [allowancesDirty, setAllowancesDirty] = useState(false);
  const [isSavingAllowances, setIsSavingAllowances] = useState(false);
  const [allowancesSaveError, setAllowancesSaveError] = useState<string | null>(null);
  const [allowancesLoaded, setAllowancesLoaded] = useState(false);
  const [allowancesRowId, setAllowancesRowId] = useState<string | null>(null);

  // Expandable sections state
  const [allowancesExpanded, setAllowancesExpanded] = useState(false);
  const [expensesBreakdownExpanded, setExpensesBreakdownExpanded] = useState(false);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }, [incomes]);

  // Supabase: detect if configured
  const supabaseEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  // On mount: if Supabase enabled, load incomes, expenses, and savings from DB
  useEffect(() => {
    const loadIncomes = async () => {
      if (!supabaseEnabled) return;
      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) {
        console.error('Failed to load incomes from Supabase:', error.message);
        return;
      }
      const mapped = (data || []).map((row: any): Income => ({
        id: row.id,
        amount: Number(row.amount),
        frequency: row.frequency,
        from: row.from,
        dueDate: row.due_date,
        isPrimary: row.is_primary,
      }));
      setIncomes(mapped);
    };

    const loadExpenses = async () => {
      if (!supabaseEnabled) return;
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) {
        console.error('Failed to load expenses from Supabase:', error.message);
        return;
      }
      const mapped = (data || []).map((row: any): Expense => ({
        id: row.id,
        payee: row.payee,
        amount: Number(row.amount),
        dueDate: row.due_date,
        frequency: row.frequency,
        category: row.category,
        paid: row.paid,
        account: row.account,
      }));
      setExpenses(mapped);
    };

    const loadSavings = async () => {
      if (!supabaseEnabled) return;
      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Failed to load savings from Supabase:', error.message);
        return;
      }
      const mapped = (data || []).map((row: any): SavingsAccount => ({
        id: row.id,
        name: row.name,
        balance: Number(row.balance),
        accountType: row.account_type,
        interestRate: row.interest_rate === null ? null : Number(row.interest_rate),
        isVariableRate: Boolean(row.is_variable_rate),
      }));
      setSavings(mapped);
    };

    const loadAllowances = async () => {
      if (!supabaseEnabled) {
        setAllowancesLoaded(true);
        return;
      }
      const { data, error } = await supabase
        .from('allowances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) {
        console.error('Failed to load allowances from Supabase:', error.message);
        setAllowancesLoaded(true);
        return;
      }
      if (data && data.length > 0) {
        const row = data[0];
        setAllowancesRowId(row.id ?? null);
        setAllowance1(row.allowance1 != null ? String(row.allowance1) : '');
        setAllowance2(row.allowance2 != null ? String(row.allowance2) : '');
        setFoodKidsFuel(row.food_kids_fuel != null ? String(row.food_kids_fuel) : '');
        setAllowancesLastSaved({
          allowance1: row.allowance1 != null ? String(row.allowance1) : '',
          allowance2: row.allowance2 != null ? String(row.allowance2) : '',
          foodKidsFuel: row.food_kids_fuel != null ? String(row.food_kids_fuel) : '',
        });
      }
      setAllowancesLoaded(true);
    };

    loadIncomes();
    loadExpenses();
    loadSavings();
    loadAllowances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('savings', JSON.stringify(savings));
  }, [savings]);

  useEffect(() => {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (!allowancesLoaded) return;
    setAllowancesDirty(
      allowance1 !== allowancesLastSaved.allowance1 ||
      allowance2 !== allowancesLastSaved.allowance2 ||
      foodKidsFuel !== allowancesLastSaved.foodKidsFuel
    );
  }, [allowance1, allowance2, foodKidsFuel, allowancesLastSaved, allowancesLoaded]);

  const saveAllowances = async () => {
    if (!allowancesLoaded) return;

    setIsSavingAllowances(true);
    setAllowancesSaveError(null);

    const payload = {
      allowance1: Number(allowance1) || 0,
      allowance2: Number(allowance2) || 0,
      food_kids_fuel: Number(foodKidsFuel) || 0,
    };

    try {
      if (supabaseEnabled) {
        if (allowancesRowId) {
          const { error } = await supabase
            .from('allowances')
            .update(payload)
            .eq('id', allowancesRowId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('allowances')
            .insert(payload)
            .select('id')
            .single();
          if (error) throw error;
          setAllowancesRowId(data?.id ?? null);
        }
      }

      // Always mirror to localStorage as a convenient fallback.
      localStorage.setItem('allowance1', allowance1);
      localStorage.setItem('allowance2', allowance2);
      localStorage.setItem('foodKidsFuel', foodKidsFuel);
      setAllowancesLastSaved({ allowance1, allowance2, foodKidsFuel });
    } catch (error: any) {
      console.error('Failed to save allowances:', error?.message || error);
      setAllowancesSaveError(error?.message || 'Failed to save allowances');
    } finally {
      setIsSavingAllowances(false);
    }
  };

  // Auto-update income due dates when they're reached
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedIncomes = incomes.map(income => {
      const dueDate = new Date(income.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // If due date is today, move it forward by one month
      if (dueDate.getTime() === today.getTime() && income.frequency === 'Monthly') {
        const newDueDate = new Date(income.dueDate);
        newDueDate.setMonth(newDueDate.getMonth() + 1);
        
        const next = {
          ...income,
          dueDate: newDueDate.toISOString().split('T')[0]
        };
        // Also persist to Supabase if enabled
        if (supabaseEnabled) {
          supabase
            .from('incomes')
            .update({ due_date: next.dueDate })
            .eq('id', income.id)
            .then(({ error }) => {
              if (error) console.error('Failed to bump income due date in Supabase:', error.message);
            });
        }
        return next;
      }
      
      return income;
    });

    // Only update if there were changes
    if (JSON.stringify(updatedIncomes) !== JSON.stringify(incomes)) {
      setIncomes(updatedIncomes);
    }
  }, [incomes]);

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const insert = async () => {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            payee: expense.payee,
            amount: expense.amount,
            due_date: expense.dueDate,
            frequency: expense.frequency,
            category: expense.category,
            paid: expense.paid,
            account: expense.account,
          })
          .select()
          .single();
        if (error) {
          console.error('Failed to add expense to Supabase:', error.message);
          return;
        }
        const newExpense: Expense = {
          id: data.id,
          payee: data.payee,
          amount: Number(data.amount),
          dueDate: data.due_date,
          frequency: data.frequency,
          category: data.category,
          paid: data.paid,
          account: data.account,
        };
        setExpenses([...expenses, newExpense]);
      } else {
        const newExpense: Expense = { ...expense, id: crypto.randomUUID() };
        setExpenses([...expenses, newExpense]);
      }
    };
    insert();
  };

  const editExpense = (expense: Expense) => {
    const updateLocal = () => setExpenses(expenses.map((e) => e.id === expense.id ? expense : e));
    const updateRemote = async () => {
      if (!supabaseEnabled) return updateLocal();
      const { error } = await supabase
        .from('expenses')
        .update({
          payee: expense.payee,
          amount: expense.amount,
          due_date: expense.dueDate,
          frequency: expense.frequency,
          category: expense.category,
          paid: expense.paid,
          account: expense.account,
        })
        .eq('id', expense.id);
      if (error) console.error('Failed to update expense in Supabase:', error.message);
      updateLocal();
    };
    updateRemote();
  };

  const requestDeleteExpense = (id: string) => {
    setExpenseIdPendingDelete(id);
    setShowDeleteExpenseConfirm(true);
  };

  const confirmDeleteExpense = async () => {
    const id = expenseIdPendingDelete;
    if (!id) return;

    setShowDeleteExpenseConfirm(false);
    setExpenseIdPendingDelete(null);

    if (supabaseEnabled) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) console.error('Failed to delete expense in Supabase:', error.message);
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(undefined);
  };

  const addAccount = (accountName: string) => {
    if (!accounts.includes(accountName)) {
      setAccounts([...accounts, accountName]);
    }
  };

  const addIncome = (income: Omit<Income, 'id'>) => {
    const insert = async () => {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from('incomes')
          .insert({
            amount: income.amount,
            frequency: income.frequency,
            from: income.from,
            due_date: income.dueDate,
            is_primary: income.isPrimary,
          })
          .select()
          .single();
        if (error) {
          console.error('Failed to add income to Supabase:', error.message);
          return;
        }
        const newIncome: Income = {
          id: data.id,
          amount: Number(data.amount),
          frequency: data.frequency,
          from: data.from,
          dueDate: data.due_date,
          isPrimary: data.is_primary,
        };
        setIncomes([...incomes, newIncome]);
      } else {
        const newIncome: Income = { ...income, id: crypto.randomUUID() };
        setIncomes([...incomes, newIncome]);
      }
    };
    insert();
  };

  const editIncome = (income: Income) => {
    const updateLocal = () => setIncomes(incomes.map((i) => i.id === income.id ? income : i));
    const updateRemote = async () => {
      if (!supabaseEnabled) return updateLocal();
      const { error } = await supabase
        .from('incomes')
        .update({
          amount: income.amount,
          frequency: income.frequency,
          from: income.from,
          due_date: income.dueDate,
          is_primary: income.isPrimary,
        })
        .eq('id', income.id);
      if (error) console.error('Failed to update income in Supabase:', error.message);
      updateLocal();
    };
    updateRemote();
  };

  const deleteIncome = (id: string) => {
    if (confirm('Are you sure you want to delete this income source?')) {
      const perform = async () => {
        if (supabaseEnabled) {
          const { error } = await supabase.from('incomes').delete().eq('id', id);
          if (error) console.error('Failed to delete income in Supabase:', error.message);
        }
        setIncomes(incomes.filter((i) => i.id !== id));
      };
      perform();
    }
  };

  const openEditIncome = (income: Income) => {
    setEditingIncome(income);
    setShowIncomeModal(true);
  };

  const closeIncomeModal = () => {
    setShowIncomeModal(false);
    setEditingIncome(undefined);
  };

  const addSavingsAccount = (account: Omit<SavingsAccount, 'id'>) => {
    const insert = async () => {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from('savings')
          .insert({
            name: account.name,
            balance: account.balance,
            account_type: account.accountType,
            interest_rate: account.interestRate,
            is_variable_rate: account.isVariableRate,
          })
          .select()
          .single();
        if (error) {
          console.error('Failed to add savings account to Supabase:', error.message);
          return;
        }
        const newAccount: SavingsAccount = {
          id: data.id,
          name: data.name,
          balance: Number(data.balance),
          accountType: data.account_type,
          interestRate: data.interest_rate === null ? null : Number(data.interest_rate),
          isVariableRate: Boolean(data.is_variable_rate),
        };
        setSavings([...savings, newAccount]);
      } else {
        const newAccount: SavingsAccount = {
          ...account,
          id: crypto.randomUUID(),
        };
        setSavings([...savings, newAccount]);
      }
    };
    insert();
  };

  const editSavingsAccount = (account: SavingsAccount) => {
    const updateLocal = () => setSavings(savings.map((s) => s.id === account.id ? account : s));
    const updateRemote = async () => {
      if (!supabaseEnabled) return updateLocal();
      const { error } = await supabase
        .from('savings')
        .update({
          name: account.name,
          balance: account.balance,
          account_type: account.accountType,
          interest_rate: account.interestRate,
          is_variable_rate: account.isVariableRate,
        })
        .eq('id', account.id);
      if (error) console.error('Failed to update savings account in Supabase:', error.message);
      updateLocal();
    };
    updateRemote();
  };

  const deleteSavingsAccount = (id: string) => {
    if (confirm('Are you sure you want to delete this savings account?')) {
      const perform = async () => {
        if (supabaseEnabled) {
          const { error } = await supabase.from('savings').delete().eq('id', id);
          if (error) console.error('Failed to delete savings account in Supabase:', error.message);
        }
        setSavings(savings.filter((s) => s.id !== id));
      };
      perform();
    }
  };

  const openEditSavings = (account: SavingsAccount) => {
    setEditingSavings(account);
    setShowSavingsModal(true);
  };

  const closeSavingsModal = () => {
    setShowSavingsModal(false);
    setEditingSavings(undefined);
  };

  const togglePaid = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
    const updated = expenses.map((e) =>
      e.id === id ? { ...e, paid: !e.paid } : e
    );
    setExpenses(updated);

    if (supabaseEnabled) {
      const { error } = await supabase
        .from('expenses')
        .update({ paid: !expense.paid })
        .eq('id', id);
      if (error) console.error('Failed to toggle paid in Supabase:', error.message);
    }
  };

  const exportToExcel = () => {
    // Prepare data for Excel export
    const exportData = expenses.map(expense => ({
      Payee: expense.payee,
      Amount: expense.amount,
      'Due Date': new Date(expense.dueDate).toLocaleDateString('en-GB'),
      Frequency: expense.frequency,
      Account: expense.account,
      Category: expense.category,
      Paid: expense.paid ? 'Yes' : 'No'
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    // Generate filename with current date
    const fileName = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fileName);
  };

  const markAllUnpaid = async () => {
    const updated = expenses.map(expense => ({ ...expense, paid: false }));
    setExpenses(updated);
    if (supabaseEnabled) {
      const { error } = await supabase
        .from('expenses')
        .update({ paid: false })
        .in('id', expenses.map(e => e.id));
      if (error) console.error('Failed to mark all unpaid in Supabase:', error.message);
    }
  };

  const markAllPaid = async () => {
    const updated = expenses.map(expense => ({ ...expense, paid: true }));
    setExpenses(updated);
    if (supabaseEnabled) {
      const { error } = await supabase
        .from('expenses')
        .update({ paid: true })
        .in('id', expenses.map(e => e.id));
      if (error) console.error('Failed to mark all paid in Supabase:', error.message);
    }
  };

  const undoNewCycle = async () => {
    if (undoExpenses) {
      setExpenses(undoExpenses);
      
      // Restore to Supabase if enabled
      if (supabaseEnabled) {
        for (const expense of undoExpenses) {
          const { error } = await supabase
            .from('expenses')
            .update({
              paid: expense.paid,
              due_date: expense.dueDate,
            })
            .eq('id', expense.id);
          if (error) console.error('Failed to undo expense in Supabase:', error.message);
        }
      }

      setUndoExpenses(null);
      setUndoTimer(0);
      if (undoIntervalId) {
        clearInterval(undoIntervalId);
        setUndoIntervalId(null);
      }
    }
  };

  const newCycle = () => {
    setShowNewCycleConfirm(true);
  };

  const confirmNewCycle = async () => {
    setShowNewCycleConfirm(false);

    // Store current state for undo
    setUndoExpenses([...expenses]);

    // Update expenses: mark as unpaid and increment due dates
    const updatedExpenses = expenses.map(expense => {
      const currentDueDate = new Date(expense.dueDate);
      let newDueDate = new Date(currentDueDate);

      // Increment based on frequency
      if (expense.frequency === 'Monthly') {
        newDueDate.setMonth(newDueDate.getMonth() + 1);
      } else if (expense.frequency === 'Weekly') {
        newDueDate.setDate(newDueDate.getDate() + 7);
      } else if (expense.frequency === 'Yearly') {
        newDueDate.setFullYear(newDueDate.getFullYear() + 1);
      }

      return {
        ...expense,
        paid: false,
        dueDate: newDueDate.toISOString().split('T')[0]
      };
    });

    setExpenses(updatedExpenses);

    // Persist to Supabase if enabled
    if (supabaseEnabled) {
      for (const expense of updatedExpenses) {
        const { error } = await supabase
          .from('expenses')
          .update({
            paid: false,
            due_date: expense.dueDate,
          })
          .eq('id', expense.id);
        if (error) console.error('Failed to update expense in new cycle:', error.message);
      }
    }

    // Start 10-second countdown
    setUndoTimer(10);
    const intervalId = window.setInterval(() => {
      setUndoTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setUndoExpenses(null);
          setUndoIntervalId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setUndoIntervalId(intervalId);
  };

  // Calculate totals
  const totalIncome = incomes.reduce((sum, income) => {
    if (income.frequency === 'Monthly') return sum + income.amount;
    if (income.frequency === 'Weekly') return sum + (income.amount * 4.33);
    if (income.frequency === 'Yearly') return sum + (income.amount / 12);
    return sum;
  }, 0);

  const totalExpenses = expenses.reduce((sum, expense) => {
    if (expense.frequency === 'Monthly') return sum + expense.amount;
    if (expense.frequency === 'Weekly') return sum + (expense.amount * 4.33);
    if (expense.frequency === 'Yearly') return sum + (expense.amount / 12);
    if (expense.frequency === 'One-time') return sum + expense.amount;
    return sum + expense.amount; // Default: treat as monthly
  }, 0);

  const totalSavings = savings.reduce((sum, account) => sum + account.balance, 0);

  // Calculate allowances total
  const totalAllowances = 
    (parseFloat(allowance1) || 0) + 
    (parseFloat(allowance2) || 0) + 
    (parseFloat(foodKidsFuel) || 0);

  // Total expenditure includes both expenses and allowances
  const totalExpenditure = totalExpenses + totalAllowances;

  // Calculate days until next payday (from primary income)
  const primaryIncome = incomes.find(income => income.isPrimary);
  const daysUntilPayday = primaryIncome 
    ? Math.ceil((new Date(primaryIncome.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate left to go out: sum of unpaid expenses due between now and next payday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextPaydayDate = primaryIncome ? new Date(primaryIncome.dueDate) : null;
  
  const unpaidExpensesDueBeforePayday = expenses
    .filter(expense => {
      if (expense.paid) return false;
      if (!nextPaydayDate) return false;
      
      const expenseDueDate = new Date(expense.dueDate);
      expenseDueDate.setHours(0, 0, 0, 0);
      // Include all unpaid expenses due on or before next payday (including overdue)
      return expenseDueDate <= nextPaydayDate;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const leftToGoOut = unpaidExpensesDueBeforePayday;

  // Calculate expenses breakdown by account
  const expensesByAccount = expenses.reduce((acc, expense) => {
    const monthlyAmount = 
      expense.frequency === 'Monthly' ? expense.amount :
      expense.frequency === 'Weekly' ? expense.amount * 4.33 :
      expense.frequency === 'Yearly' ? expense.amount / 12 :
      expense.amount;
    
    acc[expense.account] = (acc[expense.account] || 0) + monthlyAmount;
    return acc;
  }, {} as Record<string, number>);

  // Calculate expenses breakdown by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const monthlyAmount = 
      expense.frequency === 'Monthly' ? expense.amount :
      expense.frequency === 'Weekly' ? expense.amount * 4.33 :
      expense.frequency === 'Yearly' ? expense.amount / 12 :
      expense.amount;
    
    acc[expense.category] = (acc[expense.category] || 0) + monthlyAmount;
    return acc;
  }, {} as Record<string, number>);

  // Sort categories by spending amount (highest first)
  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a);

  // Find max value for chart scaling
  const maxCategorySpending = Math.max(...Object.values(expensesByCategory), 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Sorting helpers
  const compareValues = (a: Expense, b: Expense, field: typeof sortField) => {
    let av: any;
    let bv: any;
    switch (field) {
      case 'amount':
        av = a.amount; bv = b.amount; break;
      case 'dueDate':
        av = new Date(a.dueDate).getTime();
        bv = new Date(b.dueDate).getTime();
        break;
      case 'paid':
        av = a.paid ? 1 : 0; bv = b.paid ? 1 : 0; break;
      case 'payee':
        av = a.payee.toLowerCase(); bv = b.payee.toLowerCase(); break;
      case 'frequency':
        av = a.frequency; bv = b.frequency; break;
      case 'account':
        av = a.account.toLowerCase(); bv = b.account.toLowerCase(); break;
      case 'category':
        av = a.category.toLowerCase(); bv = b.category.toLowerCase(); break;
      default:
        av = a[field as keyof Expense];
        bv = b[field as keyof Expense];
    }
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  };

  // Apply date range filtering (inclusive) before sorting
  const filteredExpenses = expenses.filter((e) => {
    if (fromDate) {
      const eDate = new Date(e.dueDate);
      const fDate = new Date(fromDate);
      eDate.setHours(0,0,0,0);
      fDate.setHours(0,0,0,0);
      if (eDate < fDate) return false;
    }
    if (toDate) {
      const eDate = new Date(e.dueDate);
      const tDate = new Date(toDate);
      eDate.setHours(0,0,0,0);
      tDate.setHours(0,0,0,0);
      if (eDate > tDate) return false;
    }
    return true;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const cmp = compareValues(a, b, sortField);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <span className="sort-icon muted">↕︎</span>;
    return (
      <span className={`sort-icon ${sortDir}`}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <LogoGlyph />
            <div className="brand-text">
              <h1>Expense Manager</h1>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-theme"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☼' : '☾'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Income Card */}
          <div className={`dashboard-card income-card${dashboardCollapsed ? ' collapsed' : ''}`}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-icon">📊</span>
                Income
              </span>
              <div className="card-header-right">
                {dashboardCollapsed ? (
                  <span className="card-summary-value">{formatCurrency(totalIncome)}</span>
                ) : (
                  <button
                    className="btn-add"
                    onClick={() => setShowIncomeModal(true)}
                    aria-label="Add income"
                  >
                    +
                  </button>
                )}
                <button
                  className="btn-icon btn-collapse"
                  onClick={toggleDashboardCollapsed}
                  title={dashboardCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
                  aria-expanded={!dashboardCollapsed}
                >
                  {dashboardCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {!dashboardCollapsed && (
              <>
                {/* Individual Income Items */}
                <div className="income-list">
                  {incomes.map((income) => (
                    <div key={income.id} className="income-item">
                      <div className="income-header">
                        <div className="income-name">{income.from}</div>
                        <div className="income-actions">
                          <button
                            className="btn-icon"
                            onClick={() => openEditIncome(income)}
                            title="Edit income"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => deleteIncome(income.id)}
                            title="Delete income"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {income.isPrimary && <span className="primary-badge">⭐ Primary</span>}
                      <div className="income-amount">{formatCurrency(income.amount)}</div>
                      <div className="income-details">
                        {income.frequency} · Next: {formatDate(income.dueDate)}
                      </div>
                    </div>
                  ))}
                  {incomes.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
                      No income sources yet
                    </div>
                  )}
                </div>

                {/* Inline total income */}
                <div className="card-footer-summary income-footer">
                  <div className="summary-icon">📈</div>
                  <div className="summary-footer-text">
                    <div className="summary-label">Total Income</div>
                    <div className="summary-amount">{formatCurrency(totalIncome)}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Expenses Card */}
          <div className={`dashboard-card expenses-card${dashboardCollapsed ? ' collapsed' : ''}`}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-icon">📋</span>
                Expenditure
              </span>
              <div className="card-header-right">
                {dashboardCollapsed && (
                  <span className="card-summary-value">{formatCurrency(totalExpenditure)}</span>
                )}
                <button
                  className="btn-icon btn-collapse"
                  onClick={toggleDashboardCollapsed}
                  title={dashboardCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
                  aria-expanded={!dashboardCollapsed}
                >
                  {dashboardCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {!dashboardCollapsed && (
              <>
                {/* Combined payday + left-to-go-out panel */}
                <div className="card-inline-summary cashflow-box">
                  <div className="summary-icon">📅</div>
                  <div className="summary-footer-text">
                    <div className="summary-label">Cashflow</div>
                    <div className="summary-subtext">
                      {daysUntilPayday !== null
                        ? `You get paid in ${daysUntilPayday} day${daysUntilPayday !== 1 ? 's' : ''}`
                        : 'Payday not set'}
                      {` and have ${formatCurrency(Math.abs(leftToGoOut))} left to go out`}
                      {leftToGoOut < 0 ? ' (over)' : ''}.
                    </div>
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="expense-section-container">
                  <div 
                    className="expense-section-header"
                    onClick={() => setAllowancesExpanded(!allowancesExpanded)}
                  >
                    <span className="section-name">Allowances</span>
                    <div className="section-right">
                      <span className="section-total">{formatCurrency(totalAllowances)}</span>
                      <span className={`expand-icon ${allowancesExpanded ? 'expanded' : ''}`}>▲</span>
                    </div>
                  </div>
                  {allowancesExpanded && (
                    <div className="expense-section-content">
                      <div className="allowance-item">
                        <label>Personal Allowance 1</label>
                        <div className="currency-input">
                          <span className="currency-symbol">£</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={allowance1}
                            onChange={(e) => setAllowance1(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="allowance-item">
                        <label>Personal Allowance 2</label>
                        <div className="currency-input">
                          <span className="currency-symbol">£</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={allowance2}
                            onChange={(e) => setAllowance2(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="allowance-item">
                        <label>Food, Kids, Eating Out and Fuel</label>
                        <div className="currency-input">
                          <span className="currency-symbol">£</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={foodKidsFuel}
                            onChange={(e) => setFoodKidsFuel(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="allowance-actions">
                        <button
                          className="btn-control"
                          onClick={saveAllowances}
                          disabled={isSavingAllowances || !allowancesDirty}
                          title={supabaseEnabled ? 'Save allowances to Supabase' : 'Save allowances locally'}
                        >
                          {isSavingAllowances ? 'Saving…' : '💾 Save Allowances'}
                        </button>
                        <div className="allowance-status" aria-live="polite">
                          {supabaseEnabled && !allowancesLoaded ? (
                            <span>Loading…</span>
                          ) : allowancesSaveError ? (
                            <span className="allowance-status-error">{allowancesSaveError}</span>
                          ) : allowancesDirty ? (
                            <span className="allowance-status-unsaved">Unsaved changes</span>
                          ) : (
                            <span className="allowance-status-saved">Saved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expenses Breakdown Section */}
                <div className="expense-section-container">
                  <div 
                    className="expense-section-header"
                    onClick={() => setExpensesBreakdownExpanded(!expensesBreakdownExpanded)}
                  >
                    <span className="section-name">Expenses</span>
                    <div className="section-right">
                      <span className="section-total">{formatCurrency(totalExpenses)}</span>
                      <span className={`expand-icon ${expensesBreakdownExpanded ? 'expanded' : ''}`}>▲</span>
                    </div>
                  </div>
                  {expensesBreakdownExpanded && (
                    <div className="expense-section-content">
                      <div className="breakdown-label">Breakdown by Account</div>
                      {Object.entries(expensesByAccount).map(([account, amount]) => (
                        <div key={account} className="account-breakdown-item">
                          <span className="account-icon">💳</span>
                          <span className="account-name">{account}</span>
                          <span className="account-amount">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline total expenses box to mirror income */}
                <div className="card-footer-summary expenses-footer">
                  <div className="summary-icon">📉</div>
                  <div className="summary-footer-text">
                    <div className="summary-label">Total Expenditure</div>
                    <div className="summary-amount">{formatCurrency(totalExpenditure)}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Spending by Category */}
          <div className={`dashboard-card category-card${dashboardCollapsed ? ' collapsed' : ''}`}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-icon">🧭</span>
                Spending by Category
              </span>
              <div className="card-header-right">
                {dashboardCollapsed && (
                  <span className="card-summary-value">{formatCurrency(totalExpenses)}</span>
                )}
                <button
                  className="btn-icon btn-collapse"
                  onClick={toggleDashboardCollapsed}
                  title={dashboardCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
                  aria-expanded={!dashboardCollapsed}
                >
                  {dashboardCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {!dashboardCollapsed && (
              <div className="category-chart">
                {sortedCategories.length === 0 ? (
                  <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No expenses yet
                  </div>
                ) : (
                  sortedCategories.map(([category, amount]) => {
                    const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                    const barWidth = (amount / maxCategorySpending) * 100;
                    const categoryClass = category
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    const labelOnFill = barWidth >= 12;
                    const percentOnFill = barWidth >= 92;

                    return (
                      <div key={category} className="category-bar-item">
                        <div className="category-bar-row">
                          <div className="category-bar-container">
                            <div
                              className={`category-bar category-${categoryClass}`}
                              style={{ width: `${barWidth}%` }}
                            />

                            <div className="category-bar-overlay">
                              <span
                                className={`category-bar-overlay-label ${labelOnFill ? 'on-fill' : 'off-fill'}`}
                                title={category}
                              >
                                {category}
                              </span>
                              <span
                                className={`category-bar-overlay-percent ${percentOnFill ? 'on-fill' : 'off-fill'}`}
                              >
                                {percentage}%
                              </span>
                            </div>
                          </div>

                          <div className="category-bar-values">
                            <span className="category-bar-amount">{formatCurrency(amount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Savings Card */}
          <div className={`dashboard-card savings-card${dashboardCollapsed ? ' collapsed' : ''}`}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-icon">💰</span>
                Savings
              </span>
              <div className="card-header-right">
                {dashboardCollapsed ? (
                  <span className="card-summary-value">{formatCurrency(totalSavings)}</span>
                ) : (
                  <button
                    className="btn-add"
                    onClick={() => setShowSavingsModal(true)}
                    aria-label="Add savings account"
                  >
                    +
                  </button>
                )}
                <button
                  className="btn-icon btn-collapse"
                  onClick={toggleDashboardCollapsed}
                  title={dashboardCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
                  aria-expanded={!dashboardCollapsed}
                >
                  {dashboardCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {!dashboardCollapsed && (
              <>
                {/* Individual Savings Accounts */}
                <div className="savings-accounts-list">
                  {savings.map((account) => {
                    const monthlyInterest = account.interestRate && !account.isVariableRate
                      ? (account.balance * account.interestRate / 100) / 12
                      : 0;

                    return (
                      <div key={account.id} className="savings-account-item">
                        <div className="savings-account-header">
                          <div className="savings-account-name">{account.name}</div>
                          <div className="savings-account-actions">
                            <button
                              className="btn-icon"
                              onClick={() => openEditSavings(account)}
                              title="Edit account"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => deleteSavingsAccount(account.id)}
                              title="Delete account"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="savings-account-type">{account.accountType}</div>
                        <div className="savings-account-balance">{formatCurrency(account.balance)}</div>
                        <div className="savings-account-interest">
                          {account.isVariableRate ? (
                            <>📈 Variable</>
                          ) : (
                            <>
                              📈 {account.interestRate}% • {formatCurrency(monthlyInterest)}/mo interest payable
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {savings.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
                      No savings accounts yet
                    </div>
                  )}
                </div>

                {/* Total Savings Footer */}
                <div className="card-footer-summary savings-footer">
                  <div className="summary-icon">🐷</div>
                  <div className="summary-footer-text">
                    <div className="summary-label">Total Savings</div>
                    <div className="summary-amount">{formatCurrency(totalSavings)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* All Expenses Table */}
        <div className="expense-section">
          <div className="section-header">
            <h2 className="section-title">
              <span>📋</span>
              All Expenses
            </h2>
            <button
              className="btn-add"
              onClick={() => setShowExpenseModal(true)}
              aria-label="Add expense"
            >
              +
            </button>
          </div>

          <div className="table-controls">
            <button className="btn-control" onClick={exportToExcel}>📤 Export</button>
            <button className="btn-control" onClick={newCycle}>🔄 New Cycle</button>
            <button className="btn-control" onClick={markAllUnpaid}>☑️ Mark All Unpaid</button>
            <button className="btn-control" onClick={markAllPaid}>✅ Mark All Paid</button>
            <div className="date-range">
              <span style={{ color: 'var(--text-secondary)' }}>📅 Filter by Date Range:</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button
                className="btn-control btn-clear-date-range"
                onClick={() => { setFromDate(''); setToDate(''); }}
                title="Clear date range"
              >
                ✖️ Clear
              </button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-state">
              <p>No expenses yet. Add your first expense above!</p>
            </div>
          ) : (
            <table className="expense-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('paid')}
                    className="sortable"
                    title="Sort by Paid"
                  >
                    Paid {renderSortIcon('paid')}
                  </th>
                  <th
                    onClick={() => handleSort('payee')}
                    className="sortable"
                    title="Sort by Payee"
                  >
                    Payee {renderSortIcon('payee')}
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="sortable"
                    title="Sort by Amount"
                  >
                    Amount {renderSortIcon('amount')}
                  </th>
                  <th
                    onClick={() => handleSort('dueDate')}
                    className="sortable"
                    title="Sort by Next Due Date"
                  >
                    Next Due Date {renderSortIcon('dueDate')}
                  </th>
                  <th
                    onClick={() => handleSort('frequency')}
                    className="sortable"
                    title="Sort by Frequency"
                  >
                    Frequency {renderSortIcon('frequency')}
                  </th>
                  <th
                    onClick={() => handleSort('account')}
                    className="sortable"
                    title="Sort by Account"
                  >
                    Account {renderSortIcon('account')}
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="sortable"
                    title="Sort by Category"
                  >
                    Category {renderSortIcon('category')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td data-label="Paid">
                      <input
                        type="checkbox"
                        className="paid-checkbox"
                        checked={expense.paid}
                        onChange={() => togglePaid(expense.id)}
                      />
                    </td>
                    <td data-label="Payee">{expense.payee}</td>
                    <td data-label="Amount" style={{ fontWeight: 700, color: 'var(--text)' }}>
                      <div className="expense-amount-cell">
                        <span className="expense-amount-value">{formatCurrency(expense.amount)}</span>
                        <div className="expense-mobile-actions mobile-only">
                          <button
                            className="btn-edit"
                            onClick={() => openEditExpense(expense)}
                            title="Edit"
                            aria-label="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => requestDeleteExpense(expense.id)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </td>
                    <td data-label="Next Due" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(expense.dueDate)}
                    </td>
                    <td data-label="Frequency" style={{ color: 'var(--text-secondary)' }}>{expense.frequency}</td>
                    <td data-label="Account">
                      <span className={`account-badge ${expense.account.toLowerCase().replace(' ', '')}`}>
                        {expense.account}
                      </span>
                    </td>
                    <td data-label="Category">
                      <span
                        className={`category-badge category-${expense.category
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '')}`}
                      >
                        {expense.category}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <button className="btn-edit" onClick={() => openEditExpense(expense)}>✏️</button>
                      <button className="btn-delete" onClick={() => requestDeleteExpense(expense.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={closeExpenseModal}
        onAdd={addExpense}
        accounts={accounts}
        onAddAccount={addAccount}
        editingExpense={editingExpense}
        onEdit={editExpense}
      />
      <AddIncomeModal
        isOpen={showIncomeModal}
        onClose={closeIncomeModal}
        onAdd={addIncome}
        editingIncome={editingIncome}
        onEdit={editIncome}
        existingIncomes={incomes}
      />
      <AddSavingsModal
        isOpen={showSavingsModal}
        onClose={closeSavingsModal}
        onAdd={addSavingsAccount}
        editingSavings={editingSavings}
        onEdit={editSavingsAccount}
      />

      {/* Undo notification */}
      {undoTimer > 0 && undoExpenses && (
        <div className="undo-notification">
          <div className="undo-content">
            <span>New cycle applied! Undo in {undoTimer}s</span>
            <button className="btn-undo" onClick={undoNewCycle}>
              ↶ Undo
            </button>
          </div>
        </div>
      )}

      {/* New Cycle Confirmation Modal */}
      {showNewCycleConfirm && (
        <div className="modal-overlay" onClick={() => setShowNewCycleConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🔄</div>
            <h2 className="confirm-title">Start New Cycle?</h2>
            <p className="confirm-message">
              This will mark all expenses as <strong>unpaid</strong> and increment their due dates based on frequency.
            </p>
            <div className="confirm-warning">
              <span className="warning-icon">⚠️</span>
              <span>You'll have 10 seconds to undo this action</span>
            </div>
            <div className="confirm-actions">
              <button 
                className="btn-confirm-cancel" 
                onClick={() => setShowNewCycleConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-proceed" 
                onClick={confirmNewCycle}
              >
                Let's Go! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {showDeleteExpenseConfirm && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDeleteExpenseConfirm(false);
            setExpenseIdPendingDelete(null);
          }}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h2 className="confirm-title">Delete Expense?</h2>
            <p className="confirm-message">This will permanently delete the expense.</p>
            <div className="confirm-warning">
              <span className="warning-icon">⚠️</span>
              <span>This action can't be undone</span>
            </div>
            <div className="confirm-actions">
              <button
                className="btn-confirm-cancel"
                onClick={() => {
                  setShowDeleteExpenseConfirm(false);
                  setExpenseIdPendingDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="btn-confirm-proceed" onClick={confirmDeleteExpense}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
