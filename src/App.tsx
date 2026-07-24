import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAuth } from "./lib/auth-context";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <span className="wordmark small">Salon</span>
        <button className="ghost small" onClick={signOut}>
          Sign out
        </button>
      </header>

      <main className="wrap">{children}</main>

      <nav className="tabbar">
        <NavLink to="/" end>Today</NavLink>
        <NavLink to="/sale">New sale</NavLink>
        {user?.role === "owner" && <NavLink to="/reports">Reports</NavLink>}
      </nav>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sale" element={<NewSale />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
