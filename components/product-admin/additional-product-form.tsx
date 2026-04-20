'use client';

import Link from 'next/link';
import { FormEvent } from 'react';
import { TableCard } from './common';
import { additionalProductFields, AdditionalProductFormValues } from './additional-product-shared';

export default function AdditionalProductForm({
  title,
  values,
  onChange,
  onSubmit,
  submitLabel,
  cancelHref,
  submitting = false,
}: {
  title: string;
  values: AdditionalProductFormValues;
  onChange: (values: AdditionalProductFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  cancelHref: string;
  submitting?: boolean;
}) {
  function updateField(name: string, value: string) {
    onChange({
      ...values,
      [name]: value,
    });
  }

  return (
    <TableCard header={<h5 className="mb-0">{title}</h5>}>
      <form onSubmit={onSubmit}>
        {additionalProductFields.map((field) => (
          <div className="mb-3" key={field.name}>
            <label className="form-label">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                className="form-control"
                rows={4}
                value={values[field.name] ?? ''}
                onChange={(event) => updateField(field.name, event.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                readOnly={field.readOnly}
              />
            ) : field.type === 'select' ? (
              <select
                className="form-control"
                value={values[field.name] ?? ''}
                onChange={(event) => updateField(field.name, event.target.value)}
                required={field.required}
                disabled={field.readOnly}
              >
                <option value="">Select...</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-control"
                type={field.type ?? 'text'}
                value={values[field.name] ?? ''}
                onChange={(event) => updateField(field.name, event.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                readOnly={field.readOnly}
              />
            )}
          </div>
        ))}

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
