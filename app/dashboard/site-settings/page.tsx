'use client';

import { useEffect, useState } from 'react';
import { adminGet } from '@/lib/api';

type AdminUser = {
  id: number;
  name: string;
  email: string;
};

export default function SiteSettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('hakidd_admin_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    adminGet('/admin-api/me', token)
      .then((payload: AdminUser) => setUser(payload))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'));
  }, []);

  return (
    <div className="pc-content">
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-12">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/dashboard">Home</a>
                </li>
                <li className="breadcrumb-item" aria-current="page">
                  Site Settings
                </li>
              </ul>
            </div>
            <div className="col-md-12">
              <div className="page-header-title">
                <h2 className="mb-0">Site Settings</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h5>Administrator Profile</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input className="form-control" value={user?.name ?? ''} readOnly />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input className="form-control" value={user?.email ?? ''} readOnly />
            </div>
          </div>
          <p className="text-muted mt-3 mb-0">
            Profile update actions are not wired yet in the Node admin panel.
          </p>
        </div>
      </div>
    </div>
  );
}
