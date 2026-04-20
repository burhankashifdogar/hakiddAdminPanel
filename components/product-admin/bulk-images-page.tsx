'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPostForm, adminPostFormWithProgress } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';

export default function BulkImagesPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<null | { records_before: number; records_after: number; new_records: number }>(
    null,
  );

  async function uploadImages(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || imageFiles.length === 0) {
      return;
    }

    const body = new FormData();
    imageFiles.forEach((file) => body.append('images', file));

    try {
      setUploading(true);
      setError('');
      setMessage('');
      setImportSummary(null);
      const response = (await adminPostFormWithProgress('/admin-api/products/bulk-images/upload', token, body, setUploadProgress)) as {
        message?: string;
      };
      setMessage(response.message ?? 'Images are successfully uploaded to S3.');
      setImageFiles([]);
      setUploadProgress(0);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload images.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function importCsv(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !csvFile) {
      return;
    }

    const body = new FormData();
    body.append('file', csvFile);

    try {
      setImporting(true);
      setError('');
      setMessage('');
      const response = (await adminPostForm('/admin-api/products/bulk-images/import', token, body)) as {
        message?: string;
        records_before?: number;
        records_after?: number;
        new_records?: number;
      };
      setMessage(response.message ?? 'Images imported successfully');
      setImportSummary({
        records_before: Number(response.records_before ?? 0),
        records_after: Number(response.records_after ?? 0),
        new_records: Number(response.new_records ?? 0),
      });
      setCsvFile(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import image CSV.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Bulk Images Upload"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Bulk Images Upload' },
        ]}
      />
      <AlertStack error={error} message={message} />

      {importSummary ? (
        <div className="alert alert-info" role="alert">
          Records before: {importSummary.records_before} | Records after: {importSummary.records_after} | New records added:{' '}
          {importSummary.new_records}
        </div>
      ) : null}

      <TableCard header={<h5 className="mb-0">Upload Bulk Images for Product</h5>}>
        <div className="d-flex flex-column gap-5">
          <form onSubmit={uploadImages} className="d-flex flex-column align-items-start w-100">
            <div className="d-flex gap-3 w-100 align-items-center">
              <div className="flex-grow-1">
                <label className="form-label text-primary mb-1">Please upload images:</label>
                <input
                  type="file"
                  className="form-control border-primary mb-3"
                  multiple
                  accept="image/*"
                  onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
                  required
                />
              </div>
              <div className="ml-3 mt-2">
                <button type="submit" className="btn btn-success" style={{ whiteSpace: 'nowrap' }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </button>
              </div>
            </div>

            {uploading ? (
              <div style={{ width: '100%' }} className="mt-3">
                <label className="form-label">Upload Progress:</label>
                <progress value={uploadProgress} max="100" style={{ width: '100%' }} />
                <span>{uploadProgress}%</span>
              </div>
            ) : null}
          </form>

          <form onSubmit={importCsv} className="d-flex flex-column align-items-start w-100">
            <div className="d-flex gap-3 w-100 align-items-center">
              <div className="flex-grow-1">
                <label className="form-label text-primary mb-1">Please upload a CSV file:</label>
                <input
                  type="file"
                  className="form-control border-primary mb-3"
                  accept=".csv,text/csv"
                  onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="ml-3 mt-2">
                <button type="submit" className="btn btn-success" disabled={importing}>
                  {importing ? 'Importing...' : 'Import CSV'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </TableCard>
    </div>
  );
}
