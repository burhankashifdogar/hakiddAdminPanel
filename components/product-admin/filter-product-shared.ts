export type FilterProductFormValues = {
  product_id: string;
  type: string;
  size: string;
  color: string;
};

const FILTER_PRODUCT_FLASH_KEY = 'hakidd_admin_filter_products_flash';

export function emptyFilterProductForm(): FilterProductFormValues {
  return {
    product_id: '',
    type: '',
    size: '',
    color: '',
  };
}

export function toFilterProductFormValues(
  value?: Partial<Record<keyof FilterProductFormValues, unknown>> | null,
): FilterProductFormValues {
  return {
    product_id: String(value?.product_id ?? ''),
    type: String(value?.type ?? ''),
    size: String(value?.size ?? ''),
    color: String(value?.color ?? ''),
  };
}

export function toFilterProductPayload(values: FilterProductFormValues) {
  return {
    product_id: values.product_id.trim(),
    type: values.type.trim(),
    size: values.size.trim(),
    color: values.color.trim(),
  };
}

export function setFilterProductFlash(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(FILTER_PRODUCT_FLASH_KEY, message);
}

export function consumeFilterProductFlash() {
  if (typeof window === 'undefined') {
    return null;
  }

  const message = window.sessionStorage.getItem(FILTER_PRODUCT_FLASH_KEY);
  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(FILTER_PRODUCT_FLASH_KEY);
  return message;
}
