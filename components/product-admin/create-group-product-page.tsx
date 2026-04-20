'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api';
import { AlertStack, PageHeader, ensureAdminToken } from './common';
import GroupProductForm from './group-product-form';
import { emptyGroupProductForm, setGroupProductFlash, toGroupProductPayload } from './group-product-shared';

export default function CreateGroupProductPage() {
  const router = useRouter();
  const [values, setValues] = useState(emptyGroupProductForm());
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
      await adminPost('/admin-api/group-products', token, toGroupProductPayload(values, false));
      setGroupProductFlash('Group created successfully');
      router.push('/dashboard/group-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create product group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Create Product Group"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products Grouping', href: '/dashboard/group-products' },
          { label: 'Create Group' },
        ]}
      />
      <AlertStack error={error} />
      <GroupProductForm
        title="Add New Group"
        values={values}
        onChange={setValues}
        onSubmit={onSubmit}
        submitLabel={submitting ? 'Creating...' : 'Create Group'}
        cancelHref="/dashboard/group-products"
      />
    </div>
  );
}
