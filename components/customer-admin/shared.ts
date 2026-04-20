'use client';

export type CustomerStatusFilter = 'all' | 'active' | 'pending';

export type CustomerRow = {
  id: number;
  owner_name: string;
  email: string;
  customer_code: string | null;
  status: number;
  flag: number;
  cflag: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CustomerListResponse = {
  data: CustomerRow[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  counts?: {
    all: number;
    active: number;
    pending: number;
  };
  filters?: {
    email?: string;
    owner_name?: string;
    customer_code?: string;
    status?: string;
  };
};

export type CustomerDetailResponse = {
  user: CustomerRow;
};

export type CustomerFormState = {
  owner_name: string;
  email: string;
  password: string;
  customer_code: string;
  status: '1' | '0';
  flag: '1' | '0';
  cflag: '' | 'ca' | 'us';
};

export const DEFAULT_CUSTOMER_FORM: CustomerFormState = {
  owner_name: '',
  email: '',
  password: '',
  customer_code: '',
  status: '1',
  flag: '1',
  cflag: 'ca',
};

export function normalizeStatusFilter(value: string | null): CustomerStatusFilter {
  if (value === 'active') {
    return 'active';
  }

  if (value === 'pending') {
    return 'pending';
  }

  return 'all';
}

export function statusFilterValue(value: CustomerStatusFilter) {
  if (value === 'all') {
    return '';
  }

  return value;
}

export function statusLabel(status: number) {
  return status === 1 ? 'Active' : 'Pending';
}

export function customerCodeLabel(customerCode: string | null) {
  return customerCode && customerCode.trim() !== '' ? customerCode : 'Null';
}

export function currencyLabel(cflag: string | null) {
  if (cflag === 'ca') {
    return 'CA';
  }

  if (cflag === 'us') {
    return 'US';
  }

  return '--';
}

export function customerFormFromRow(row: CustomerRow): CustomerFormState {
  return {
    owner_name: row.owner_name,
    email: row.email,
    password: '',
    customer_code: row.customer_code ?? '',
    status: row.status === 1 ? '1' : '0',
    flag: row.flag === 1 ? '1' : '0',
    cflag: row.cflag === 'ca' || row.cflag === 'us' ? row.cflag : '',
  };
}
