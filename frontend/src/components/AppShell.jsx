import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, User, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './AppShell.css';

export default function AppShell() {
  const [open, setOpen] = useState(true);

  return (
    <div className="app-shell">
      <nav className={`sidebar${open ? '' : ' sidebar--collapsed'}`}>
        <div className="sidebar-header">
          {open && <span className="sidebar-brand">Claude Scholars</span>}
          <button
            className="sidebar-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className="nav-link" aria-label="Dashboard" data-label="Dashboard">
              <LayoutDashboard size={20} className="nav-icon" aria-hidden="true" />
              <span className="nav-text">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className="nav-link" aria-label="Profile" data-label="Profile">
              <User size={20} className="nav-icon" aria-hidden="true" />
              <span className="nav-text">Profile</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className="nav-link" aria-label="Settings" data-label="Settings">
              <Settings size={20} className="nav-icon" aria-hidden="true" />
              <span className="nav-text">Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
