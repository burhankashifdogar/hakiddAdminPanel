'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type MenuItem = {
  href: string;
  label: string;
  icon?: string;
  iconText?: string;
};

const PRODUCT_ITEMS: MenuItem[] = [
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/class-codes', label: 'Class Code' },
  { href: '/dashboard/on-sale-products', label: 'On Sale Products' },
  { href: '/dashboard/manage-product-quantity', label: 'Manage Product Quantity' },
  { href: '/dashboard/filter-products', label: 'Filter Products' },
  { href: '/dashboard/additional-products', label: 'Additional Products' },
  { href: '/dashboard/group-products', label: 'Product Grouping' },
  { href: '/dashboard/product-group-items', label: 'Product Group Item' },
];

const MAIN_ITEMS: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'ph-duotone ph-gauge' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'material-icons-two-tone', iconText: 'analytics' },
  { href: '/dashboard/categories', label: 'Categories', icon: 'material-icons-two-tone', iconText: 'category' },
  { href: '/dashboard/web-users', label: 'Customers', icon: 'ph-duotone ph-user-circle' },
  { href: '/dashboard/orders', label: 'Orders', icon: 'material-icons-two-tone', iconText: 'shopping_bag' },
  { href: '/dashboard/pre-orders', label: 'Pre Orders', icon: 'fab fa-first-order' },
  { href: '/dashboard/search-synonyms', label: 'Search synonyms', icon: 'fas fa-search-plus' },
  { href: '/dashboard/displays', label: 'Home Page Ads', icon: 'material-icons-two-tone', iconText: 'domain' },
  { href: '/dashboard/banners', label: 'Banner Management', icon: 'fas fa-bullhorn' },
  { href: '/dashboard/faqs', label: 'FAQS', icon: 'fas fa-question-circle' },
  { href: '/dashboard/catalogues', label: 'Catalogues', icon: 'material-icons-two-tone', iconText: 'insert_drive_file' },
  { href: '/dashboard/crousals', label: 'Carousel', icon: 'fas fa-image' },
  { href: '/dashboard/patterns', label: 'Free Pattern', icon: 'material-icons-two-tone', iconText: 'picture_as_pdf' },
  { href: '/dashboard/newsletters', label: 'Newsletter', icon: 'fas fa-newspaper' },
  { href: '/dashboard/site-settings', label: 'Site Settings', icon: 'ph-duotone ph-globe' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState({ name: 'Administrator', email: 'admin@hakidd.com' });
  const isProductRoute = PRODUCT_ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const [productMenuOpen, setProductMenuOpen] = useState(isProductRoute);

  useEffect(() => {
    const raw = localStorage.getItem('hakidd_admin_user');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { name?: string; email?: string };
      setUser({
        name: parsed.name || 'Administrator',
        email: parsed.email || 'admin@hakidd.com',
      });
    } catch (_error) {
      setUser({ name: 'Administrator', email: 'admin@hakidd.com' });
    }
  }, []);

  useEffect(() => {
    setProductMenuOpen(isProductRoute);
  }, [isProductRoute]);

  return (
    <>
      <nav className="pc-sidebar">
        <div className="navbar-wrapper">
          <div className="m-header">
            <Link href="/dashboard" className="b-brand text-primary">
              <img src="/assets/images/logo.png" alt="logo image" />
            </Link>
          </div>

          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item pc-caption">
                <label>Navigation</label>
              </li>

              <li className={`pc-item ${isActive(pathname, '/dashboard') ? 'active' : ''}`}>
                <Link href="/dashboard" className="pc-link">
                  <span className="pc-micon">
                    <i className="ph-duotone ph-gauge" />
                  </span>
                  <span className="pc-mtext">Dashboard</span>
                </Link>
              </li>

              <li className={`pc-item ${isActive(pathname, '/dashboard/analytics') ? 'active' : ''}`}>
                <Link href="/dashboard/analytics" className="pc-link">
                  <span className="pc-micon">
                    <i className="material-icons-two-tone">analytics</i>
                  </span>
                  <span className="pc-mtext">Analytics</span>
                </Link>
              </li>

              <li className={`pc-item ${productMenuOpen ? 'pc-trigger active' : ''}`}>
                <a
                  href="#!"
                  className="pc-link"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setProductMenuOpen((value) => !value);
                  }}
                >
                  <span className="pc-micon">
                    <i className="ph-duotone ph-layout" />
                  </span>
                  <span className="pc-mtext">Products</span>
                  <span className="pc-arrow">
                    <i data-feather="chevron-right" />
                  </span>
                </a>
                <ul className="pc-submenu" style={{ display: productMenuOpen ? 'block' : 'none' }}>
                  {PRODUCT_ITEMS.map((item) => (
                    <li key={item.href} className={`pc-item ${isActive(pathname, item.href) ? 'active' : ''}`}>
                      <Link className="pc-link" href={item.href}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              {MAIN_ITEMS.slice(2).map((item) => (
                <li key={item.href} className={`pc-item ${isActive(pathname, item.href) ? 'active' : ''}`}>
                  <Link href={item.href} className="pc-link">
                    <span className="pc-micon">
                      {item.icon === 'material-icons-two-tone' ? (
                        <i className={item.icon}>{item.iconText ?? 'apps'}</i>
                      ) : (
                        <i className={item.icon} />
                      )}
                    </span>
                    <span className="pc-mtext">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card pc-user-card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <img src="/assets/images/user/avatar-1.jpg" alt="user-image" className="user-avtar wid-45 rounded-circle" />
                </div>
                <div className="flex-grow-1 ms-3 me-2">
                  <h6 className="mb-0">{user.name}</h6>
                  <small>Administrator</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <header className="pc-header">
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp">
            <ul className="list-unstyled">
              <li className="pc-h-item pc-sidebar-collapse">
                <a href="#!" className="pc-head-link ms-0" id="sidebar-hide">
                  <i className="ti ti-menu-2" />
                </a>
              </li>
              <li className="pc-h-item pc-sidebar-popup">
                <a href="#!" className="pc-head-link ms-0" id="mobile-collapse">
                  <i className="ti ti-menu-2" />
                </a>
              </li>
            </ul>
          </div>

          <div className="ms-auto">
            <ul className="list-unstyled">
              <li className="dropdown pc-h-item header-user-profile">
                <a
                  className="pc-head-link dropdown-toggle arrow-none me-0"
                  data-bs-toggle="dropdown"
                  href="#!"
                  role="button"
                  aria-haspopup="false"
                  aria-expanded="false"
                >
                  <img src="/assets/images/user/avatar-2.jpg" alt="user-image" className="user-avtar" />
                </a>
                <div className="dropdown-menu dropdown-user-profile dropdown-menu-end pc-h-dropdown">
                  <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <h5 className="m-0">Profile</h5>
                  </div>
                  <div className="dropdown-body">
                    <div className="profile-notification-scroll position-relative">
                      <ul className="list-group list-group-flush w-100">
                        <li className="list-group-item">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                              <img src="/assets/images/user/avatar-2.jpg" alt="user-image" className="wid-50 rounded-circle" />
                            </div>
                            <div className="flex-grow-1 mx-3">
                              <h5 className="mb-0">{user.name}</h5>
                              <a className="link-primary" href="#!">
                                {user.email}
                              </a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item">
                          <button
                            type="button"
                            className="dropdown-item border-0 bg-transparent w-100 text-start"
                            onClick={() => {
                              localStorage.removeItem('hakidd_admin_token');
                              localStorage.removeItem('hakidd_admin_user');
                              router.push('/login');
                            }}
                          >
                            <span className="d-flex align-items-center">
                              <i className="ph-duotone ph-power" />
                              <span>Logout</span>
                            </span>
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div className="pc-container">{children}</div>

      <footer className="pc-footer">
        <div className="footer-wrapper container-fluid">
          <div className="row">
            <div className="col-sm-6 my-1">
              <p className="m-0">© 2024 - H. A. Kidd and Company Limited All Rights Reserved.</p>
            </div>
            <div className="col-sm-6 ms-auto my-1">
              <ul className="list-inline footer-link mb-0 justify-content-sm-end d-flex">
                <li className="list-inline-item">
                  <Link href="/dashboard">Home</Link>
                </li>
                <li className="list-inline-item">
                  <a href="#!">Support</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
