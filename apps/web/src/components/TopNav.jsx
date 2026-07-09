import { Link } from 'react-router-dom';

export function TopNav() {
  return (
    <nav className="top-nav">
      <Link to="/" className="logo" style={{ color: 'white', textDecoration: 'none' }}>
        GitJira
      </Link>
    </nav>
  );
}
