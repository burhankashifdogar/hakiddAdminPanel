'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from './common';

type GroupProductDetail = Record<string, unknown>;

export default function GroupProductDetailPage({ id }: { id: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<GroupProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = (await adminGet(`/admin-api/group-products/${id}`, token)) as GroupProductDetail;
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product group');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  return (
    <div className="pc-content">
      <PageHeader
        title={detail?.title ? String(detail.title) : 'View Product Group'}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products Grouping', href: '/dashboard/group-products' },
          { label: detail?.title ? String(detail.title) : 'View Product Group' },
        ]}
      />
      <AlertStack error={error} />
      <TableCard header={<h5 className="mb-0">Product Group Details</h5>}>
        {loading ? (
          <p className="mb-0">Loading product group...</p>
        ) : detail ? (
          <>
            <p>
              <strong>Title:</strong> {formatValue(detail.title)}
            </p>
            <p>
              <strong>Description:</strong> {formatValue(detail.description)}
            </p>
            <p className="mb-3">
              <strong>External:</strong> {formatValue(detail.external)}
            </p>
            <div className="d-flex gap-2">
              <Link href="/dashboard/group-products" className="btn btn-secondary">
                Back to Grouping
              </Link>
              <Link href={`/dashboard/group-products/${id}/edit`} className="btn btn-primary">
                Edit Group
              </Link>
            </div>
          </>
        ) : (
          <p className="mb-0">Product group not found.</p>
        )}
      </TableCard>
    </div>
  );
}
