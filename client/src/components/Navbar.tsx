import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="bg-stone-900 border-b border-stone-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-torch-400">
            <span className="text-2xl">🔥</span>
            <span className="hidden sm:block">Survivor Fantasy</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/">Home</NavLink>
            {user && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && <NavLink to="/profile">Profile</NavLink>}
            {user?.isAdmin && (
              <>
                <NavLink to="/admin/setup">Setup</NavLink>
                <NavLink to="/admin/episodes">Episodes</NavLink>
                <NavLink to="/admin/results">Results</NavLink>
                <NavLink to="/admin/users">Users</NavLink>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-stone-400">
                  {user.username}
                  {user.isAdmin && (
                    <span className="ml-1 text-xs bg-torch-700 text-torch-200 px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-stone-300 hover:text-stone-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-torch-600 hover:bg-torch-500 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  Join
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-stone-400 hover:text-stone-100 p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1 border-t border-stone-800 pt-2">
            <MobileLink to="/" onClick={() => setMenuOpen(false)}>Home</MobileLink>
            {user && <MobileLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</MobileLink>}
            {user && <MobileLink to="/profile" onClick={() => setMenuOpen(false)}>Profile</MobileLink>}
            {user?.isAdmin && (
              <>
                <MobileLink to="/admin/setup" onClick={() => setMenuOpen(false)}>Setup</MobileLink>
                <MobileLink to="/admin/episodes" onClick={() => setMenuOpen(false)}>Episodes</MobileLink>
                <MobileLink to="/admin/results" onClick={() => setMenuOpen(false)}>Results</MobileLink>
                <MobileLink to="/admin/users" onClick={() => setMenuOpen(false)}>Users</MobileLink>
              </>
            )}
            {user ? (
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="block w-full text-left px-3 py-2 text-stone-400 hover:text-stone-100 text-sm"
              >
                Logout ({user.username})
              </button>
            ) : (
              <div className="flex gap-2 px-3 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-stone-300 hover:text-stone-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm bg-torch-600 hover:bg-torch-500 text-white px-3 py-1 rounded"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-md transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-md"
    >
      {children}
    </Link>
  );
}
