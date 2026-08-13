import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import {
  BadgeDollarSign,
  BarChart3,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Moon,
  PlusCircle,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "./lib/auth-context";
import OfflineStatus from "./components/OfflineStatus";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";
import Catalogue from "./pages/Catalogue";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";

const pageTitles: Record<string, { title: string; eyebrow: string }> = {
  "/": { title: "Good day", eyebrow: "Business overview" },
  "/sale": { title: "Record a sale", eyebrow: "Point of sale" },
  "/shop": { title: "Products & services", eyebrow: "Catalogue" },
  "/reports": { title: "Business reports", eyebrow: "Performance" },
  "/staff": { title: "Team management", eyebrow: "People" },
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img src="/nailflow-mark.svg" alt="" />
    </span>
  );
}

function Shell({ children, theme, toggleTheme }: { children: React.ReactNode; theme: "light" | "dark"; toggleTheme: () => void }) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const heading = pageTitles[pathname] ?? pageTitles["/"];

  const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/sale", label: "New sale", icon: PlusCircle },
    { to: "/shop", label: "Catalogue", icon: MenuSquare },
    ...(user?.role === "owner"
      ? [
          { to: "/reports", label: "Reports", icon: BarChart3 },
          { to: "/staff", label: "Staff", icon: Users },
        ]
      : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <div>
            <span className="brand-name">NailFlow</span>
            <span className="brand-caption">Salon management</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-profile">
          <span className="avatar">{user?.name?.charAt(0).toUpperCase() || "N"}</span>
          <div className="profile-copy">
            <strong>{user?.name}</strong>
            <span>{user?.role === "owner" ? "Business owner" : "Staff member"}</span>
          </div>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <section className="app-content">
        <OfflineStatus />
        <header className="mobile-topbar">
          <div className="brand compact"><BrandMark /><span className="brand-name">NailFlow</span></div>
          <div className="topbar-actions">
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </header>

        <header className="page-header">
          <div>
            <p className="page-kicker">{heading.eyebrow}</p>
            <h1>{heading.title}{pathname === "/" && user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          </div>
          <div className="header-tools">
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {pathname !== "/sale" && (
              <NavLink className="header-action" to="/sale">
                <BadgeDollarSign size={18} /> Record sale
              </NavLink>
            )}
          </div>
        </header>

        <main className="page-body">{children}</main>
      </section>

      <nav className="tabbar" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label}>
            <Icon size={20} />
            <span>{label === "Overview" ? "Home" : label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("nailflow-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("nailflow-theme", theme);
  }, [theme]);

  if (loading) {
    return <div className="auth-screen"><div className="loading-orb" /><p>Preparing your workspace…</p></div>;
  }

  if (!user) {
    return showRegister
      ? <Register onBack={() => setShowRegister(false)} />
      : <Login onRegister={() => setShowRegister(true)} />;
  }

  return (
    <Shell theme={theme} toggleTheme={() => setTheme((value) => value === "light" ? "dark" : "light")}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sale" element={<NewSale />} />
        <Route path="/shop" element={<Catalogue />} />
        {user.role === "owner" && <Route path="/reports" element={<Reports />} />}
        {user.role === "owner" && <Route path="/staff" element={<Staff />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
