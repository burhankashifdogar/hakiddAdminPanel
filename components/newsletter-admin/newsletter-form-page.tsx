'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  EMPTY_NEWSLETTER_FORM,
  NEWSLETTER_IMAGE_ASPECT_RATIO,
  type NewsletterRow,
  mapNewsletterToForm,
} from './shared';

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div className="form-text mt-1">{children}</div>;
}

export default function NewsletterFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_NEWSLETTER_FORM);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const newsletterId = useMemo(() => {
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

    if (!newsletterId) {
      setError('Invalid newsletter id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/newsletters/view/${newsletterId}`, token)
      .then((payload) => {
        const newsletter = payload as NewsletterRow;
        setForm(mapNewsletterToForm(newsletter));
        setCurrentImageUrl(newsletter.img_url ?? '');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load newsletter.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mode, newsletterId, router]);

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

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImageFile(event.target.files?.[0] ?? null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !newsletterId) {
      setError('Invalid newsletter id.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const body = new FormData();
      body.append('header', form.header);
      body.append('fre_header', form.fre_header);
      body.append('sp_header', form.sp_header);
      body.append('link', form.link);

      if (selectedImageFile) {
        body.append('img', selectedImageFile);
      }

      const endpoint =
        mode === 'create' ? '/admin-api/newsletters/structured' : `/admin-api/newsletters/structured/${newsletterId}`;
      const response = (await adminPostForm(endpoint, token, body)) as { message?: string };
      const successMessage = response.message ?? (mode === 'create' ? 'Image is uploaded' : 'Image is updated');

      router.push(`/dashboard/newsletters?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save newsletter.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add Newsletter' : 'Edit Newsletter';
  const previewImage = selectedImageUrl || currentImageUrl;

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Newsletter', href: '/dashboard/newsletters' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-xl-8">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading newsletter...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  English and French headings are required. Spanish heading is optional. Upload one image and add the
                  target URL.
                </div>

                <div className="mb-3">
                  <label htmlFor="header" className="form-label">
                    Heading <span className="text-danger">*</span>
                  </label>
                  <input
                    id="header"
                    className="form-control"
                    type="text"
                    value={form.header}
                    onChange={(event) => updateField('header', event.target.value)}
                    placeholder="Add Heading"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="fre_header" className="form-label">
                    French Heading <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fre_header"
                    className="form-control"
                    type="text"
                    value={form.fre_header}
                    onChange={(event) => updateField('fre_header', event.target.value)}
                    placeholder="Add French Heading"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="sp_header" className="form-label">
                    Spanish Heading
                  </label>
                  <input
                    id="sp_header"
                    className="form-control"
                    type="text"
                    value={form.sp_header}
                    onChange={(event) => updateField('sp_header', event.target.value)}
                    placeholder="Add Spanish Heading"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="img" className="form-label">
                    Add File {mode === 'create' ? <span className="text-danger">*</span> : null}
                  </label>
                  <input
                    id="img"
                    className="form-control"
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
                    onChange={onImageChange}
                    required={mode === 'create'}
                  />
                  <FieldHint>Upload a JPG, JPEG, PNG, or SVG up to 500KB.</FieldHint>
                </div>

                <div className="mb-4">
                  <label htmlFor="link" className="form-label">
                    URL <span className="text-danger">*</span>
                  </label>
                  <input
                    id="link"
                    className="form-control"
                    type="url"
                    value={form.link}
                    onChange={(event) => updateField('link', event.target.value)}
                    placeholder="Enter URL"
                    required
                  />
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => router.push('/dashboard/newsletters')}>
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
                  alt={form.header || 'Newsletter preview'}
                  className="w-100"
                  style={{ aspectRatio: NEWSLETTER_IMAGE_ASPECT_RATIO, objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center text-muted"
                  style={{ aspectRatio: NEWSLETTER_IMAGE_ASPECT_RATIO }}
                >
                  Image preview
                </div>
              )}
            </div>

            <div className="fw-semibold mb-1">{form.header.trim() || 'English heading'}</div>
            <div className="text-muted mb-1">{form.fre_header.trim() || 'French heading'}</div>
            <div className="text-muted mb-3">{form.sp_header.trim() || 'Spanish heading'}</div>
            <div className="small text-uppercase text-muted mb-1">URL</div>
            <div className="text-break">{form.link.trim() || 'https://example.com'}</div>
          </TableCard>
        </div>
      </div>
    </div>
  );
}
