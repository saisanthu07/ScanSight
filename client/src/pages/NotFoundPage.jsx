import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      textAlign: 'center',
      padding: 24,
    }}>
      <div style={{ color: 'var(--cyan)', marginBottom: 24, animation: 'float 4s ease-in-out infinite' }}>
        <AlertTriangle size={64} />
      </div>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, margin: 0, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 32 }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn btn-primary btn-lg">
        <Home size={18} /> Back to Dashboard
      </Link>
    </div>
  );
}
