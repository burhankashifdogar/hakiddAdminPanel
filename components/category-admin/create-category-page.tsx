'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPost } from '@/lib/api';
import { AlertStack, PageHeader, TableCard, ensureAdminToken } from '@/components/product-admin/common';
import { type CategoryCreateOptionsPayload } from './shared';

type CategoryFormState = {
  cat_code: string;
  category: string;
  name_en: string;
  name_es: string;
  name_fr: string;
  select_type: '' | 'category' | 'subcategory' | 'sub_subcategory';
  subcategory: string;
};

const EMPTY_FORM: CategoryFormState = {
  cat_code: '',
  category: '',
  name_en: '',
  name_es: '',
  name_fr: '',
  select_type: '',
  subcategory: '',
};

export default function CreateCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [groups, setGroups] = useState<Array<{ name: string; sub_categories: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOptions = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet('/admin-api/categories/create-options', token)) as CategoryCreateOptionsPayload;
      setGroups(payload.category_groups ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load category options.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const availableSubcategories = useMemo(
    () => groups.find((group) => group.name === form.category)?.sub_categories ?? [],
    [form.category, groups],
  );

  useEffect(() => {
    if (form.select_type !== 'subcategory' && form.select_type !== 'sub_subcategory' && form.category !== '') {
      setForm((current) => ({ ...current, category: '', subcategory: '' }));
      return;
    }

    if (form.select_type !== 'sub_subcategory' && form.subcategory !== '') {
      setForm((current) => ({ ...current, subcategory: '' }));
      return;
    }

    if (form.subcategory && !availableSubcategories.includes(form.subcategory)) {
      setForm((current) => ({ ...current, subcategory: '' }));
    }
  }, [availableSubcategories, form.category, form.select_type, form.subcategory]);

  function updateField<K extends keyof CategoryFormState>(field: K, value: CategoryFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const response = (await adminPost('/admin-api/categories/structured', token, form)) as { message?: string };
      setMessage(response.message ?? 'Category saved successfully.');
      setForm(EMPTY_FORM);
      await loadOptions();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  }

  const showCategorySection = form.select_type === 'subcategory' || form.select_type === 'sub_subcategory';
  const showSubcategorySection = form.select_type === 'sub_subcategory';

  return (
    <div className="pc-content">
      <PageHeader
        title="Add Category/Subcategory/Sub-Subcategory"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Add Categories', href: '/dashboard/categories/create' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <div className="row">
        <div className="col-sm-12">
          <TableCard header={<h5 className="mb-0">Add Category</h5>}>
            {loading ? (
              <div className="text-center py-5 text-muted">Loading category options...</div>
            ) : (
              <form onSubmit={submitForm}>
                <div className="mb-3">
                  <label htmlFor="select_type" className="form-label">
                    Select Type
                  </label>
                  <select
                    id="select_type"
                    className="form-control"
                    value={form.select_type}
                    onChange={(event) => updateField('select_type', event.target.value as CategoryFormState['select_type'])}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="category">Main Category</option>
                    <option value="subcategory">Subcategory</option>
                    <option value="sub_subcategory">Sub-Subcategory</option>
                  </select>
                </div>

                {showCategorySection ? (
                  <div className="mb-3">
                    <label htmlFor="category" className="form-label">
                      Category
                    </label>
                    <select
                      id="category"
                      className="form-control"
                      value={form.category}
                      onChange={(event) => updateField('category', event.target.value)}
                      required={showCategorySection}
                    >
                      <option value="">Select Category</option>
                      {groups.map((group) => (
                        <option key={group.name} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {showSubcategorySection ? (
                  <div className="mb-3">
                    <label htmlFor="subcategory" className="form-label">
                      Subcategory
                    </label>
                    <select
                      id="subcategory"
                      className="form-control"
                      value={form.subcategory}
                      onChange={(event) => updateField('subcategory', event.target.value)}
                      required={showSubcategorySection}
                    >
                      <option value="">Select Subcategory</option>
                      {availableSubcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="mb-3">
                  <label htmlFor="name_en" className="form-label">
                    Name (English)
                  </label>
                  <input
                    id="name_en"
                    type="text"
                    className="form-control"
                    value={form.name_en}
                    onChange={(event) => updateField('name_en', event.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="name_es" className="form-label">
                    Name (Spanish)
                  </label>
                  <input
                    id="name_es"
                    type="text"
                    className="form-control"
                    value={form.name_es}
                    onChange={(event) => updateField('name_es', event.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="name_fr" className="form-label">
                    Name (French)
                  </label>
                  <input
                    id="name_fr"
                    type="text"
                    className="form-control"
                    value={form.name_fr}
                    onChange={(event) => updateField('name_fr', event.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="cat_code" className="form-label">
                    Category Code
                  </label>
                  <input
                    id="cat_code"
                    type="text"
                    className="form-control"
                    value={form.cat_code}
                    onChange={(event) => updateField('cat_code', event.target.value)}
                    required
                  />
                </div>

                <div className="pt-0">
                  <button type="submit" className="btn btn-primary me-2 mt-4" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit'}
                  </button>
                  <Link href="/dashboard/categories" className="btn btn-secondary mt-4">
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
