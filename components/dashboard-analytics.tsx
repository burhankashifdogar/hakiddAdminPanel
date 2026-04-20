'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ApexOptions } from 'apexcharts';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminDownload, adminGet, adminPost } from '@/lib/api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type StoredEvent = {
  city: string | null;
  country: string | null;
  customer_code: string | null;
  device_category: string | null;
  event_date: string;
  event_id: number;
  event_label: string | null;
  event_name: string;
  event_params: Record<string, string | number | null>;
  event_timestamp: string | number | null;
  page_location: string | null;
  user_id: string | null;
};

type ClickRow = {
  category_name?: string;
  event_name: string;
  latest_timestamp: string | number | null;
  product_id?: string;
  total_clicks: number;
  unique_users: number;
};

type AnalyticsPayload = {
  activeCartsCount: number;
  avgItemsPerCart: number;
  bigQuerySummary: {
    product_clicks: number;
    total_events: number;
    track_category: number;
    unique_users: number;
  };
  cartsByCountry: Record<string, number>;
  categoryClickBreakdown: ClickRow[];
  days: number;
  monthlyLabels: string[];
  monthlyOrdersData: number[];
  monthlyRevenueData: number[];
  orderCounts: number[];
  orderDates: string[];
  ordersLast30Days: number;
  ordersLast7Days: number;
  productCartOrderAnalysis: Array<{
    avg_order_price: number;
    product: string;
    product_id: string;
    total_ordered_qty: number;
    unique_carts: number;
    unique_orders: number;
  }>;
  productCartUsers: Record<string, string[]>;
  productClickBreakdown: ClickRow[];
  productClicksDetailed: ClickRow[];
  productGroupCartAnalysis: Array<{
    avg_order_price: number;
    group_id: string;
    group_name: string;
    ordered_by: number;
    total_cart_items: number;
    total_ordered_qty: number;
    unique_carts: number;
    unique_products_in_carts: number;
    unique_products_in_group: number;
  }>;
  productGroupProducts: Record<string, Array<{ id: string; title: string }>>;
  recentStoredEvents: StoredEvent[];
  revenueCounts: number[];
  topCartProducts: Array<{ cart_count: number; product: string; product_id: string }>;
  totalCartItems: number;
  totalEvents: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  usersByStatus: Record<string, number>;
  usersLast30Days: number;
  usersLast7Days: number;
};

type SortColumn = 'device' | 'event_name' | 'location' | 'timestamp' | 'user';

type SortState = {
  column: SortColumn;
  direction: 'asc' | 'desc';
};

type FlatpickrInstance = {
  clear: () => void;
  destroy: () => void;
  setDate: (value: string[] | Date[] | string | Date, triggerChange?: boolean) => void;
};

declare global {
  interface Window {
    flatpickr?: (
      element: HTMLElement,
      options: {
        dateFormat?: string;
        defaultDate?: string[] | Date[];
        maxDate?: string;
        mode?: 'range';
        onChange?: (selectedDates: Date[]) => void;
      },
    ) => FlatpickrInstance;
  }
}

function normalizeDays(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '30';
  }
  return String(parsed);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value ?? 0);
}

function isRetryableAnalyticsError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('database is unavailable') ||
    message.includes("can't reach database server") ||
    message.includes('engine is not yet connected') ||
    message.includes('internal server error') ||
    message.includes('failed to fetch')
  );
}

async function loadAnalyticsDashboard(days: string, token: string, attempts = 2, waitMs = 3000) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return (await adminGet(`/admin-api/analytics?days=${encodeURIComponent(days)}`, token)) as AnalyticsPayload;
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isRetryableAnalyticsError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load analytics');
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultRange(days: string) {
  const totalDays = Math.max(1, Number(days) || 30);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (totalDays - 1));
  return [start, end] as const;
}

function isSafeUserIdentifier(value: string) {
  const normalized = value.trim();
  if (normalized === '') {
    return false;
  }

  return /^\d+$/.test(normalized) || /^[A-Za-z0-9._@\-/# ]+$/.test(normalized);
}

function getUserDisplayValue(event: StoredEvent) {
  const customerCode = event.customer_code?.trim() ?? '';
  if (customerCode) {
    return {
      display: limitText(customerCode, 15),
      fullDisplay: customerCode,
      raw: customerCode,
    };
  }

  const rawUserId = event.user_id?.trim() ?? '';
  if (!isSafeUserIdentifier(rawUserId)) {
    return {
      display: '',
      fullDisplay: '',
      raw: rawUserId,
    };
  }

  return {
    display: limitText(rawUserId, 15),
    fullDisplay: rawUserId,
    raw: rawUserId,
  };
}

function formatEventLocation(event: StoredEvent) {
  if (!event.city && !event.country) {
    return '-';
  }

  return `${event.city ?? 'Unknown'}, ${event.country ?? 'Unknown'}`;
}

function getStoredEventType(eventName: string) {
  if (eventName.includes('Product Click')) {
    return 'Product Click';
  }
  if (eventName.includes('Track Category')) {
    return 'Track Category';
  }
  return 'other';
}

function formatRelativeTime(value: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  let timestamp: number | null = null;
  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    timestamp = numeric > 1000000000000 ? Math.floor(numeric / 1000) : numeric;
  } else {
    const parsed = Date.parse(String(value));
    if (!Number.isNaN(parsed)) {
      timestamp = parsed;
    }
  }

  if (timestamp === null) {
    return String(value);
  }

  const now = Date.now();
  const difference = timestamp - now;
  const absoluteDifference = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absoluteDifference < 60000) {
    return formatter.format(Math.round(difference / 1000), 'second');
  }
  if (absoluteDifference < 3600000) {
    return formatter.format(Math.round(difference / 60000), 'minute');
  }
  if (absoluteDifference < 86400000) {
    return formatter.format(Math.round(difference / 3600000), 'hour');
  }
  if (absoluteDifference < 604800000) {
    return formatter.format(Math.round(difference / 86400000), 'day');
  }

  return new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerBrowserDownload(blob, filename);
}

function getDeviceIcon(category: string | null) {
  if (category === 'desktop') {
    return 'desktop';
  }
  if (category === 'tablet') {
    return 'tablet-alt';
  }
  return 'mobile-alt';
}

function getSortIcon(column: SortColumn, currentSort: SortState) {
  if (currentSort.column !== column) {
    return 'fas fa-sort text-muted';
  }

  return currentSort.direction === 'asc' ? 'fas fa-sort-up text-primary' : 'fas fa-sort-down text-primary';
}

function MetricCard({
  className = 'col-lg-2 col-md-4',
  icon,
  iconBackground,
  iconColor,
  subtitle,
  title,
  value,
}: {
  className?: string;
  icon: string;
  iconBackground: string;
  iconColor: string;
  subtitle?: string;
  title: string;
  value: string;
}) {
  return (
    <div className={className}>
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="flex-shrink-0">
              <div className={`${iconBackground} bg-opacity-10 p-3 rounded-circle`}>
                <i className={`${icon} ${iconColor} fs-4`} />
              </div>
            </div>
            <div className="flex-grow-1 ms-3">
              <h6 className="text-muted mb-1 fw-medium">{title}</h6>
              <h3 className="mb-0 fw-bold text-dark">{value}</h3>
              {subtitle ? <small className="text-muted">{subtitle}</small> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartEmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-4">
      <i className={`${icon} text-muted fs-1 mb-3`} />
      <p className="text-muted mb-0">{message}</p>
    </div>
  );
}

export default function DashboardAnalytics() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const days = normalizeDays(searchParams.get('days'));

  const [dashboard, setDashboard] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [sortState, setSortState] = useState<SortState>({
    column: 'timestamp',
    direction: 'desc',
  });
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState({
    endDate: '',
    startDate: '',
  });

  const dateRangeRef = useRef<HTMLInputElement>(null);
  const flatpickrRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase());
      setFiltering(false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;

    const initializeDatePicker = () => {
      if (cancelled || !dateRangeRef.current) {
        return;
      }

      if (!window.flatpickr) {
        pollTimer = window.setTimeout(initializeDatePicker, 100);
        return;
      }

      flatpickrRef.current?.destroy();
      flatpickrRef.current = window.flatpickr(dateRangeRef.current, {
        dateFormat: 'Y-m-d',
        defaultDate: getDefaultRange(days).map((date) => isoDate(date)),
        maxDate: 'today',
        mode: 'range',
        onChange: (selectedDates) => {
          if (selectedDates.length === 2) {
            setExportRange({
              endDate: isoDate(selectedDates[1]),
              startDate: isoDate(selectedDates[0]),
            });
            return;
          }

          if (selectedDates.length === 0) {
            setExportRange({ endDate: '', startDate: '' });
          }
        },
      });
    };

    initializeDatePicker();

    return () => {
      cancelled = true;
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
      }
      flatpickrRef.current?.destroy();
      flatpickrRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('hakidd_admin_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setError('');

    loadAnalyticsDashboard(days, token)
      .then((payload) => {
        if (!cancelled) {
          setDashboard(payload);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load analytics');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const handleDaysChange = (nextDays: string) => {
    setExportRange({ endDate: '', startDate: '' });
    flatpickrRef.current?.setDate(getDefaultRange(nextDays).map((date) => isoDate(date)), false);

    const params = new URLSearchParams(searchParams.toString());
    params.set('days', nextDays);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearDateRange = () => {
    flatpickrRef.current?.clear();
    setExportRange({ endDate: '', startDate: '' });
  };

  const getToken = () => {
    const token = localStorage.getItem('hakidd_admin_token');
    if (!token) {
      window.location.href = '/login';
      return null;
    }
    return token;
  };

  const reloadAnalytics = async ({
    attempts = 2,
    showLoadingState = true,
    surfaceError = true,
    waitMs = 3000,
  }: {
    attempts?: number;
    showLoadingState?: boolean;
    surfaceError?: boolean;
    waitMs?: number;
  } = {}) => {
    const token = getToken();
    if (!token) {
      return false;
    }

    if (showLoadingState) {
      setLoading(true);
    }

    if (surfaceError) {
      setError('');
    }

    try {
      const payload = await loadAnalyticsDashboard(days, token, attempts, waitMs);
      setDashboard(payload);
      return true;
    } catch (requestError) {
      if (surfaceError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to refresh analytics');
      }
      return false;
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  const exportAnalytics = async (kind: 'csv' | 'excel' | 'product_cart' | 'product_group') => {
    const token = getToken();
    if (!token) {
      return;
    }

    setWorkingAction(kind);
    setError('');
    setNotice('');

    try {
      const params = new URLSearchParams();

      if (exportRange.startDate && exportRange.endDate) {
        params.set('start_date', exportRange.startDate);
        params.set('end_date', exportRange.endDate);
      } else {
        params.set('days', days);
      }

      if (kind === 'product_cart') {
        params.set('only', 'product_cart');
      } else if (kind === 'product_group') {
        params.set('only', 'product_group');
      }

      const path = kind === 'csv' ? '/admin-api/analytics/export/csv' : '/admin-api/analytics/export/excel';
      const download = await adminDownload(`${path}?${params.toString()}`, token);
      triggerBrowserDownload(download.blob, download.filename);
      setNotice(`Exported ${download.filename}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to export analytics');
    } finally {
      setWorkingAction(null);
    }
  };

  const fetchLatestBigQuery = async () => {
    const token = getToken();
    if (!token) {
      return;
    }

    setWorkingAction('fetch-bigquery');
    setError('');
    setNotice('');

    try {
      const payload = await adminPost('/admin-api/analytics/bigquery/fetch', token, { type: 'both' });
      if (payload?.success === false) {
        throw new Error(String(payload?.message ?? 'BigQuery data fetch failed'));
      }

      const completedMessage = String(payload?.message ?? 'BigQuery data fetch completed');
      setNotice(completedMessage);

      const refreshed = await reloadAnalytics({
        attempts: 4,
        showLoadingState: false,
        surfaceError: false,
        waitMs: 4000,
      });

      if (!refreshed) {
        setNotice(`${completedMessage}. The import finished, but the dashboard refresh is still catching up. Try again in a few seconds.`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to fetch BigQuery data');
    } finally {
      setWorkingAction(null);
    }
  };

  const exportClickData = () => {
    downloadJsonFile(
      {
        category_clicks: dashboard?.categoryClickBreakdown ?? [],
        export_date: new Date().toISOString(),
        product_clicks: dashboard?.productClickBreakdown ?? [],
      },
      'click-analytics-data.json',
    );
    setNotice('Exported click-analytics-data.json');
  };

  const eventRows = (dashboard?.recentStoredEvents ?? []).map((event) => {
    const user = getUserDisplayValue(event);
    return {
      event,
      location: formatEventLocation(event),
      searchableText: [
        event.event_name,
        event.event_label ?? '',
        event.page_location ?? '',
        event.customer_code ?? '',
        event.user_id ?? '',
        user.fullDisplay,
        event.device_category ?? '',
        event.city ?? '',
        event.country ?? '',
      ]
        .join(' ')
        .toLowerCase(),
      type: getStoredEventType(event.event_name),
      user,
    };
  });

  const countryOptions = [...new Set(eventRows.map((row) => row.event.country).filter((value): value is string => Boolean(value)))].sort(
    (left, right) => left.localeCompare(right),
  );

  const filteredEventRows = [...eventRows].filter((row) => {
    if (searchTerm && !row.searchableText.includes(searchTerm)) {
      return false;
    }
    if (selectedEventType && row.type !== selectedEventType) {
      return false;
    }
    if (selectedDevice && (row.event.device_category ?? '') !== selectedDevice) {
      return false;
    }
    if (selectedCountry && (row.event.country ?? '') !== selectedCountry) {
      return false;
    }
    return true;
  });

  filteredEventRows.sort((left, right) => {
    let leftValue = '';
    let rightValue = '';

    if (sortState.column === 'timestamp') {
      const leftNumeric = Number(left.event.event_timestamp ?? 0);
      const rightNumeric = Number(right.event.event_timestamp ?? 0);
      return sortState.direction === 'asc' ? leftNumeric - rightNumeric : rightNumeric - leftNumeric;
    }

    if (sortState.column === 'event_name') {
      leftValue = left.event.event_name;
      rightValue = right.event.event_name;
    } else if (sortState.column === 'user') {
      leftValue = left.user.fullDisplay;
      rightValue = right.user.fullDisplay;
    } else if (sortState.column === 'location') {
      leftValue = left.location;
      rightValue = right.location;
    } else if (sortState.column === 'device') {
      leftValue = left.event.device_category ?? '';
      rightValue = right.event.device_category ?? '';
    }

    const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
    return sortState.direction === 'asc' ? comparison : comparison * -1;
  });

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCountry('');
    setSelectedDevice('');
    setSelectedEventType('');
    setFiltering(false);
  };

  const removeFilter = (filterName: 'country' | 'device' | 'eventType' | 'search') => {
    if (filterName === 'search') {
      setSearchInput('');
      setSearchTerm('');
      return;
    }
    if (filterName === 'eventType') {
      setSelectedEventType('');
      return;
    }
    if (filterName === 'device') {
      setSelectedDevice('');
      return;
    }
    setSelectedCountry('');
  };

  const exportFilteredEvents = () => {
    downloadJsonFile(
      filteredEventRows.map((row) => ({
        device: row.event.device_category,
        event_name: row.event.event_name,
        location: row.location,
        timestamp: row.event.event_timestamp,
      })),
      'filtered-bigquery-events.json',
    );
    setNotice('Exported filtered-bigquery-events.json');
  };

  const toggleSort = (column: SortColumn) => {
    setSortState((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        column,
        direction: column === 'timestamp' ? 'desc' : 'asc',
      };
    });
  };

  const dailyOrdersOptions: ApexOptions = {
    chart: {
      height: 300,
      toolbar: { show: false },
      type: 'line',
    },
    colors: ['#111111', '#0f9d8a'],
    dataLabels: { enabled: false },
    fill: {
      opacity: [0.1, 0.1],
      type: 'solid',
    },
    grid: {
      borderColor: '#dbe3ec',
      strokeDashArray: 0,
    },
    legend: { position: 'top' },
    markers: {
      hover: { size: 6 },
      size: 4,
      strokeWidth: 0,
    },
    stroke: { curve: 'straight', width: [3, 3] },
    tooltip: {
      intersect: false,
      shared: true,
      y: {
        formatter: (value: number, context?: { seriesIndex?: number }) =>
          context?.seriesIndex === 0 ? formatNumber(Math.round(value)) : formatCurrency(value),
      },
    },
    xaxis: {
      categories: dashboard?.orderDates ?? [],
      axisBorder: { color: '#cbd5e0' },
      axisTicks: { color: '#cbd5e0' },
      title: { text: 'Date' },
    },
    yaxis: [
      {
        forceNiceScale: true,
        labels: {
          formatter: (value: number) => formatNumber(Math.round(value)),
        },
        title: { text: 'Orders' },
      },
      {
        forceNiceScale: true,
        opposite: true,
        title: { text: 'Revenue ($)' },
        labels: {
          formatter: (value: number) => formatCurrency(value),
        },
      },
    ],
  };

  const monthlyRevenueOptions: ApexOptions = {
    chart: {
      height: 300,
      toolbar: { show: false },
      type: 'line',
    },
    colors: ['#0f9d8a', '#111111'],
    dataLabels: { enabled: false },
    fill: {
      opacity: [0.12, 0.12],
      type: 'solid',
    },
    grid: {
      borderColor: '#dbe3ec',
      strokeDashArray: 0,
    },
    legend: { position: 'top' },
    markers: {
      hover: { size: 6 },
      size: 4,
      strokeWidth: 0,
    },
    stroke: {
      curve: 'straight',
      width: [3, 3],
    },
    tooltip: {
      intersect: false,
      shared: true,
      y: {
        formatter: (value: number, context?: { seriesIndex?: number }) =>
          context?.seriesIndex === 0 ? formatCurrency(value) : formatNumber(Math.round(value)),
      },
    },
    xaxis: {
      categories: dashboard?.monthlyLabels ?? [],
      axisBorder: { color: '#cbd5e0' },
      axisTicks: { color: '#cbd5e0' },
    },
    yaxis: [
      {
        title: { text: 'Revenue ($)' },
        labels: {
          formatter: (value: number) => formatCurrency(value),
        },
      },
      {
        forceNiceScale: true,
        opposite: true,
        title: { text: 'Orders' },
        labels: {
          formatter: (value: number) => formatNumber(Math.round(value)),
        },
      },
    ],
  };

  const userStatusLabels = Object.keys(dashboard?.usersByStatus ?? {});
  const userStatusSeries = Object.values(dashboard?.usersByStatus ?? {});

  const userStatusOptions: ApexOptions = {
    chart: {
      height: 300,
      toolbar: { show: false },
      type: 'pie',
    },
    colors: ['#28a745', '#ffc107'],
    labels: userStatusLabels,
    legend: { position: 'bottom' },
  };

  const productClickOptions: ApexOptions = {
    chart: {
      height: 300,
      stacked: false,
      toolbar: { show: false },
      type: 'bar',
    },
    colors: ['#28a745', '#17a2b8'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#edf2f7' },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '48%',
      },
    },
    xaxis: {
      categories: (dashboard?.productClickBreakdown ?? []).map((row) => row.product_id ?? row.event_name),
      labels: {
        rotate: -30,
      },
    },
  };

  const categoryClickOptions: ApexOptions = {
    chart: {
      height: 300,
      stacked: false,
      toolbar: { show: false },
      type: 'bar',
    },
    colors: ['#ffc107', '#198754'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#edf2f7' },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '48%',
      },
    },
    xaxis: {
      categories: (dashboard?.categoryClickBreakdown ?? []).map((row) => row.category_name ?? row.event_name),
      labels: {
        rotate: -30,
      },
    },
  };

  const activeFilterChips = [
    searchTerm ? { key: 'search' as const, label: `Search: "${searchTerm}"` } : null,
    selectedEventType ? { key: 'eventType' as const, label: `Type: ${selectedEventType}` } : null,
    selectedDevice ? { key: 'device' as const, label: `Device: ${selectedDevice}` } : null,
    selectedCountry ? { key: 'country' as const, label: `Country: ${selectedCountry}` } : null,
  ].filter((value): value is { key: 'country' | 'device' | 'eventType' | 'search'; label: string } => Boolean(value));

  return (
    <div className="pc-content">
      <style jsx global>{`
        .analytics-dashboard .text-purple {
          color: #6f42c1 !important;
        }

        .analytics-dashboard .bg-purple {
          background-color: #6f42c1 !important;
        }

        .analytics-dashboard .bg-purple.bg-opacity-10 {
          background-color: rgba(111, 66, 193, 0.1) !important;
        }

        .analytics-dashboard .sort-trigger {
          border: 0;
          background: transparent;
          box-shadow: none;
          padding: 0;
        }

        .analytics-dashboard .active-filter-chip button {
          background: transparent;
          border: 0;
          color: inherit;
          line-height: 1;
          padding: 0;
        }
      `}</style>

      <div className="analytics-dashboard container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="mb-1 fw-bold text-dark">Analytics Dashboard</h2>
            <p className="text-muted mb-0">
              <i className="fas fa-calendar-alt me-1" />
              Showing insights for the last {dashboard?.days ?? Number(days)} days
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary btn-sm dropdown-toggle"
                type="button"
                id="analyticsExportDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="fas fa-download me-1" />
                Export
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="analyticsExportDropdown">
                <li>
                  <button className="dropdown-item" type="button" disabled={Boolean(workingAction)} onClick={() => void exportAnalytics('csv')}>
                    <i className="fas fa-file-csv me-2 text-primary" />
                    <div>
                      <strong>Simple CSV</strong>
                      <small className="d-block text-muted">Event data only</small>
                    </div>
                  </button>
                </li>
                <li>
                  <button className="dropdown-item" type="button" disabled={Boolean(workingAction)} onClick={() => void exportAnalytics('excel')}>
                    <i className="fas fa-file-excel me-2 text-success" />
                    <div>
                      <strong>Product &amp; Category Clicks</strong>
                      <small className="d-block text-muted">Multi-sheet comprehensive analytics</small>
                    </div>
                  </button>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    disabled={Boolean(workingAction)}
                    onClick={() => void exportAnalytics('product_cart')}
                  >
                    <i className="fas fa-shopping-cart me-2 text-info" />
                    <div>
                      <strong>Export: Product Cart vs Orders</strong>
                      <small className="d-block text-muted">Only product cart/order analysis</small>
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    disabled={Boolean(workingAction)}
                    onClick={() => void exportAnalytics('product_group')}
                  >
                    <i className="fas fa-layer-group me-2 text-primary" />
                    <div>
                      <strong>Export: Product Group Analysis</strong>
                      <small className="d-block text-muted">Only group-level analysis</small>
                    </div>
                  </button>
                </li>
              </ul>
            </div>

            <div className="input-group input-group-sm" style={{ width: 280 }}>
              <span className="input-group-text">
                <i className="fas fa-calendar-alt" />
              </span>
              <input
                ref={dateRangeRef}
                type="text"
                className="form-control form-control-sm"
                placeholder="Select date range..."
                readOnly
              />
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={clearDateRange}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i className="fas fa-filter me-1" />
                {days} days
              </button>
              <ul className="dropdown-menu">
                {['7', '30', '90'].map((option) => (
                  <li key={option}>
                    <button className="dropdown-item" type="button" onClick={() => handleDaysChange(option)}>
                      Last {option} days
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="alert alert-success" role="alert">
            {notice}
          </div>
        ) : null}

        {loading && !dashboard ? (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-3 mb-0">Loading analytics dashboard...</p>
            </div>
          </div>
        ) : null}

        {dashboard ? (
          <>
            <div className="row g-4 mb-5">
              <MetricCard icon="fas fa-chart-line" iconBackground="bg-primary" iconColor="text-primary" title="Total Events" value={formatNumber(dashboard.totalEvents)} />
              <MetricCard icon="fas fa-shopping-cart" iconBackground="bg-success" iconColor="text-success" title="Total Orders" value={formatNumber(dashboard.totalOrders)} />
              <MetricCard icon="fas fa-shopping-basket" iconBackground="bg-info" iconColor="text-info" title="Cart Items" value={formatNumber(dashboard.totalCartItems)} />
              <MetricCard icon="fas fa-users" iconBackground="bg-warning" iconColor="text-warning" title="Total Users" value={formatNumber(dashboard.totalUsers)} />
              <MetricCard icon="fas fa-box" iconBackground="bg-secondary" iconColor="text-secondary" title="Products" value={formatNumber(dashboard.totalProducts)} />
              <MetricCard icon="fas fa-shopping-cart" iconBackground="bg-danger" iconColor="text-danger" title="Avg Cart Size" value={String(dashboard.avgItemsPerCart)} />
            </div>

            <div className="row g-4 mb-5">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-shopping-basket text-primary me-2" />
                      <h5 className="mb-0 fw-semibold">Top Cart Products</h5>
                    </div>
                    <p className="text-muted small mb-0">Most added to cart items</p>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 fw-semibold">Product</th>
                            <th className="border-0 fw-semibold text-end">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.topCartProducts.length > 0 ? (
                            dashboard.topCartProducts.map((product) => (
                              <tr key={product.product_id}>
                                <td className="border-0">
                                  <span className="fw-medium">{limitText(product.product || `Product #${product.product_id}`, 25)}</span>
                                </td>
                                <td className="border-0 text-end">
                                  <span className="badge bg-primary bg-opacity-10 text-primary fw-medium">{product.cart_count}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="text-center text-muted py-4">
                                <i className="fas fa-shopping-basket fs-1 text-muted mb-2 d-block" />
                                No cart data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-globe text-success me-2" />
                      <h5 className="mb-0 fw-semibold">Carts by Country</h5>
                    </div>
                    <p className="text-muted small mb-0">Geographic distribution of cart items</p>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 fw-semibold">Country</th>
                            <th className="border-0 fw-semibold text-end">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dashboard.cartsByCountry).length > 0 ? (
                            Object.entries(dashboard.cartsByCountry).map(([country, count]) => (
                              <tr key={country}>
                                <td className="border-0">
                                  <span className="fw-medium">{country}</span>
                                </td>
                                <td className="border-0 text-end">
                                  <span className="badge bg-success bg-opacity-10 text-success fw-medium">{count}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="text-center text-muted py-4">
                                <i className="fas fa-globe fs-1 text-muted mb-2 d-block" />
                                No country data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-clock text-info me-2" />
                      <h5 className="mb-0 fw-semibold">Recent Activity</h5>
                    </div>
                    <p className="text-muted small mb-0">Activity over different periods</p>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Orders (Last 7 days)</span>
                          <span className="fw-bold text-primary">{formatNumber(dashboard.ordersLast7Days)}</span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Orders (Last 30 days)</span>
                          <span className="fw-bold text-success">{formatNumber(dashboard.ordersLast30Days)}</span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Users (Last 7 days)</span>
                          <span className="fw-bold text-info">{formatNumber(dashboard.usersLast7Days)}</span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Users (Last 30 days)</span>
                          <span className="fw-bold text-warning">{formatNumber(dashboard.usersLast30Days)}</span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Active Carts</span>
                          <span className="fw-bold text-danger">{formatNumber(dashboard.activeCartsCount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-shopping-cart text-info me-2" />
                      <h5 className="mb-0 fw-semibold">Product Cart vs Order Analysis</h5>
                    </div>
                    <p className="text-muted small mb-0">Compare products in carts vs actual orders</p>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 fw-semibold">Product</th>
                            <th className="border-0 fw-semibold text-center">In Carts</th>
                            <th className="border-0 fw-semibold text-center">Ordered By</th>
                            <th className="border-0 fw-semibold text-center">Total Ordered Qty</th>
                            <th className="border-0 fw-semibold text-center">Avg Order Price</th>
                            <th className="border-0 fw-semibold text-center">Users</th>
                            <th className="border-0 fw-semibold text-center">Conversion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.productCartOrderAnalysis.length > 0 ? (
                            dashboard.productCartOrderAnalysis.map((product) => {
                              const usersForProduct = dashboard.productCartUsers[product.product_id] ?? [];
                              const conversionRate = product.unique_carts > 0 ? Number(((product.unique_orders / product.unique_carts) * 100).toFixed(1)) : 0;
                              const progressWidth = Math.min(100, conversionRate);

                              return (
                                <tr key={product.product_id}>
                                  <td className="border-0">
                                    <div className="d-flex align-items-center">
                                      <span className="fw-medium">{limitText(product.product || `Product #${product.product_id}`, 30)}</span>
                                    </div>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-warning bg-opacity-10 text-warning fw-medium">{product.unique_carts}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-success bg-opacity-10 text-success fw-medium">{product.unique_orders ?? 0}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-info bg-opacity-10 text-info fw-medium">{product.total_ordered_qty ?? 0}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    {product.avg_order_price ? <span className="text-success fw-medium">{formatCurrency(product.avg_order_price)}</span> : <span className="text-muted">-</span>}
                                  </td>
                                  <td className="border-0 text-center">
                                    {usersForProduct.length > 0 ? (
                                      <div className="dropdown">
                                        <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                          {usersForProduct.length} users
                                        </button>
                                        <ul className="dropdown-menu">
                                          {usersForProduct.map((code) => (
                                            <li key={`${product.product_id}-${code}`}>
                                              <span className="dropdown-item-text">{code}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td className="border-0 text-center">
                                    <div className="d-flex align-items-center justify-content-center">
                                      <div className="progress me-2" style={{ height: 6, width: 50 }}>
                                        <div className="progress-bar bg-success" role="progressbar" style={{ width: `${progressWidth}%` }} aria-valuenow={progressWidth} aria-valuemin={0} aria-valuemax={100} />
                                      </div>
                                      <span className="small fw-medium">{conversionRate}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center text-muted py-4">
                                <i className="fas fa-shopping-cart fs-1 text-muted mb-2 d-block" />
                                <h6 className="text-muted">No product cart data available</h6>
                                <p className="small text-muted mb-0">Products with cart activity will appear here.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-layer-group text-primary me-2" />
                      <h5 className="mb-0 fw-semibold">Product Group Cart &amp; Order Analysis</h5>
                    </div>
                    <p className="text-muted small mb-0">Group-wise cart and order performance</p>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 fw-semibold">Product Group</th>
                            <th className="border-0 fw-semibold text-center">Unique Carts</th>
                            <th className="border-0 fw-semibold text-center">Total Cart Items</th>
                            <th className="border-0 fw-semibold text-center">Ordered By</th>
                            <th className="border-0 fw-semibold text-center">Total Ordered Qty</th>
                            <th className="border-0 fw-semibold text-center">Avg Order Price</th>
                            <th className="border-0 fw-semibold text-center">Products</th>
                            <th className="border-0 fw-semibold text-center">Cart Coverage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.productGroupCartAnalysis.length > 0 ? (
                            dashboard.productGroupCartAnalysis.map((group) => {
                              const productsForGroup = dashboard.productGroupProducts[group.group_id] ?? [];
                              const coverageRate = group.unique_products_in_group > 0 ? Number(((group.unique_products_in_carts / group.unique_products_in_group) * 100).toFixed(1)) : 0;
                              const progressWidth = Math.min(100, coverageRate);

                              return (
                                <tr key={group.group_id}>
                                  <td className="border-0">
                                    <div className="d-flex align-items-center">
                                      <span className="fw-medium">{limitText(group.group_name || `Group #${group.group_id}`, 30)}</span>
                                    </div>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-primary bg-opacity-10 text-primary fw-medium">{group.unique_carts}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-info bg-opacity-10 text-info fw-medium">{group.total_cart_items}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-success bg-opacity-10 text-success fw-medium">{group.ordered_by ?? 0}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    <span className="badge bg-info bg-opacity-10 text-info fw-medium">{group.total_ordered_qty ?? 0}</span>
                                  </td>
                                  <td className="border-0 text-center">
                                    {group.avg_order_price ? <span className="text-success fw-medium">{formatCurrency(group.avg_order_price)}</span> : <span className="text-muted">-</span>}
                                  </td>
                                  <td className="border-0 text-center">
                                    {productsForGroup.length > 0 ? (
                                      <div className="dropdown">
                                        <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                          {productsForGroup.length} products
                                        </button>
                                        <ul className="dropdown-menu">
                                          {productsForGroup.map((product) => (
                                            <li key={`${group.group_id}-${product.id}`}>
                                              <Link href={`/dashboard/products/${product.id}`} className="dropdown-item">
                                                {product.title}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td className="border-0 text-center">
                                    <div className="d-flex align-items-center justify-content-center">
                                      <div className="progress me-2" style={{ height: 6, width: 50 }}>
                                        <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${progressWidth}%` }} aria-valuenow={progressWidth} aria-valuemin={0} aria-valuemax={100} />
                                      </div>
                                      <span className="small fw-medium">{coverageRate}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} className="text-center text-muted py-4">
                                <i className="fas fa-layer-group fs-1 text-muted mb-2 d-block" />
                                <h6 className="text-muted">No product group data available</h6>
                                <p className="small text-muted mb-0">Product groups with cart activity will appear here.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-lg-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-chart-area text-primary me-2" />
                      <h5 className="mb-0 fw-semibold">Daily Orders &amp; Revenue (Last 30 Days)</h5>
                    </div>
                    <p className="text-muted small mb-0">Track daily order volume and revenue trends</p>
                  </div>
                  <div className="card-body">
                    {dashboard.orderDates.length > 0 ? (
                      <ReactApexChart
                        options={dailyOrdersOptions}
                        series={[
                          { data: dashboard.orderCounts, name: 'Orders' },
                          { data: dashboard.revenueCounts, name: 'Revenue' },
                        ]}
                        type="line"
                        height={300}
                      />
                    ) : (
                      <ChartEmptyState icon="fas fa-chart-area" message="No order trend data available" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-dollar-sign text-success me-2" />
                      <h5 className="mb-0 fw-semibold">Monthly Revenue &amp; Orders Trend</h5>
                    </div>
                    <p className="text-muted small mb-0">Revenue and grouped order activity over the last 12 months</p>
                  </div>
                  <div className="card-body">
                    {dashboard.monthlyLabels.length > 0 ? (
                      <ReactApexChart
                        options={monthlyRevenueOptions}
                        series={[
                          { data: dashboard.monthlyRevenueData, name: 'Revenue', type: 'line' },
                          { data: dashboard.monthlyOrdersData, name: 'Orders', type: 'line' },
                        ]}
                        type="line"
                        height={300}
                      />
                    ) : (
                      <ChartEmptyState icon="fas fa-dollar-sign" message="No monthly revenue data available" />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-users text-info me-2" />
                      <h5 className="mb-0 fw-semibold">User Status</h5>
                    </div>
                  </div>
                  <div className="card-body">
                    {userStatusSeries.length > 0 ? (
                      <ReactApexChart options={userStatusOptions} series={userStatusSeries} type="pie" height={300} />
                    ) : (
                      <ChartEmptyState icon="fas fa-users" message="No user status data available" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-12">
                <div className="row g-3 mb-4">
                  <MetricCard
                    className="col-lg-3 col-md-6"
                    icon="fas fa-mouse-pointer"
                    iconBackground="bg-info"
                    iconColor="text-info"
                    title="Product Clicks"
                    value={formatNumber(dashboard.bigQuerySummary.product_clicks)}
                    subtitle={`Last ${dashboard.days} days`}
                  />
                  <MetricCard
                    className="col-lg-3 col-md-6"
                    icon="fas fa-tags"
                    iconBackground="bg-warning"
                    iconColor="text-warning"
                    title="Category Clicks"
                    value={formatNumber(dashboard.bigQuerySummary.track_category)}
                    subtitle={`Last ${dashboard.days} days`}
                  />
                  <MetricCard
                    className="col-lg-3 col-md-6"
                    icon="fas fa-chart-line"
                    iconBackground="bg-success"
                    iconColor="text-success"
                    title="Total BigQuery Events"
                    value={formatNumber(dashboard.bigQuerySummary.total_events)}
                    subtitle="Stored in database"
                  />
                  <MetricCard
                    className="col-lg-3 col-md-6"
                    icon="fas fa-users"
                    iconBackground="bg-purple"
                    iconColor="text-purple"
                    title="Unique Users"
                    value={formatNumber(dashboard.bigQuerySummary.unique_users)}
                    subtitle="From BigQuery data"
                  />
                </div>
              </div>

              <div className="col-lg-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-database text-info me-2" />
                          <h5 className="mb-0 fw-semibold">Recent BigQuery Events</h5>
                        </div>
                        <p className="text-muted small mb-0">Latest events stored from BigQuery</p>
                      </div>

                      <div className="d-flex align-items-center">
                        <div className="me-2">
                          <button className="btn btn-outline-primary btn-sm" type="button" disabled={Boolean(workingAction)} onClick={() => void fetchLatestBigQuery()}>
                            <i className="fas fa-sync-alt me-1" />
                            {workingAction === 'fetch-bigquery' ? 'Fetching...' : 'Fetch Latest'}
                          </button>
                        </div>

                        <span className="badge bg-info bg-opacity-10 text-info" id="eventsCount">
                          {filteredEventRows.length} shown
                        </span>
                      </div>
                    </div>

                    <div className="row g-3 mt-3">
                      <div className="col-lg-4">
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="fas fa-search text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Search events, users, locations..."
                            value={searchInput}
                            onChange={(event) => {
                              setFiltering(true);
                              setSearchInput(event.target.value);
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-lg-2">
                        <select className="form-select" value={selectedEventType} onChange={(event) => setSelectedEventType(event.target.value)}>
                          <option value="">All Events</option>
                          <option value="Product Click">Product Clicks</option>
                          <option value="Track Category">Category Clicks</option>
                          <option value="other">Other Events</option>
                        </select>
                      </div>

                      <div className="col-lg-2">
                        <select className="form-select" value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}>
                          <option value="">All Devices</option>
                          <option value="desktop">Desktop</option>
                          <option value="mobile">Mobile</option>
                          <option value="tablet">Tablet</option>
                        </select>
                      </div>

                      <div className="col-lg-2">
                        <select className="form-select" value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
                          <option value="">All Countries</option>
                          {countryOptions.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-lg-2">
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={clearAllFilters} title="Clear Filters">
                            <i className="fas fa-times" />
                          </button>
                          <button className="btn btn-outline-success btn-sm" type="button" onClick={exportFilteredEvents} title="Export Results">
                            <i className="fas fa-download" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {activeFilterChips.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {activeFilterChips.map((filter) => (
                          <span key={filter.key} className="badge bg-primary bg-opacity-10 text-primary active-filter-chip">
                            {filter.label}
                            <button type="button" className="ms-1" onClick={() => removeFilter(filter.key)}>
                              <i className="fas fa-times" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="card-body">
                    {filtering ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-2 mb-0">Filtering events...</p>
                      </div>
                    ) : dashboard.recentStoredEvents.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className="fas fa-database fs-1 text-muted mb-2 d-block" />
                        No BigQuery events stored yet
                        <br />
                        <small>
                          Run <code>php artisan analytics:fetch</code> to populate data
                        </small>
                      </div>
                    ) : filteredEventRows.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-search fs-1 text-muted mb-2 d-block" />
                        <h6 className="text-muted">No events match your filters</h6>
                        <p className="small text-muted">Try adjusting your search criteria or clearing filters.</p>
                        <button className="btn btn-outline-primary btn-sm" type="button" onClick={clearAllFilters}>
                          <i className="fas fa-times me-1" />
                          Clear All Filters
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle">
                          <thead className="table-light">
                            <tr>
                              <th className="border-0 fw-semibold">
                                <div className="d-flex align-items-center">
                                  Event Name
                                  <button className="sort-trigger btn btn-sm ms-1" type="button" onClick={() => toggleSort('event_name')} title="Sort by Event Name">
                                    <i className={getSortIcon('event_name', sortState)} />
                                  </button>
                                </div>
                              </th>
                              <th className="border-0 fw-semibold">
                                <div className="d-flex align-items-center">
                                  User
                                  <button className="sort-trigger btn btn-sm ms-1" type="button" onClick={() => toggleSort('user')} title="Sort by User">
                                    <i className={getSortIcon('user', sortState)} />
                                  </button>
                                </div>
                              </th>
                              <th className="border-0 fw-semibold">
                                <div className="d-flex align-items-center">
                                  Location
                                  <button className="sort-trigger btn btn-sm ms-1" type="button" onClick={() => toggleSort('location')} title="Sort by Location">
                                    <i className={getSortIcon('location', sortState)} />
                                  </button>
                                </div>
                              </th>
                              <th className="border-0 fw-semibold">
                                <div className="d-flex align-items-center">
                                  Device
                                  <button className="sort-trigger btn btn-sm ms-1" type="button" onClick={() => toggleSort('device')} title="Sort by Device">
                                    <i className={getSortIcon('device', sortState)} />
                                  </button>
                                </div>
                              </th>
                              <th className="border-0 fw-semibold">
                                <div className="d-flex align-items-center">
                                  Timestamp
                                  <button className="sort-trigger btn btn-sm ms-1" type="button" onClick={() => toggleSort('timestamp')} title="Sort by Timestamp">
                                    <i className={getSortIcon('timestamp', sortState)} />
                                  </button>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEventRows.map((row) => (
                              <tr key={row.event.event_id}>
                                <td className="border-0">
                                  {row.type === 'Product Click' ? (
                                    <span className="badge bg-info bg-opacity-10 text-info me-1">
                                      <i className="fas fa-mouse-pointer me-1" />
                                      Product
                                    </span>
                                  ) : row.type === 'Track Category' ? (
                                    <span className="badge bg-warning bg-opacity-10 text-warning me-1">
                                      <i className="fas fa-tags me-1" />
                                      Category
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary me-1">
                                      <i className="fas fa-calendar me-1" />
                                      Event
                                    </span>
                                  )}
                                  <span className="fw-medium">{limitText(row.event.event_name, 30)}</span>
                                </td>
                                <td className="border-0">
                                  <small className="text-muted" title={row.user.raw}>
                                    {row.user.display || '-'}
                                  </small>
                                </td>
                                <td className="border-0">
                                  {row.location !== '-' ? (
                                    <small className="text-muted">
                                      <i className="fas fa-map-marker-alt me-1" />
                                      {row.location}
                                    </small>
                                  ) : (
                                    <small className="text-muted">-</small>
                                  )}
                                </td>
                                <td className="border-0">
                                  {row.event.device_category ? (
                                    <small className="text-muted">
                                      <i className={`fas fa-${getDeviceIcon(row.event.device_category)} me-1`} />
                                      {row.event.device_category.charAt(0).toUpperCase() + row.event.device_category.slice(1)}
                                    </small>
                                  ) : (
                                    <small className="text-muted">-</small>
                                  )}
                                </td>
                                <td className="border-0">
                                  <small className="text-muted">{formatRelativeTime(row.event.event_timestamp)}</small>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 pb-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-chart-bar text-primary me-2" />
                          <h5 className="mb-0 fw-semibold">Click Analytics Overview</h5>
                        </div>
                        <p className="text-muted small mb-0">Product and category click performance</p>
                      </div>
                      <div className="dropdown">
                        <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                          <i className="fas fa-ellipsis-v" />
                        </button>
                        <ul className="dropdown-menu">
                          <li>
                            <button className="dropdown-item" type="button" onClick={exportClickData}>
                              <i className="fas fa-download me-2" />
                              Export Data
                            </button>
                          </li>
                          <li>
                            <button className="dropdown-item" type="button" onClick={() => void reloadAnalytics()}>
                              <i className="fas fa-sync-alt me-2" />
                              Refresh
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-lg-6">
                        <h6 className="fw-semibold mb-3">
                          <i className="fas fa-mouse-pointer text-info me-1" />
                          Top Product Clicks
                        </h6>
                        {dashboard.productClickBreakdown.length > 0 ? (
                          <ReactApexChart
                            options={productClickOptions}
                            series={[
                              { data: dashboard.productClickBreakdown.map((row) => row.unique_users), name: 'Unique Users' },
                              { data: dashboard.productClickBreakdown.map((row) => row.total_clicks), name: 'Total Clicks' },
                            ]}
                            type="bar"
                            height={300}
                          />
                        ) : (
                          <ChartEmptyState icon="fas fa-chart-bar" message="No product click data available" />
                        )}
                      </div>

                      <div className="col-lg-6">
                        <h6 className="fw-semibold mb-3">
                          <i className="fas fa-tags text-warning me-1" />
                          Top Category Clicks
                        </h6>
                        {dashboard.categoryClickBreakdown.length > 0 ? (
                          <ReactApexChart
                            options={categoryClickOptions}
                            series={[
                              { data: dashboard.categoryClickBreakdown.map((row) => row.unique_users), name: 'Unique Users' },
                              { data: dashboard.categoryClickBreakdown.map((row) => row.total_clicks), name: 'Total Clicks' },
                            ]}
                            type="bar"
                            height={300}
                          />
                        ) : (
                          <ChartEmptyState icon="fas fa-chart-bar" message="No category click data available" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
