'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api';
import { AlertStack, PageHeader, ensureAdminToken } from './common';
import AdditionalProductForm from './additional-product-form';
import {
  emptyAdditionalProductForm,
  setAdditionalProductFlash,
  toAdditionalProductPayload,
  AdditionalProductFormValues,
} from './additional-product-shared';

export default function CreateAdditionalProductPage() {
  const router = useRouter();
  const [values, setValues] = useState<AdditionalProductFormValues>(emptyAdditionalProductForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await adminPost('/admin-api/additional-products', token, toAdditionalProductPayload(values));
      setAdditionalProductFlash('Record created successfully');
      router.push('/dashboard/additional-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save additional product');
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
          { label: 'Add Products' },
        ]}
      />
      <AlertStack error={error} />

      <AdditionalProductForm
        title="Addtionals"
        values={values}
        onChange={setValues}
        onSubmit={onSubmit}
        submitLabel={submitting ? 'Submitting...' : 'Submit'}
        cancelHref="/dashboard/additional-products"
        submitting={submitting}
      />
    </div>
  );
}
