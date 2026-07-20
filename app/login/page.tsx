'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api';
import { storeAdminSession } from '@/lib/admin-auth';
import { getRequiredAdminImageUrl } from '@/lib/assets';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = await adminLogin(email.trim(), password);
      if (!payload?.token || !payload?.user) {
        throw new Error('Login failed: unexpected response from server');
      }
      storeAdminSession(payload.token, payload.user);
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-main v1">
      <div className="auth-wrapper">
        <div className="auth-form">
          <div className="card my-5">
            <div className="card-body">
              <div className="text-center">
                <img
                  src={getRequiredAdminImageUrl('/assets/images/authentication/img-auth-login.png')}
                  alt="images"
                  className="img-fluid mb-3"
                />
                <h4 className="f-w-500 mb-1">Login with your email</h4>
              </div>
              <form onSubmit={onSubmit}>
                <div className="form-group mb-3">
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Email Address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group mb-3">
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="d-flex mt-1 justify-content-between align-items-center">
                  <div className="form-check">
                    <input className="form-check-input input-primary" type="checkbox" id="remember" defaultChecked />
                    <label className="form-check-label text-muted" htmlFor="remember">
                      Remember me?
                    </label>
                  </div>
                  <a href="#!">
                    <h6 className="f-w-400 mb-0">Forgot Password?</h6>
                  </a>
                </div>

                {error ? (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="d-grid mt-4">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
