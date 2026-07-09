import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function HomePage() {
  const { user } = useAuth();
  return (
    <>
      <h1>Welcome back, {user?.name}</h1>
      <p>
        Head to <Link to="/projects">your projects</Link> to track work. The Kanban board arrives in
        sprint 04.
      </p>
    </>
  );
}
