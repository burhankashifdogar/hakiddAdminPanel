'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPost, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  BANNER_SUPPORTED_LANGUAGES,
  BANNER_TYPE_OPTIONS,
  EMPTY_BANNER_FORM,
  type BannerFormState,
  type BannerRow,
  mapBannerToForm,
} from './shared';

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

function LanguagePanel({
  badge,
  field,
  label,
  value,
  placeholder,
  onChange,
  hint,
}: {
  badge: string;
  field: 'message_en' | 'message_fr' | 'message_es';
  label: string;
  value: string;
  placeholder: string;
  onChange: (field: 'message_en' | 'message_fr' | 'message_es', value: string) => void;
  hint?: string;
}) {
  return (
    <div className="border rounded-3 p-3 h-100">
      <label htmlFor={field} className="form-label d-flex align-items-center gap-2">
        <span className="badge bg-secondary">{badge}</span>
        {label}
      </label>
      <textarea
        id={field}
        className="form-control"
        rows={field === 'message_en' ? 4 : 5}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
      />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}

export default function BannerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<BannerFormState>(EMPTY_BANNER_FORM);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const bannerId = useMemo(() => {
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

    if (!bannerId) {
      setError('Invalid banner id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/banners/view/${bannerId}`, token)
      .then((payload) => {
        setForm(mapBannerToForm(payload as BannerRow));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load banner.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bannerId, mode, router]);

  function updateField<K extends keyof BannerFormState>(field: K, value: BannerFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !bannerId) {
      setError('Invalid banner id.');
      return;
    }

    const normalizedMessages = Object.fromEntries(
      [
        ['en', form.message_en.trim()],
        ['fr', form.message_fr.trim()],
        ['es', form.message_es.trim()],
      ].filter((entry): entry is [string, string] => entry[1].length > 0),
    );

    if (Object.keys(normalizedMessages).length === 0) {
      setError('Please provide at least one message in English, French, or Spanish.');
      return;
    }

    if (form.meta.trim() !== '') {
      try {
        JSON.parse(form.meta);
      } catch {
        setError('Meta data must be valid JSON.');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    const payload = {
      title: form.title.trim(),
      type: form.type,
      country: form.country.trim().toUpperCase(),
      priority: form.priority.trim(),
      show: form.show,
      start_date: form.start_date,
      end_date: form.end_date,
      background_color: form.background_color,
      text_color: form.text_color,
      meta: form.meta.trim(),
      messages: normalizedMessages,
    };

    try {
      const response =
        mode === 'create'
          ? ((await adminPost('/admin-api/banners/structured', token, payload)) as { message?: string })
          : ((await adminPut(`/admin-api/banners/structured/${bannerId}`, token, payload)) as { message?: string });

      const successMessage =
        response.message ?? (mode === 'create' ? 'Banner created successfully!' : 'Banner updated successfully!');

      router.push(`/dashboard/banners?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save banner.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Create New Banner' : 'Edit Banner';
  const previewTitle = form.title.trim() || 'No title';
  const previewMessage = form.message_en.trim() || form.message_fr.trim() || form.message_es.trim() || 'Your banner will appear here';
  const selectedLanguages = BANNER_SUPPORTED_LANGUAGES.filter((language) => {
    if (language === 'en') {
      return form.message_en.trim().length > 0;
    }
    if (language === 'fr') {
      return form.message_fr.trim().length > 0;
    }
    return form.message_es.trim().length > 0;
  }).map((language) => language.toUpperCase());

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Banner Management', href: '/dashboard/banners' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading banner...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="alert alert-info mb-4" role="alert">
                  <div className="fw-semibold mb-1">Supported languages</div>
                  <div className="small">
                    This form is intentionally limited to <strong>English</strong>, <strong>French</strong>, and
                    <strong> Spanish</strong> so the banner content is easier to review before publishing.
                  </div>
                </div>

                <div className="card border mb-4 overflow-hidden">
                  <div className="card-header">
                    <h6 className="mb-0">Live Banner Preview</h6>
                  </div>
                  <div className="card-body p-0">
                    <div
                      style={{
                        backgroundColor: form.background_color,
                        color: form.text_color,
                        borderTop: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between gap-3 px-3 px-md-4 py-3 flex-wrap flex-md-nowrap">
                        <div className="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
                          <span
                            className="rounded-circle flex-shrink-0"
                            style={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: form.text_color,
                              opacity: 0.85,
                            }}
                          />
                          <div className="min-w-0">
                            {form.title.trim() ? (
                              <div className="fw-semibold text-uppercase small" style={{ letterSpacing: '0.08em' }}>
                                {previewTitle}
                              </div>
                            ) : null}
                            <div className="fw-medium" style={{ lineHeight: 1.45 }}>
                              {previewMessage}
                            </div>
                          </div>
                        </div>
                        <div className="small opacity-75 flex-shrink-0">Preview uses EN, then FR, then ES</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-xl-8">
                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Basic Information"
                        description="Set the banner title, choose the alert style, and control the overall look."
                      />

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="title" className="form-label">
                            Title <span className="text-muted">(Optional)</span>
                          </label>
                          <input
                            id="title"
                            className="form-control"
                            type="text"
                            value={form.title}
                            onChange={(event) => updateField('title', event.target.value)}
                            placeholder="Banner title"
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="type" className="form-label">
                            Type <span className="text-danger">*</span>
                          </label>
                          <select
                            id="type"
                            className="form-select"
                            value={form.type}
                            onChange={(event) => updateField('type', event.target.value as BannerFormState['type'])}
                          >
                            {BANNER_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Banner Copy"
                        description="Write the banner message directly for each storefront language. English is used first in the preview."
                      />

                      <div className="row g-3">
                        <div className="col-12">
                          <LanguagePanel
                            badge="EN"
                            field="message_en"
                            label="English Message"
                            value={form.message_en}
                            placeholder="Primary English message"
                            onChange={updateField}
                            hint="Recommended as the primary/default banner copy."
                          />
                        </div>
                        <div className="col-md-6">
                          <LanguagePanel
                            badge="FR"
                            field="message_fr"
                            label="French Message"
                            value={form.message_fr}
                            placeholder="French banner message"
                            onChange={updateField}
                          />
                        </div>
                        <div className="col-md-6">
                          <LanguagePanel
                            badge="ES"
                            field="message_es"
                            label="Spanish Message"
                            value={form.message_es}
                            placeholder="Spanish banner message"
                            onChange={updateField}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4 mb-4">
                      <SectionTitle
                        title="Scheduling & Targeting"
                        description="Control visibility, target an optional country, and define the active window."
                      />

                      <div className="row g-3">
                        <div className="col-md-4">
                          <label htmlFor="country" className="form-label">
                            Country <span className="text-muted">(Optional)</span>
                          </label>
                          <input
                            id="country"
                            className="form-control"
                            type="text"
                            value={form.country}
                            onChange={(event) => updateField('country', event.target.value)}
                            placeholder="US, CA, etc."
                            maxLength={2}
                          />
                          <FieldHint>Use a 2-letter ISO code. Leave empty for all countries.</FieldHint>
                        </div>
                        <div className="col-md-4">
                          <label htmlFor="priority" className="form-label">
                            Priority
                          </label>
                          <input
                            id="priority"
                            className="form-control"
                            type="number"
                            min={1}
                            max={100}
                            value={form.priority}
                            onChange={(event) => updateField('priority', event.target.value)}
                          />
                          <FieldHint>Higher numbers appear first.</FieldHint>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check form-switch mt-md-4 pt-md-2">
                            <input
                              id="show"
                              className="form-check-input"
                              type="checkbox"
                              checked={form.show}
                              onChange={(event) => updateField('show', event.target.checked)}
                            />
                            <label htmlFor="show" className="form-check-label">
                              Show Banner
                            </label>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="start_date" className="form-label">
                            Start Date <span className="text-muted">(Optional)</span>
                          </label>
                          <input
                            id="start_date"
                            className="form-control"
                            type="datetime-local"
                            value={form.start_date}
                            onChange={(event) => updateField('start_date', event.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="end_date" className="form-label">
                            End Date <span className="text-muted">(Optional)</span>
                          </label>
                          <input
                            id="end_date"
                            className="form-control"
                            type="datetime-local"
                            value={form.end_date}
                            onChange={(event) => updateField('end_date', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-3 p-3 p-md-4">
                      <SectionTitle
                        title="Styling & Meta"
                        description="Set banner colors and optional metadata for advanced behavior."
                      />

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="background_color" className="form-label">
                            Background Color
                          </label>
                          <input
                            id="background_color"
                            className="form-control form-control-color"
                            type="color"
                            value={form.background_color}
                            onChange={(event) => updateField('background_color', event.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="text_color" className="form-label">
                            Text Color
                          </label>
                          <input
                            id="text_color"
                            className="form-control form-control-color"
                            type="color"
                            value={form.text_color}
                            onChange={(event) => updateField('text_color', event.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="meta" className="form-label">
                            Meta Data <span className="text-muted">(JSON, optional)</span>
                          </label>
                          <textarea
                            id="meta"
                            className="form-control"
                            rows={5}
                            value={form.meta}
                            onChange={(event) => updateField('meta', event.target.value)}
                            placeholder='{"link": "/promotions", "icon": "fas fa-gift"}'
                          />
                          <FieldHint>Additional structured data for advanced banner behavior.</FieldHint>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-4">
                    <div className="card border mb-4">
                      <div className="card-header">
                        <h6 className="mb-0">At A Glance</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <span className="text-muted d-block small">Languages Ready</span>
                          {selectedLanguages.length > 0 ? (
                            selectedLanguages.map((language) => (
                              <span key={language} className="badge bg-secondary me-1 mb-1">
                                {language}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">No banner copy added yet.</span>
                          )}
                        </div>
                        <div className="mb-2">
                          <span className="text-muted d-block small">Visibility</span>
                          <span className={`badge ${form.show ? 'bg-success' : 'bg-secondary'}`}>
                            {form.show ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mb-0">
                          <span className="text-muted d-block small">Priority</span>
                          <span>{form.priority || '1'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card border">
                      <div className="card-header">
                        <h6 className="mb-0">Quick Notes</h6>
                      </div>
                      <div className="card-body">
                        <ul className="small text-muted mb-0 ps-3">
                          <li>Only English, French, and Spanish are supported in this form.</li>
                          <li>At least one of those three messages is required.</li>
                          <li>Country is optional and targets a single ISO region.</li>
                          <li>Meta must be valid JSON when provided.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Link href="/dashboard/banners" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : mode === 'create' ? 'Create Banner' : 'Update Banner'}
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
