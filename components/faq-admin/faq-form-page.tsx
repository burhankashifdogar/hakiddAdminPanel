'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPost, adminPut } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { EMPTY_FAQ_FORM, FAQ_LANGUAGE_OPTIONS, type FaqRow, getFaqLanguageLabel, mapFaqToForm } from './shared';

export default function FaqFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FAQ_FORM);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const faqId = useMemo(() => {
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

    if (!faqId) {
      setError('Invalid FAQ id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/faqs/view/${faqId}`, token)
      .then((payload) => {
        setForm(mapFaqToForm(payload as FaqRow));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load FAQ.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [faqId, mode, router]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (mode === 'edit' && !faqId) {
      setError('Invalid FAQ id.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const payload = {
        question: form.question,
        answer: form.answer,
        lang: form.lang,
      };

      const response =
        mode === 'create'
          ? ((await adminPost('/admin-api/faqs/structured', token, payload)) as { message?: string })
          : ((await adminPut(`/admin-api/faqs/structured/${faqId}`, token, payload)) as { message?: string });

      const successMessage = response.message ?? (mode === 'create' ? 'Faq is uploaded' : 'faq is updated');
      router.push(`/dashboard/faqs?success=${encodeURIComponent(successMessage)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save FAQ.');
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = mode === 'create' ? 'Add FAQs' : 'Edit FAQs';

  return (
    <div className="pc-content">
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'FAQs', href: '/dashboard/faqs' },
          { label: pageTitle },
        ]}
      />

      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-xl-8">
          <TableCard header={<h5 className="mb-0">{pageTitle}</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading FAQ...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="mb-3">
                  <label htmlFor="question" className="form-label">
                    Question <span className="text-danger">*</span>
                  </label>
                  <input
                    id="question"
                    className="form-control"
                    type="text"
                    value={form.question}
                    onChange={(event) => updateField('question', event.target.value)}
                    placeholder="Add Question"
                    maxLength={255}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="answer" className="form-label">
                    Answer <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="answer"
                    className="form-control"
                    rows={6}
                    value={form.answer}
                    onChange={(event) => updateField('answer', event.target.value)}
                    placeholder="Add Answer"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="lang" className="form-label">
                    Language <span className="text-danger">*</span>
                  </label>
                  <select
                    id="lang"
                    className="form-control"
                    value={form.lang}
                    onChange={(event) => updateField('lang', event.target.value as typeof form.lang)}
                  >
                    {FAQ_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => router.push('/dashboard/faqs')}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </TableCard>
        </div>

        <div className="col-xl-4">
          <TableCard header={<h5 className="mb-0">Preview</h5>}>
            <div className="small text-muted text-uppercase mb-2">{getFaqLanguageLabel(form.lang)}</div>
            <div className="fw-semibold mb-2">{form.question.trim() || 'Question preview'}</div>
            <div className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>
              {form.answer.trim() || 'The answer you enter will appear here so you can quickly review the final copy.'}
            </div>
          </TableCard>
        </div>
      </div>
    </div>
  );
}
