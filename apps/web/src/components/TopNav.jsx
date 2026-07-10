import { Link } from 'react-router-dom';
import { Button } from '@gitjira/ui';
import { useAuth } from '../auth/AuthContext.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

export function TopNav() {
  const { user, logout } = useAuth();

  return (
    <nav className="top-nav">
      <Link to="/" className="logo" style={{ color: 'white', textDecoration: 'none' }}>
        GitJira
      </Link>
      <span className="nav-user">
        <ThemeToggle />
        {user && (
          <>
            <NotificationBell />
            {user.name}
            {/* Migrated to the design-system Button — one look, everywhere. */}
            <Button size="sm" onClick={logout}>
              Log out
            </Button>
          </>
        )}
      </span>
    </nav>
  );
}
