'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type DisplayListPayload, type DisplayRow } from './shared';

export default function DisplaysPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDisplays = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet('/admin-api/displays/view', token)) as DisplayListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load home page ads.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDisplays();
  }, [loadDisplays]);

  async function deleteDisplay(row: DisplayRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setDeletingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminDelete(`/admin-api/displays/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Record deleted');
      await loadDisplays();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete home page ad.');
    } finally {
      setDeletingId(null);
    }
  }

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';

  return (
    <div className="pc-content">
      <PageHeader
        title="Home Page Ads"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Home Page Ads' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/displays/create" className="btn btn-primary">
            Add Home Page Ads
          </Link>
        </div>
      </div>

      <AlertStack error={error || flashError} message={message || flashMessage} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Display Categories</h5>
              </div>
            }
          >
            <div className="dt-responsive table-responsive">
              <table className="table table-striped table-hover table-bordered nowrap align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Category</th>
                    <th>Header</th>
                    <th>Image</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        Loading home page ads...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No home page ads found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{row.link}</td>
                        <td>{row.heading}</td>
                        <td>
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt={row.heading}
                              className="user-avtar rounded wid-80 hie-80"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/dashboard/displays/${row.id}`}>
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => void deleteDisplay(row)}
                            disabled={deletingId === row.id}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </div>
      </div>
    </div>
  );
}
