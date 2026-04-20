'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPostFormWithProgress } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from './common';

type ThumbnailSelection = {
  file: File;
  previewUrl: string;
};

export default function BulkThumbnailsPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selections, setSelections] = useState<ThumbnailSelection[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  function appendFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const nextSelections = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelections((current) => [...current, ...nextSelections]);
  }

  function removeSelection(index: number) {
    setSelections((current) => {
      const target = current[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  async function uploadThumbnails(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || selections.length === 0) {
      return;
    }

    const body = new FormData();
    selections.forEach((selection) => body.append('thumbnails', selection.file));

    try {
      setUploading(true);
      setError('');
      setMessage('');
      const response = (await adminPostFormWithProgress('/admin-api/products/bulk-thumbnails/upload', token, body, setUploadProgress)) as {
        message?: string;
      };
      selections.forEach((selection) => URL.revokeObjectURL(selection.previewUrl));
      setSelections([]);
      setMessage(response.message ?? 'Thumbnails uploaded successfully.');
      setUploadProgress(0);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload thumbnails.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Thumbnail Image Upload"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products', href: '/dashboard/products' },
          { label: 'Thumbnail Image Upload' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard header={<h5 className="mb-0">Upload Thumbnail Images</h5>}>
        <form onSubmit={uploadThumbnails}>
          <div className="form-group">
            <div className="d-flex align-items-center">
              <label className="btn btn-outline-secondary btn-sm mb-0">
                <i className="fa fa-plus" /> Add Thumbnails
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    appendFiles(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
            {selections.map((selection, index) => (
              <div key={`${selection.file.name}-${index}`} className="text-center position-relative" style={{ marginRight: 10 }}>
                <img
                  src={selection.previewUrl}
                  alt={selection.file.name}
                  className="img-thumbnail mr-2 mb-2"
                  style={{ width: 100, height: 100, objectFit: 'cover' }}
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm position-absolute"
                  style={{ top: 5, right: 5 }}
                  onClick={() => removeSelection(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-success btn-sm mt-3" type="submit" disabled={uploading || selections.length === 0}>
            {uploading ? 'Uploading...' : 'Upload Now'}
          </button>

          {uploading ? (
            <div className="mt-3">
              <progress value={uploadProgress} max="100" />
              <span className="ms-2">{uploadProgress}%</span>
            </div>
          ) : null}

          <p className="mt-2" style={{ fontSize: '0.9em', color: '#333' }}>
            <strong>Important:</strong> Each product should have one thumbnail image sized at <strong>150 x 150 px</strong>,
            named as <code>product_id.jpg</code> (for example, <code>93939.jpg</code>). Please note that only one thumbnail
            is required per product.
          </p>
        </form>
      </TableCard>
    </div>
  );
}
