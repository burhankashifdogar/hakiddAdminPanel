'use client';

import Link from 'next/link';
import { FormEvent } from 'react';
import { TableCard } from './common';
import { FilterProductFormValues } from './filter-product-shared';

type FilterProductFormProps = {
  title: string;
  values: FilterProductFormValues;
  onChange: (values: FilterProductFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  cancelHref: string;
  submitting?: boolean;
};

export default function FilterProductForm({
  title,
  values,
  onChange,
  onSubmit,
  submitLabel,
  cancelHref,
  submitting = false,
}: FilterProductFormProps) {
  function updateField(field: keyof FilterProductFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <TableCard header={<h5 className="mb-0">{title}</h5>}>
      <form onSubmit={onSubmit}>
        <div className="row mb-3">
          <label htmlFor="filter-product-id" className="form-label">
            Product ID
          </label>
          <input
            id="filter-product-id"
            type="text"
            className="form-control"
            value={values.product_id}
            placeholder="Product ID"
            onChange={(event) => updateField('product_id', event.target.value)}
          />
        </div>

        <div className="row mb-3">
          <label htmlFor="filter-product-type" className="form-label">
            Type
          </label>
          <input
            id="filter-product-type"
            type="text"
            className="form-control"
            value={values.type}
            placeholder="Type"
            onChange={(event) => updateField('type', event.target.value)}
          />
        </div>

        <div className="row mb-3">
          <label htmlFor="filter-product-size" className="form-label">
            Size
          </label>
          <input
            id="filter-product-size"
            type="text"
            className="form-control"
            value={values.size}
            placeholder="Size"
            onChange={(event) => updateField('size', event.target.value)}
          />
        </div>

        <div className="row mb-4">
          <label htmlFor="filter-product-color" className="form-label">
            Color
          </label>
          <input
            id="filter-product-color"
            type="text"
            className="form-control"
            value={values.color}
            placeholder="Color"
            onChange={(event) => updateField('color', event.target.value)}
          />
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitLabel}
          </button>
          <Link href={cancelHref} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </TableCard>
  );
}
