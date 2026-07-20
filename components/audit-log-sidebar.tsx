'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { getStoredAdminToken, getStoredAdminUser, hasAdminPermission } from '@/lib/admin-auth';
import { resolveAuditResource } from '@/lib/audit-resources';

const COLLAPSE_STORAGE_KEY = 'hakidd-admin-audit-sidebar-collapsed';
const SESSION_BASELINE_KEY_PREFIX = 'hakidd-audit-baseline:';

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

// Session counter: the first total observed for a resource in this browser
// session is the baseline; the badge shows how many logs arrived since.
function readSessionCount(resourceType: string, total: number) {
  const key = `${SESSION_BASELINE_KEY_PREFIX}${resourceType}`;
  const stored = window.sessionStorage.getItem(key);
  if (stored === null) {
    window.sessionStorage.setItem(key, String(total));
    return 0;
  }
  return Math.max(0, total - Number(stored));
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
  const [sessionCount, setSessionCount] = useState(0);
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
        const nextTotal = response.total ?? 0;
        setEntries(response.data ?? []);
        setTotal(nextTotal);
        setSessionCount(readSessionCount(resourceType, nextTotal));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load audit logs.');
      })
      .finally(() => setLoading(false));
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (canRead) {
      loadEntries();
    }
  }, [canRead, collapsed, loadEntries]);

  const visible = Boolean(resource) && canRead;

  // The fixed panel needs the page content (and footer) to shrink with it;
  // globals.css keys the margins off these body classes.
  useEffect(() => {
    const body = document.body;
    body.classList.remove('audit-sidebar-open', 'audit-sidebar-rail');
    if (visible) {
      body.classList.add(collapsed ? 'audit-sidebar-rail' : 'audit-sidebar-open');
    }
    return () => {
      body.classList.remove('audit-sidebar-open', 'audit-sidebar-rail');
    };
  }, [visible, collapsed]);

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

  return (
    <nav className={`pc-sidebar audit-sidebar ${collapsed ? 'audit-sidebar-collapsed' : ''}`}>
      <div className="navbar-wrapper">
        {collapsed ? (
          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item">
                <button
                  type="button"
                  className="pc-link position-relative"
                  onClick={toggleCollapsed}
                  aria-label={`Show audit logs${sessionCount > 0 ? ` (${sessionCount} this session)` : ''}`}
                >
                  <span className="pc-micon">
                    <i className="ph-duotone ph-clock-counter-clockwise" />
                  </span>
                  {sessionCount > 0 ? (
                    <span className="badge bg-danger rounded-pill audit-sidebar-counter">
                      {sessionCount > 99 ? '99+' : sessionCount}
                    </span>
                  ) : null}
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item pc-caption">
                <label>
                  {resource.label} Audit{resource.resourceId ? ` #${resource.resourceId}` : ''}
                </label>
              </li>
              <li className="pc-item px-3 pb-2 d-flex justify-content-end gap-1">
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
                  <i className="ph-duotone ph-caret-double-right" />
                </button>
              </li>
              {error ? <li className="pc-item px-3 py-2 text-danger small">{error}</li> : null}
              {!error && loading && entries.length === 0 ? (
                <li className="pc-item px-3 py-2 text-muted small">Loading…</li>
              ) : null}
              {!error && !loading && entries.length === 0 ? (
                <li className="pc-item px-3 py-2 text-muted small">No audit entries yet.</li>
              ) : null}
              {entries.map((entry) => {
                const failed = !entry.success || entry.success === 0;
                return (
                  <li key={entry.id} className="pc-item audit-sidebar-entry">
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
                  </li>
                );
              })}
              <li className="pc-item px-3 py-3 text-center">
                <Link href={viewAllHref} className="small">
                  View all {resource.label} logs{total > 0 ? ` (${total})` : ''}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
