import EditFilterProductPage from '@/components/product-admin/edit-filter-product-page';

export default async function EditFilterProductRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditFilterProductPage id={Number(id)} />;
}
