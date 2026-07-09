import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1>404 — not found</h1>
      <p>
        That page doesn’t exist. Head back to <Link to="/">home</Link> or your{' '}
        <Link to="/projects">projects</Link>.
      </p>
    </div>
  );
}
