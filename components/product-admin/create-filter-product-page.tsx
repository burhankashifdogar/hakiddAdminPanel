'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api';
import { AlertStack, PageHeader, ensureAdminToken } from './common';
import FilterProductForm from './filter-product-form';
import {
  emptyFilterProductForm,
  setFilterProductFlash,
  toFilterProductPayload,
  FilterProductFormValues,
} from './filter-product-shared';

export default function CreateFilterProductPage() {
  const router = useRouter();
  const [values, setValues] = useState<FilterProductFormValues>(emptyFilterProductForm());
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
      await adminPost('/admin-api/filter-products', token, toFilterProductPayload(values));
      setFilterProductFlash('Filter stored successfully');
      router.push('/dashboard/filter-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save filter product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Filter Products"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Filter Products', href: '/dashboard/filter-products' },
          { label: 'Add Filter Product' },
        ]}
      />
      <AlertStack error={error} />

      <FilterProductForm
        title="Add Filter Product"
        values={values}
        onChange={setValues}
        onSubmit={onSubmit}
        submitLabel={submitting ? 'Saving...' : 'Save Filter'}
        cancelHref="/dashboard/filter-products"
        submitting={submitting}
      />
    </div>
  );
}
