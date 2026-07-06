'use client';

import Link from 'next/link';
import { FormEvent } from 'react';
import { TableCard } from './common';
import { GroupProductFormValues } from './group-product-shared';

export default function GroupProductForm({
  title,
  values,
  onChange,
  onSubmit,
  submitLabel,
  cancelHref,
  submitting = false,
  showExternal = false,
}: {
  title: string;
  values: GroupProductFormValues;
  onChange: (values: GroupProductFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  cancelHref: string;
  submitting?: boolean;
  showExternal?: boolean;
}) {
  function updateField(field: keyof GroupProductFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <TableCard header={<h5 className="mb-0">{title}</h5>}>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            type="text"
            className="form-control"
            value={values.title}
            placeholder="Enter group title"
            onChange={(event) => updateField('title', event.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows={4}
            value={values.description}
            placeholder="Enter group description"
            onChange={(event) => updateField('description', event.target.value)}
          />
        </div>
        <div className="row g-3 mb-3">
          <div className="col-lg-6">
            <label className="form-label">English Title</label>
            <input
              type="text"
              className="form-control"
              value={values.title_en}
              placeholder="Enter English group title"
              onChange={(event) => updateField('title_en', event.target.value)}
            />
          </div>
          <div className="col-lg-6">
            <label className="form-label">Spanish Title</label>
            <input
              type="text"
              className="form-control"
              value={values.title_es}
              placeholder="Enter Spanish group title"
              onChange={(event) => updateField('title_es', event.target.value)}
            />
          </div>
          <div className="col-lg-6">
            <label className="form-label">English Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={values.description_en}
              placeholder="Enter English group description"
              onChange={(event) => updateField('description_en', event.target.value)}
            />
          </div>
          <div className="col-lg-6">
            <label className="form-label">Spanish Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={values.description_es}
              placeholder="Enter Spanish group description"
              onChange={(event) => updateField('description_es', event.target.value)}
            />
          </div>
        </div>
        {showExternal ? (
          <div className="mb-3">
            <label className="form-label">External</label>
            <input
              type="text"
              className="form-control"
              value={values.external}
              placeholder="Enter group external"
              onChange={(event) => updateField('external', event.target.value)}
            />
          </div>
        ) : null}
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
