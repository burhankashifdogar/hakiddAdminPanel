'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { getStoredAdminToken } from '@/lib/admin-auth';

export type Breadcrumb = {
  label: string;
  href?: string;
};

export function ensureAdminToken(router: ReturnType<typeof useRouter>) {
  const token = getStoredAdminToken();
  if (!token) {
    router.push('/login');
    return null;
  }

  return token;
}

export function PageHeader({ title, breadcrumbs }: { title: string; breadcrumbs: Breadcrumb[] }) {
  return (
    <div className="page-header">
      <div className="page-block">
        <div className="row align-items-center">
          <div className="col-md-12">
            <ul className="breadcrumb">
              {breadcrumbs.map((breadcrumb) => (
                <li key={`${breadcrumb.label}-${breadcrumb.href ?? 'plain'}`} className="breadcrumb-item" aria-current="page">
                  {breadcrumb.href ? <Link href={breadcrumb.href}>{breadcrumb.label}</Link> : breadcrumb.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-12">
            <div className="page-header-title">
              <h2 className="mb-0">{title}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertStack({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      ) : null}
    </>
  );
}

export function Pagination({
  page,
  lastPage,
  onPageChange,
}: {
  page: number;
  lastPage: number;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="d-flex gap-2 mt-3">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Prev
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        disabled={page >= lastPage}
        onClick={() => onPageChange(Math.min(lastPage, page + 1))}
      >
        Next
      </button>
    </div>
  );
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  return String(value);
}

export function CountryIndicator({ country }: { country: unknown }) {
  const normalized = String(country ?? '').trim().toUpperCase();

  if (normalized === 'US') {
    return <i className="fas fa-flag-usa" title="United States" />;
  }

  if (normalized === 'CA') {
    return <i className="fab fa-canadian-maple-leaf" title="Canada" />;
  }

  return <span>{formatValue(country)}</span>;
}

export function LanguageLabel({ code }: { code: unknown }) {
  const normalized = String(code ?? '').trim().toLowerCase();

  if (normalized === 'en') {
    return <span>English</span>;
  }

  if (normalized === 'fr') {
    return <span>French</span>;
  }

  if (normalized === 'sp') {
    return <span>Spanish</span>;
  }

  return <span>{formatValue(code)}</span>;
}

export function StatusIcon({ active }: { active: boolean }) {
  return active ? (
    <i className="ph-duotone ph-check-circle text-success f-24" title="Active" />
  ) : (
    <i className="ph-duotone ph-x text-danger f-24" title="Inactive" />
  );
}

export function TableCard({
  children,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="card">
      {header ? <div className="card-header">{header}</div> : null}
      <div className="card-body">{children}</div>
    </div>
  );
}
