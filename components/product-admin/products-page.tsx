'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminGet } from '@/lib/api';
import {
  AlertStack,
  Breadcrumb,
  CountryIndicator,
  LanguageLabel,
  PageHeader,
  Pagination,
  StatusIcon,
  TableCard,
  ensureAdminToken,
  formatValue,
} from './common';

type ProductRow = Record<string, unknown>;

const COUNTRY_OPTIONS = [
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
];

function getCountryLabel(code: string) {
  return COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function getLanguageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function formatPriceValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return formatValue(value);
  }

  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export default function ProductsPage() {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Products' },
  ];

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [productIdInput, setProductIdInput] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [countryInput, setCountryInput] = useState('CA');
  const [langCodeInput, setLangCodeInput] = useState('en');

  const [productIdFilter, setProductIdFilter] = useState('');
  const [categoriesFilter, setCategoriesFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('CA');
  const [langCodeFilter, setLangCodeFilter] = useState('en');

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    const query = new URLSearchParams({
      page: String(page),
      per_page: '20',
    });

    if (productIdFilter.trim()) {
      query.set('id', productIdFilter.trim());
    }
    if (categoriesFilter.trim()) {
      query.set('categories', categoriesFilter.trim());
    }
    query.set('country', countryFilter);
    query.set('lang_code', langCodeFilter);

    setLoading(true);
    setError('');

    adminGet(`/admin-api/products?${query.toString()}`, token)
      .then((payload: AdminListResponse) => {
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [categoriesFilter, countryFilter, langCodeFilter, page, productIdFilter, router]);

  return (
    <div className="pc-content">
      <PageHeader title="Products" breadcrumbs={breadcrumbs} />
      <AlertStack error={error} />

      <div className="d-flex justify-content-end mb-3">
        <Link href="/dashboard/products/bulk-images" className="btn btn-primary me-2">
          <i className="ti ti-plus f-18" /> Add Bulk Images
        </Link>
        <Link href="/dashboard/products/bulk-thumbnails" className="btn btn-primary">
          <i className="ti ti-plus f-18" /> Add Bulk Thumbnails
        </Link>
      </div>

      <TableCard
        header={
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setProductIdFilter(productIdInput);
              setCategoriesFilter(categoriesInput);
              setCountryFilter(countryInput);
              setLangCodeFilter(langCodeInput);
            }}
          >
            <div className="row g-3 align-items-end">
              <div className="col-lg-4">
                <label className="form-label mb-1">Product Id</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search Product Id"
                    value={productIdInput}
                    onChange={(event) => setProductIdInput(event.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3 col-lg-2">
                <label className="form-label mb-1">Country</label>
                <select className="form-select" value={countryInput} onChange={(event) => setCountryInput(event.target.value)}>
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 col-lg-2">
                <label className="form-label mb-1">Language</label>
                <select className="form-select" value={langCodeInput} onChange={(event) => setLangCodeInput(event.target.value)}>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-4">
                <label className="form-label mb-1">Categories</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search Categories"
                    value={categoriesInput}
                    onChange={(event) => setCategoriesInput(event.target.value)}
                  />
                </div>
              </div>
              <div className="col-sm-auto">
                <button className="btn btn-primary" type="submit">
                  Search
                </button>
              </div>
            </div>
          </form>
        }
      >
        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="badge text-bg-light border">Country: {getCountryLabel(countryFilter)}</span>
          <span className="badge text-bg-light border">Language: {getLanguageLabel(langCodeFilter)}</span>
          <span className="badge text-bg-light border">Total Products: {total}</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle tbl-product">
            <thead>
              <tr>
                <th className="text-end">#No</th>
                <th>Product Code</th>
                <th>Product</th>
                <th>Ship pac</th>
                <th>Categories</th>
                <th>Language</th>
                <th className="text-end">Price</th>
                <th className="text-end">Inner Pac</th>
                <th className="text-center">Status</th>
                <th className="text-center">Brand</th>
                <th>Country</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-5 text-muted">
                    Loading products...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-5 text-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                rows.map((product, index) => (
                  <tr key={String(product.id ?? index)}>
                    <td className="text-end text-muted">{(page - 1) * 20 + index + 1}</td>
                    <td className="text-nowrap">
                      <span className="fw-semibold">{formatValue(product.product_id)}</span>
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <div className="fw-semibold text-dark">{formatValue(product.name)}</div>
                      <small className="text-muted d-block mt-1">Class: {formatValue(product.class)}</small>
                    </td>
                    <td className="text-nowrap">{formatValue(product.ship_pac)}</td>
                    <td style={{ minWidth: 220, whiteSpace: 'normal' }}>
                      <span className="text-body">{formatValue(product.product_category)}</span>
                    </td>
                    <td className="text-nowrap">
                      <LanguageLabel code={product.lang_code} />
                    </td>
                    <td className="text-end font-monospace fw-semibold">{formatPriceValue(product.selling_price)}</td>
                    <td className="text-end text-nowrap">{formatValue(product.inner_pac)}</td>
                    <td className="text-center">
                      <StatusIcon active />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <span className="text-body">{formatValue(product.brand)}</span>
                    </td>
                    <td className="text-nowrap">
                      <span className="d-inline-flex align-items-center gap-2">
                        <CountryIndicator country={product.country} />
                        <span>{formatValue(product.country)}</span>
                      </span>
                    </td>
                    <td className="text-nowrap">
                      <Link
                        href={`/dashboard/products/${encodeURIComponent(String(product.product_id ?? '').trim())}`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Total: {total} | Page: {page}/{lastPage}
            </div>
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        </div>
      </TableCard>
    </div>
  );
}
