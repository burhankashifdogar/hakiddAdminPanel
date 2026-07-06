'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGet, adminPost, adminPut } from '@/lib/api';
import { getStoredAdminUser, hasAdminPermission } from '@/lib/admin-auth';
import { AlertStack, PageHeader, TableCard, ensureAdminToken, formatValue } from '@/components/product-admin/common';

type AdminRole = {
  id: number;
  key: string;
  name: string;
  description: string | null;
};

type ManagedAdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole | null;
  role_permissions: string[];
  permission_overrides: {
    allow: string[];
    deny: string[];
  };
  permissions: string[];
  is_super_admin: boolean;
  role_locked: boolean;
};

type AdminRoleDetail = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  users_count: number;
  permissions: string[];
};

type AdminUsersResponse = {
  data: ManagedAdminUser[];
  total: number;
  available_permissions?: string[];
};

type AdminRolesResponse = {
  data: AdminRoleDetail[];
  total: number;
  available_permissions?: string[];
};

type RoleFormState = {
  description: string;
  id: number | null;
  key: string;
  name: string;
  permissions: string[];
};

function getRoleBadgeClass(roleKey: string | null | undefined) {
  if (roleKey === 'super_admin') {
    return 'bg-light-danger text-dark';
  }

  if (roleKey === 'marketing_admin') {
    return 'bg-light-warning text-dark';
  }

  if (roleKey === 'sales_admin') {
    return 'bg-light-success text-dark';
  }

  return 'bg-light-primary text-dark';
}

function formatPermissionLabel(code: string) {
  return code
    .split('.')
    .map((segment) =>
      segment
        .split('_')
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ')
    )
    .join(' / ');
}

function buildEmptyRoleForm(): RoleFormState {
  return {
    id: null,
    key: '',
    name: '',
    description: '',
    permissions: [],
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ManagedAdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRoleDetail[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [canRead, setCanRead] = useState(false);
  const [canWriteUsers, setCanWriteUsers] = useState(false);
  const [canViewRoles, setCanViewRoles] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<Record<number, string>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);
  const [savingAccessUserId, setSavingAccessUserId] = useState<number | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(buildEmptyRoleForm());
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    const storedUser = getStoredAdminUser();
    const nextCanRead = hasAdminPermission(storedUser, 'admin_users.read');
    const nextCanManageRoles = hasAdminPermission(storedUser, 'roles.write');
    const nextCanViewRoles = nextCanManageRoles || hasAdminPermission(storedUser, 'roles.read');

    if (!nextCanRead) {
      router.replace('/dashboard/forbidden');
      return;
    }

    setCanRead(true);
    setCanWriteUsers(hasAdminPermission(storedUser, 'admin_users.write'));
    setCanViewRoles(nextCanViewRoles);
    setCanManageRoles(nextCanManageRoles);
  }, [router]);

  const loadData = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [usersPayload, rolesPayload] = await Promise.all([
        adminGet('/admin-api/admin-users', token),
        canViewRoles ? adminGet('/admin-api/roles', token) : Promise.resolve({ data: [], total: 0 }),
      ]);
      const usersResponse = usersPayload as AdminUsersResponse;
      const rolesResponse = rolesPayload as AdminRolesResponse;
      const users = usersResponse.data ?? [];
      const nextRoles = rolesResponse.data ?? [];

      setRows(users);
      setRoles(nextRoles);
      setPendingRoles(Object.fromEntries(users.map((row) => [row.id, row.role?.key ?? ''])) as Record<number, string>);
      setAvailablePermissions(
        (rolesResponse.available_permissions ?? usersResponse.available_permissions ?? []).slice()
      );

      setSelectedUserId((current) => {
        if (current && users.some((row) => row.id === current)) {
          return current;
        }
        return users[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load user management data.');
    } finally {
      setLoading(false);
    }
  }, [canViewRoles, router]);

  useEffect(() => {
    if (!canRead) {
      return;
    }

    void loadData();
  }, [canRead, loadData]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [row.name, row.email, row.role?.name ?? '', row.role?.key ?? ''].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [rows, search]);

  const selectedUser = useMemo(
    () => rows.find((row) => row.id === selectedUserId) ?? null,
    [rows, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) {
      setPermissionDraft([]);
      return;
    }

    setPermissionDraft(selectedUser.permissions.slice());
  }, [selectedUser]);

  function resetRoleForm() {
    setRoleForm(buildEmptyRoleForm());
  }

  function startRoleEdit(role: AdminRoleDetail) {
    setRoleForm({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions.slice(),
    });
  }

  async function saveRole(userId: number) {
    const roleKey = pendingRoles[userId]?.trim();
    if (!roleKey) {
      setError('Select a role before saving.');
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setSavingUserId(userId);
    setError('');
    setMessage('');

    try {
      const updatedUser = (await adminPut(`/admin-api/admin-users/${userId}/role`, token, {
        role_key: roleKey,
      })) as ManagedAdminUser;

      setRows((current) => current.map((row) => (row.id === updatedUser.id ? updatedUser : row)));
      setPendingRoles((current) => ({
        ...current,
        [updatedUser.id]: updatedUser.role?.key ?? '',
      }));
      if (selectedUserId === updatedUser.id) {
        setPermissionDraft(updatedUser.permissions.slice());
      }
      setMessage(`Updated role for ${updatedUser.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update admin role.');
    } finally {
      setSavingUserId(null);
    }
  }

  async function saveUserAccess() {
    if (!selectedUser) {
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setSavingAccessUserId(selectedUser.id);
    setError('');
    setMessage('');

    try {
      const updatedUser = (await adminPut(`/admin-api/admin-users/${selectedUser.id}/access`, token, {
        permissions: permissionDraft,
      })) as ManagedAdminUser;

      setRows((current) => current.map((row) => (row.id === updatedUser.id ? updatedUser : row)));
      setPermissionDraft(updatedUser.permissions.slice());
      setMessage(`Updated access for ${updatedUser.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update user access.');
    } finally {
      setSavingAccessUserId(null);
    }
  }

  async function saveRoleDefinition() {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setSavingRole(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        key: roleForm.key,
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
      };

      if (roleForm.id) {
        await adminPut(`/admin-api/roles/${roleForm.id}`, token, payload);
        setMessage('Role updated successfully.');
      } else {
        await adminPost('/admin-api/roles', token, payload);
        setMessage('Role created successfully.');
      }

      resetRoleForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save role.');
    } finally {
      setSavingRole(false);
    }
  }

  function toggleDraftPermission(code: string) {
    setPermissionDraft((current) =>
      current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]
    );
  }

  function toggleRoleFormPermission(code: string) {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(code)
        ? current.permissions.filter((entry) => entry !== code)
        : [...current.permissions, code],
    }));
  }

  return (
    <div className="pc-content">
      <PageHeader
        title="User Management"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'User Management' },
        ]}
      />

      <AlertStack error={error} message={message} />

      {!canWriteUsers ? (
        <div className="alert alert-info" role="alert">
          You have read-only access to user management. Role assignment and access overrides require write permission.
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-12 col-xxl-7">
          <TableCard
            header={
              <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center">
                <div>
                  <h5 className="mb-1">Admin Users</h5>
                  <small className="text-muted">{rows.length} admin accounts</small>
                </div>
                <div className="ms-md-auto">
                  <input
                    className="form-control"
                    placeholder="Search by name, email, or role"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Effective Access</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        Loading admin users...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        No admin users found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const selectedRole = pendingRoles[row.id] ?? row.role?.key ?? '';
                      const disableRoleEdit = !canWriteUsers || row.role_locked || roles.length === 0;

                      return (
                        <tr key={row.id} className={selectedUserId === row.id ? 'table-active' : ''}>
                          <td>
                            <div className="fw-semibold">{formatValue(row.name)}</div>
                            {row.is_super_admin ? (
                              <small className="text-muted">Super admin account</small>
                            ) : null}
                          </td>
                          <td>{row.email}</td>
                          <td>
                            <div className="d-flex flex-column gap-2">
                              <div>
                                <span className={`badge ${getRoleBadgeClass(row.role?.key)}`}>
                                  {row.role?.name ?? 'Unassigned'}
                                </span>
                              </div>
                              {canWriteUsers ? (
                                <div className="d-flex flex-column gap-2">
                                  <select
                                    className="form-select form-select-sm"
                                    value={selectedRole}
                                    disabled={disableRoleEdit}
                                    onChange={(event) =>
                                      setPendingRoles((current) => ({
                                        ...current,
                                        [row.id]: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Select role</option>
                                    {roles.map((role) => (
                                      <option key={role.id} value={role.key}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </select>
                                  {row.role_locked ? (
                                    <small className="text-muted">This reserved account stays on the super admin role.</small>
                                  ) : null}
                                </div>
                              ) : (
                                <small className="text-muted">{row.role?.description ?? 'No role description'}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {row.permissions.length === 0 ? (
                                <span className="text-muted">No permissions</span>
                              ) : (
                                row.permissions.slice(0, 4).map((permission) => (
                                  <span key={permission} className="badge bg-light-secondary text-dark">
                                    {permission}
                                  </span>
                                ))
                              )}
                              {row.permissions.length > 4 ? (
                                <span className="badge bg-light text-dark">+{row.permissions.length - 4} more</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setSelectedUserId(row.id)}
                              >
                                Manage Access
                              </button>
                              {canWriteUsers ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  disabled={
                                    disableRoleEdit ||
                                    savingUserId === row.id ||
                                    selectedRole === (row.role?.key ?? '')
                                  }
                                  onClick={() => void saveRole(row.id)}
                                >
                                  {savingUserId === row.id ? 'Saving...' : 'Save Role'}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </div>

        <div className="col-12 col-xxl-5">
          {canViewRoles ? (
            <TableCard
              header={
                <div className="d-flex align-items-center justify-content-between gap-3">
                  <div>
                    <h5 className="mb-1">Roles</h5>
                    <small className="text-muted">{roles.length} configured roles</small>
                  </div>
                  {canManageRoles ? (
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={resetRoleForm}>
                      New Role
                    </button>
                  ) : null}
                </div>
              }
            >
              <div className="d-flex flex-column gap-3">
                {loading ? (
                  <div className="text-center py-5 text-muted">Loading roles...</div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-5 text-muted">No roles found.</div>
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="border rounded p-3">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="fw-semibold">{role.name}</div>
                          <small className="text-muted">{role.key}</small>
                        </div>
                        <div className="text-end">
                          <span className={`badge ${getRoleBadgeClass(role.key)}`}>{role.users_count} users</span>
                          {canManageRoles ? (
                            <div className="mt-2">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startRoleEdit(role)}>
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-muted small mb-2">{role.description ?? 'No description'}</p>
                      <div className="d-flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <span key={permission} className="badge bg-light-secondary text-dark">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TableCard>
          ) : null}

          {canManageRoles ? (
            <div className="mt-4">
              <TableCard
                header={
                  <div>
                    <h5 className="mb-1">{roleForm.id ? 'Edit Role' : 'Create Role'}</h5>
                    <small className="text-muted">
                      Super admins can define roles for marketing, sales, support, and custom teams.
                    </small>
                  </div>
                }
              >
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={roleForm.name}
                      onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Key</label>
                    <input
                      className="form-control"
                      value={roleForm.key}
                      disabled={Boolean(roleForm.id && roles.find((role) => role.id === roleForm.id)?.is_system)}
                      onChange={(event) => setRoleForm((current) => ({ ...current, key: event.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={roleForm.description}
                      onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Permissions</label>
                    <div className="row g-2">
                      {availablePermissions.map((permission) => (
                        <div key={permission} className="col-md-6">
                          <label className="border rounded p-2 d-flex align-items-start gap-2 h-100">
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(permission)}
                              onChange={() => toggleRoleFormPermission(permission)}
                            />
                            <span>
                              <div className="fw-medium small">{formatPermissionLabel(permission)}</div>
                              <div className="text-muted small">{permission}</div>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12 d-flex gap-2">
                    <button type="button" className="btn btn-primary" disabled={savingRole} onClick={() => void saveRoleDefinition()}>
                      {savingRole ? 'Saving...' : roleForm.id ? 'Update Role' : 'Create Role'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={resetRoleForm}>
                      Reset
                    </button>
                  </div>
                </div>
              </TableCard>
            </div>
          ) : null}
        </div>

        <div className="col-12">
          <TableCard
            header={
              <div>
                <h5 className="mb-1">User Level Access</h5>
                <small className="text-muted">
                  {selectedUser
                    ? `Editing effective permissions for ${selectedUser.name}`
                    : 'Select an admin user to review or override access.'}
                </small>
              </div>
            }
          >
            {!selectedUser ? (
              <div className="text-center py-5 text-muted">Select an admin user to manage access.</div>
            ) : (
              <div className="row g-4">
                <div className="col-lg-4">
                  <div className="border rounded p-3 h-100">
                    <div className="fw-semibold mb-2">{selectedUser.name}</div>
                    <div className="text-muted mb-2">{selectedUser.email}</div>
                    <div className="mb-2">
                      <span className={`badge ${getRoleBadgeClass(selectedUser.role?.key)}`}>
                        {selectedUser.role?.name ?? 'Unassigned'}
                      </span>
                    </div>
                    <div className="small text-muted mb-3">{selectedUser.role?.description ?? 'No role description'}</div>
                    <div className="small">
                      <div className="fw-medium mb-1">Overrides</div>
                      <div>Allowed: {formatValue(selectedUser.permission_overrides.allow.length)}</div>
                      <div>Blocked: {formatValue(selectedUser.permission_overrides.deny.length)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-8">
                  <div className="row g-2">
                    {availablePermissions.map((permission) => {
                      const inherited = selectedUser.role_permissions.includes(permission);
                      const enabled = permissionDraft.includes(permission);
                      const isAllowedOverride = selectedUser.permission_overrides.allow.includes(permission);
                      const isDeniedOverride = selectedUser.permission_overrides.deny.includes(permission);

                      return (
                        <div key={permission} className="col-md-6">
                          <label className="border rounded p-2 d-flex align-items-start gap-2 h-100">
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={!canWriteUsers || selectedUser.role_locked}
                              onChange={() => toggleDraftPermission(permission)}
                            />
                            <span>
                              <div className="fw-medium small">{formatPermissionLabel(permission)}</div>
                              <div className="text-muted small">{permission}</div>
                              <div className="small mt-1">
                                {isAllowedOverride ? (
                                  <span className="badge bg-light-success text-dark">Extra access</span>
                                ) : isDeniedOverride ? (
                                  <span className="badge bg-light-danger text-dark">Blocked from role</span>
                                ) : inherited ? (
                                  <span className="badge bg-light-secondary text-dark">Inherited</span>
                                ) : (
                                  <span className="badge bg-light text-dark">Not granted</span>
                                )}
                              </div>
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={Boolean(
                        !canWriteUsers ||
                          selectedUser.role_locked ||
                          savingAccessUserId === selectedUser.id
                      )}
                      onClick={() => void saveUserAccess()}
                    >
                      {savingAccessUserId === selectedUser.id ? 'Saving...' : 'Save Access'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setPermissionDraft(selectedUser.permissions.slice())}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
}
