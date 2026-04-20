'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { EMPTY_PATTERN_FORM, type PatternRow, getFileNameFromPath, mapPatternToForm } from './shared';

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div className="form-text mt-1">{children}</div>;
}

export default function PatternFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_PATTERN_FORM);
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

  const patternId = useMemo(() => {
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

    if (!patternId) {
      setError('Invalid pattern id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/patterns/view/${patternId}`, token)
      .then((payload) => {
        const pattern = payload as PatternRow;
        setForm(mapPatternToForm(pattern));
        setCurrentFileUrl(pattern.file_url ?? '');
        setCurrentFileName(getFileNameFromPath(pattern.file));
        setCurrentImageUrl(pattern.image_url ?? '');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load free pattern.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mode, patternId, router]);

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

    if (mode === 'edit' && !patternId) {
      setError('Invalid pattern id.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const body = new FormData();
      body.append('name', form.name);
      body.append('fre_name', form.fre_name);
      body.append('sp_name', form.sp_name);

      if (selectedPdfFile) {
        body.append('file', selectedPdfFile);
      }

      if (selectedImageFile) {
        body.append('image', selectedImageFile);
      }

      const endpoint = mode === 'create' ? '/admin-api/patterns/structured' : `/admin-api/patterns/structured/${patternId}`;
      const response = (await adminPostForm(endpoint, token, body)) as { message?: string };
      const successMessage =
        response.message ?? (mode === 'create' ? 'file is uploaded' : 'Pattern file is updated successfully.');

      router.push(`/dashboard/patterns?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save free pattern.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add Patterns' : 'Edit Patterns';
  const previewImage = selectedImageUrl || currentImageUrl;
  const previewFileName = selectedPdfFile?.name || currentFileName || 'No PDF selected yet';

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Patterns', href: '/dashboard/patterns' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-xl-8">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading free pattern...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  English, French, and Spanish names are required. Upload a PDF for the free pattern file and a square
                  image for the listing.
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
                  <label htmlFor="sp_name" className="form-label">
                    Spanish Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="sp_name"
                    className="form-control"
                    type="text"
                    value={form.sp_name}
                    onChange={(event) => updateField('sp_name', event.target.value)}
                    placeholder="Add Spanish Name"
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
                  <FieldHint>Use a 250x250 thumbnail image. JPG, JPEG, PNG, or SVG up to 512KB.</FieldHint>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => router.push('/dashboard/patterns')}>
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
                  alt={form.name || 'Pattern preview'}
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

            <div className="fw-semibold mb-1">{form.name.trim() || 'English pattern name'}</div>
            <div className="text-muted mb-1">{form.fre_name.trim() || 'French pattern name'}</div>
            <div className="text-muted mb-3">{form.sp_name.trim() || 'Spanish pattern name'}</div>

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
