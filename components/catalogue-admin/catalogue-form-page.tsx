'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { EMPTY_CATALOGUE_FORM, type CatalogueRow, getFileNameFromPath, mapCatalogueToForm } from './shared';

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div className="form-text mt-1">{children}</div>;
}

export default function CatalogueFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_CATALOGUE_FORM);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const catalogueId = useMemo(() => {
    if (mode !== 'edit') {
      return null;
    }

    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const parsed = Number(raw ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [mode, params?.id]);

  useEffect(() => {
    if (mode !== 'edit') {
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!catalogueId) {
      setError('Invalid catalogue id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/catalogues/view/${catalogueId}`, token)
      .then((payload) => {
        const catalogue = payload as CatalogueRow;
        setForm(mapCatalogueToForm(catalogue));
        setCurrentFileUrl(catalogue.file_url ?? '');
        setCurrentFileName(getFileNameFromPath(catalogue.file));
        setCurrentImageUrl(catalogue.image_url ?? '');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load catalogue.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [catalogueId, mode, router]);

  useEffect(() => {
    if (!selectedImageFile) {
      setSelectedImageUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setSelectedImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onPdfChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedPdfFile(event.target.files?.[0] ?? null);
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImageFile(event.target.files?.[0] ?? null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !catalogueId) {
      setError('Invalid catalogue id.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const body = new FormData();
      body.append('name', form.name);
      body.append('fre_name', form.fre_name);

      if (selectedPdfFile) {
        body.append('file', selectedPdfFile);
      }

      if (selectedImageFile) {
        body.append('image', selectedImageFile);
      }

      const endpoint =
        mode === 'create' ? '/admin-api/catalogues/structured' : `/admin-api/catalogues/structured/${catalogueId}`;
      const response = (await adminPostForm(endpoint, token, body)) as { message?: string };
      const successMessage =
        response.message ?? (mode === 'create' ? 'Image is uploaded' : 'Catalogue file is updated successfully.');

      router.push(`/dashboard/catalogues?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save catalogue.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add Catalogues' : 'Edit Catalogues';
  const previewImage = selectedImageUrl || currentImageUrl;
  const previewFileName = selectedPdfFile?.name || currentFileName || 'No PDF selected yet';

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Catalogues', href: '/dashboard/catalogues' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-xl-8">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading catalogue...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  English and French names are required. Upload a PDF for the catalogue file and an image for the list
                  thumbnail.
                </div>

                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="name"
                    className="form-control"
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Add Name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="fre_name" className="form-label">
                    French Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fre_name"
                    className="form-control"
                    type="text"
                    value={form.fre_name}
                    onChange={(event) => updateField('fre_name', event.target.value)}
                    placeholder="Add French Name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="file" className="form-label">
                    Add File {mode === 'create' ? <span className="text-danger">*</span> : null}
                  </label>
                  <input
                    id="file"
                    className="form-control"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={onPdfChange}
                    required={mode === 'create'}
                  />
                  <FieldHint>Only PDF files are allowed.</FieldHint>
                </div>

                <div className="mb-4">
                  <label htmlFor="image" className="form-label">
                    Add Image {mode === 'create' ? <span className="text-danger">*</span> : null}
                  </label>
                  <input
                    id="image"
                    className="form-control"
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
                    onChange={onImageChange}
                    required={mode === 'create'}
                  />
                  <FieldHint>Use a square thumbnail image. JPG, JPEG, PNG, or SVG up to 512KB.</FieldHint>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => router.push('/dashboard/catalogues')}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </TableCard>
        </div>

        <div className="col-xl-4">
          <TableCard header={<h5 className="mb-0">Preview</h5>}>
            <div className="border rounded-3 overflow-hidden bg-light mb-3">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={form.name || 'Catalogue preview'}
                  className="w-100"
                  style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center text-muted"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  Image preview
                </div>
              )}
            </div>

            <div className="fw-semibold mb-1">{form.name.trim() || 'English catalogue name'}</div>
            <div className="text-muted mb-3">{form.fre_name.trim() || 'French catalogue name'}</div>

            <div className="small text-uppercase text-muted mb-1">PDF File</div>
            {currentFileUrl && !selectedPdfFile ? (
              <a href={currentFileUrl} target="_blank" rel="noreferrer" className="text-decoration-none">
                {previewFileName}
              </a>
            ) : (
              <div className="text-muted">{previewFileName}</div>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
