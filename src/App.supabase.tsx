import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseSummary } from './components/ExpenseSummary';
import { Auth } from './components/Auth';
import { useAuth } from './hooks/useAuth';
import { useExpenses } from './hooks/useExpenses';
import './App.css';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    expenses,
    loading: expensesLoading,
    error,
    addExpense,
    deleteExpense,
    togglePaid,
  } = useExpenses();

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💰 Monthly Expense Manager</h1>
            <p>Track and manage your monthly expenses</p>
          </div>
          <button onClick={() => signOut()} className="btn-signout">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {error && <div className="error-banner">{error}</div>}
          
          <ExpenseForm onAddExpense={addExpense} />
          
          {expensesLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading expenses...</p>
            </div>
          ) : (
            <>
              <ExpenseSummary expenses={expenses} />
              <ExpenseList
                expenses={expenses}
                onDeleteExpense={deleteExpense}
                onTogglePaid={togglePaid}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
