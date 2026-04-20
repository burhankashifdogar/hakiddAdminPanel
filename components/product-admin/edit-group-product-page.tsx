'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';
import GroupProductForm from './group-product-form';
import { emptyGroupProductForm, setGroupProductFlash, toGroupProductFormValues, toGroupProductPayload } from './group-product-shared';

type GroupProductDetail = Record<string, unknown>;

export default function EditGroupProductPage({ id }: { id: number }) {
  const router = useRouter();
  const [values, setValues] = useState(emptyGroupProductForm());
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
      const payload = (await adminGet(`/admin-api/group-products/${id}`, token)) as GroupProductDetail;
      setValues(toGroupProductFormValues(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product group');
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
      await adminPut(`/admin-api/group-products/${id}`, token, toGroupProductPayload(values, true));
      setGroupProductFlash('Group updated successfully');
      router.push('/dashboard/group-products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update product group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Edit Product Group"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products Grouping', href: '/dashboard/group-products' },
          { label: 'Edit Group' },
        ]}
      />
      <AlertStack error={error} />
      {loading ? (
        <TableCard header={<h5 className="mb-0">Edit Group</h5>}>
          <p className="mb-0">Loading product group...</p>
        </TableCard>
      ) : (
        <GroupProductForm
          title="Edit Group"
          values={values}
          onChange={setValues}
          onSubmit={onSubmit}
          submitLabel={submitting ? 'Updating...' : 'Update Group'}
          cancelHref="/dashboard/group-products"
          showExternal
        />
      )}
    </div>
  );
}
