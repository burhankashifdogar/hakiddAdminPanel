'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPost } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';
import { emptyProductGroupItemRow, ProductGroupItemCreateRow, setProductGroupItemFlash } from './product-group-item-shared';

export default function CreateProductGroupItemPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Array<{ id: string; title: string }>>([]);
  const [pgId, setPgId] = useState('');
  const [status, setStatus] = useState('active');
  const [items, setItems] = useState<ProductGroupItemCreateRow[]>([emptyProductGroupItemRow()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    adminGet('/admin-api/group-products?page=1&per_page=500', token)
      .then((payload) => {
        const rows = (payload as { data?: Record<string, unknown>[] }).data ?? [];
        setGroups(
          rows.map((row) => ({
            id: String(row.id ?? ''),
            title: String(row.title ?? `Group ${row.id ?? ''}`),
          })),
        );
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load product groups'))
      .finally(() => setLoading(false));
  }, [router]);

  function updateItem(index: number, field: keyof ProductGroupItemCreateRow, value: string) {
    setItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItemRow() {
    setItems((current) => [...current, emptyProductGroupItemRow()]);
  }

  function removeItemRow(index: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((_item, currentIndex) => currentIndex !== index)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      for (const item of items) {
        await adminPost('/admin-api/product-group-items', token, {
          pg_id: pgId,
          pg_product_id: item.pg_product_id.trim(),
          sequence: Number(item.sequence),
          status,
        });
      }
      setProductGroupItemFlash('Product Group Item(s) added successfully!');
      router.push('/dashboard/product-group-items');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create product group item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Create Product Group Item"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Product Group Items', href: '/dashboard/product-group-items' },
          { label: 'Create Group Item' },
        ]}
      />
      <AlertStack error={error} />
      <TableCard header={<h5 className="mb-0">Add New Product Group Item</h5>}>
        {loading ? (
          <p className="mb-0">Loading product groups...</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label">Product Group</label>
              <select className="form-control" value={pgId} onChange={(event) => setPgId(event.target.value)} required>
                <option value="">Select a Product Group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
            </div>

            <div id="product-item-container">
              {items.map((item, index) => (
                <div className="row mb-3" key={`item-${index}`}>
                  <div className="col-md-5">
                    <label className="form-label">Product ID</label>
                    <input
                      type="number"
                      className="form-control"
                      value={item.pg_product_id}
                      placeholder="Enter Product ID"
                      onChange={(event) => updateItem(index, 'pg_product_id', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">Sequence</label>
                    <input
                      type="number"
                      className="form-control"
                      value={item.sequence}
                      placeholder="Enter sequence number"
                      onChange={(event) => updateItem(index, 'sequence', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-center justify-content-center">
                    <button type="button" className="btn btn-danger remove-item mt-4" onClick={() => removeItemRow(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3">
              <button type="button" className="btn btn-secondary" onClick={addItemRow}>
                Add Another Product
              </button>
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Item'}
              </button>
              <Link href="/dashboard/product-group-items" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </TableCard>
    </div>
  );
}
