'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type CrousalListPayload, type CrousalRow } from './shared';

export default function CrousalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<CrousalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCrousals = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet('/admin-api/crousals/view', token)) as CrousalListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load carousel items.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCrousals();
  }, [loadCrousals]);

  async function deleteCrousal(row: CrousalRow) {
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
      const response = (await adminDelete(`/admin-api/crousals/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Deleted successfully');
      await loadCrousals();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete carousel item.');
    } finally {
      setDeletingId(null);
    }
  }

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';

  return (
    <div className="pc-content">
      <PageHeader
        title="Carousel"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Carousel' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/crousals/create" className="btn btn-primary">
            Add Image
          </Link>
        </div>
      </div>

      <AlertStack error={error || flashError} message={message || flashMessage} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">Carousel</h5>}>
            <div className="table-responsive">
              <table className="table table-hover tbl-product align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Header</th>
                    <th>Img</th>
                    <th>Link</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        Loading carousel items...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No carousel items found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{row.header}</td>
                        <td>
                          {row.img_url ? (
                            <img
                              src={row.img_url}
                              alt={row.header}
                              className="user-avtar rounded wid-80 hie-80"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="badge rounded-pill text-bg-secondary">Null</span>
                          )}
                        </td>
                        <td>
                          <a
                            href={row.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none d-inline-block text-truncate"
                            style={{ maxWidth: 260 }}
                            title={row.link}
                          >
                            {row.link}
                          </a>
                        </td>
                        <td>
                          <Link href={`/dashboard/crousals/${row.id}`}>
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={deletingId === row.id}
                            onClick={() => void deleteCrousal(row)}
                          >
                            {deletingId === row.id ? 'Deleting...' : 'Delete'}
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
