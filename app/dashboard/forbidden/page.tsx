'use client';

import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="pc-content">
      <div className="card">
        <div className="card-body text-center py-5">
          <h3 className="mb-3">Access denied</h3>
          <p className="text-muted mb-4">
            Your admin role does not have permission to access this section.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
