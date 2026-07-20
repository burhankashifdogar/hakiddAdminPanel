'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminListResponse, adminDelete, adminGet, adminPost, adminPut } from '@/lib/api';
import { canReadEntity, canWriteEntity, getStoredAdminToken, getStoredAdminUser } from '@/lib/admin-auth';

type Row = Record<string, unknown>;

const READ_ONLY_ENTITIES = new Set(['analytics', 'pre-orders']);

function normalizeEntity(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function toTitle(entity: string) {
  return entity
    .split('-')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ');
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function rowId(row: Row) {
  if (typeof row.id === 'number' && Number.isFinite(row.id)) {
    return row.id;
  }
  if (typeof row.id === 'string' && row.id.trim() !== '' && !Number.isNaN(Number(row.id))) {
    return Number(row.id);
  }
  return null;
}

export default function EntityPage() {
  const params = useParams();
  const router = useRouter();
  const entity = normalizeEntity(params?.entity as string | string[] | undefined);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;

  const [createJson, setCreateJson] = useState('{}');
  const [editId, setEditId] = useState<number | null>(null);
  const [editJson, setEditJson] = useState('{}');
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const isReadOnly = READ_ONLY_ENTITIES.has(entity) || !canWrite;

  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
    return Array.from(set).slice(0, 10);
  }, [rows]);

  useEffect(() => {
    const storedUser = getStoredAdminUser();
    const nextCanRead = canReadEntity(storedUser, entity);
    const nextCanWrite = canWriteEntity(storedUser, entity);

    setCanRead(nextCanRead);
    setCanWrite(nextCanWrite);

    if (!nextCanRead) {
      router.replace('/dashboard/forbidden');
    }
  }, [entity, router]);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    const token = getStoredAdminToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const query = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (search.trim()) {
      query.set('search', search.trim());
    }

    adminGet(`/admin-api/${entity}?${query.toString()}`, token)
      .then((payload: AdminListResponse) => {
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [canRead, entity, page, refresh, search]);

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (isReadOnly) {
      return;
    }

    setError('');
    setMessage('');

    const token = getStoredAdminToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = parseJsonObject(createJson);
      delete payload.id;
      await adminPost(`/admin-api/${entity}`, token, payload);
      setMessage('Record created successfully');
      setCreateJson('{}');
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    }
  }

  async function updateRecord(event: FormEvent) {
    event.preventDefault();
    if (isReadOnly) {
      return;
    }

    setError('');
    setMessage('');

    if (!editId) {
      setError('Select a row first');
      return;
    }

    const token = getStoredAdminToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = parseJsonObject(editJson);
      delete payload.id;
      await adminPut(`/admin-api/${entity}/${editId}`, token, payload);
      setMessage(`Record #${editId} updated successfully`);
      setEditId(null);
      setEditJson('{}');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    }
  }

  async function deleteRecord(row: Row) {
    if (isReadOnly) {
      return;
    }

    const id = rowId(row);
    if (!id) {
      setError('This row cannot be deleted because id is missing or invalid');
      return;
    }

    if (!window.confirm(`Delete record #${id}?`)) {
      return;
    }

    const token = getStoredAdminToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setError('');
    setMessage('');

    try {
      await adminDelete(`/admin-api/${entity}/${id}`, token);
      setMessage(`Record #${id} deleted successfully`);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  }

  function setRowForEdit(row: Row) {
    const id = rowId(row);
    if (!id) {
      setError('This row cannot be edited because id is missing or invalid');
      return;
    }
    setEditId(id);
    setEditJson(JSON.stringify(row, null, 2));
    setMessage(`Editing #${id}`);
  }

  return (
    <div className="pc-content">
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-12">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Home</Link>
                </li>
                <li className="breadcrumb-item" aria-current="page">
                  {toTitle(entity)}
                </li>
              </ul>
            </div>
            <div className="col-md-12">
              <div className="page-header-title">
                <h2 className="mb-0">{toTitle(entity)}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      ) : null}
      {isReadOnly ? (
        <div className="alert alert-info" role="alert">
          {READ_ONLY_ENTITIES.has(entity)
            ? 'This screen is read-only in the Node admin panel.'
            : 'You have read-only access to this screen.'}
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Search by id</label>
              <input
                className="form-control"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Type id..."
              />
            </div>
            <div className="col-md-9 d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput);
                }}
              >
                Search
              </button>
              <button
                type="button"
                className="btn btn-light-secondary"
                onClick={() => {
                  setPage(1);
                  setSearch('');
                  setSearchInput('');
                  setRefresh((value) => value + 1);
                }}
              >
                Reset
              </button>
              <div className="ms-auto text-muted align-self-center">
                Total: {total} | Page: {page}/{lastPage}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                {!isReadOnly ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (isReadOnly ? 0 : 1)}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (isReadOnly ? 0 : 1)}>No records found.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    {columns.map((column) => (
                      <td key={`${String(row.id ?? index)}-${column}`}>{String(row[column] ?? '')}</td>
                    ))}
                    {!isReadOnly ? (
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => setRowForEdit(row)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteRecord(row)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="d-flex gap-2 mt-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= lastPage}
              onClick={() => setPage((value) => Math.min(value + 1, lastPage))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {!isReadOnly ? (
        <div className="row">
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">
                <h5>Create Record</h5>
              </div>
              <div className="card-body">
                <form onSubmit={createRecord}>
                  <div className="mb-3">
                    <label className="form-label">JSON payload</label>
                    <textarea
                      className="form-control"
                      rows={10}
                      value={createJson}
                      onChange={(event) => setCreateJson(event.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Create
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">
                <h5>Update Record</h5>
              </div>
              <div className="card-body">
                <p className="text-muted">Selected id: {editId ?? 'None'}</p>
                <form onSubmit={updateRecord}>
                  <div className="mb-3">
                    <label className="form-label">JSON payload</label>
                    <textarea
                      className="form-control"
                      rows={10}
                      value={editJson}
                      onChange={(event) => setEditJson(event.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Update
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
