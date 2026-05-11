import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUseCase } from '../app/container';
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
            We've sent an activation link to <strong>{form.email}</strong>. Click it to enable
            your account, then sign in.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 24 }}
            onClick={() => navigate('/')}>
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

        {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-field">
              <label className="form-label">First name</label>
              <input name="firstName" required className="form-input"
                value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">Last name</label>
              <input name="lastName" required className="form-input"
                value={form.lastName} onChange={handleChange} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input name="email" type="email" required className="form-input"
              value={form.email} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <input name="password" type="password" required minLength={6} className="form-input"
              value={form.password} onChange={handleChange} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
