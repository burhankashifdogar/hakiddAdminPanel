import ClassCodeEditPage from '@/components/product-admin/class-code-edit-page';

export default async function ClassCodeEditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassCodeEditPage id={Number(id)} />;
}
