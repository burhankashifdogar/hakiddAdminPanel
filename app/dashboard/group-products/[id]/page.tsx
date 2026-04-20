import GroupProductDetailPage from '@/components/product-admin/group-product-detail-page';

export default async function GroupProductDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupProductDetailPage id={Number(id)} />;
}
