'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminDelete, adminGet, adminPostFormWithProgress } from '@/lib/api';
import { getAdminImageUrl } from '@/lib/assets';
import {
  AlertStack,
  Breadcrumb,
  CountryIndicator,
  LanguageLabel,
  PageHeader,
  TableCard,
  ensureAdminToken,
  formatValue,
} from './common';

type ProductDetail = {
  product: Record<string, unknown>;
  thumbnail: { image: string; url: string } | null;
  thumbnail_url: string | null;
  images: Array<{ image: string; url: string }>;
};

function normalizeProductId(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return String(value).trim();
  }
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border rounded-3 p-3 h-100 bg-light-subtle">
      <div className="text-muted small text-uppercase mb-1">{label}</div>
      <div className="fw-semibold text-dark" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {formatValue(value)}
      </div>
    </div>
  );
}

function UploadProgress({ active, value, label }: { active: boolean; value: number; label: string }) {
  if (!active) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <progress value={value} max="100" style={{ width: '100%' }} />
    </div>
  );
}

export default function ProductDetailPage({ productId }: { productId: string }) {
  const router = useRouter();
  const normalizedProductId = normalizeProductId(productId);
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'View Product' },
  ];

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [deletingImageName, setDeletingImageName] = useState('');
  const [deletingThumbnail, setDeletingThumbnail] = useState(false);

  const loadProductDetail = useCallback(async () => {
    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = (await adminGet(`/admin-api/products/${encodeURIComponent(normalizedProductId)}`, token)) as ProductDetail;
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product details.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [normalizedProductId, router]);

  useEffect(() => {
    loadProductDetail();
  }, [loadProductDetail]);

  async function uploadGalleryImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    const token = ensureAdminToken(router);
    if (!token || files.length === 0) {
      return;
    }

    const body = new FormData();
    files.forEach((file) => body.append('images', file));

    try {
      setUploadingGallery(true);
      setGalleryUploadProgress(0);
      setError('');
      setMessage('');
      const response = (await adminPostFormWithProgress(
        `/admin-api/products/${encodeURIComponent(normalizedProductId)}/images`,
        token,
        body,
        setGalleryUploadProgress,
      )) as { message?: string; skipped?: string[] };

      const skippedText = Array.isArray(response.skipped) && response.skipped.length > 0
        ? ` Skipped existing files: ${response.skipped.join(', ')}.`
        : '';
      setMessage(`${response.message ?? 'Images uploaded successfully.'}${skippedText}`);
      await loadProductDetail();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload images.');
    } finally {
      setUploadingGallery(false);
      setGalleryUploadProgress(0);
    }
  }

  async function uploadThumbnail(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    const token = ensureAdminToken(router);
    if (!token || !file) {
      return;
    }

    const body = new FormData();
    body.append('image', file);

    try {
      setUploadingThumbnail(true);
      setThumbnailUploadProgress(0);
      setError('');
      setMessage('');
      const response = (await adminPostFormWithProgress(
        `/admin-api/products/${encodeURIComponent(normalizedProductId)}/thumbnail`,
        token,
        body,
        setThumbnailUploadProgress,
      )) as { message?: string };

      setMessage(response.message ?? 'Thumbnail image uploaded successfully.');
      await loadProductDetail();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload thumbnail.');
    } finally {
      setUploadingThumbnail(false);
      setThumbnailUploadProgress(0);
    }
  }

  async function removeImage(imageName: string) {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setDeletingImageName(imageName);
      setError('');
      setMessage('');
      const response = (await adminDelete(
        `/admin-api/products/${encodeURIComponent(normalizedProductId)}/images/${encodeURIComponent(imageName)}`,
        token,
      )) as { message?: string };
      setMessage(response.message ?? 'Image has been deleted successfully.');
      await loadProductDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete image.');
    } finally {
      setDeletingImageName('');
    }
  }

  async function removeThumbnail() {
    if (!window.confirm('Are you sure you want to delete this thumbnail?')) {
      return;
    }

    const token = ensureAdminToken(router);
    if (!token) {
      return;
    }

    try {
      setDeletingThumbnail(true);
      setError('');
      setMessage('');
      const response = (await adminDelete(`/admin-api/products/${encodeURIComponent(normalizedProductId)}/thumbnail`, token)) as {
        message?: string;
      };
      setMessage(response.message ?? 'Thumbnail has been deleted successfully.');
      await loadProductDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete thumbnail.');
    } finally {
      setDeletingThumbnail(false);
    }
  }

  const product = detail?.product ?? null;
  const imageCount = detail?.images.length ?? 0;
  const hasThumbnail = Boolean(detail?.thumbnail);

  return (
    <div className="pc-content">
      <PageHeader title="View Product" breadcrumbs={breadcrumbs} />
      <AlertStack error={error} message={message} />

      <div className="card border-0 bg-light-subtle mb-3">
        <div className="card-body d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <div className="text-muted small mb-1">Product Detail</div>
            <h3 className="mb-2">{loading ? 'Loading product...' : formatValue(product?.name)}</h3>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge text-bg-light border">Product ID: {normalizedProductId}</span>
              <span className="badge text-bg-light border d-inline-flex align-items-center gap-2">
                <CountryIndicator country={product?.country} />
                {formatValue(product?.country)}
              </span>
              <span className="badge text-bg-light border">
                <LanguageLabel code={product?.lang_code} />
              </span>
              <span className="badge text-bg-light border">Gallery Images: {imageCount}</span>
              <span className={`badge ${hasThumbnail ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {hasThumbnail ? 'Thumbnail Available' : 'No Thumbnail'}
              </span>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadProductDetail} disabled={loading}>
              Refresh
            </button>
            <Link href="/dashboard/products" className="btn btn-outline-secondary btn-sm">
              Back to Products
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-xl-6">
          <TableCard header={<h5 className="mb-0">Product Information</h5>}>
            {loading || !product ? (
              <p className="mb-0">Loading product details...</p>
            ) : (
              <div className="row g-3">
                <div className="col-md-6">
                  <DetailField label="Product ID" value={product.product_id} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Product Name" value={product.name} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Category" value={product.product_category} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Ship Pac" value={product.ship_pac} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Inner Pac" value={product.inner_pac} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Class Code" value={product.class} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Brand" value={product.brand} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Selling Price" value={product.selling_price} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Country" value={product.country} />
                </div>
                <div className="col-md-6">
                  <DetailField label="Language" value={product.lang_code} />
                </div>
                <div className="col-12">
                  <DetailField label="Product Description" value={product.product_description} />
                </div>
              </div>
            )}
          </TableCard>
        </div>

        <div className="col-xl-6">
          <TableCard header={<h5 className="mb-0">Media Actions</h5>}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded-3 p-3 h-100">
                  <div className="fw-semibold mb-1">Thumbnail</div>
                  <div className="text-muted small mb-3">
                    Upload or replace the single product thumbnail. Recommended naming stays product-based.
                  </div>
                  <input
                    type="file"
                    id="product-thumbnail-upload"
                    className="d-none"
                    accept="image/*"
                    onChange={uploadThumbnail}
                    disabled={uploadingThumbnail}
                  />
                  <label htmlFor="product-thumbnail-upload" className="btn btn-primary btn-sm mb-0">
                    {uploadingThumbnail ? 'Uploading Thumbnail...' : 'Upload Thumbnail'}
                  </label>
                  <UploadProgress active={uploadingThumbnail} value={thumbnailUploadProgress} label="Thumbnail upload" />
                </div>
              </div>

              <div className="col-md-6">
                <div className="border rounded-3 p-3 h-100">
                  <div className="fw-semibold mb-1">Gallery Images</div>
                  <div className="text-muted small mb-3">
                    Add one or more images for this product. Existing filenames are skipped automatically.
                  </div>
                  <input
                    type="file"
                    id="product-gallery-upload"
                    className="d-none"
                    accept="image/*"
                    multiple
                    onChange={uploadGalleryImages}
                    disabled={uploadingGallery}
                  />
                  <label htmlFor="product-gallery-upload" className="btn btn-primary btn-sm mb-0">
                    {uploadingGallery ? 'Uploading Images...' : 'Upload Images'}
                  </label>
                  <UploadProgress active={uploadingGallery} value={galleryUploadProgress} label="Gallery upload" />
                </div>
              </div>
            </div>
          </TableCard>
        </div>
      </div>

      <div className="mt-3">
        <TableCard
          header={
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Thumbnail Image</h5>
              <span className={`badge ${hasThumbnail ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {hasThumbnail ? 'Available' : 'Missing'}
              </span>
            </div>
          }
        >
          {loading ? (
            <p className="mb-0">Loading thumbnail...</p>
          ) : detail?.thumbnail ? (
            <div className="row g-3 align-items-start">
              <div className="col-xl-3 col-md-4 col-sm-6">
                <div className="border rounded-3 p-3 bg-light-subtle">
                  <a className="card-gallery d-block" href={getAdminImageUrl(detail.thumbnail.url) ?? ''} target="_blank" rel="noreferrer">
                    <img className="img-fluid rounded border" src={getAdminImageUrl(detail.thumbnail.url) ?? ''} alt="Thumbnail" />
                  </a>
                  <div className="mt-3 small text-muted text-break">{detail.thumbnail.image}</div>
                  <div className="d-flex gap-2 mt-3">
                    <a
                      href={getAdminImageUrl(detail.thumbnail.url) ?? ''}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={removeThumbnail}
                      disabled={deletingThumbnail}
                    >
                      {deletingThumbnail ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <div className="fw-semibold mb-1">No thumbnail image available</div>
              <div className="small">Use the thumbnail upload action above to add one for this product.</div>
            </div>
          )}
        </TableCard>
      </div>

      <div className="mt-3">
        <TableCard
          header={
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">All Images</h5>
              <span className="badge text-bg-light border">{imageCount} total</span>
            </div>
          }
        >
          {loading ? (
            <p className="mb-0">Loading images...</p>
          ) : detail && detail.images.length > 0 ? (
            <div className="row g-3">
              {detail.images.map((image) => (
                <div key={image.image} className="col-xl-3 col-md-4 col-sm-6">
                  <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                    <a className="card-gallery d-block" href={getAdminImageUrl(image.url) ?? ''} target="_blank" rel="noreferrer">
                      <img className="img-fluid rounded border" src={getAdminImageUrl(image.url) ?? ''} alt={image.image} />
                    </a>
                    <div className="mt-3 text-break small text-muted">{image.image}</div>
                    <div className="d-flex gap-2 mt-3">
                      <a
                        href={getAdminImageUrl(image.url) ?? ''}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeImage(image.image)}
                        disabled={deletingImageName === image.image}
                      >
                        {deletingImageName === image.image ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <div className="fw-semibold mb-1">No gallery images found</div>
              <div className="small">Use the gallery upload action above to attach images to this product.</div>
            </div>
          )}
        </TableCard>
      </div>
    </div>
  );
}
