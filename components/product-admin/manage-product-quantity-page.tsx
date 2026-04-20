'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';

export default function ManageProductQuantityPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [quantityPercentage, setQuantityPercentage] = useState('');
  const [quantityMessage, setQuantityMessage] = useState('Currently Out Of Stock.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    adminGet('/admin-api/on-sale-products/config', token)
      .then((payload) => {
        const data = payload as { quantity?: { quantity?: number; quantity_message?: string } | null };
        setQuantityPercentage(String(data.quantity?.quantity ?? ''));
        setQuantityMessage(data.quantity?.quantity_message ?? 'Currently Out Of Stock.');
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load quantity configuration'))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveQuantityConfig(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await adminPut('/admin-api/on-sale-products/config', token, {
        quantity_percentage: quantityPercentage,
        quantity_message: quantityMessage,
      });
      setMessage('Quantities Percentage Stored Successfully!');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save quantity configuration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Manage Product Quantity"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products' },
          { label: 'Manage Product Quantity' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard header={<h5 className="mb-0">Manage Product Quantity</h5>}>
        {loading ? (
          <p className="mb-0 text-muted">Loading quantity configuration...</p>
        ) : (
          <form onSubmit={saveQuantityConfig}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Quantity Multiplier (%)</label>
                <input
                  type="text"
                  className="form-control"
                  value={quantityPercentage}
                  onChange={(event) => setQuantityPercentage(event.target.value)}
                  placeholder="e.g., 80"
                  required
                />
                <small className="form-text text-muted">Enter the percentage as a whole number.</small>
              </div>
              <div className="col-md-6">
                <label className="form-label">Quantity Message</label>
                <input
                  type="text"
                  className="form-control"
                  value={quantityMessage}
                  onChange={(event) => setQuantityMessage(event.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Saving...' : 'Save Quantity'}
            </button>
          </form>
        )}
      </TableCard>
    </div>
  );
}
