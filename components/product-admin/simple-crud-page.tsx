'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminListResponse, adminDelete, adminGet, adminPost, adminPostForm, adminPut } from '@/lib/api';
import { AlertStack, Breadcrumb, PageHeader, Pagination, TableCard, ensureAdminToken, formatValue } from './common';

type Row = Record<string, unknown>;

export type CrudColumn = {
  key: string;
  label: string;
  render?: (row: Row, index: number) => ReactNode;
};

export type CrudField = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select';
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  options?: Array<{ label: string; value: string }>;
};

type RowActionHelpers = {
  refresh: () => void;
  setEditingRow: (row: Row | null) => void;
  setSelectedRow: (row: Row | null) => void;
  setError: (message: string) => void;
  setMessage: (message: string) => void;
};

export default function SimpleCrudPage({
  entity,
  title,
  breadcrumbs,
  columns,
  fields,
  importLabel,
  importAccept = '.csv',
  searchPlaceholder = 'Search by id',
  perPage = 20,
  allowDelete = true,
  allowCreate = true,
  showSearch = true,
  buildListPath,
  mapRowToForm,
  preparePayload,
  renderRowActions,
  renderDetails,
  headerActions,
}: {
  entity: string;
  title: string;
  breadcrumbs: Breadcrumb[];
  columns: CrudColumn[];
  fields: CrudField[];
  importLabel?: string;
  importAccept?: string;
  searchPlaceholder?: string;
  perPage?: number;
  allowDelete?: boolean;
  allowCreate?: boolean;
  showSearch?: boolean;
  buildListPath?: (page: number, search: string) => string;
  mapRowToForm?: (row: Row) => Record<string, string>;
  preparePayload?: (values: Record<string, string>) => Record<string, unknown>;
  renderRowActions?: (row: Row, helpers: RowActionHelpers) => ReactNode;
  renderDetails?: (row: Row) => ReactNode;
  headerActions?: ReactNode;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rowId = (row: Row) => {
    const raw = row.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resetForm = () => {
    const nextValues: Record<string, string> = {};
    fields.forEach((field) => {
      nextValues[field.name] = '';
    });
    setFormValues(nextValues);
    setEditingRow(null);
  };

  useEffect(() => {
    resetForm();
  }, [entity]);

  useEffect(() => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    const path =
      buildListPath?.(page, search) ??
      `/admin-api/${entity}?page=${page}&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ''}`;

    adminGet(path, token)
      .then((payload: AdminListResponse) => {
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [buildListPath, entity, page, perPage, refreshTick, router, search]);

  const actionHelpers = useMemo<RowActionHelpers>(
    () => ({
      refresh: () => setRefreshTick((value) => value + 1),
      setEditingRow,
      setSelectedRow,
      setError,
      setMessage,
    }),
    [],
  );

  function startEdit(row: Row) {
    const source = mapRowToForm ? mapRowToForm(row) : Object.fromEntries(fields.map((field) => [field.name, String(row[field.name] ?? '')]));
    setFormValues(source);
    setEditingRow(row);
    setSelectedRow(row);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const requestPayload = preparePayload ? preparePayload(formValues) : formValues;

      if (editingRow) {
        const id = rowId(editingRow);
        if (!id) {
          throw new Error('Invalid row id');
        }
        await adminPut(`/admin-api/${entity}/${id}`, token, requestPayload);
        setMessage('Record updated successfully');
      } else {
        await adminPost(`/admin-api/${entity}`, token, requestPayload);
        setMessage('Record created successfully');
      }

      resetForm();
      setPage(1);
      const path =
        buildListPath?.(1, search) ??
        `/admin-api/${entity}?page=1&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const refreshedPayload = (await adminGet(path, token)) as AdminListResponse;
      setRows(refreshedPayload.data ?? []);
      setTotal(refreshedPayload.total ?? 0);
      setLastPage(refreshedPayload.last_page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(row: Row) {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    const id = rowId(row);
    if (!id) {
      setError('Invalid row id');
      return;
    }

    if (!window.confirm(`Delete record #${id}?`)) {
      return;
    }

    try {
      await adminDelete(`/admin-api/${entity}/${id}`, token);
      setMessage('Deleted successfully');
      setRows((current) => current.filter((item) => rowId(item) !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    const token = ensureAdminToken(router);
    if (!token || !importFile) {
      return;
    }

    const body = new FormData();
    body.append('file', importFile);

    try {
      setError('');
      setMessage('');
      await adminPostForm(`/admin-api/${entity}/import`, token, body);
      setImportFile(null);
      setMessage('Import completed successfully');
      setPage(1);
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <div className="pc-content">
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <AlertStack error={error} message={message} />

      {importLabel ? (
        <form className="d-flex align-items-end gap-3 col-lg-7 mb-3" onSubmit={onImport}>
          <div className="flex-grow-1">
            <label className="form-label text-primary mb-1">{importLabel}</label>
            <input
              type="file"
              className="form-control border-primary"
              accept={importAccept}
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              required
            />
          </div>
          <button type="submit" className="btn btn-success">
            Import
          </button>
        </form>
      ) : null}

      <TableCard
        header={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              {showSearch ? (
                <>
                  <input
                    className="form-control"
                    style={{ maxWidth: 280 }}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={searchPlaceholder}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setPage(1);
                      setSearch(searchInput.trim());
                    }}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-light-secondary"
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                      setPage(1);
                    }}
                  >
                    Reset
                  </button>
                </>
              ) : null}
            </div>
            <div className="d-flex align-items-center gap-2">
              {headerActions}
              {allowCreate ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    setSelectedRow(null);
                  }}
                >
                  Add New
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1}>No records found.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={String(row.id ?? `${entity}-${index}`)}>
                    {columns.map((column) => (
                      <td key={`${String(row.id ?? index)}-${column.key}`}>
                        {column.render ? column.render(row, index) : formatValue(row[column.key])}
                      </td>
                    ))}
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelectedRow(row)}
                        >
                          View
                        </button>
                        {fields.length > 0 ? (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => startEdit(row)}>
                            Edit
                          </button>
                        ) : null}
                        {allowDelete ? (
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(row)}>
                            Delete
                          </button>
                        ) : null}
                        {renderRowActions ? renderRowActions(row, actionHelpers) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Total: {total} | Page: {page}/{lastPage}
            </div>
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        </div>
      </TableCard>

      {renderDetails && selectedRow ? (
        <div className="mt-3">
          <TableCard header={<h5 className="mb-0">Details</h5>}>{renderDetails(selectedRow)}</TableCard>
        </div>
      ) : null}

      {fields.length > 0 && (allowCreate || editingRow) ? (
        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">{editingRow ? `Edit ${title}` : `Add ${title}`}</h5>
          </div>
          <div className="card-body">
            <form onSubmit={onSubmit}>
              {fields.map((field) => (
                <div className="mb-3" key={field.name}>
                  <label className="form-label">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="form-control"
                      rows={4}
                      value={formValues[field.name] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                      placeholder={field.placeholder}
                      required={field.required}
                      readOnly={field.readOnly}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="form-control"
                      value={formValues[field.name] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
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
                      value={formValues[field.name] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                      placeholder={field.placeholder}
                      required={field.required}
                      readOnly={field.readOnly}
                    />
                  )}
                </div>
              ))}
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {editingRow ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
