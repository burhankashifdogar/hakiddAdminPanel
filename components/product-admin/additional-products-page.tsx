'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminDelete, adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, Pagination, StatusIcon, TableCard, ensureAdminToken, formatValue } from './common';
import { consumeAdditionalProductFlash } from './additional-product-shared';

type AdditionalProductRow = Record<string, unknown>;

function getRowId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdditionalProductsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdditionalProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [typeInput, setTypeInput] = useState('');
  const [productIdInput, setProductIdInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [productIdFilter, setProductIdFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const flashMessage = consumeAdditionalProductFlash();
    if (flashMessage) {
      setMessage(flashMessage);
    }
  }, []);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    const query = new URLSearchParams({
      page: String(page),
      per_page: '20',
    });
    if (typeFilter.trim()) {
      query.set('type', typeFilter.trim());
    }
    if (productIdFilter.trim()) {
      query.set('product_id', productIdFilter.trim());
    }
    if (titleFilter.trim()) {
      query.set('title', titleFilter.trim());
    }
    if (statusFilter) {
      query.set('status', statusFilter);
    }

    adminGet(`/admin-api/additional-products?${query.toString()}`, token)
      .then((payload: AdminListResponse) => {
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load additional products'))
      .finally(() => setLoading(false));
  }, [page, router, typeFilter, productIdFilter, titleFilter, statusFilter]);

  async function refresh() {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    const query = new URLSearchParams({
      page: String(page),
      per_page: '20',
    });
    if (typeFilter.trim()) {
      query.set('type', typeFilter.trim());
    }
    if (productIdFilter.trim()) {
      query.set('product_id', productIdFilter.trim());
    }
    if (titleFilter.trim()) {
      query.set('title', titleFilter.trim());
    }
    if (statusFilter) {
      query.set('status', statusFilter);
    }

    const payload = (await adminGet(`/admin-api/additional-products?${query.toString()}`, token)) as AdminListResponse;
    setRows(payload.data ?? []);
    setTotal(payload.total ?? 0);
    setLastPage(payload.last_page ?? 1);
  }

  async function remove(row: AdditionalProductRow) {
    const token = ensureAdminToken(router);
    const rowId = getRowId(row.id);
    if (!token || !rowId) {
      return;
    }

    if (!window.confirm(`Delete record #${rowId}?`)) {
      return;
    }

    try {
      await adminDelete(`/admin-api/additional-products/${rowId}`, token);
      setMessage('Deleted successfully');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete additional product');
    }
  }

  async function runImport(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !importFile) {
      return;
    }

    const body = new FormData();
    body.append('file', importFile);

    try {
      await adminPostForm('/admin-api/additional-products/import', token, body);
      setImportFile(null);
      setMessage('Import completed successfully');
      setPage(1);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Additional Products"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Additional Products' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <div className="row mb-3">
        <div className="col-6">
          <form onSubmit={runImport} className="d-flex align-items-center">
            <div className="d-flex gap-3 w-100 align-items-center">
              <div className="flex-grow-1">
                <label className="form-label text-primary mb-1">Please upload a CSV file:</label>
                <input
                  type="file"
                  className="form-control border-primary mb-3"
                  accept=".csv"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="ml-3 mt-2">
                <button type="submit" className="btn btn-success">
                  Import
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="col-6 d-flex justify-content-end align-items-center">
          <Link href="/dashboard/additional-products/create" className="btn btn-primary">
            Add Additionals
          </Link>
        </div>
      </div>

      <TableCard>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setTypeFilter(typeInput);
            setProductIdFilter(productIdInput);
            setTitleFilter(titleInput);
            setStatusFilter(statusInput);
          }}
          className="mb-4"
        >
          <div className="row g-3">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Type"
                value={typeInput}
                onChange={(event) => setTypeInput(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Product ID"
                value={productIdInput}
                onChange={(event) => setProductIdInput(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Title"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select className="form-control" value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
                <option value="">Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="col-md-1 d-flex gap-2">
              <button type="submit" className="btn btn-primary w-100">
                Search
              </button>
            </div>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>#No</th>
                <th>Type</th>
                <th>Product ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No records found.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    <td>{(page - 1) * 20 + index + 1}</td>
                    <td>{formatValue(row.type)}</td>
                    <td>{formatValue(row.product_id)}</td>
                    <td>{formatValue(row.en_title)}</td>
                    <td>
                      <StatusIcon active={Number(row.status ?? 0) === 1} />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {getRowId(row.id) ? (
                          <Link href={`/dashboard/additional-products/${getRowId(row.id)}`} className="btn btn-sm btn-primary">
                            View
                          </Link>
                        ) : (
                          <button type="button" className="btn btn-sm btn-primary" disabled>
                            View
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(row)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Total: {total} | Page: {page}/{lastPage}
            </div>
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        </div>
      </TableCard>
    </div>
  );
}
