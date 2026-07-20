'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { getStoredAdminToken, getStoredAdminUser, hasAdminPermission } from '@/lib/admin-auth';
import { resolveAuditResource } from '@/lib/audit-resources';

const COLLAPSE_STORAGE_KEY = 'hakidd-admin-audit-sidebar-collapsed';

type AuditLogEntry = {
  id: number;
  actor_email: string | null;
  action_type: string;
  resource_id: string | null;
  summary: string | null;
  success: boolean | number;
  created_at: string | null;
};

type AuditLogListResponse = {
  data: AuditLogEntry[];
  total: number;
};

const ACTION_BADGE_CLASSES: Record<string, string> = {
  create: 'bg-success',
  update: 'bg-primary',
  delete: 'bg-danger',
  toggle: 'bg-warning text-dark',
  approve: 'bg-info text-dark',
  import: 'bg-secondary',
};

function formatRelativeTime(value: string | null) {
  if (!value) {
    return '';
  }

  const timestamp = new Date(value.includes('T') ? value : value.replace(' ', 'T')).getTime();
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AuditLogSidebar() {
  const pathname = usePathname();
  const resource = resolveAuditResource(pathname ?? '');
  const resourceType = resource?.resourceType ?? null;
  const resourceId = resource?.resourceId ?? null;
  const [canRead, setCanRead] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCanRead(hasAdminPermission(getStoredAdminUser(), 'activity_logs.read'));
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === 'true');
    } else {
      setCollapsed(window.innerWidth < 1200);
    }
  }, []);

  const loadEntries = useCallback(() => {
    const token = getStoredAdminToken();
    if (!token || !resourceType) {
      return;
    }

    setLoading(true);
    setError('');

    const query = new URLSearchParams({ resource: resourceType, per_page: '10' });
    if (resourceId) {
      query.set('resource_id', resourceId);
    }

    adminGet(`/admin-api/activity-logs?${query.toString()}`, token)
      .then((payload) => {
        const response = payload as AuditLogListResponse;
        setEntries(response.data ?? []);
        setTotal(response.total ?? 0);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load audit logs.');
      })
      .finally(() => setLoading(false));
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (canRead && !collapsed) {
      loadEntries();
    }
  }, [canRead, collapsed, loadEntries]);

  if (!resource || !canRead) {
    return null;
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(!current));
      return !current;
    });
  }

  const viewAllHref = `/dashboard/activity-logs?resource=${encodeURIComponent(resource.resourceType)}`;

  if (collapsed) {
    return (
      <div className="position-sticky flex-shrink-0 ms-2" style={{ top: 90 }}>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          style={{ writingMode: 'vertical-rl' }}
          onClick={toggleCollapsed}
          aria-label="Show audit logs"
        >
          <i className="ph-duotone ph-clock-counter-clockwise" />
          <span>Audit Logs</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className="position-sticky flex-shrink-0 ms-3"
      style={{ top: 90, width: 300, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      <div className="card mb-0">
        <div className="card-header d-flex align-items-center justify-content-between py-2">
          <h6 className="mb-0">
            {resource.label} Audit{resource.resourceId ? ` #${resource.resourceId}` : ''}
          </h6>
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-link p-0 px-1"
              onClick={loadEntries}
              disabled={loading}
              aria-label="Refresh audit logs"
            >
              <i className="ph-duotone ph-arrows-clockwise" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link p-0 px-1 text-secondary"
              onClick={toggleCollapsed}
              aria-label="Hide audit logs"
            >
              <i className="ph-duotone ph-x" />
            </button>
          </div>
        </div>
        <div className="list-group list-group-flush">
          {error ? <div className="list-group-item text-danger small">{error}</div> : null}
          {!error && loading && entries.length === 0 ? (
            <div className="list-group-item text-muted small">Loading…</div>
          ) : null}
          {!error && !loading && entries.length === 0 ? (
            <div className="list-group-item text-muted small">No audit entries yet.</div>
          ) : null}
          {entries.map((entry) => {
            const failed = !entry.success || entry.success === 0;
            return (
              <div key={entry.id} className="list-group-item py-2">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span
                    className={`badge ${failed ? 'bg-danger' : ACTION_BADGE_CLASSES[entry.action_type] ?? 'bg-secondary'}`}
                  >
                    {entry.action_type}
                    {failed ? ' (failed)' : ''}
                  </span>
                  <small className="text-muted flex-shrink-0">{formatRelativeTime(entry.created_at)}</small>
                </div>
                <div className="small mt-1 text-truncate" title={entry.summary ?? ''}>
                  {entry.summary ?? `${entry.action_type} ${resource.resourceType}`}
                </div>
                <div className="small text-muted text-truncate" title={entry.actor_email ?? ''}>
                  {entry.actor_email ?? 'Unknown user'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="card-footer py-2 text-center">
          <Link href={viewAllHref} className="small">
            View all {resource.label} logs{total > 0 ? ` (${total})` : ''}
          </Link>
        </div>
      </div>
    </aside>
  );
}
