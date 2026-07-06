import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth.js';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();

  const { currentUser, logout } = useAuth();
  const [username, setUsername] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUsername() {
      if (!currentUser) {
        return;
      }

      try {
        const token = await currentUser.getIdToken();

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await res.json();

        if (!active) {
          return;
        }

        setUsername(data.profile?.username ?? 'User');
      } catch (error) {
        console.error('Failed to load username:', error);
        setUsername('User');
      }
    }

    loadUsername();

    return () => {
      active = false;
    };
  }, [currentUser]);

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
          aria-label="Toggle menu"
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
            to="/documents"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'bg-white/10 text-white' : ''}`
            }
          >
            <FileText size={18} />
            Documents
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
          <div className="flex items-center gap-3">
            <div
              className="
        flex-1
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
        text-sm
        font-medium
        text-white
        truncate
      "
            >
              {username}
            </div>

            <button
              onClick={handleLogout}
              className="
        flex
        items-center
        justify-center
        rounded-xl
        bg-red-500/15
        border
        border-red-500/30
        px-4
        py-3
        text-red-400
        hover:bg-red-500/25
        transition
      "
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
