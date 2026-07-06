'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { ensureAdminToken } from './common';

type SpecialProductRow = {
  special_product_id?: string | number | null;
  product_id?: string | number | null;
  product_name?: string | number | null;
  country?: string | number | null;
  deduct_price?: string | number | null;
  deduct_price_us?: string | number | null;
  start_date?: string | number | null;
  end_date?: string | number | null;
  created_at?: string | number | null;
  selling_price_2?: string | number | null;
  ca_retail_price?: string | number | null;
  ca_selling_price?: string | number | null;
  ca_selling_price_2?: string | number | null;
  us_retail_price?: string | number | null;
  us_selling_price?: string | number | null;
  us_selling_price_2?: string | number | null;
};

type SpecialListsResponse = {
  data?: SpecialProductRow[];
  total?: number;
  last_page?: number;
  current_page?: number;
  counts?: {
    on_sale?: number;
    clearance?: number;
  };
};

type SpecialTab = 'on-sale' | 'clearance';

const PER_PAGE = 25;

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '-';
}

function firstFilled(...values: unknown[]): unknown {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }

  return null;
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, 10);
}

function statusFor(start: unknown, end: unknown): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  const s = toDateOnly(start);
  const e = toDateOnly(end);

  if (s && s > today) return { label: 'Upcoming', className: 'bg-warning text-dark' };
  if (e && e < today) return { label: 'Expired', className: 'bg-secondary' };
  return { label: 'Active', className: 'bg-success' };
}

function PricingCell({
  retail,
  list,
  reduced,
  reducedClassName,
}: {
  retail: unknown;
  list: unknown;
  reduced: unknown;
  reducedClassName: string;
}) {
  return (
    <div className="d-flex flex-column" style={{ minWidth: 130 }}>
      <span className="d-flex justify-content-between gap-3">
        <span className="text-muted small">Retail</span>
        <span>{formatMoney(retail)}</span>
      </span>
      <span className="d-flex justify-content-between gap-3">
        <span className="text-muted small">List</span>
        <span>{formatMoney(list)}</span>
      </span>
      <span className="d-flex justify-content-between gap-3">
        <span className="text-muted small">Reduced</span>
        <span className={reducedClassName}>{formatMoney(reduced)}</span>
      </span>
    </div>
  );
}

export default function SpecialProductLists({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<SpecialTab>('on-sale');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SpecialProductRow[]>([]);
  const [counts, setCounts] = useState<{ on_sale: number; clearance: number }>({ on_sale: 0, clearance: 0 });
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      const token = ensureAdminToken(router);
      if (!token) return;

      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          tab,
          page: String(targetPage),
          per_page: String(PER_PAGE),
        });
        if (tab === 'clearance') {
          // Clearance is fixed to the Canada / English product variant.
          params.set('country', 'CA');
          params.set('lang_code', 'en');
        }
        const payload = (await adminGet(
          `/admin-api/on-sale-products/special-lists?${params.toString()}`,
          token,
        )) as SpecialListsResponse;
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
        setCounts({ on_sale: payload.counts?.on_sale ?? 0, clearance: payload.counts?.clearance ?? 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load special products');
      } finally {
        setLoading(false);
      }
    },
    [tab, router],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  function switchTab(next: SpecialTab) {
    if (next !== tab) {
      setTab(next);
      setPage(1);
    }
  }

  async function deleteRow(row: SpecialProductRow) {
    const id = String(row.special_product_id ?? '');

    if (!id) {
      setError('This row has no deletable special-product id.');
      return;
    }

    if (!window.confirm('Delete this on sale product?')) return;

    const token = ensureAdminToken(router);
    if (!token) return;

    try {
      setDeletingId(id);
      setError('');
      await adminDelete(`/admin-api/on-sale-products/${id}`, token);
      await load(page);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete on-sale product');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <ul className="nav nav-tabs" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'on-sale' ? ' active' : ''}`}
            onClick={() => switchTab('on-sale')}
          >
            On Sale <span className="badge bg-primary ms-1">{counts.on_sale}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${tab === 'clearance' ? ' active' : ''}`}
            onClick={() => switchTab('clearance')}
          >
            Clearance <span className="badge bg-danger ms-1">{counts.clearance}</span>
          </button>
        </li>
      </ul>

      <div className="table-responsive pt-3">
        <table className="table table-hover table-striped align-middle">
          {tab === 'on-sale' ? (
            <>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Name</th>
                  <th>CA Pricing</th>
                  <th>US Pricing</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={String(row.special_product_id ?? row.product_id ?? index)}>
                      <td className="fw-semibold">{row.product_id ?? '-'}</td>
                      <td>{row.product_name ?? 'Product not found'}</td>
                      <td>
                        <PricingCell
                          retail={row.ca_retail_price}
                          list={row.ca_selling_price}
                          reduced={row.deduct_price}
                          reducedClassName="fw-semibold text-primary"
                        />
                      </td>
                      <td>
                        <PricingCell
                          retail={row.us_retail_price}
                          list={row.us_selling_price}
                          reduced={row.deduct_price_us}
                          reducedClassName="fw-semibold text-primary"
                        />
                      </td>
                      <td>{toDateOnly(row.start_date) ?? '-'}</td>
                      <td>{toDateOnly(row.end_date) ?? '-'}</td>
                      <td>
                        {(() => {
                          const s = statusFor(row.start_date, row.end_date);
                          return <span className={`badge ${s.className}`}>{s.label}</span>;
                        })()}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          {row.product_id ? (
                            <Link
                              href={`/dashboard/products/${encodeURIComponent(String(row.product_id).trim())}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={deletingId === String(row.special_product_id ?? '')}
                            onClick={() => void deleteRow(row)}
                          >
                            {deletingId === String(row.special_product_id ?? '') ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Name</th>
                  <th>CA Pricing</th>
                  <th>US Pricing</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={String(row.special_product_id ?? row.product_id ?? index)}>
                      <td className="fw-semibold">{row.product_id ?? '-'}</td>
                      <td>{row.product_name ?? 'Product not found'}</td>
                      <td>
                        <PricingCell
                          retail={row.ca_retail_price}
                          list={row.ca_selling_price}
                          reduced={firstFilled(row.deduct_price, row.ca_selling_price_2, row.selling_price_2)}
                          reducedClassName="fw-semibold text-danger"
                        />
                      </td>
                      <td>
                        <PricingCell
                          retail={row.us_retail_price}
                          list={row.us_selling_price}
                          reduced={firstFilled(row.deduct_price_us, row.us_selling_price_2)}
                          reducedClassName="fw-semibold text-danger"
                        />
                      </td>
                      <td>
                        {row.product_id ? (
                          <Link
                            href={`/dashboard/products/${encodeURIComponent(String(row.product_id).trim())}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            View
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted">
          Total: {total} | Page: {page}/{lastPage}
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
