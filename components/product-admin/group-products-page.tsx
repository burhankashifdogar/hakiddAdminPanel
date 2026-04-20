'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminGet } from '@/lib/api';
import { AlertStack, PageHeader, Pagination, TableCard, ensureAdminToken, formatValue } from './common';
import { consumeGroupProductFlash } from './group-product-shared';

type GroupProductRow = Record<string, unknown>;

function getRowId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function GroupProductsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<GroupProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const flashMessage = consumeGroupProductFlash();
    if (flashMessage) {
      setMessage(flashMessage);
    }
  }, []);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/group-products?page=${page}&per_page=20`, token)
      .then((payload: AdminListResponse) => {
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load group products'))
      .finally(() => setLoading(false));
  }, [page, router]);

  return (
    <div className="pc-content">
      <PageHeader
        title="Products Grouping"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Products Grouping' },
        ]}
      />
      <AlertStack error={error} message={message} />

      <TableCard
        header={
          <div className="d-flex align-items-center justify-content-between gap-3">
            <h5 className="mb-0">Products Group</h5>
            <Link href="/dashboard/group-products/create" className="btn btn-primary">
              Add Group
            </Link>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="table table-striped table-hover table-bordered nowrap">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Title</th>
                <th>Description</th>
                <th>External</th>
                <th>View</th>
                <th>Edit</th>
                <th>Product Group Items</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No group products found.</td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const id = getRowId(row.id);
                  return (
                    <tr key={String(row.id ?? index)}>
                      <td>{formatValue(row.id)}</td>
                      <td>{formatValue(row.title)}</td>
                      <td>{formatValue(row.description)}</td>
                      <td>
                        {row.external ? (
                          <>
                            {formatValue(row.external)}{' '}
                            <a href={String(row.external)} target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
                              View
                            </a>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{id ? <Link href={`/dashboard/group-products/${id}`} className="btn btn-info btn-sm">View</Link> : null}</td>
                      <td>{id ? <Link href={`/dashboard/group-products/${id}/edit`} className="btn btn-warning btn-sm">Edit</Link> : null}</td>
                      <td>
                        {id && Number(row.item_count ?? 0) > 0 ? (
                          <Link href={`/dashboard/product-group-items?pg_id=${id}`} className="btn btn-default btn-sm ewRowLink ewDetail">
                            Product Group Items <span className="label label-info">{formatValue(row.item_count)}</span>
                          </Link>
                        ) : (
                          <span className="text-muted">No items</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">
            Total: {total} | Page: {page}/{lastPage}
          </div>
          <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
        </div>
      </TableCard>
    </div>
  );
}
