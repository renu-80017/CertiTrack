import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout({ admin = false }) {
  const { profile, logout } = useAuth();

  const links = admin
    ? [
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/certificates', 'Certificates'],
        ['/admin/renewals', 'Renewals'],
        ['/admin/panel', 'Admin Panel ⭐'],
      ]
    : [
        ['/dashboard', 'Dashboard'],
        ['/certificates', 'Certificates'],
        ['/renewals', 'Renewals'],
      ];

  return (
    <div className="layout">
      <aside className="sidebar glass-card">
        <h2>CertiTrack</h2>
        <small>{admin ? 'Admin Workspace' : 'User Workspace'}</small>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active-link' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar glass-card">
          <div>
            <h3>Welcome, {profile?.name || 'User'}</h3>
            <p>{profile?.email}</p>
          </div>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
