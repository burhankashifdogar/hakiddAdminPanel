'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';
import { emptyProductGroupItemEditValues, setProductGroupItemFlash, toProductGroupItemEditValues } from './product-group-item-shared';

type ProductGroupItemDetail = Record<string, unknown>;

export default function EditProductGroupItemPage({ id }: { id: number }) {
  const router = useRouter();
  const [values, setValues] = useState(emptyProductGroupItemEditValues());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = (await adminGet(`/admin-api/product-group-items/${id}`, token)) as ProductGroupItemDetail;
      setValues(toProductGroupItemEditValues(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product group item');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await adminPut(`/admin-api/product-group-items/${id}`, token, {
        pg_product_id: values.pg_product_id.trim(),
        sequence: Number(values.sequence),
        status: values.status,
      });
      setProductGroupItemFlash('Product Group Item updated successfully!');
      router.push('/dashboard/product-group-items');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update product group item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Edit Product Group Item"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Product Group Items', href: '/dashboard/product-group-items' },
          { label: 'Edit Product Group Item' },
        ]}
      />
      <AlertStack error={error} />
      {loading ? (
        <TableCard header={<h5 className="mb-0">Edit Product Group Item</h5>}>
          <p className="mb-0">Loading product group item...</p>
        </TableCard>
      ) : (
        <TableCard header={<h5 className="mb-0">Edit Product Group Item</h5>}>
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label">Product ID</label>
              <input
                type="number"
                className="form-control"
                value={values.pg_product_id}
                onChange={(event) => setValues((current) => ({ ...current, pg_product_id: event.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Sequence</label>
              <input
                type="number"
                className="form-control"
                value={values.sequence}
                onChange={(event) => setValues((current) => ({ ...current, sequence: event.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={values.status}
                onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Item'}
              </button>
              <Link href="/dashboard/product-group-items" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </TableCard>
      )}
    </div>
  );
}
