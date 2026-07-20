'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet, adminPost } from '@/lib/api';
import { getAdminImageUrl } from '@/lib/assets';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  CATALOGUE_LANGUAGE_OPTIONS,
  type CatalogueLanguage,
  type CatalogueListPayload,
  type CatalogueRow,
  getCatalogueDisplayName,
  getFileNameFromPath,
} from './shared';

export default function CataloguesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedLang, setSelectedLang] = useState<CatalogueLanguage>('en');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadCatalogues = useCallback(async () => {
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

      const payload = (await adminGet(`/admin-api/catalogues/view?${query.toString()}`, token)) as CatalogueListPayload;
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load catalogues.');
    } finally {
      setLoading(false);
    }
  }, [router, search, selectedLang]);

  useEffect(() => {
    void loadCatalogues();
  }, [loadCatalogues]);

  async function toggleCatalogue(row: CatalogueRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setTogglingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminPost(`/admin-api/catalogues/${row.id}/toggle`, token, {})) as { message?: string };
      setMessage(response.message ?? 'Catalogue status updated.');
      await loadCatalogues();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update catalogue status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteCatalogue(row: CatalogueRow) {
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
      const response = (await adminDelete(`/admin-api/catalogues/${row.id}`, token)) as { message?: string };
      setMessage(response.message ?? 'Deleted successfully');
      await loadCatalogues();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete catalogue.');
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

  const flashMessage = searchParams.get('success') ?? '';
  const flashError = searchParams.get('error') ?? '';

  return (
    <div className="pc-content">
      <PageHeader
        title="Catalogues"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Catalogues' },
        ]}
      />

      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/catalogues/create" className="btn btn-primary">
            Add File
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
                  <h5 className="mb-0">Catalogues</h5>
                </div>

                <div className="row g-3 align-items-end">
                  <div className="col-lg-5">
                    <label htmlFor="catalogue-search" className="form-label mb-1">
                      Search
                    </label>
                    <form onSubmit={submitSearch} className="d-flex gap-2">
                      <input
                        id="catalogue-search"
                        type="text"
                        className="form-control"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search catalogue name"
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
                    <label htmlFor="catalogue-language-filter" className="form-label mb-1">
                      Language
                    </label>
                    <select
                      id="catalogue-language-filter"
                      className="form-control"
                      value={selectedLang}
                      onChange={(event) => setSelectedLang(event.target.value as CatalogueLanguage)}
                    >
                      {CATALOGUE_LANGUAGE_OPTIONS.map((option) => (
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
                    <th>Name</th>
                    <th>File</th>
                    <th>Image</th>
                    <th>Status</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        Loading catalogues...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        No catalogues found for the selected language.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{getCatalogueDisplayName(row, selectedLang)}</td>
                        <td>
                          {row.file_url ? (
                            <a
                              href={row.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-decoration-none"
                              title={getFileNameFromPath(row.file)}
                            >
                              {getFileNameFromPath(row.file)}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {row.image_url ? (
                            <img
                              src={getAdminImageUrl(row.image_url) ?? ''}
                              alt={row.display_name}
                              className="user-avtar rounded wid-50 hie-50"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id={`catalogue-toggle-${row.id}`}
                              checked={row.enabled}
                              disabled={togglingId === row.id}
                              onChange={() => void toggleCatalogue(row)}
                            />
                            <label className="form-check-label" htmlFor={`catalogue-toggle-${row.id}`}>
                              {row.enabled ? 'Enabled' : 'Disabled'}
                            </label>
                          </div>
                        </td>
                        <td>
                          <Link href={`/dashboard/catalogues/${row.id}`} title="View catalogue">
                            <i className="fas fa-eye" />
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={deletingId === row.id}
                            onClick={() => void deleteCatalogue(row)}
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
    </div>
  );
}
