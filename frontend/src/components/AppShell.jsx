import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth.js';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      navigate('/');

      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  const navItem =
    'flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition';

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-white/10">
        <h1 className="text-lg font-semibold">Claude Scholars</h1>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/5"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={`
          bg-black/30 backdrop-blur-xl border-r border-white/10
          md:w-64 md:flex md:flex-col
          ${mobileOpen ? 'flex flex-col w-full' : 'hidden md:flex'}
        `}
      >
        <div className="hidden md:block px-6 py-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">Claude Scholars</h2>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'bg-white/10 text-white' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'bg-white/10 text-white' : ''}`
            }
          >
            <User size={18} />
            Profile
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'bg-white/10 text-white' : ''}`
            }
          >
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
