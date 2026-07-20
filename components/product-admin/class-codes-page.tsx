'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminGet, adminPost } from '@/lib/api';
import { getAdminImageUrl } from '@/lib/assets';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from './common';

type ClassCodeRow = {
  id: number;
  class: string;
  image: string | null;
  image_url?: string | null;
  status: number;
};

type ToggleClassResponse = {
  message?: string;
  value?: number;
};

function getImageUrl(row: ClassCodeRow) {
  if (!row.image) {
    return null;
  }

  return getAdminImageUrl(row.image_url || row.image);
}

export default function ClassCodesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ClassCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadClassCodes = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet('/admin-api/class-codes', token)) as AdminListResponse;
      setRows((payload.data ?? []) as ClassCodeRow[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load class codes.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadClassCodes();
  }, [loadClassCodes]);

  async function toggleClass(id: number) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setTogglingId(id);
      setError('');
      setMessage('');
      const response = (await adminPost(`/admin-api/class-codes/${id}/toggle`, token, {})) as ToggleClassResponse;
      setMessage(response.message ?? 'Class status updated.');
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === id
            ? {
                ...row,
                status: Number(response.value ?? row.status),
              }
            : row,
        ),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update class status.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Class Codes"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products' },
          { label: 'Class Codes' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard
        header={
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Class Codes</h5>
            <Link href="/dashboard/class-codes/create" className="btn btn-primary btn-sm">
              <i className="ti ti-plus f-18" /> Add Class Code
            </Link>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="table table-striped table-hover table-bordered align-middle">
            <thead>
              <tr>
                <th>No.</th>
                <th>Class</th>
                <th>Image</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    Loading class codes...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    No class codes found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const imageUrl = getImageUrl(row);
                  const isActive = Number(row.status ?? 0) === 1;

                  return (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="badge rounded-pill text-bg-info">{formatValue(row.class)}</span>
                      </td>
                      <td>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={String(row.class ?? 'class code')}
                            className="user-avtar rounded wid-50 hie-50"
                          />
                        ) : (
                          <span className="badge rounded-pill text-bg-secondary">Null</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <Link href={`/dashboard/class-codes/${row.id}`} className="me-2" title="Edit">
                            <i className="ti ti-edit" />
                          </Link>
                          <button
                            type="button"
                            className={`btn btn-sm btn-outline-${isActive ? 'danger' : 'success'}`}
                            title={isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleClass(row.id)}
                            disabled={togglingId === row.id}
                          >
                            {togglingId === row.id ? 'Updating...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
