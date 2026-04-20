'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet, adminPost } from '@/lib/api';
import { AlertStack, PageHeader, Pagination, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type BannerListPayload, type BannerRow, truncateBannerText } from './shared';

function typeBadgeClass(type: BannerRow['type']) {
  switch (type) {
    case 'info':
      return 'bg-info';
    case 'warning':
      return 'bg-warning text-dark';
    case 'success':
      return 'bg-success';
    case 'danger':
      return 'bg-danger';
    case 'promo':
      return '';
    default:
      return 'bg-secondary';
  }
}

export default function BannersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadBanners = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet(`/admin-api/banners/view?page=${page}&per_page=10`, token)) as BannerListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setLastPage(Math.max(payload.last_page ?? 1, 1));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  async function toggleBanner(row: BannerRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setTogglingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminPost(`/admin-api/banners/${row.id}/toggle`, token, {})) as { message?: string };
      setMessage(response.message ?? 'Banner status updated');
      await loadBanners();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update banner status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteBanner(row: BannerRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      setDeletingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminDelete(`/admin-api/banners/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Banner deleted successfully!');
      await loadBanners();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete banner.');
    } finally {
      setDeletingId(null);
    }
  }

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';

  return (
    <div className="pc-content">
      <PageHeader
        title="Banner Management"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Banner Management' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/banners/create" className="btn btn-primary">
            <i className="fas fa-plus me-2" />
            Create New Banner
          </Link>
        </div>
      </div>

      <AlertStack error={error || flashError} message={message || flashMessage} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Banner List</h5>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-hover tbl-product align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Title</th>
                    <th>Message Preview</th>
                    <th>Languages</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Country</th>
                    <th>Priority</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted">
                        Loading banners...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5">
                        <div className="text-muted">
                          <i className="fas fa-bullhorn fa-3x mb-3" />
                          <h5>No banners found</h5>
                          <p>Create your first banner to get started!</p>
                          <Link href="/dashboard/banners/create" className="btn btn-primary">
                            Create Banner
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{(page - 1) * 10 + index + 1}</td>
                        <td>{row.title?.trim() || 'No Title'}</td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '220px' }} title={row.message_preview ?? ''}>
                            {truncateBannerText(row.message_preview ?? 'No message')}
                          </div>
                        </td>
                        <td>
                          {Array.isArray(row.available_languages) && row.available_languages.length > 0 ? (
                            row.available_languages.map((language) => (
                              <span key={`${row.id}-${language}`} className="badge bg-secondary me-1">
                                {language.toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">No languages</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${typeBadgeClass(row.type)}`}
                            style={row.type === 'promo' ? { backgroundColor: '#6f42c1' } : undefined}
                          >
                            {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${row.show ? 'btn-success' : 'btn-secondary'}`}
                            disabled={togglingId === row.id}
                            onClick={() => void toggleBanner(row)}
                          >
                            {row.show ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>{row.country ? row.country.toUpperCase() : 'All'}</td>
                        <td>{row.priority}</td>
                        <td>
                          <div className="d-flex gap-3 align-items-center">
                            <Link href={`/dashboard/banners/${row.id}`} className="text-body" title="Edit banner">
                              <i className="fas fa-edit" />
                            </Link>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-danger"
                              disabled={deletingId === row.id}
                              title="Delete banner"
                              onClick={() => void deleteBanner(row)}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && lastPage > 1 ? <Pagination page={page} lastPage={lastPage} onPageChange={setPage} /> : null}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
