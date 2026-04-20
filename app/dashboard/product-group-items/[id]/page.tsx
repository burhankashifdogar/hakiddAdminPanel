import ProductGroupItemDetailPage from '@/components/product-admin/product-group-item-detail-page';

export default async function ProductGroupItemDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductGroupItemDetailPage id={Number(id)} />;
}
