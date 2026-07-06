'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';

export default function ClassCodeCreatePage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [status, setStatus] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    const trimmed = classCode.trim();
    if (!trimmed) {
      setError('Class code is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const created = (await adminPost('/admin-api/class-codes', token, { class: trimmed, status })) as {
        id?: number | string;
      };
      const newId = Number(created?.id);

      if (file && Number.isFinite(newId) && newId > 0) {
        const body = new FormData();
        body.append('image', file);
        await adminPostForm(`/admin-api/class-codes/${newId}/image`, token, body);
      }

      setMessage('Class code created.');
      router.push('/dashboard/class-codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class code.');
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
          { label: 'Create' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard header={<h5 className="mb-0">Create Class Code</h5>}>
        <form onSubmit={onSubmit}>
          <div className="form-group mb-3">
            <label className="form-label">Class Code</label>
            <input
              className="form-control"
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              placeholder="Enter class code"
              required
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Image</label>
            <input
              className="form-control"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="form-text">Optional. You can also add or change the image later.</div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={submitting || !classCode.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <Link href="/dashboard/class-codes" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </TableCard>
    </div>
  );
}
