'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminDelete, adminGet, adminPost, adminPostForm } from '@/lib/api';
import {
  AlertStack,
  CountryIndicator,
  PageHeader,
  Pagination,
  TableCard,
  ensureAdminToken,
  formatValue,
} from './common';

type OnSaleProductRow = {
  id?: number;
  product_id?: string;
  product_name?: string | null;
  country?: string | null;
  class?: string;
  deduct_price?: string | number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
};

type OnSaleFilters = {
  product_id: string;
  class: string;
  start_date: string;
  end_date: string;
  created_from: string;
  created_to: string;
};

type BulkDeleteResponse = {
  deleted?: number;
  message?: string;
};

const EMPTY_FILTERS: OnSaleFilters = {
  product_id: '',
  class: '',
  start_date: '',
  end_date: '',
  created_from: '',
  created_to: '',
};

function buildOnSaleQuery(page: number, filters: OnSaleFilters) {
  const query = new URLSearchParams({
    page: String(page),
    per_page: '20',
  });

  for (const [key, value] of Object.entries(filters)) {
    const normalized = value.trim();
    if (normalized) {
      query.set(key, normalized);
    }
  }

  return query.toString();
}

function hasActiveFilters(filters: OnSaleFilters) {
  return Object.values(filters).some((value) => value.trim() !== '');
}

export default function OnSaleProductsPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<OnSaleProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterInput, setFilterInput] = useState<OnSaleFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<OnSaleFilters>(EMPTY_FILTERS);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showRecoveryTools, setShowRecoveryTools] = useState(false);

  const loadOnSaleProducts = useCallback(
    async (targetPage: number) => {
      const token = ensureAdminToken(router);
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const payload = (await adminGet(`/admin-api/on-sale-products?${buildOnSaleQuery(targetPage, filters)}`, token)) as AdminListResponse;
        setRows((payload.data ?? []) as OnSaleProductRow[]);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load on-sale products');
      } finally {
        setLoading(false);
      }
    },
    [filters, router],
  );

  useEffect(() => {
    loadOnSaleProducts(page);
  }, [loadOnSaleProducts, page]);

  async function importSpecialProducts(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !file) {
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('start_date', startDate);
    body.append('end_date', endDate);

    try {
      setImporting(true);
      setError('');
      setMessage('');
      await adminPostForm('/admin-api/on-sale-products/import', token, body);
      setMessage('Special products uploaded successfully');
      setFile(null);
      setFileInputKey((current) => current + 1);
      if (page === 1) {
        await loadOnSaleProducts(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import on-sale products');
    } finally {
      setImporting(false);
    }
  }

  async function deleteRow(row: OnSaleProductRow) {
    const token = ensureAdminToken(router);
    const rowId = Number(row.id ?? 0);

    if (!token || !Number.isFinite(rowId) || rowId <= 0) {
      setError('Invalid on-sale product row.');
      return;
    }

    if (!window.confirm(`Delete on-sale row #${rowId} for product ${formatValue(row.product_id)}?`)) {
      return;
    }

    try {
      setDeletingId(rowId);
      setError('');
      setMessage('');
      await adminDelete(`/admin-api/on-sale-products/${rowId}`, token);
      setMessage('On-sale product deleted successfully.');
      if (page === 1) {
        await loadOnSaleProducts(1);
      } else {
        setPage(1);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete on-sale product');
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteFilteredRows() {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!hasActiveFilters(filters)) {
      setError('Apply at least one filter before bulk deleting rows.');
      return;
    }

    if (
      !window.confirm(
        `Delete ${total} filtered on-sale product record${total === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setBulkDeleting(true);
      setError('');
      setMessage('');
      const response = (await adminPost('/admin-api/on-sale-products/bulk-delete', token, filters)) as BulkDeleteResponse;
      setMessage(response.message ?? `Deleted ${response.deleted ?? 0} on-sale products.`);
      if (page === 1) {
        await loadOnSaleProducts(1);
      } else {
        setPage(1);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to bulk delete on-sale products');
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="On Sale Trigger"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products' },
          { label: 'On Sale Trigger' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard
        header={
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">On Sale Trigger</h5>
            <span className="badge text-bg-light border">Total Records: {total}</span>
          </div>
        }
      >
        <form onSubmit={importSpecialProducts}>
          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Upload CSV File</label>
              <input
                key={fileInputKey}
                type="file"
                className="form-control"
                accept=".csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="col-md-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={!file || importing}>
                {importing ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </form>

        <hr className="my-4" />

        <div className="accordion mb-4" id="onSaleRecoveryTools">
          <div className="accordion-item">
            <h2 className="accordion-header" id="on-sale-recovery-heading">
              <button
                className={`accordion-button${showRecoveryTools ? '' : ' collapsed'}`}
                type="button"
                aria-expanded={showRecoveryTools}
                aria-controls="on-sale-recovery-panel"
                onClick={() => setShowRecoveryTools((current) => !current)}
              >
                Recovery And Delete Tools
                {hasActiveFilters(filters) ? (
                  <span className="badge text-bg-light border ms-2">Filters Active</span>
                ) : null}
              </button>
            </h2>
            <div
              id="on-sale-recovery-panel"
              className={`accordion-collapse collapse${showRecoveryTools ? ' show' : ''}`}
              aria-labelledby="on-sale-recovery-heading"
            >
              <div className="accordion-body">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setError('');
                    setMessage('');
                    setPage(1);
                    setFilters({ ...filterInput });
                  }}
                >
                  <div className="row g-3">
                    <div className="col-md-4 col-lg-3">
                      <label className="form-label mb-1">Product ID</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Filter by product id"
                        value={filterInput.product_id}
                        onChange={(event) => setFilterInput((current) => ({ ...current, product_id: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-2 col-lg-2">
                      <label className="form-label mb-1">Class</label>
                      <select
                        className="form-select"
                        value={filterInput.class}
                        onChange={(event) => setFilterInput((current) => ({ ...current, class: event.target.value }))}
                      >
                        <option value="">All</option>
                        <option value="Y">Y</option>
                        <option value="R">R</option>
                      </select>
                    </div>
                    <div className="col-md-3 col-lg-2">
                      <label className="form-label mb-1">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterInput.start_date}
                        onChange={(event) => setFilterInput((current) => ({ ...current, start_date: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-3 col-lg-2">
                      <label className="form-label mb-1">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterInput.end_date}
                        onChange={(event) => setFilterInput((current) => ({ ...current, end_date: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-3 col-lg-2">
                      <label className="form-label mb-1">Uploaded From</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterInput.created_from}
                        onChange={(event) => setFilterInput((current) => ({ ...current, created_from: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-3 col-lg-2">
                      <label className="form-label mb-1">Uploaded To</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterInput.created_to}
                        onChange={(event) => setFilterInput((current) => ({ ...current, created_to: event.target.value }))}
                      />
                    </div>
                    <div className="col-lg-12 d-flex flex-wrap gap-2 align-items-center">
                      <button type="submit" className="btn btn-primary">
                        Apply Filters
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setError('');
                          setMessage('');
                          setFilterInput(EMPTY_FILTERS);
                          setFilters(EMPTY_FILTERS);
                          setPage(1);
                        }}
                      >
                        Clear Filters
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={!hasActiveFilters(filters) || total === 0 || bulkDeleting}
                        onClick={deleteFilteredRows}
                      >
                        {bulkDeleting ? 'Deleting...' : 'Delete Filtered Results'}
                      </button>
                      <small className="text-muted">
                        Bulk delete is enabled only after filters are applied.
                      </small>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h5 className="mb-0">On Sale Products</h5>
          <small className="text-muted">
            Total: {total} | Page: {page}/{lastPage}
          </small>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-bordered align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Country</th>
                <th>Class</th>
                <th>Deduct Price</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    Loading on-sale products...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    No on-sale products found in the database.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={String(row.id ?? `${row.product_id ?? 'row'}-${index}`)}>
                    <td className="text-muted">{(page - 1) * 20 + index + 1}</td>
                    <td className="text-nowrap fw-semibold">{formatValue(row.product_id)}</td>
                    <td>{formatValue(row.product_name)}</td>
                    <td className="text-nowrap">
                      <span className="d-inline-flex align-items-center gap-2">
                        <CountryIndicator country={row.country} />
                        <span>{formatValue(row.country)}</span>
                      </span>
                    </td>
                    <td>{formatValue(row.class)}</td>
                    <td>{formatValue(row.deduct_price)}</td>
                    <td>{formatValue(row.start_date)}</td>
                    <td>{formatValue(row.end_date)}</td>
                    <td>{formatValue(row.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={deletingId === Number(row.id ?? 0)}
                        onClick={() => void deleteRow(row)}
                      >
                        {deletingId === Number(row.id ?? 0) ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">
            Showing {rows.length} record{rows.length === 1 ? '' : 's'}
          </div>
          <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
        </div>
      </TableCard>
    </div>
  );
}
