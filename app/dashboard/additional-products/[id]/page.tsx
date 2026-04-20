import EditAdditionalProductPage from '@/components/product-admin/edit-additional-product-page';

export default async function EditAdditionalProductRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditAdditionalProductPage id={Number(id)} />;
}
