'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminDelete, adminGet, adminPost, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { currencyLabel, CustomerDetailResponse, CustomerFormState, CustomerRow, customerFormFromRow, statusLabel } from './shared';

function parseCustomerId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return Number(value[0] ?? '');
  }

  return Number(value ?? '');
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const customerId = parseCustomerId(params?.id as string | string[] | undefined);

  const [user, setUser] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingApproval, setTogglingApproval] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!Number.isFinite(customerId) || customerId <= 0) {
      setError('Invalid customer id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/web-users/${customerId}`, token)
      .then((payload) => {
        const response = payload as CustomerDetailResponse;
        setUser(response.user);
        setForm(customerFormFromRow(response.user));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load customer profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customerId, router]);

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !form) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = (await adminPut(`/admin-api/web-users/${customerId}`, token, form)) as {
        message?: string;
        user?: CustomerRow;
      };
      if (response.user) {
        setUser(response.user);
        setForm(customerFormFromRow(response.user));
      } else if (user) {
        setForm((current) => (current ? { ...current, password: '' } : current));
      }
      setMessage(response.message ?? 'User updated successfully');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update customer.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleApproval() {
    const token = ensureAdminToken(router);
    if (!token || !user) {
      return;
    }

    setTogglingApproval(true);
    setError('');
    setMessage('');

    try {
      const response = (await adminPost(`/admin-api/web-users/${customerId}/approve`, token, {})) as {
        message?: string;
        status?: number;
      };
      const nextStatus = typeof response.status === 'number' ? response.status : user.status === 1 ? 0 : 1;
      const updatedUser = {
        ...user,
        status: nextStatus,
      };
      setUser(updatedUser);
      setForm(customerFormFromRow(updatedUser));
      setMessage(response.message ?? 'Customer status updated successfully');
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update approval status.');
    } finally {
      setTogglingApproval(false);
    }
  }

  async function deleteCustomer() {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await adminDelete(`/admin-api/web-users/${customerId}`, token);
      router.push('/dashboard/web-users');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Customer Profile"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Customer', href: '/dashboard/web-users' },
          { label: 'Customer Profile' },
        ]}
      />

      <AlertStack error={error} message={message} />

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">Loading customer profile...</div>
        </div>
      ) : !user || !form ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">Customer profile could not be loaded.</div>
        </div>
      ) : (
        <div className="row">
          <div className="col-sm-12">
            <div className="card bg-primary">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 me-3">
                    <h3 className="text-white">Customer Verification</h3>
                    <p className="text-white text-opacity-75 mb-0">Only verified customer can login into the system.</p>
                  </div>
                  <div className="flex-shrink-0">
                    <img
                      src="/assets/images/application/img-accout-alert.png"
                      alt="Customer verification"
                      className="img-fluid wid-80"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-lg-5 col-xxl-3">
                <div className="card overflow-hidden">
                  <div className="card-body position-relative">
                    <div className="text-center mt-3">
                      <div className="chat-avtar d-inline-flex mx-auto">
                        <img
                          className="rounded-circle img-fluid wid-90 img-thumbnail"
                          src="/assets/images/user/avatar-2.jpg"
                          alt="Customer"
                        />
                        <i className={`chat-badge ${user.status === 1 ? 'bg-success' : 'bg-danger'} me-2 mb-2`} />
                      </div>
                      <h5 className="mb-0">{user.owner_name}</h5>
                    </div>
                  </div>
                  <div
                    className="nav flex-column nav-pills list-group list-group-flush account-pills mb-0"
                    role="tablist"
                    aria-orientation="vertical"
                  >
                    <span className="nav-link list-group-item list-group-item-action active">
                      <span className="f-w-500">
                        <i className="ph-duotone ph-user-circle m-r-10" />
                        Profile Overview
                      </span>
                    </span>
                  </div>
                </div>

                <TableCard header={<h5 className="mb-0">Personal information</h5>}>
                  <div className="d-inline-flex align-items-center justify-content-between w-100 mb-3">
                    <p className="mb-0 text-muted me-1">Email</p>
                    <p className="mb-0">{user.email}</p>
                  </div>
                  <div className="d-inline-flex align-items-center justify-content-between w-100 mb-3">
                    <p className="mb-0 text-muted me-1">Customer Code</p>
                    <p className="mb-0">{user.customer_code || 'Null'}</p>
                  </div>
                  <div className="d-inline-flex align-items-center justify-content-between w-100 mb-3">
                    <p className="mb-0 text-muted me-1">Status</p>
                    <p className="mb-0">{statusLabel(user.status)}</p>
                  </div>
                  <div className="d-inline-flex align-items-center justify-content-between w-100">
                    <p className="mb-0 text-muted me-1">Currency</p>
                    <p className="mb-0">{currencyLabel(user.cflag)}</p>
                  </div>
                </TableCard>
              </div>

              <div className="col-lg-7 col-xxl-9">
                <TableCard header={<h5 className="mb-0">Owner Details</h5>}>
                  <form onSubmit={saveCustomer}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label text-muted">Owner Name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={form.owner_name}
                          onChange={(event) => setForm((current) => (current ? { ...current, owner_name: event.target.value } : current))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={form.email}
                          onChange={(event) => setForm((current) => (current ? { ...current, email: event.target.value } : current))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">
                          Password <small className="text-muted">(leave blank to keep current)</small>
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          value={form.password}
                          onChange={(event) => setForm((current) => (current ? { ...current, password: event.target.value } : current))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">Customer Code</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.customer_code}
                          onChange={(event) =>
                            setForm((current) => (current ? { ...current, customer_code: event.target.value } : current))
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted">Status</label>
                        <select
                          className="form-select"
                          value={form.status}
                          onChange={(event) =>
                            setForm((current) => (current ? { ...current, status: event.target.value === '0' ? '0' : '1' } : current))
                          }
                        >
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted">Currency</label>
                        <select
                          className="form-select"
                          value={form.cflag}
                          onChange={(event) =>
                            setForm((current) =>
                              current
                                ? {
                                    ...current,
                                    cflag:
                                      event.target.value === 'us' || event.target.value === 'ca' ? event.target.value : '',
                                  }
                                : current,
                            )
                          }
                        >
                          <option value="">-- Select --</option>
                          <option value="us">US</option>
                          <option value="ca">CA</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-muted">Verified</label>
                        <select
                          className="form-select"
                          value={form.flag}
                          onChange={(event) =>
                            setForm((current) => (current ? { ...current, flag: event.target.value === '0' ? '0' : '1' } : current))
                          }
                        >
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </div>
                      <div className="col-12 text-end mt-2">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                </TableCard>

                <div className="btn-page d-flex justify-content-between align-items-center">
                  <div>
                    <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void deleteCustomer()}>
                      {deleting ? 'Deleting...' : 'Delete User'}
                    </button>
                  </div>
                  <div className="d-flex gap-2">
                    <Link className="btn btn-outline-secondary" href="/dashboard/web-users">
                      Cancel
                    </Link>
                    <button type="button" className="btn btn-primary" disabled={togglingApproval} onClick={() => void toggleApproval()}>
                      {togglingApproval
                        ? 'Updating...'
                        : user.status === 0
                          ? 'Approve Profile'
                          : 'Disapprove Profile'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
