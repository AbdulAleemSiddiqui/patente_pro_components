import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import en from '../translations/en.json';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const { session, role, loading, error, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!loading && (session || role)) {
      navigate(from, { replace: true });
    }
  }, [loading, session, role, from, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError(en.loginValidation);
      return;
    }

    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setFormError(err?.message || en.loginError);
    }
  };

  const handleDemo = () => {
    useAuthStore.setState({ role: 'admin', loading: false });
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell p-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-brand">{en.loginBrand}</div>
          <div className="mt-1 text-sm text-muted">{en.loginSubtitle}</div>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted">{en.authLoading}</div>
        ) : isSupabaseConfigured ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-ink">
              {en.loginEmailLabel}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-[#f9fafb] px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder={en.loginEmailPlaceholder}
                required
              />
            </label>

            <label className="block text-sm font-medium text-ink">
              {en.loginPasswordLabel}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-[#f9fafb] px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder={en.loginPasswordPlaceholder}
                required
              />
            </label>

            {formError || error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError || error?.message || error}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-mid"
            >
              {en.loginButton}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">
              {en.loginDemoNotice}
            </p>
            <button
              type="button"
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-mid"
              onClick={handleDemo}
            >
              {en.loginDemoButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
