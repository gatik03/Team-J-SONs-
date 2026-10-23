import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { navByRole } from '../routes/nav';
import { RoleBadge } from '../components/ui/RoleBadge';
import { MockBadge } from '../components/ui/MockBadge';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('ll-theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.dataset.theme = 'dark';
      try {
        localStorage.setItem('ll-theme', 'dark');
      } catch {
        // ignore
      }
    } else {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.setItem('ll-theme', 'light');
      } catch {
        // ignore
      }
    }
  }, [isDark]);

  if (!user) return null;

  const navItems = navByRole[user.role] ?? [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-sans">
      {/* Skip Link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:shadow-pop"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 xl:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <span className="text-primary font-semibold text-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
              Kestrel Bank · LoanLens
            </span>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 h-16">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 h-16 inline-flex items-center text-sm font-medium border-b-2 transition-colors focus-ring ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-fg'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className="p-2 rounded-md hover:bg-surface-2 text-muted hover:text-fg transition-colors focus-ring"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Details */}
            <div className="hidden sm:flex items-center gap-2">
              <RoleBadge role={user.role} />
              <span className="text-sm font-medium text-fg truncate max-w-[140px]">
                {user.displayName}
              </span>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-surface-2 text-muted hover:text-danger transition-colors focus-ring"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 rounded-md hover:bg-surface-2 text-muted hover:text-fg transition-colors focus-ring"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-2 shadow-pop"
          >
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border">
              <RoleBadge role={user.role} />
              <span className="text-sm font-medium">{user.displayName}</span>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm font-medium transition-colors focus-ring ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-fg hover:bg-surface-2'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main id="main" className="mx-auto max-w-[1200px] w-full px-4 md:px-6 xl:px-8 py-6 flex-1">
        <Outlet />
      </main>

      {/* Mock Badge */}
      <MockBadge />
    </div>
  );
}
