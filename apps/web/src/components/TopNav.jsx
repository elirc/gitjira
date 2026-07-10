import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { NotificationBell } from './NotificationBell.jsx';

export function TopNav() {
  const { user, logout } = useAuth();

  return (
    <nav className="top-nav">
      <Link to="/" className="logo" style={{ color: 'white', textDecoration: 'none' }}>
        GitJira
      </Link>
      {user && (
        <span className="nav-user">
          <NotificationBell />
          {user.name}
          <button className="link-button" onClick={logout}>
            Log out
          </button>
        </span>
      )}
    </nav>
  );
}
