import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUseCase, env } from '../app/container';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerUseCase.execute(form);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className="eyebrow-rule">Almost there</div>
          <h1 className={styles.title}>Check your inbox.</h1>
          <p style={{ color: 'var(--ink-700)', fontSize: 'var(--text-md)', lineHeight: 1.6 }}>
            We've sent an activation link to <strong>{form.email}</strong>. Click it to enable your
            account, then sign in.
          </p>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 24 }}
            onClick={() => navigate('/')}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className="eyebrow-rule">Create account</div>
        <h1 className={styles.title}>Join Reserva.</h1>

        {error && (
          <div className="error-box" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-field">
              <label className="form-label">First name</label>
              <input
                name="firstName"
                required
                className="form-input"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Last name</label>
              <input
                name="lastName"
                required
                className="form-input"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              name="email"
              type="email"
              required
              className="form-input"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="form-input"
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <a href={`${env.authBaseUrl}/login`} style={{ color: 'var(--primary)' }}>
            Sign in
          </a>
        </p>

        <div className={styles.divider}>or</div>

        <a
          href={`${env.authBaseUrl}/oauth2/authorization/google`}
          className={styles.btnGoogle}
          title="Sign up with Google"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
