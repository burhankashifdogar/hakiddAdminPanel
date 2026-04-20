'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';
import AdditionalProductForm from './additional-product-form';
import {
  emptyAdditionalProductForm,
  setAdditionalProductFlash,
  toAdditionalProductFormValues,
  toAdditionalProductPayload,
  AdditionalProductFormValues,
} from './additional-product-shared';

type AdditionalProductDetail = Record<string, unknown>;

export default function EditAdditionalProductPage({ id }: { id: number }) {
  const router = useRouter();
  const [values, setValues] = useState<AdditionalProductFormValues>(emptyAdditionalProductForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAdditionalProduct = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = (await adminGet(`/admin-api/additional-products/${id}`, token)) as AdditionalProductDetail;
      setValues(toAdditionalProductFormValues(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load additional product');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadAdditionalProduct();
  }, [loadAdditionalProduct]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await adminPut(`/admin-api/additional-products/${id}`, token, toAdditionalProductPayload(values));
      setAdditionalProductFlash('Record updated successfully');
      router.push('/dashboard/additional-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update additional product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Additional Products"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Additional Products', href: '/dashboard/additional-products' },
          { label: 'Edit Products' },
        ]}
      />
      <AlertStack error={error} />

      {loading ? (
        <TableCard header={<h5 className="mb-0">Addtionals</h5>}>
          <p className="mb-0">Loading additional product...</p>
        </TableCard>
      ) : (
        <AdditionalProductForm
          title="Addtionals"
          values={values}
          onChange={setValues}
          onSubmit={onSubmit}
          submitLabel={submitting ? 'Submitting...' : 'Submit'}
          cancelHref="/dashboard/additional-products"
          submitting={submitting}
        />
      )}
    </div>
  );
}
