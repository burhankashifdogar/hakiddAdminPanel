'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { getAdminImageUrl } from '@/lib/assets';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from './common';

type ClassCodeDetail = {
  id: number;
  class: string;
  image: string | null;
  image_url?: string | null;
  status: number;
};

function getImageUrl(detail: ClassCodeDetail | null) {
  if (!detail?.image) {
    return null;
  }

  return getAdminImageUrl(detail.image_url || detail.image);
}

export default function ClassCodeEditPage({ id }: { id: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ClassCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClassCode = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet(`/admin-api/class-codes/${id}`, token)) as ClassCodeDetail;
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load class code.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadClassCode();
  }, [loadClassCode]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !file) {
      return;
    }

    const body = new FormData();
    body.append('image', file);

    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      await adminPostForm(`/admin-api/class-codes/${id}/image`, token, body);
      setMessage('Class code is updated');
      setFile(null);
      await loadClassCode();
      router.push('/dashboard/class-codes');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update class code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Class Codes"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Class Codes', href: '/dashboard/class-codes' },
          { label: 'Edit' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard header={<h5 className="mb-0">Class Code</h5>}>
        {loading ? (
          <p className="mb-0">Loading class code...</p>
        ) : detail ? (
          <form onSubmit={onSubmit}>
            <div>
              <div className="form-group mb-3">
                <label className="form-label">Class Code</label>
                <input className="form-control" type="text" value={formatValue(detail.class)} readOnly />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Current Image</label>
                {getImageUrl(detail) ? (
                  <div>
                    <img
                      src={getImageUrl(detail) ?? ''}
                      alt={detail.class}
                      className="rounded border"
                      style={{ width: 120, height: 120, objectFit: 'contain', padding: 8 }}
                    />
                  </div>
                ) : (
                  <div className="text-muted">No image uploaded.</div>
                )}
              </div>

              <div className="form-group mb-4">
                <label className="form-label">File</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={!file || submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <Link href="/dashboard/class-codes" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <p className="mb-0">Class code not found.</p>
        )}
      </TableCard>
    </div>
  );
}
