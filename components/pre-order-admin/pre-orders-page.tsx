'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet } from '@/lib/api';
import { getAdminImageUrl } from '@/lib/assets';
import { AlertStack, PageHeader, Pagination, TableCard, ensureAdminToken } from '@/components/product-admin/common';

type PreOrderRow = {
  id?: number | string | null;
  product_id?: string | number | null;
  product_name?: string | null;
  customer_code?: string | null;
  order_qty?: string | number | null;
  price?: string | number | null;
  thumbnail_url?: string | null;
};

type BootstrapTooltipInstance = {
  dispose?: () => void;
};

type BootstrapTooltipConstructor = {
  new (element: Element, options?: Record<string, unknown>): BootstrapTooltipInstance;
  getInstance?: (element: Element) => BootstrapTooltipInstance | null;
};

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function EllipsisTooltip({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const updateTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    updateTruncation();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateTruncation();
      });

      observer.observe(element);
      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener('resize', updateTruncation);
    return () => {
      window.removeEventListener('resize', updateTruncation);
    };
  }, [text]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof window === 'undefined') {
      return;
    }

    const Tooltip = ((window as Window & { bootstrap?: { Tooltip?: BootstrapTooltipConstructor } }).bootstrap?.Tooltip ??
      null) as BootstrapTooltipConstructor | null;

    if (!Tooltip) {
      return;
    }

    const existingTooltip = Tooltip.getInstance?.(element);
    existingTooltip?.dispose?.();

    if (!isTruncated) {
      return;
    }

    const tooltip = new Tooltip(element, {
      trigger: 'hover focus',
      placement: 'top',
      container: 'body',
    });

    return () => {
      tooltip.dispose?.();
    };
  }, [isTruncated, text]);

  return (
    <span
      ref={elementRef}
      className={className}
      style={style}
      title={isTruncated ? text : undefined}
      data-bs-toggle={isTruncated ? 'tooltip' : undefined}
      data-bs-placement={isTruncated ? 'top' : undefined}
      tabIndex={isTruncated ? 0 : undefined}
    >
      {text}
    </span>
  );
}

export default function PreOrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PreOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    adminGet(`/admin-api/pre-orders?page=${page}&per_page=${perPage}`, token)
      .then((payload) => {
        const nextRows = Array.isArray(payload?.data) ? (payload.data as PreOrderRow[]) : [];
        setRows(nextRows);
        setTotal(Number(payload?.total ?? 0));
        setLastPage(Math.max(1, Number(payload?.last_page ?? 1)));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load pre orders.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, router]);

  function exportCsv() {
    if (rows.length === 0) {
      setError('No data available to export.');
      return;
    }

    setError('');
    setMessage('');

    const header = ['No', 'Product ID', 'Product Name', 'Customer Code', 'Order Quantity', 'Price', 'Image URL'];
    const csvRows = [
      header.join(','),
      ...rows.map((row, index) =>
        [
          csvEscape((page - 1) * perPage + index + 1),
          csvEscape(String(row.product_id ?? '').trim()),
          csvEscape(row.product_name ?? ''),
          csvEscape(row.customer_code ?? ''),
          csvEscape(row.order_qty ?? ''),
          csvEscape(row.price ?? ''),
          csvEscape(row.thumbnail_url ?? ''),
        ].join(','),
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pre_order_products.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('CSV export started.');
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="Pre Order"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Pre Order' },
        ]}
      />

      <AlertStack error={error} message={message} />

      <TableCard header={<h5 className="mb-0">Pre Order</h5>}>
        <div className="table-responsive">
          <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
            <button type="button" className="btn btn-light-primary btn-sm" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </button>
          </div>

          <table className="table table-hover tbl-product align-middle">
            <thead>
              <tr>
                <th className="text-end">#No</th>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Customer Code</th>
                <th>Order Quantity</th>
                <th>Image</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No pre orders found.</td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const productId = String(row.product_id ?? '').trim();
                  const productName = String((row.product_name ?? productId) || '-').trim() || '-';
                  const thumbnailUrl = getAdminImageUrl(typeof row.thumbnail_url === 'string' ? row.thumbnail_url : '');

                  return (
                    <tr key={`${row.id ?? productId ?? index}`}>
                      <td className="text-end">{(page - 1) * perPage + index + 1}</td>
                      <td>{productId || '-'}</td>
                      <td style={{ maxWidth: 150 }}>
                        <EllipsisTooltip text={productName} className="d-inline-block text-truncate" style={{ maxWidth: 150 }} />
                      </td>
                      <td>{row.customer_code || '-'}</td>
                      <td>{row.order_qty ?? '-'}</td>
                      <td>
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl ?? ''}
                            alt={productName}
                            className="user-avatar rounded wid-50 hie-50"
                            style={{ objectFit: 'cover' }}
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{row.price ?? '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 ? (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
            <small className="text-muted">
              Total: {total} | Page: {page}/{lastPage}
            </small>
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        ) : null}
      </TableCard>
    </div>
  );
}
