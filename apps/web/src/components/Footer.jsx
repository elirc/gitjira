import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function Footer() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api('/health')
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <footer className="footer">
      {health && <span>api v{health.version} · up {health.uptimeSeconds}s</span>}
      {error && <span>api unreachable</span>}
      {!health && !error && <span>checking api…</span>}
    </footer>
  );
}
