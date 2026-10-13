import React, { useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { Activity, BarChart3, Boxes, Database, FlaskConical, LayoutDashboard, LogOut, Menu, Search, Settings2 } from "lucide-react";
import { Dashboard } from "../pages/Dashboard";
import { Projects, ProjectDetail } from "../pages/Projects";
import { Datasets } from "../pages/Datasets";
import { Experiments } from "../pages/Experiments";
import { Models } from "../pages/Models";
import { Runs } from "../pages/Runs";
import { RunDetail } from "../pages/RunDetail";
import { Analytics } from "../pages/Analytics";
import { SearchPage } from "../pages/Search";
import { ThemeToggle } from "../components/ThemeToggle";

const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/projects", "Projects", Boxes],
  ["/datasets", "Datasets", Database],
  ["/experiments", "Experiments", FlaskConical],
  ["/models", "Models", Settings2],
  ["/runs", "Training Runs", Activity],
  ["/analytics", "Analytics", BarChart3],
];
export function Layout({ user, logout, theme, onToggleTheme }) {
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState("");
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="sidebar-brand" to="/" onClick={() => setMobile(false)}>
          <span className="brand-icon">L</span>
          <span className="brand-wordmark">LLM <span>MANAGEMENT</span><small>SYSTEM / RESEARCH WORKSPACE</small></span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={logout}>
            <LogOut size={18} /> Log out
          </button>
          <small>LLM MANAGEMENT SYSTEM · v1.0</small>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="top-title">
            <strong>LLM MANAGEMENT SYSTEM</strong>
            <span>Research workspace</span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim())
                navigate(`/search?q=${encodeURIComponent(search.trim())}`);
            }}
          >
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, models, runs…"
              aria-label="Global search"
            />
            <kbd>↵</kbd>
          </form>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <div className="user-chip">
            <span className="avatar">{user?.name?.[0] || "U"}</span>
            <div>
              <strong>{user?.name || "Loading…"}</strong>
              <small>{user?.role}</small>
            </div>
          </div>
        </header>
        <main>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="datasets" element={<Datasets />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="models" element={<Models />} />
            <Route path="runs" element={<Runs />} />
            <Route path="runs/:id" element={<RunDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      {mobile && (
        <div className="mobile-shade" onClick={() => setMobile(false)} />
      )}
    </div>
  );
}

