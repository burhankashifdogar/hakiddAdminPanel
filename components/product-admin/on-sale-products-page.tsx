'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPostForm } from '@/lib/api';
import SpecialProductLists from './special-product-lists';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';

export default function OnSaleProductsPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  // Bumped after a successful upload to remount the list below so it refetches.
  const [reloadToken, setReloadToken] = useState(0);

  async function importSpecialProducts(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !file) {
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('start_date', startDate);
    body.append('end_date', endDate);

    try {
      setImporting(true);
      setError('');
      setMessage('');
      await adminPostForm('/admin-api/on-sale-products/import', token, body);
      setMessage('Special products uploaded successfully');
      setFile(null);
      setFileInputKey((current) => current + 1);
      setReloadToken((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import on-sale products');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="On Sale Trigger"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products' },
          { label: 'On Sale Trigger' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard
        header={
          <div>
            <h5 className="mb-1">Upload Sale &amp; Clearance Prices</h5>
            <small className="text-muted">
              Upload a CSV to add or update sale prices. The current On Sale and Clearance products are listed below.
            </small>
          </div>
        }
      >
        <form onSubmit={importSpecialProducts}>
          <div className="row g-3 align-items-end mb-2">
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Upload CSV File</label>
              <input
                key={fileInputKey}
                type="file"
                className="form-control"
                accept=".csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100" disabled={!file || importing}>
                {importing ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
          <small className="text-muted">Start and end dates apply to every row in the uploaded file.</small>
        </form>

        <hr className="my-4" />

        <SpecialProductLists key={reloadToken} />
      </TableCard>
    </div>
  );
}
