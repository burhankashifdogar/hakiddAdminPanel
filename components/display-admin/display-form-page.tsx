'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type DisplayRow, EMPTY_DISPLAY_FORM, mapDisplayToForm } from './shared';

function FieldHint({ children }: { children: ReactNode }) {
  return <div className="form-text mt-1">{children}</div>;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3">
      <h6 className="mb-1">{title}</h6>
      <p className="text-muted mb-0">{description}</p>
    </div>
  );
}

export default function DisplayFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_DISPLAY_FORM);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const displayId = useMemo(() => {
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

    if (!displayId) {
      setError('Invalid display id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/displays/view/${displayId}`, token)
      .then((payload) => {
        const display = payload as DisplayRow;
        setForm(mapDisplayToForm(display));
        setCurrentImageUrl(display.image_url ?? '');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load home page ad.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [displayId, mode, router]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  useEffect(() => {
    if (!selectedFile) {
      setSelectedImageUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !displayId) {
      setError('Invalid display id.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    const body = new FormData();
    body.append('link', form.link);
    body.append('heading', form.heading);
    body.append('fre_heading', form.fre_heading);
    body.append('sp_heading', form.sp_heading);
    body.append('text', form.text);
    body.append('fre_text', form.fre_text);
    body.append('sp_text', form.sp_text);
    body.append('button_text', form.button_text);
    body.append('fr_button_text', form.fr_button_text);
    body.append('sp_button_text', form.sp_button_text);

    if (selectedFile) {
      body.append('image', selectedFile);
    }

    try {
      const endpoint =
        mode === 'create' ? '/admin-api/displays/structured' : `/admin-api/displays/structured/${displayId}`;
      const response = (await adminPostForm(endpoint, token, body)) as { message?: string };
      const successMessage =
        response.message ?? (mode === 'create' ? 'Category successfully uploaded.' : 'Category updated successfully.');

      router.push(`/dashboard/displays?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save home page ad.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add Home Page Ads' : 'Edit Home Page Ads';
  const previewImageUrl = selectedImageUrl || currentImageUrl;
  const previewHeading = form.heading.trim() || 'English heading preview';
  const previewText = form.text.trim() || 'The text you enter here will appear in the ad preview.';
  const previewButton = form.button_text.trim() || 'Shop now';

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Home Page Ads', href: '/dashboard/displays' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading home page ad...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  <div className="fw-semibold mb-1">What this form creates</div>
                  <div className="small">
                    One homepage ad with shared link and image, plus English, French, and Spanish copy. Laravel only allows
                    up to <strong>3</strong> homepage ads at a time.
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-xl-8">
                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Placement & Media"
                        description="Set the destination link and the image used across all language versions."
                      />

                      <div className="mb-3">
                        <label htmlFor="link" className="form-label">
                          Link of Category <span className="text-danger">*</span>
                        </label>
                        <input
                          id="link"
                          className="form-control"
                          type="text"
                          value={form.link}
                          onChange={(event) => updateField('link', event.target.value)}
                          placeholder="/categories/embroidery or full URL"
                          required
                        />
                        <FieldHint>Where the banner should send the user after clicking.</FieldHint>
                      </div>

                      <div className="mb-0">
                        <label htmlFor="image" className="form-label">
                          Banner Image {mode === 'create' ? <span className="text-danger">*</span> : null}
                        </label>
                        <input
                          id="image"
                          className="form-control"
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.svg"
                          onChange={onFileChange}
                          required={mode === 'create'}
                        />
                        <FieldHint>Recommended size: 590x320. JPG, PNG, GIF, or SVG. Max 5MB.</FieldHint>
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="English Copy"
                        description="This content drives the preview on the right and is the default site language."
                      />

                      <div className="mb-3">
                        <label htmlFor="heading" className="form-label">
                          Heading <span className="text-danger">*</span>
                        </label>
                        <input
                          id="heading"
                          className="form-control"
                          type="text"
                          value={form.heading}
                          onChange={(event) => updateField('heading', event.target.value)}
                          placeholder="Add Heading"
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="text" className="form-label">
                          Text <span className="text-danger">*</span>
                        </label>
                        <input
                          id="text"
                          className="form-control"
                          type="text"
                          value={form.text}
                          onChange={(event) => updateField('text', event.target.value)}
                          placeholder="Add Text"
                          required
                        />
                      </div>

                      <div className="mb-0">
                        <label htmlFor="button_text" className="form-label">
                          Button Text <span className="text-muted">(Optional)</span>
                        </label>
                        <input
                          id="button_text"
                          className="form-control"
                          type="text"
                          value={form.button_text}
                          onChange={(event) => updateField('button_text', event.target.value)}
                          placeholder="Add Button text"
                        />
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="French Copy"
                        description="Localized heading, body text, and optional button label for French visitors."
                      />

                      <div className="mb-3">
                        <label htmlFor="fre_heading" className="form-label">
                          French Heading <span className="text-danger">*</span>
                        </label>
                        <input
                          id="fre_heading"
                          className="form-control"
                          type="text"
                          value={form.fre_heading}
                          onChange={(event) => updateField('fre_heading', event.target.value)}
                          placeholder="Add French Heading"
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="fre_text" className="form-label">
                          French Text <span className="text-danger">*</span>
                        </label>
                        <input
                          id="fre_text"
                          className="form-control"
                          type="text"
                          value={form.fre_text}
                          onChange={(event) => updateField('fre_text', event.target.value)}
                          placeholder="Add French Text"
                          required
                        />
                      </div>

                      <div className="mb-0">
                        <label htmlFor="fr_button_text" className="form-label">
                          French Button Text <span className="text-muted">(Optional)</span>
                        </label>
                        <input
                          id="fr_button_text"
                          className="form-control"
                          type="text"
                          value={form.fr_button_text}
                          onChange={(event) => updateField('fr_button_text', event.target.value)}
                          placeholder="Add French Button text"
                        />
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Spanish Copy"
                        description="Localized heading, body text, and optional button label for Spanish visitors."
                      />

                      <div className="mb-3">
                        <label htmlFor="sp_heading" className="form-label">
                          Spanish Heading <span className="text-danger">*</span>
                        </label>
                        <input
                          id="sp_heading"
                          className="form-control"
                          type="text"
                          value={form.sp_heading}
                          onChange={(event) => updateField('sp_heading', event.target.value)}
                          placeholder="Add Spanish Heading"
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="sp_text" className="form-label">
                          Spanish Text <span className="text-danger">*</span>
                        </label>
                        <input
                          id="sp_text"
                          className="form-control"
                          type="text"
                          value={form.sp_text}
                          onChange={(event) => updateField('sp_text', event.target.value)}
                          placeholder="Add Spanish Text"
                          required
                        />
                      </div>

                      <div className="mb-0">
                        <label htmlFor="sp_button_text" className="form-label">
                          Spanish Button Text <span className="text-muted">(Optional)</span>
                        </label>
                        <input
                          id="sp_button_text"
                          className="form-control"
                          type="text"
                          value={form.sp_button_text}
                          onChange={(event) => updateField('sp_button_text', event.target.value)}
                          placeholder="Add Spanish Button text"
                        />
                      </div>
                    </div>

                    <div className="pt-0">
                      <button className="btn btn-primary me-2" type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : mode === 'create' ? 'Create Home Page Ad' : 'Update Home Page Ad'}
                      </button>
                      <Link href="/dashboard/displays" className="btn btn-secondary">
                        Cancel
                      </Link>
                    </div>
                  </div>

                  <div className="col-xl-4">
                    <div className="position-sticky" style={{ top: 24 }}>
                      <div className="border rounded-3 p-3 p-md-4 mb-4 bg-light-subtle">
                        <SectionTitle
                          title="Live Preview"
                          description="Quickly check heading, copy, button text, and image before saving."
                        />

                        <div className="border rounded-3 overflow-hidden bg-white">
                          <div
                            className="w-100 border-bottom"
                            style={{
                              aspectRatio: '590 / 320',
                              background: previewImageUrl
                                ? `center / cover no-repeat url(${previewImageUrl})`
                                : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                            }}
                          />
                          <div className="p-3">
                            <div className="small text-uppercase text-muted mb-2">English Preview</div>
                            <h5 className="mb-2">{previewHeading}</h5>
                            <p className="text-muted mb-3">{previewText}</p>
                            <button type="button" className="btn btn-outline-primary btn-sm" disabled>
                              {previewButton}
                            </button>
                          </div>
                        </div>

                        {mode === 'edit' && currentImageUrl && !selectedImageUrl ? (
                          <div className="small text-muted mt-2">Showing the current saved image.</div>
                        ) : null}
                        {selectedFile ? (
                          <div className="small text-muted mt-2">Selected file: {selectedFile.name}</div>
                        ) : null}
                      </div>

                      <div className="border rounded-3 p-3 p-md-4">
                        <SectionTitle
                          title="Quick Checklist"
                          description="Use this to avoid incomplete ad entries."
                        />
                        <ul className="mb-0 ps-3 text-muted">
                          <li>Link points to the intended category or landing page.</li>
                          <li>English, French, and Spanish copy are all filled in.</li>
                          <li>Button text is only needed if the ad design uses a CTA.</li>
                          <li>Image matches the recommended 590x320 ratio.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
