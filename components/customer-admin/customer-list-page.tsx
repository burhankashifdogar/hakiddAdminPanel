'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet, adminPost } from '@/lib/api';
import { getStoredAdminUser, hasAdminPermission } from '@/lib/admin-auth';
import { AlertStack, PageHeader, Pagination, StatusIcon, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  customerCodeLabel,
  CustomerFormState,
  CustomerListResponse,
  CustomerRow,
  CustomerStatusFilter,
  DEFAULT_CUSTOMER_FORM,
  normalizeStatusFilter,
  statusFilterValue,
} from './shared';

type CountsState = {
  all: number;
  active: number;
  pending: number;
};

function buildQueryString({
  email,
  ownerName,
  customerCode,
  page,
  status,
}: {
  email: string;
  ownerName: string;
  customerCode: string;
  page: number;
  status: CustomerStatusFilter;
}) {
  const params = new URLSearchParams();

  if (email.trim()) {
    params.set('email', email.trim());
  }

  if (ownerName.trim()) {
    params.set('owner_name', ownerName.trim());
  }

  if (customerCode.trim()) {
    params.set('customer_code', customerCode.trim());
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const statusValue = statusFilterValue(status);
  if (statusValue) {
    params.set('status', statusValue);
  }

  return params.toString();
}

function emptyCounts(): CountsState {
  return {
    all: 0,
    active: 0,
    pending: 0,
  };
}

export default function CustomerListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const currentQuery = {
    email: searchParams.get('email') ?? '',
    owner_name: searchParams.get('owner_name') ?? '',
    customer_code: searchParams.get('customer_code') ?? '',
  };

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const activeStatus = normalizeStatusFilter(searchParams.get('status'));
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [counts, setCounts] = useState<CountsState>(emptyCounts());
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filters, setFilters] = useState(currentQuery);
  const [createForm, setCreateForm] = useState<CustomerFormState>(DEFAULT_CUSTOMER_FORM);
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    setFilters(currentQuery);
  }, [searchKey]);

  useEffect(() => {
    const storedUser = getStoredAdminUser();
    const nextCanRead = hasAdminPermission(storedUser, 'customers.read');
    const nextCanWrite = hasAdminPermission(storedUser, 'customers.write');

    setCanRead(nextCanRead);
    setCanWrite(nextCanWrite);

    if (!nextCanRead) {
      router.replace('/dashboard/forbidden');
    }
  }, [router]);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    const apiQuery = new URLSearchParams(searchKey);
    apiQuery.set('per_page', '20');

    adminGet(`/admin-api/web-users?${apiQuery.toString()}`, token)
      .then((payload) => {
        const response = payload as CustomerListResponse;
        setRows(response.data ?? []);
        setTotal(response.total ?? 0);
        setLastPage(response.last_page ?? 1);
        setCounts(response.counts ?? emptyCounts());
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load customers.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canRead, refreshKey, router, searchKey]);

  function updateRoute(next: {
    email?: string;
    owner_name?: string;
    customer_code?: string;
    page?: number;
    status?: CustomerStatusFilter;
  }) {
    const query = buildQueryString({
      email: next.email ?? currentQuery.email,
      ownerName: next.owner_name ?? currentQuery.owner_name,
      customerCode: next.customer_code ?? currentQuery.customer_code,
      page: next.page ?? page,
      status: next.status ?? activeStatus,
    });

    router.replace(query ? `/dashboard/web-users?${query}` : '/dashboard/web-users', { scroll: false });
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    updateRoute({
      email: filters.email,
      owner_name: filters.owner_name,
      customer_code: filters.customer_code,
      page: 1,
    });
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !canWrite) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = (await adminPost('/admin-api/web-users', token, createForm)) as { message?: string };
      setMessage(response.message ?? 'User created successfully');
      setCreateForm(DEFAULT_CUSTOMER_FORM);
      setShowCreateModal(false);
      setRefreshKey((value) => value + 1);
      updateRoute({ page: 1 });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create customer.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(row: CustomerRow) {
    const token = ensureAdminToken(router);
    if (!token || !canWrite) {
      return;
    }

    if (!window.confirm('Delete this user?')) {
      return;
    }

    setDeletingId(row.id);
    setError('');
    setMessage('');

    try {
      const response = (await adminDelete(`/admin-api/web-users/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'User deleted successfully');
      setRefreshKey((value) => value + 1);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete customer.');
    } finally {
      setDeletingId(null);
    }
  }

  const firstRecord = rows.length === 0 ? 0 : (page - 1) * 20 + 1;
  const lastRecord = rows.length === 0 ? 0 : firstRecord + rows.length - 1;

  return (
    <div className="pc-content">
      <PageHeader
        title="Customer list"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Customer' },
          { label: 'Customer list' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center">
          <div className="btn-group" role="group" aria-label="Customer status filters">
            <button
              type="button"
              className={`btn btn-sm ${activeStatus === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => updateRoute({ status: 'all', page: 1 })}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeStatus === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => updateRoute({ status: 'active', page: 1 })}
            >
              Active ({counts.active})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeStatus === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => updateRoute({ status: 'pending', page: 1 })}
            >
              Pending ({counts.pending})
            </button>
          </div>

          {canWrite ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              + Add User
            </button>
          ) : null}
        </div>
      </div>

      <AlertStack error={error} message={message} />
      {!canWrite ? (
        <div className="alert alert-info" role="alert">
          You have read-only access to customers.
        </div>
      ) : null}

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <form onSubmit={submitFilters}>
                <div className="row g-4 align-items-center">
                  <div className="col">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="ti ti-search" />
                      </span>
                      <input
                        type="text"
                        name="email"
                        className="form-control"
                        placeholder="Search Email"
                        value={filters.email}
                        onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
                      />
                      <input
                        type="text"
                        name="owner_name"
                        className="form-control"
                        placeholder="Search Owner Name"
                        value={filters.owner_name}
                        onChange={(event) => setFilters((current) => ({ ...current, owner_name: event.target.value }))}
                      />
                      <input
                        type="text"
                        name="customer_code"
                        className="form-control"
                        placeholder="Search Customer Code"
                        value={filters.customer_code}
                        onChange={(event) => setFilters((current) => ({ ...current, customer_code: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-sm-auto">
                    <div className="d-grid d-sm-inline-block">
                      <button className="btn btn-primary" type="submit">
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            }
          >
            <div className="table-responsive">
              <table className="table table-hover tbl-product align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Owner Name</th>
                    <th>Email</th>
                    <th>Customer Code</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        Loading customers...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{(page - 1) * 20 + index + 1}</td>
                        <td>{row.owner_name.trim() || '—'}</td>
                        <td>{row.email.trim() || '—'}</td>
                        <td>{customerCodeLabel(row.customer_code)}</td>
                        <td>
                          <StatusIcon active={row.status === 1} />
                        </td>
                        <td>
                          <div className="d-flex gap-3 align-items-center">
                            <Link href={`/dashboard/web-users/${row.id}`} className="text-body">
                              <i className="fas fa-eye" />
                            </Link>
                            {canWrite ? (
                              <button
                                type="button"
                                className="btn btn-link p-0 text-danger"
                                title="Delete user"
                                disabled={deletingId === row.id}
                                onClick={() => void deleteCustomer(row)}
                              >
                                <i className="fas fa-trash-alt" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
              <p className="mb-0 text-muted">
                Showing {firstRecord} to {lastRecord} of {total} customers
              </p>
              <Pagination page={page} lastPage={lastPage} onPageChange={(nextPage) => updateRoute({ page: nextPage })} />
            </div>
          </TableCard>
        </div>
      </div>

      {showCreateModal && canWrite ? (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={createCustomer}>
                  <div className="modal-header">
                    <h5 className="modal-title btn-primary">+ Add User</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateForm(DEFAULT_CUSTOMER_FORM);
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label htmlFor="customer-owner-name" className="form-label">
                        Owner Name
                      </label>
                      <input
                        id="customer-owner-name"
                        type="text"
                        className="form-control"
                        required
                        value={createForm.owner_name}
                        onChange={(event) => setCreateForm((current) => ({ ...current, owner_name: event.target.value }))}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="customer-email" className="form-label">
                        Email
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        className="form-control"
                        required
                        value={createForm.email}
                        onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="customer-password" className="form-label">
                        Password
                      </label>
                      <input
                        id="customer-password"
                        type="password"
                        className="form-control"
                        required
                        value={createForm.password}
                        onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="customer-code" className="form-label">
                        Customer Code (optional)
                      </label>
                      <input
                        id="customer-code"
                        type="text"
                        className="form-control"
                        value={createForm.customer_code}
                        onChange={(event) => setCreateForm((current) => ({ ...current, customer_code: event.target.value }))}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="customer-status" className="form-label">
                          Status
                        </label>
                        <select
                          id="customer-status"
                          className="form-select"
                          value={createForm.status}
                          onChange={(event) =>
                            setCreateForm((current) => ({ ...current, status: event.target.value === '0' ? '0' : '1' }))
                          }
                        >
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="customer-cflag" className="form-label">
                          Currency
                        </label>
                        <select
                          id="customer-cflag"
                          className="form-select"
                          value={createForm.cflag}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              cflag: event.target.value === 'us' || event.target.value === 'ca' ? event.target.value : '',
                            }))
                          }
                        >
                          <option value="">-- Select --</option>
                          <option value="ca">CA</option>
                          <option value="us">US</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateForm(DEFAULT_CUSTOMER_FORM);
                      }}
                    >
                      Close
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </div>
  );
}
