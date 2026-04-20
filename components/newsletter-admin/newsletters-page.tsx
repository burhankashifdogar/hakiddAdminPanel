'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, Pagination, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  NEWSLETTER_IMAGE_ASPECT_RATIO,
  NEWSLETTER_THUMBNAIL_WIDTH,
  type NewsletterListPayload,
  type NewsletterRow,
} from './shared';

export default function NewslettersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<NewsletterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadNewsletters = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (search.trim()) {
        query.set('search', search.trim());
      }

      const payload = (await adminGet(`/admin-api/newsletters/view?${query.toString()}`, token)) as NewsletterListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setLastPage(Number(payload.last_page ?? 1) || 1);
      setPerPage(Number(payload.per_page ?? 10) || 10);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load newsletters.');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, router, search]);

  useEffect(() => {
    void loadNewsletters();
  }, [loadNewsletters]);

  async function deleteNewsletter(row: NewsletterRow) {
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
      const response = (await adminDelete(`/admin-api/newsletters/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Deleted successfully');

      if (rows.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
        return;
      }

      await loadNewsletters();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete newsletter.');
    } finally {
      setDeletingId(null);
    }
  }

  function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';
  const rowStart = (page - 1) * perPage;

  return (
    <div className="pc-content">
      <PageHeader
        title="Newsletter"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Newsletter' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/newsletters/create" className="btn btn-primary">
            Add Image
          </Link>
        </div>
      </div>

      <AlertStack error={error || flashError} message={message || flashMessage} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Newsletter</h5>
                </div>
                <div className="row g-3 align-items-end">
                  <div className="col-lg-6">
                    <label htmlFor="newsletter-search" className="form-label mb-1">
                      Search
                    </label>
                    <form onSubmit={submitSearch} className="d-flex gap-2">
                      <input
                        id="newsletter-search"
                        type="text"
                        className="form-control"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search heading or link"
                      />
                      <button type="submit" className="btn btn-outline-primary">
                        Search
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={resetSearch}>
                        Reset
                      </button>
                    </form>
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
                    <th>Header</th>
                    <th>Img</th>
                    <th>Link</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        Loading newsletters...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No newsletters found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{rowStart + index + 1}</td>
                        <td>{row.header}</td>
                        <td>
                          {row.img_url ? (
                            <img
                              src={row.img_url}
                              alt={row.header}
                              className="rounded border"
                              style={{
                                width: NEWSLETTER_THUMBNAIL_WIDTH,
                                aspectRatio: NEWSLETTER_IMAGE_ASPECT_RATIO,
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <span className="badge rounded-pill text-bg-secondary">Null</span>
                          )}
                        </td>
                        <td>
                          <a
                            href={row.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none d-inline-block text-truncate"
                            style={{ maxWidth: 280 }}
                            title={row.link}
                          >
                            {row.link}
                          </a>
                        </td>
                        <td>
                          <Link href={`/dashboard/newsletters/${row.id}`}>
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={deletingId === row.id}
                            onClick={() => void deleteNewsletter(row)}
                          >
                            {deletingId === row.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && lastPage > 1 ? <Pagination page={page} lastPage={lastPage} onPageChange={setPage} /> : null}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
