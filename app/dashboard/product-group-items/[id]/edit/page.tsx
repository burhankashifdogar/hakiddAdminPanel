import EditProductGroupItemPage from '@/components/product-admin/edit-product-group-item-page';

export default async function EditProductGroupItemRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductGroupItemPage id={Number(id)} />;
}
