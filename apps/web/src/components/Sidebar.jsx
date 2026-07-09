import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/login', label: 'Log in' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
