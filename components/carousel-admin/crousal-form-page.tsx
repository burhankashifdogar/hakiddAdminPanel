'use client';

import { ChangeEvent, FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type CrousalRow, EMPTY_CROUSAL_FORM, mapCrousalToForm } from './shared';

function FieldHint({ children }: { children: ReactNode }) {
  return <div className="form-text mt-1">{children}</div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h6 className="mb-1">{title}</h6>
      <p className="text-muted mb-0">{description}</p>
    </div>
  );
}

export default function CrousalFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_CROUSAL_FORM);
  const [currentMainImageUrl, setCurrentMainImageUrl] = useState('');
  const [currentMobileImageUrl, setCurrentMobileImageUrl] = useState('');
  const [currentTabImageUrl, setCurrentTabImageUrl] = useState('');
  const [selectedMainImage, setSelectedMainImage] = useState<File | null>(null);
  const [selectedMobileImage, setSelectedMobileImage] = useState<File | null>(null);
  const [selectedTabImage, setSelectedTabImage] = useState<File | null>(null);
  const [mainPreviewUrl, setMainPreviewUrl] = useState('');
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState('');
  const [tabPreviewUrl, setTabPreviewUrl] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const crousalId = useMemo(() => {
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

    if (!crousalId) {
      setError('Invalid carousel id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/crousals/view/${crousalId}`, token)
      .then((payload) => {
        const crousal = payload as CrousalRow;
        setForm(mapCrousalToForm(crousal));
        setCurrentMainImageUrl(crousal.img_url ?? '');
        setCurrentMobileImageUrl(crousal.mbl_img_url ?? '');
        setCurrentTabImageUrl(crousal.tab_img_url ?? '');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load carousel item.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [crousalId, mode, router]);

  useEffect(() => {
    if (!selectedMainImage) {
      setMainPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedMainImage);
    setMainPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedMainImage]);

  useEffect(() => {
    if (!selectedMobileImage) {
      setMobilePreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedMobileImage);
    setMobilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedMobileImage]);

  useEffect(() => {
    if (!selectedTabImage) {
      setTabPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedTabImage);
    setTabPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedTabImage]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onMainImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedMainImage(event.target.files?.[0] ?? null);
  }

  function onMobileImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedMobileImage(event.target.files?.[0] ?? null);
  }

  function onTabImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedTabImage(event.target.files?.[0] ?? null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !crousalId) {
      setError('Invalid carousel id.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    const body = new FormData();
    body.append('header', form.header);
    body.append('fre_header', form.fre_header);
    body.append('sp_header', form.sp_header);
    body.append('text', form.text);
    body.append('fre_text', form.fre_text);
    body.append('sp_text', form.sp_text);
    body.append('link', form.link);

    if (selectedMainImage) {
      body.append('img', selectedMainImage);
    }

    if (selectedMobileImage) {
      body.append('mbl_img', selectedMobileImage);
    }

    if (selectedTabImage) {
      body.append('tab_img', selectedTabImage);
    }

    try {
      const endpoint =
        mode === 'create' ? '/admin-api/crousals/structured' : `/admin-api/crousals/structured/${crousalId}`;
      const response = (await adminPostForm(endpoint, token, body)) as { message?: string };
      const successMessage = response.message ?? (mode === 'create' ? 'Image is uploaded' : 'Image is updated');

      router.push(`/dashboard/crousals?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save carousel item.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add Carousel' : 'Edit Carousel';
  const previewHeading = form.header.trim() || 'Heading preview';
  const previewSubHeading = form.text.trim() || 'Sub heading preview';
  const previewDesktopImage = mainPreviewUrl || currentMainImageUrl;
  const previewMobileImage = mobilePreviewUrl || currentMobileImageUrl;
  const previewTabImage = tabPreviewUrl || currentTabImageUrl;

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Carousel', href: '/dashboard/crousals' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading carousel item...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  This form creates one desktop, mobile, and tablet carousel image set. The page follows Laravel’s
                  carousel flow and keeps a maximum of 10 items.
                </div>

                <div className="row g-4">
                  <div className="col-xl-8">
                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="English Copy"
                        description="This is the primary heading and sub heading shown in the main preview."
                      />

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

                      <div className="mb-0">
                        <label htmlFor="text" className="form-label">
                          Sub Heading <span className="text-danger">*</span>
                        </label>
                        <input
                          id="text"
                          className="form-control"
                          type="text"
                          value={form.text}
                          onChange={(event) => updateField('text', event.target.value)}
                          placeholder="Add Sub Heading"
                          required
                        />
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="French & Spanish Copy"
                        description="Provide localized headings and sub headings for the alternate storefront languages."
                      />

                      <div className="row g-3">
                        <div className="col-md-6">
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

                        <div className="col-md-6">
                          <label htmlFor="sp_header" className="form-label">
                            Spanish Heading <span className="text-danger">*</span>
                          </label>
                          <input
                            id="sp_header"
                            className="form-control"
                            type="text"
                            value={form.sp_header}
                            onChange={(event) => updateField('sp_header', event.target.value)}
                            placeholder="Add Spanish Heading"
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="fre_text" className="form-label">
                            French Sub Heading <span className="text-danger">*</span>
                          </label>
                          <input
                            id="fre_text"
                            className="form-control"
                            type="text"
                            value={form.fre_text}
                            onChange={(event) => updateField('fre_text', event.target.value)}
                            placeholder="Add French Sub Heading"
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label htmlFor="sp_text" className="form-label">
                            Spanish Sub Heading <span className="text-danger">*</span>
                          </label>
                          <input
                            id="sp_text"
                            className="form-control"
                            type="text"
                            value={form.sp_text}
                            onChange={(event) => updateField('sp_text', event.target.value)}
                            placeholder="Add Spanish Sub Heading"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4">
                      <SectionTitle
                        title="Images & Link"
                        description="Upload one image for desktop, one for mobile, one for tablet, then set the destination URL."
                      />

                      <div className="mb-3">
                        <label htmlFor="img" className="form-label">
                          Add File {mode === 'create' ? <span className="text-danger">*</span> : null}
                        </label>
                        <input
                          id="img"
                          className="form-control"
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.svg,.webp,image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                          onChange={onMainImageChange}
                          required={mode === 'create'}
                        />
                        <FieldHint>Desktop image. Laravel note: 4000x1146.</FieldHint>
                      </div>

                      <div className="mb-3">
                        <label htmlFor="tab_img" className="form-label">
                          Add Tab Image {mode === 'create' ? <span className="text-danger">*</span> : null}
                        </label>
                        <input
                          id="tab_img"
                          className="form-control"
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.svg,.webp,image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                          onChange={onTabImageChange}
                          required={mode === 'create'}
                        />
                        <FieldHint>Tablet image. Laravel note: 4000x1146.</FieldHint>
                      </div>

                      <div className="mb-3">
                        <label htmlFor="mbl_img" className="form-label">
                          Add Mobile Side Image {mode === 'create' ? <span className="text-danger">*</span> : null}
                        </label>
                        <input
                          id="mbl_img"
                          className="form-control"
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.svg,.webp,image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                          onChange={onMobileImageChange}
                          required={mode === 'create'}
                        />
                        <FieldHint>Mobile image. Laravel note: 380x320.</FieldHint>
                      </div>

                      <div className="mb-0">
                        <label htmlFor="link" className="form-label">
                          URL <span className="text-danger">*</span>
                        </label>
                        <input
                          id="link"
                          className="form-control"
                          type="url"
                          value={form.link}
                          onChange={(event) => updateField('link', event.target.value)}
                          placeholder="https://example.com/page"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-4">
                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Preview"
                        description="Quick visual check for the English copy and the three image sizes."
                      />

                      <div className="fw-semibold mb-1">{previewHeading}</div>
                      <div className="text-muted mb-3">{previewSubHeading}</div>

                      <div className="small text-uppercase text-muted mb-1">Desktop</div>
                      <div className="border rounded overflow-hidden bg-light mb-3">
                        {previewDesktopImage ? (
                          <img src={previewDesktopImage} alt={previewHeading} className="w-100" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="py-5 text-center text-muted">Desktop image preview</div>
                        )}
                      </div>

                      <div className="small text-uppercase text-muted mb-1">Tablet</div>
                      <div className="border rounded overflow-hidden bg-light mb-3">
                        {previewTabImage ? (
                          <img src={previewTabImage} alt={`${previewHeading} tablet`} className="w-100" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="py-5 text-center text-muted">Tablet image preview</div>
                        )}
                      </div>

                      <div className="small text-uppercase text-muted mb-1">Mobile</div>
                      <div className="border rounded overflow-hidden bg-light">
                        {previewMobileImage ? (
                          <img
                            src={previewMobileImage}
                            alt={`${previewHeading} mobile`}
                            className="w-100"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="py-5 text-center text-muted">Mobile image preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => router.push('/dashboard/crousals')}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
