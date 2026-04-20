'use client';

export type OrderHistoryMode = 'grouped' | 'product';

export type GroupedOrderRow = {
  order_id: string;
  account_number: string | null;
  product_ids: string | null;
  quantities: string | null;
  prices: string | null;
  status: number | string | null;
  date: string | null;
  order_comment: string | null;
  items?: OrderLineItem[];
};

export type OrderLineItem = {
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  ship_pack?: number;
  units_ordered?: number;
  price: number;
  price_per_unit?: number;
  line_total?: number;
  thumbnail_url: string | null;
};

export type ProductOrderRow = {
  order_id: string;
  account_number: string | null;
  product_id: string | number | null;
  order_qty: string | number | null;
  price: string | number | null;
  status: number | string | null;
  date: string | null;
  order_comment: string | null;
};

export type OrderHistoryResponse = {
  mode: OrderHistoryMode;
  data: Array<GroupedOrderRow | ProductOrderRow>;
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  filters?: {
    customer_code?: string;
    from_date?: string;
    product_id?: string;
    to_date?: string;
  };
};

export function splitCsvField(value: string | null | undefined) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function sumPriceList(value: string | null | undefined) {
  return splitCsvField(value).reduce((total, entry) => total + (Number(entry) || 0), 0);
}

export function formatOrderDate(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, 10) : '-';
}

export function orderStatusActive(value: string | number | null | undefined) {
  return String(value ?? '0') !== '0';
}
