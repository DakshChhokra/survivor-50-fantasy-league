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
          <Link to="/" className="font-bold text-lg text-torch-400">
            Survivor Fantasy
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {user?.isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-md"
              >
                Admin
              </Link>
            )}
            {user ? (
              <>
                {!user.isAdmin && (
                  <Link
                    to={`/profile/${encodeURIComponent(user.username)}`}
                    className="text-sm text-stone-200 hover:text-white"
                  >
                    {user.username}
                  </Link>
                )}
                <button type="button" onClick={handleLogout} className="btn-danger">
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm bg-torch-600 hover:bg-torch-500 text-white px-3 py-1.5 rounded-md"
              >
                Log in
              </Link>
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
            {user?.isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-stone-400"
              >
                Admin
              </Link>
            )}
            {user ? (
              <>
                {!user.isAdmin && (
                  <Link
                    to={`/profile/${encodeURIComponent(user.username)}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-stone-200"
                  >
                    {user.username}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn-danger mx-3"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-torch-400"
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
