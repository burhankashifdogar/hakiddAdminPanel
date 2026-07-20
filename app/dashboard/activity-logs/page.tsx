'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { getStoredAdminUser, hasAdminPermission } from '@/lib/admin-auth';
import { AlertStack, PageHeader, Pagination, TableCard, ensureAdminToken, formatValue } from '@/components/product-admin/common';

type ActivityLogRow = {
  id: number;
  actor_admin_id: number | null;
  actor_email: string | null;
  actor_role_key: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  summary: string | null;
  request_method: string;
  request_path: string;
  request_ip: string | null;
  user_agent: string | null;
  success: boolean;
  failure_message: string | null;
  created_at: string | null;
  request_payload: unknown;
  before_snapshot?: unknown;
  after_snapshot?: unknown;
};

type ActivityLogListResponse = {
  data: ActivityLogRow[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

function stringifyJson(value: unknown) {
  if (value === null || value === undefined) {
    return 'null';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [detail, setDetail] = useState<ActivityLogRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [filters, setFilters] = useState({
    actor: searchParams.get('actor') ?? '',
    action: searchParams.get('action') ?? '',
    resource: searchParams.get('resource') ?? '',
    success: searchParams.get('success') ?? '',
    date_from: searchParams.get('date_from') ?? '',
    date_to: searchParams.get('date_to') ?? '',
  });
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const storedUser = getStoredAdminUser();
    if (!hasAdminPermission(storedUser, 'activity_logs.read')) {
      router.replace('/dashboard/forbidden');
    }
  }, [router]);

  useEffect(() => {
    setFilters({
      actor: searchParams.get('actor') ?? '',
      action: searchParams.get('action') ?? '',
      resource: searchParams.get('resource') ?? '',
      success: searchParams.get('success') ?? '',
      date_from: searchParams.get('date_from') ?? '',
      date_to: searchParams.get('date_to') ?? '',
    });
  }, [searchKey, searchParams]);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    const query = new URLSearchParams(searchKey);
    query.set('per_page', '25');

    adminGet(`/admin-api/activity-logs?${query.toString()}`, token)
      .then((payload) => {
        const response = payload as ActivityLogListResponse;
        setRows(response.data ?? []);
        setTotal(response.total ?? 0);
        setLastPage(response.last_page ?? 1);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load activity logs.');
      })
      .finally(() => setLoading(false));
  }, [router, searchKey]);

  function updateRoute(next: Partial<typeof filters> & { page?: number }) {
    const params = new URLSearchParams();
    const nextFilters = {
      actor: next.actor ?? filters.actor,
      action: next.action ?? filters.action,
      resource: next.resource ?? filters.resource,
      success: next.success ?? filters.success,
      date_from: next.date_from ?? filters.date_from,
      date_to: next.date_to ?? filters.date_to,
    };

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });

    const nextPage = next.page ?? page;
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    router.replace(params.toString() ? `/dashboard/activity-logs?${params.toString()}` : '/dashboard/activity-logs', {
      scroll: false,
    });
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateRoute({ page: 1 });
  }

  async function loadDetail(id: number) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setDetailLoading(true);
    setDetailError('');

    try {
      const payload = (await adminGet(`/admin-api/activity-logs/${id}`, token)) as ActivityLogRow | null;
      setDetail(payload);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Failed to load activity log detail.');
    } finally {
      setDetailLoading(false);
    }
  }

  const summaryText = useMemo(() => {
    if (rows.length === 0) {
      return 'Showing 0 logs';
    }

    const firstRecord = (page - 1) * 25 + 1;
    const lastRecord = firstRecord + rows.length - 1;
    return `Showing ${firstRecord} to ${lastRecord} of ${total} logs`;
  }, [page, rows.length, total]);

  return (
    <div className="pc-content">
      <PageHeader
        title="Activity Logs"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Activity Logs' },
        ]}
      />

      <AlertStack error={error} />

      <TableCard
        header={
          <form onSubmit={submitFilters}>
            <div className="row g-3">
              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Actor email/id"
                  value={filters.actor}
                  onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Action"
                  value={filters.action}
                  onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <input
                  className="form-control"
                  placeholder="Resource"
                  value={filters.resource}
                  onChange={(event) => setFilters((current) => ({ ...current, resource: event.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filters.success}
                  onChange={(event) => setFilters((current) => ({ ...current, success: event.target.value }))}
                >
                  <option value="">All results</option>
                  <option value="1">Success</option>
                  <option value="0">Failed</option>
                </select>
              </div>
              <div className="col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_from}
                  onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_to}
                  onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">
                  Filter
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setFilters({
                      actor: '',
                      action: '',
                      resource: '',
                      success: '',
                      date_from: '',
                      date_to: '',
                    });
                    router.replace('/dashboard/activity-logs', { scroll: false });
                  }}
                >
                  Reset
                </button>
                <div className="ms-auto text-muted align-self-center">{summaryText}</div>
              </div>
            </div>
          </form>
        }
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
                <th>Summary</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    Loading activity logs...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatValue(row.created_at)}</td>
                    <td>
                      <div>{formatValue(row.actor_email)}</div>
                      <small className="text-muted">#{formatValue(row.actor_admin_id)}</small>
                    </td>
                    <td>{row.action_type}</td>
                    <td>
                      <div>{row.resource_type}</div>
                      <small className="text-muted">{formatValue(row.resource_id)}</small>
                    </td>
                    <td>
                      <span className={`badge ${row.success ? 'bg-light-success' : 'bg-light-danger'} text-dark`}>
                        {row.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td>{formatValue(row.summary)}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void loadDetail(row.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} lastPage={lastPage} onPageChange={(nextPage) => updateRoute({ page: nextPage })} />
      </TableCard>

      <AlertStack error={detailError} />

      <TableCard header={<h5 className="mb-0">Log Detail</h5>}>
        {detailLoading ? (
          <div className="text-muted">Loading log detail...</div>
        ) : detail ? (
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="mb-3">
                <strong>Summary:</strong> {formatValue(detail.summary)}
              </div>
              <div className="mb-3">
                <strong>Path:</strong> {detail.request_method} {detail.request_path}
              </div>
              <div className="mb-3">
                <strong>IP:</strong> {formatValue(detail.request_ip)}
              </div>
              <div className="mb-3">
                <strong>User Agent:</strong> {formatValue(detail.user_agent)}
              </div>
              <div className="mb-3">
                <strong>Failure:</strong> {formatValue(detail.failure_message)}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mb-3">
                <label className="form-label">Request Payload</label>
                <textarea className="form-control font-monospace" rows={8} value={stringifyJson(detail.request_payload)} readOnly />
              </div>
            </div>
            <div className="col-lg-6">
              <label className="form-label">Before Snapshot</label>
              <textarea className="form-control font-monospace" rows={10} value={stringifyJson(detail.before_snapshot)} readOnly />
            </div>
            <div className="col-lg-6">
              <label className="form-label">After Snapshot</label>
              <textarea className="form-control font-monospace" rows={10} value={stringifyJson(detail.after_snapshot)} readOnly />
            </div>
          </div>
        ) : (
          <div className="text-muted">Select a log entry to inspect its full detail.</div>
        )}
      </TableCard>
    </div>
  );
}
