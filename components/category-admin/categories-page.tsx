'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  CATEGORY_LANGUAGES,
  type CategoriesViewPayload,
  type CategoryLanguage,
  type CategoryRow,
  encodeCategorySegment,
  formatCategoryLanguage,
} from './shared';

export default function CategoriesPage() {
  const router = useRouter();
  const [activeLanguage, setActiveLanguage] = useState<CategoryLanguage>('eng');
  const [categories, setCategories] = useState<Record<CategoryLanguage, CategoryRow[]>>({
    eng: [],
    fre: [],
    sp: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet('/admin-api/categories/view', token)) as CategoriesViewPayload;
      setCategories({
        eng: payload.categories?.eng ?? [],
        fre: payload.categories?.fre ?? [],
        sp: payload.categories?.sp ?? [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function deleteCategory(row: CategoryRow) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category and its translations?')) {
      return;
    }

    try {
      setDeletingId(row.id);
      setError('');
      setMessage('');
      const response = (await adminDelete(`/admin-api/categories/${row.id}/cascade`, token)) as { message?: string };
      setMessage(response.message ?? 'Category deleted successfully.');
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete category.');
    } finally {
      setDeletingId(null);
    }
  }

  function renderTable(language: CategoryLanguage) {
    const rows = categories[language] ?? [];

    return (
      <div
        key={language}
        className="dt-responsive table-responsive"
        style={{ display: activeLanguage === language ? 'block' : 'none' }}
      >
        <table className="table table-striped table-hover table-bordered nowrap align-middle">
          <thead>
            <tr>
              <th>#No</th>
              <th>Categories</th>
              <th>language</th>
              <th>Code</th>
              <th>View</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-5 text-muted">
                  Loading categories...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-5 text-muted">
                  No categories found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${language}-${row.id}`}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{formatCategoryLanguage(row.lang)}</td>
                  <td>{row.cat_code}</td>
                  <td>
                    <Link
                      href={`/dashboard/categories/${encodeCategorySegment(row.name)}?code=${encodeURIComponent(row.cat_code)}&lang=${row.lang}`}
                      className="view-category"
                    >
                      <i className="fas fa-eye" />
                    </Link>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void deleteCategory(row)}
                      disabled={deletingId === row.id}
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Categories"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Categories' },
        ]}
      />
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-end align-items-center h-100">
          <Link href="/dashboard/categories/create" className="btn btn-primary">
            Add Category
          </Link>
        </div>
      </div>
      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard
            header={
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Categories</h5>
                <div className="dropdown">
                  <button
                    type="button"
                    className="btn btn-link-secondary dropdown-toggle arrow-none text-decoration-none p-0 border-0"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Language
                  </button>
                  <div className="dropdown-menu dropdown-menu-end">
                    {CATEGORY_LANGUAGES.map((language) => (
                      <button
                        key={language}
                        type="button"
                        className={`dropdown-item ${activeLanguage === language ? 'active' : ''}`}
                        onClick={() => setActiveLanguage(language)}
                      >
                        {formatCategoryLanguage(language)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            {CATEGORY_LANGUAGES.map((language) => renderTable(language))}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
