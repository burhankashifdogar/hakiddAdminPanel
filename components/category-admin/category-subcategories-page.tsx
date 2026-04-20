'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { adminDelete, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import {
  type CategoryLanguage,
  type CategoryListPayload,
  type CategoryRow,
  decodeCategorySegment,
  encodeCategorySegment,
  formatCategoryLanguage,
} from './shared';

function normalizeLanguage(value: string | null): CategoryLanguage {
  if (value === 'fre' || value === 'fr') {
    return 'fre';
  }

  if (value === 'sp' || value === 'es') {
    return 'sp';
  }

  return 'eng';
}

export default function CategorySubcategoriesPage() {
  const params = useParams<{ categoryName: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryName = useMemo(() => decodeCategorySegment(String(params?.categoryName ?? '')), [params]);
  const code = searchParams.get('code') ?? '';
  const lang = normalizeLanguage(searchParams.get('lang'));

  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSubcategories = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        lang,
      });

      if (code) {
        query.set('code', code);
      }

      const payload = (await adminGet(
        `/admin-api/categories/view/${encodeCategorySegment(categoryName)}?${query.toString()}`,
        token,
      )) as CategoryListPayload;
      setRows(payload.categories ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subcategories.');
    } finally {
      setLoading(false);
    }
  }, [categoryName, code, lang, router]);

  useEffect(() => {
    void loadSubcategories();
  }, [loadSubcategories]);

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
      setMessage(response.message ?? 'Subcategory deleted successfully.');
      await loadSubcategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete subcategory.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Categories"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Categories', href: '/dashboard/categories' },
          { label: 'List' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">Categories</h5>}>
            <div className="dt-responsive table-responsive">
              <table className="table table-striped table-hover table-bordered nowrap align-middle">
                <thead>
                  <tr>
                    <th>#No</th>
                    <th>Categories</th>
                    <th>Sub Category</th>
                    <th>language</th>
                    <th>Code</th>
                    <th>View</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        Loading subcategories...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        No subcategories found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{categoryName}</td>
                        <td>
                          {row.sub_cat ? row.sub_cat : <span className="badge rounded-pill text-bg-secondary">Null</span>}
                        </td>
                        <td>{formatCategoryLanguage(row.lang)}</td>
                        <td>{row.cat_code}</td>
                        <td>
                          {row.sub_cat ? (
                            <Link
                              href={`/dashboard/categories/${encodeCategorySegment(categoryName)}/${encodeCategorySegment(row.sub_cat)}?code=${encodeURIComponent(row.cat_code)}&lang=${row.lang}`}
                            >
                              <i className="fas fa-eye" />
                            </Link>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
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
          </TableCard>
        </div>
      </div>
    </div>
  );
}
