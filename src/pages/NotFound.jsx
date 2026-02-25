import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1>404</h1>
        <p>Page not found.</p>
        <Link to="/dashboard" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
