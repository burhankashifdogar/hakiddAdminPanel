'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';
import FilterProductForm from './filter-product-form';
import {
  emptyFilterProductForm,
  setFilterProductFlash,
  toFilterProductFormValues,
  toFilterProductPayload,
  FilterProductFormValues,
} from './filter-product-shared';

type FilterProductDetail = Record<string, unknown>;

export default function EditFilterProductPage({ id }: { id: number }) {
  const router = useRouter();
  const [values, setValues] = useState<FilterProductFormValues>(emptyFilterProductForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFilterProduct = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = (await adminGet(`/admin-api/filter-products/${id}`, token)) as FilterProductDetail;
      setValues(toFilterProductFormValues(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load filter product');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadFilterProduct();
  }, [loadFilterProduct]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await adminPut(`/admin-api/filter-products/${id}`, token, toFilterProductPayload(values));
      setFilterProductFlash('Filter updated successfully');
      router.push('/dashboard/filter-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update filter product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Edit Filter Product"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Filter Products', href: '/dashboard/filter-products' },
          { label: 'Edit Filter Product' },
        ]}
      />
      <AlertStack error={error} />

      {loading ? (
        <TableCard header={<h5 className="mb-0">Edit Filter Product</h5>}>
          <p className="mb-0">Loading filter product...</p>
        </TableCard>
      ) : (
        <FilterProductForm
          title="Edit Filter Product"
          values={values}
          onChange={setValues}
          onSubmit={onSubmit}
          submitLabel={submitting ? 'Updating...' : 'Update Filter'}
          cancelHref="/dashboard/filter-products"
          submitting={submitting}
        />
      )}
    </div>
  );
}
