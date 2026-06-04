import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { handleCallback } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get('code');
    if (!code) {
      navigate('/');
      return;
    }

    const returnTo = sessionStorage.getItem('auth_return_to') ?? '/';
    sessionStorage.removeItem('auth_return_to');

    handleCallback(code)
      .then(() => navigate(returnTo, { replace: true }))
      .catch(() => navigate('/?error=auth_failed'));
  }, [params, handleCallback, navigate]);

  return (
    <div className="page-loading">
      <div className="spinner" />
    </div>
  );
}
