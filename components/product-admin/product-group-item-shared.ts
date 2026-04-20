export type ProductGroupItemCreateRow = {
  pg_product_id: string;
  sequence: string;
};

export type ProductGroupItemEditValues = {
  pg_id: string;
  pg_product_id: string;
  sequence: string;
  status: string;
};

const PRODUCT_GROUP_ITEM_FLASH_KEY = 'hakidd_admin_product_group_items_flash';

export function emptyProductGroupItemRow(): ProductGroupItemCreateRow {
  return {
    pg_product_id: '',
    sequence: '',
  };
}

export function emptyProductGroupItemEditValues(): ProductGroupItemEditValues {
  return {
    pg_id: '',
    pg_product_id: '',
    sequence: '',
    status: 'active',
  };
}

export function toProductGroupItemEditValues(value?: Record<string, unknown> | null): ProductGroupItemEditValues {
  return {
    pg_id: String(value?.pg_id ?? ''),
    pg_product_id: String(value?.pg_product_id ?? ''),
    sequence: String(value?.sequence ?? ''),
    status: String(value?.status ?? 'active'),
  };
}

export function setProductGroupItemFlash(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PRODUCT_GROUP_ITEM_FLASH_KEY, message);
}

export function consumeProductGroupItemFlash() {
  if (typeof window === 'undefined') {
    return null;
  }

  const message = window.sessionStorage.getItem(PRODUCT_GROUP_ITEM_FLASH_KEY);
  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(PRODUCT_GROUP_ITEM_FLASH_KEY);
  return message;
}
