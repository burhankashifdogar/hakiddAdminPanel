'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminListResponse, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from './common';
import { consumeProductGroupItemFlash } from './product-group-item-shared';

type GroupItemRow = Record<string, unknown>;

export default function ProductGroupItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<GroupItemRow[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const flashMessage = consumeProductGroupItemFlash();
    if (flashMessage) {
      setMessage(flashMessage);
    }
  }, []);

  useEffect(() => {
    const pgId = searchParams.get('pg_id');
    if (pgId) {
      setSearch(pgId);
      setSearchInput(pgId);
    }
  }, [searchParams]);

  async function loadData() {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [itemsPayload, groupsPayload] = await Promise.all([
        adminGet(`/admin-api/product-group-items${search ? `?search=${encodeURIComponent(search)}` : ''}`, token),
        adminGet('/admin-api/group-products?page=1&per_page=500', token),
      ]);

      const items = (itemsPayload as AdminListResponse).data ?? [];
      const availableGroups = ((groupsPayload as AdminListResponse).data ?? []).map((group) => ({
        id: String(group.id ?? ''),
        title: String(group.title ?? `Group ${group.id ?? ''}`),
      }));

      setRows(items);
      setGroups(availableGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product group items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [router, search]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, GroupItemRow[]>();
    rows.forEach((row) => {
      const key = String(row.pg_id ?? '');
      const current = map.get(key) ?? [];
      current.push(row);
      map.set(key, current);
    });
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="pc-content">
      <PageHeader
        title="Product Group Items"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Product Group Items' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <form
                className="d-flex"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <input
                  type="text"
                  className="form-control me-2"
                  placeholder="Search by PG ID, Product ID, Sequence, or Status..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button type="submit" className="btn btn-primary me-2">
                  <i className="fas fa-search" /> Search
                </button>
                {search ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </form>
            </div>
            <div className="col-md-6 text-end">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() =>
                  setCollapsedGroups((current) =>
                    groupedRows.reduce<Record<string, boolean>>((next, [groupId]) => {
                      next[groupId] = !Object.values(current).every(Boolean);
                      return next;
                    }, {}),
                  )
                }
              >
                Toggle All
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push('/dashboard/product-group-items/create')}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      </div>

      <TableCard
        header={
          <div>
            <h5 className="mb-1">Product Group Items</h5>
            <small className="text-muted">{groupedRows.length} product groups</small>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="table table-striped table-hover table-bordered nowrap">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Toggle</th>
                <th>PG ID</th>
                <th>Group Info</th>
                <th>Items Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading...</td>
                </tr>
              ) : groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No product group items found.</td>
                </tr>
              ) : (
                groupedRows.map(([groupId, items]) => (
                  <Fragment key={groupId}>
                    <tr key={`group-${groupId}`} className="table-light">
                      <td>
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none p-0"
                          onClick={() => setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }))}
                        >
                          <i className={`fas ${collapsedGroups[groupId] ? 'fa-chevron-right' : 'fa-chevron-down'}`} />
                        </button>
                      </td>
                      <td>
                        <strong>{groupId}</strong>
                      </td>
                      <td>
                        <strong>{groups.find((group) => group.id === groupId)?.title ?? `Product Group ${groupId}`}</strong>
                        <small className="text-muted d-block">PG ID: {groupId}</small>
                      </td>
                      <td>
                        <span className="badge bg-primary">{items.length} total items</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setCollapsedGroups((current) => ({ ...current, [groupId]: false }))}
                        >
                          View All
                        </button>
                      </td>
                    </tr>
                    {collapsedGroups[groupId]
                      ? null
                      : items.map((item) => (
                          <tr key={String(item.id)} className="group-item">
                            <td style={{ paddingLeft: 40 }}>
                              <i className="fas fa-arrow-right text-muted" />
                            </td>
                            <td>{formatValue(item.pg_id)}</td>
                            <td>
                              <div>
                                <strong>Product ID:</strong> {formatValue(item.pg_product_id)}
                                <br />
                                <small className="text-muted">Sequence: {formatValue(item.sequence)}</small>
                                <br />
                                <span className={`badge bg-${String(item.status ?? '') === 'active' ? 'success' : 'secondary'}`}>
                                  {String(item.status ?? '').charAt(0).toUpperCase() + String(item.status ?? '').slice(1)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">Additional product details can be viewed individually</small>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Link href={`/dashboard/product-group-items/${item.id}`} title="View" className="btn btn-sm btn-outline-primary">
                                  <i className="fas fa-eye" />
                                </Link>
                                <Link href={`/dashboard/product-group-items/${item.id}/edit`} title="Edit" className="btn btn-sm btn-outline-warning">
                                  <i className="fas fa-edit" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
