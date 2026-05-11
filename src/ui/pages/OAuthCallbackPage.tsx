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

    handleCallback(code)
      .then(() => navigate('/dashboard'))
      .catch(() => navigate('/?error=auth_failed'));
  }, []);

  return (
    <div className="page-loading">
      <div className="spinner" />
    </div>
  );
}
