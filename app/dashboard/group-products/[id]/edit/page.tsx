import EditGroupProductPage from '@/components/product-admin/edit-group-product-page';

export default async function EditGroupProductRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditGroupProductPage id={Number(id)} />;
}
