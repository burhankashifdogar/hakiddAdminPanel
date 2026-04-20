import ProductDetailPage from '@/components/product-admin/product-detail-page';

export default async function ProductDetailRoutePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductDetailPage productId={productId} />;
}
