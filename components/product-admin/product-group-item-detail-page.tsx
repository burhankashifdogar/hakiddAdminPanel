'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from './common';

type ProductGroupItemDetail = Record<string, unknown>;

export default function ProductGroupItemDetailPage({ id }: { id: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ProductGroupItemDetail | null>(null);
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
      const payload = (await adminGet(`/admin-api/product-group-items/${id}`, token)) as ProductGroupItemDetail;
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product group item');
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
        title={detail?.pg_product_id ? `Product Group Item: ${String(detail.pg_product_id)}` : 'View Product Group Item'}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Product Group Items', href: '/dashboard/product-group-items' },
          { label: detail?.pg_product_id ? `Item: ${String(detail.pg_product_id)}` : 'View Product Group Item' },
        ]}
      />
      <AlertStack error={error} />
      <TableCard header={<h5 className="mb-0">Product Group Item Details</h5>}>
        {loading ? (
          <p className="mb-0">Loading product group item...</p>
        ) : detail ? (
          <>
            <p>
              <strong>Product Group:</strong> {formatValue(detail.pg_id)}
            </p>
            <p>
              <strong>Product ID:</strong> {formatValue(detail.pg_product_id)}
            </p>
            <p>
              <strong>Sequence:</strong> {formatValue(detail.sequence)}
            </p>
            <p className="mb-3">
              <strong>Status:</strong> {formatValue(detail.status)}
            </p>
            <div className="d-flex gap-2">
              <Link href="/dashboard/product-group-items" className="btn btn-secondary">
                Back to Items
              </Link>
              <Link href={`/dashboard/product-group-items/${id}/edit`} className="btn btn-primary">
                Edit Item
              </Link>
            </div>
          </>
        ) : (
          <p className="mb-0">Product group item not found.</p>
        )}
      </TableCard>
    </div>
  );
}
