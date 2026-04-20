'use client';

import SimpleCrudPage from '@/components/product-admin/simple-crud-page';

export default function SpanishProductsRoutePage() {
  return (
    <SimpleCrudPage
      entity="spanish-products"
      title="Spanish Translation"
      breadcrumbs={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Spanish Translation' },
      ]}
      importLabel="Please upload a CSV file:"
      columns={[
        { key: 'row_number', label: '#No', render: (_row, index) => index + 1 },
        { key: 'product_id', label: 'Product ID' },
        { key: 'name', label: 'Name' },
        { key: 'product_description', label: 'Description' },
      ]}
      fields={[
        { name: 'product_id', label: 'Product ID', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'product_description', label: 'Description', type: 'textarea', required: true },
      ]}
      showSearch={false}
      searchPlaceholder="Search by id"
      renderDetails={(row) => (
        <div>
          <p>
            <strong>Product ID:</strong> {String(row.product_id ?? '')}
          </p>
          <p>
            <strong>Name:</strong> {String(row.name ?? '')}
          </p>
          <p className="mb-0">
            <strong>Description:</strong> {String(row.product_description ?? '')}
          </p>
        </div>
      )}
    />
  );
}
