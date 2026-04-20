'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet, adminPostForm } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { FAQ_LANGUAGE_OPTIONS, type FaqLanguage, type FaqListPayload, type FaqRow, truncateFaqAnswer } from './shared';

export default function FaqsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLang, setSelectedLang] = useState<FaqLanguage>('en');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const loadFaqs = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        lang: selectedLang,
      });

      if (search.trim()) {
        query.set('search', search.trim());
      }

      const payload = (await adminGet(`/admin-api/faqs/view?${query.toString()}`, token)) as FaqListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, [router, search, selectedLang]);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function importFaqs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!selectedFile) {
      setError('Select a CSV file to import.');
      return;
    }

    const body = new FormData();
    body.append('file', selectedFile);

    try {
      setImporting(true);
      setError('');
      setMessage('');
      const response = (await adminPostForm('/admin-api/faqs/import', token, body)) as { message?: string };
      setMessage(response.message ?? 'FAQs imported successfully.');
      setSelectedFile(null);
      setImportModalOpen(false);
      const input = document.getElementById('faq-import-file') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
      await loadFaqs();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import FAQs.');
    } finally {
      setImporting(false);
    }
  }

  async function deleteFaq(row: FaqRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setDeletingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminDelete(`/admin-api/faqs/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Deleted Successfully');
      await loadFaqs();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete FAQ.');
    } finally {
      setDeletingId(null);
    }
  }

  function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearch(searchInput.trim());
  }

  function resetSearch() {
    setSearchInput('');
    setSearch('');
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      setSearch(searchInput.trim());
    }
  }

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';

  return (
    <div className="pc-content">
      <PageHeader
        title="FAQs"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'FAQs' },
        ]}
      />

      <AlertStack error={error || flashError} message={message || flashMessage} />

      <div className="col-12 mb-3">
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="btn btn-success" onClick={() => setImportModalOpen(true)}>
            Import FAQs
          </button>
          <Link href="/dashboard/faqs/create" className="btn btn-primary">
            Add Questions
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">FAQs</h5>
                </div>

                <div className="row g-3 align-items-end">
                  <div className="col-lg-5">
                    <label htmlFor="faq-search" className="form-label mb-1">
                      Search
                    </label>
                    <form onSubmit={submitSearch} className="d-flex gap-2">
                      <input
                        id="faq-search"
                        type="text"
                        className="form-control"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search question or answer"
                      />
                      <button type="submit" className="btn btn-outline-primary">
                        Search
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={resetSearch}>
                        Reset
                      </button>
                    </form>
                  </div>

                  <div className="col-lg-3">
                    <label htmlFor="faq-language-filter" className="form-label mb-1">
                      Language
                    </label>
                    <select
                      id="faq-language-filter"
                      className="form-control"
                      value={selectedLang}
                      onChange={(event) => setSelectedLang(event.target.value as FaqLanguage)}
                    >
                      {FAQ_LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-hover tbl-product align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Questions</th>
                    <th>Answer</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        Loading FAQs...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        No FAQs found for the selected language.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{row.question}</td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '380px' }} title={row.answer}>
                            {truncateFaqAnswer(row.answer)}
                          </div>
                        </td>
                        <td>
                          <Link href={`/dashboard/faqs/${row.id}`} title="View FAQ">
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={deletingId === row.id}
                            onClick={() => void deleteFaq(row)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </div>
      </div>

      {importModalOpen ? (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={importFaqs}>
                  <div className="modal-header">
                    <h5 className="modal-title">Import FAQs</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => {
                        setImportModalOpen(false);
                        setSelectedFile(null);
                      }}
                    />
                  </div>

                  <div className="modal-body">
                    <label htmlFor="faq-import-file" className="form-label text-primary mb-1">
                      Please upload a CSV file:
                    </label>
                    <input
                      id="faq-import-file"
                      type="file"
                      className="form-control border-primary"
                      accept=".csv"
                      onChange={onFileChange}
                      required
                    />
                    <div className="form-text mt-2">Expected columns: question, answer, lang.</div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setImportModalOpen(false);
                        setSelectedFile(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success" disabled={importing}>
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </div>
  );
}
