"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AdminListResponse,
    adminDelete,
    adminGet,
    adminPostForm,
} from "@/lib/api";
import {
    AlertStack,
    PageHeader,
    Pagination,
    TableCard,
    ensureAdminToken,
    formatValue,
} from "./common";
import { consumeFilterProductFlash } from "./filter-product-shared";

type FilterRow = Record<string, unknown>;

function getRowId(value: unknown) {
    const normalized = String(value ?? "").trim();
    return normalized === "" ? null : normalized;
}

export default function FilterProductsPage() {
    const router = useRouter();
    const [rows, setRows] = useState<FilterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [productIdInput, setProductIdInput] = useState("");
    const [productNameInput, setProductNameInput] = useState("");
    const [productIdFilter, setProductIdFilter] = useState("");
    const [productNameFilter, setProductNameFilter] = useState("");

    const [importFile, setImportFile] = useState<File | null>(null);

    useEffect(() => {
        const flashMessage = consumeFilterProductFlash();
        if (flashMessage) {
            setMessage(flashMessage);
        }
    }, []);

    useEffect(() => {
        const token = ensureAdminToken(router);
        if (!token) {
            return;
        }

        const query = new URLSearchParams({
            page: String(page),
            per_page: "20",
        });

        if (productIdFilter.trim()) {
            query.set("product_id", productIdFilter.trim());
        }
        if (productNameFilter.trim()) {
            query.set("product_name", productNameFilter.trim());
        }

        setLoading(true);
        setError("");

        adminGet(`/admin-api/filter-products?${query.toString()}`, token)
            .then((payload: AdminListResponse) => {
                setRows(payload.data ?? []);
                setTotal(payload.total ?? 0);
                setLastPage(payload.last_page ?? 1);
            })
            .catch((err) =>
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load filter products"
                )
            )
            .finally(() => setLoading(false));
    }, [page, productIdFilter, productNameFilter, router]);

    const refresh = async () => {
        const token = ensureAdminToken(router);
        if (!token) {
            return;
        }

        const query = new URLSearchParams({
            page: String(page),
            per_page: "20",
        });
        if (productIdFilter.trim()) {
            query.set("product_id", productIdFilter.trim());
        }
        if (productNameFilter.trim()) {
            query.set("product_name", productNameFilter.trim());
        }

        const payload = (await adminGet(
            `/admin-api/filter-products?${query.toString()}`,
            token
        )) as AdminListResponse;
        setRows(payload.data ?? []);
        setTotal(payload.total ?? 0);
        setLastPage(payload.last_page ?? 1);
    };

    async function remove(row: FilterRow) {
        const token = ensureAdminToken(router);
        const rowId = getRowId(row.id);
        if (!token || !rowId) {
            return;
        }
        if (!window.confirm("Are you sure you want to delete this item?")) {
            return;
        }

        try {
            await adminDelete(`/admin-api/filter-products/${rowId}`, token);
            setMessage("Deleted successfully");
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to delete filter product"
            );
        }
    }

    async function runImport(event: FormEvent) {
        event.preventDefault();
        const token = ensureAdminToken(router);
        if (!token || !importFile) {
            return;
        }

        const body = new FormData();
        body.append("file", importFile);

        try {
            await adminPostForm(
                "/admin-api/filter-products/import",
                token,
                body
            );
            setMessage("Filters imported successfully");
            setImportFile(null);
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to import filters"
            );
        }
    }

    return (
        <div className="pc-content">
            <PageHeader
                title="Filter Products"
                breadcrumbs={[
                    { label: "Home", href: "/dashboard" },
                    { label: "Products", href: "/dashboard/products" },
                    { label: "Filter Products" },
                ]}
            />
            <AlertStack error={error} message={message} />

            <div className="row mb-3">
                <div className="col-6">
                    <form
                        onSubmit={runImport}
                        className="d-flex align-items-center"
                    >
                        <div className="d-flex gap-3 w-100 align-items-center">
                            <div className="flex-grow-1">
                                <label className="form-label text-primary mb-1">
                                    Please upload a CSV file:
                                </label>
                                <input
                                    type="file"
                                    className="form-control border-primary mb-3"
                                    accept=".csv"
                                    onChange={(event) =>
                                        setImportFile(
                                            event.target.files?.[0] ?? null
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="ml-3 mt-2">
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="col-6 d-flex justify-content-end align-items-center">
                    <Link
                        href="/dashboard/filter-products/create"
                        className="btn btn-primary"
                    >
                        Add Filter Product
                    </Link>
                </div>
            </div>

            <TableCard>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setPage(1);
                        setProductIdFilter(productIdInput);
                        setProductNameFilter(productNameInput);
                    }}
                    className="mb-4"
                >
                    <div className="row">
                        <div className="col-md-5">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Product ID"
                                value={productIdInput}
                                onChange={(event) =>
                                    setProductIdInput(event.target.value)
                                }
                            />
                        </div>
                        <div className="col-md-5">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Product Name"
                                value={productNameInput}
                                onChange={(event) =>
                                    setProductNameInput(event.target.value)
                                }
                            />
                        </div>
                        <div className="col-md-2">
                            <button type="submit" className="btn btn-primary">
                                Search
                            </button>
                        </div>
                    </div>
                </form>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>#No</th>
                                <th>Product ID</th>
                                <th>Product Name</th>
                                <th>Type</th>
                                <th>Size</th>
                                <th>Color</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7}>Loading...</td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>No records found.</td>
                                </tr>
                            ) : (
                                rows.map((row, index) => (
                                    <tr key={String(row.id ?? index)}>
                                        <td>{(page - 1) * 20 + index + 1}</td>
                                        <td>{formatValue(row.product_id)}</td>
                                        <td>{formatValue(row.product_name)}</td>
                                        <td>{formatValue(row.type)}</td>
                                        <td>{formatValue(row.size)}</td>
                                        <td>{formatValue(row.color)}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {getRowId(row.id) ? (
                                                    <Link
                                                        href={`/dashboard/filter-products/${getRowId(
                                                            row.id
                                                        )}`}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        Edit
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        disabled
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => remove(row)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                        Total: {total} | Page: {page}/{lastPage}
                    </div>
                    <Pagination
                        page={page}
                        lastPage={lastPage}
                        onPageChange={setPage}
                    />
                </div>
            </TableCard>
        </div>
    );
}
