'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminPost } from '@/lib/api';
import {
  AdminSessionUser,
  clearAdminSession,
  getStoredAdminToken,
  getStoredAdminUser,
  hasAdminPermission,
} from '@/lib/admin-auth';
import { getRequiredAdminImageUrl } from '@/lib/assets';

const SIDEBAR_STATE_STORAGE_KEY = 'hakidd-admin-sidebar-collapsed';

type MenuItem = {
  href: string;
  label: string;
  icon?: string;
  iconText?: string;
  permission?: string;
};

const PRODUCT_ITEMS: MenuItem[] = [
  { href: '/dashboard/products', label: 'Products', permission: 'products.read' },
  { href: '/dashboard/class-codes', label: 'Class Code', permission: 'products.read' },
  { href: '/dashboard/on-sale-products', label: 'On Sale Products', permission: 'products.read' },
  { href: '/dashboard/manage-product-quantity', label: 'Manage Product Quantity', permission: 'products.read' },
  { href: '/dashboard/filter-products', label: 'Filter Products', permission: 'products.read' },
  { href: '/dashboard/additional-products', label: 'Additional Products', permission: 'products.read' },
  { href: '/dashboard/group-products', label: 'Product Grouping', permission: 'products.read' },
  { href: '/dashboard/product-group-items', label: 'Product Group Item', permission: 'products.read' },
];

const MAIN_ITEMS: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'ph-duotone ph-gauge', permission: 'dashboard.read' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'material-icons-two-tone', iconText: 'analytics', permission: 'analytics.read' },
  { href: '/dashboard/categories', label: 'Categories', icon: 'material-icons-two-tone', iconText: 'category', permission: 'categories.read' },
  { href: '/dashboard/web-users', label: 'Customers', icon: 'ph-duotone ph-user-circle', permission: 'customers.read' },
  { href: '/dashboard/orders', label: 'Orders', icon: 'material-icons-two-tone', iconText: 'shopping_bag', permission: 'orders.read' },
  { href: '/dashboard/pre-orders', label: 'Pre Orders', icon: 'fab fa-first-order', permission: 'pre_orders.read' },
  { href: '/dashboard/search-synonyms', label: 'Search synonyms', icon: 'fas fa-search-plus', permission: 'search_synonyms.read' },
  { href: '/dashboard/displays', label: 'Home Page Ads', icon: 'material-icons-two-tone', iconText: 'domain', permission: 'displays.read' },
  { href: '/dashboard/banners', label: 'Banner Management', icon: 'fas fa-bullhorn', permission: 'banners.read' },
  { href: '/dashboard/faqs', label: 'FAQS', icon: 'fas fa-question-circle', permission: 'faqs.read' },
  { href: '/dashboard/catalogues', label: 'Catalogues', icon: 'material-icons-two-tone', iconText: 'insert_drive_file', permission: 'catalogues.read' },
  { href: '/dashboard/crousals', label: 'Carousel', icon: 'fas fa-image', permission: 'carousel.read' },
  { href: '/dashboard/patterns', label: 'Free Pattern', icon: 'material-icons-two-tone', iconText: 'picture_as_pdf', permission: 'patterns.read' },
  { href: '/dashboard/newsletters', label: 'Newsletter', icon: 'fas fa-newspaper', permission: 'newsletters.read' },
  { href: '/dashboard/activity-logs', label: 'Activity Logs', icon: 'ph-duotone ph-clock-counter-clockwise', permission: 'activity_logs.read' },
  { href: '/dashboard/admin-users', label: 'User Management', icon: 'ph-duotone ph-users-three', permission: 'admin_users.read' },
  { href: '/dashboard/site-settings', label: 'Site Settings', icon: 'ph-duotone ph-globe', permission: 'site_settings.read' },
];

const DEFAULT_USER: AdminSessionUser = {
  id: 0,
  name: 'Administrator',
  email: 'admin@hakidd.com',
  permissions: [],
  role: null,
  is_super_admin: false,
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function renderMenuIcon(item: MenuItem) {
  if (item.icon === 'material-icons-two-tone') {
    return <i className={item.icon}>{item.iconText ?? 'apps'}</i>;
  }

  return <i className={item.icon} />;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminSessionUser>(DEFAULT_USER);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY) === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const visibleProductItems = PRODUCT_ITEMS.filter((item) => hasAdminPermission(user, item.permission ?? null));
  const visibleMainItems = MAIN_ITEMS.filter((item) => hasAdminPermission(user, item.permission ?? null));
  const isProductRoute = visibleProductItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const [productMenuOpen, setProductMenuOpen] = useState(isProductRoute);

  useEffect(() => {
    setUser(getStoredAdminUser() ?? DEFAULT_USER);
  }, [pathname]);

  useEffect(() => {
    setProductMenuOpen(isProductRoute);
  }, [isProductRoute]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, String(desktopSidebarHidden));
  }, [desktopSidebarHidden]);

  async function logout() {
    const token = getStoredAdminToken();

    try {
      if (token) {
        await adminPost('/admin-api/logout', token, {});
      }
    } catch {
      // Ignore transport errors during logout in this stateless flow.
    } finally {
      clearAdminSession();
      router.push('/login');
    }
  }

  const brandImagePath = desktopSidebarHidden ? '/assets/images/hakidd-mark.png' : '/assets/images/hakidd-logo.png';
  const brandImageAlt = desktopSidebarHidden ? 'Hakidd mark' : 'Hakidd logo';

  return (
    <>
      <nav className={`pc-sidebar ${desktopSidebarHidden ? 'pc-sidebar-icon-only' : ''} ${mobileSidebarOpen ? 'mob-sidebar-active' : ''}`}>
        <div className="navbar-wrapper">
          <div className="m-header">
            <Link href="/dashboard" className="b-brand text-primary">
              <img
                src={getRequiredAdminImageUrl(brandImagePath)}
                alt={brandImageAlt}
                className={`admin-brand-image ${desktopSidebarHidden ? 'admin-brand-image-icon' : 'admin-brand-image-full'}`}
              />
            </Link>
          </div>

          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item pc-caption">
                <label>Navigation</label>
              </li>

              {visibleMainItems
                .filter((item) => item.href === '/dashboard' || item.href === '/dashboard/analytics')
                .map((item) => (
                  <li key={item.href} className={`pc-item ${isActive(pathname, item.href) ? 'active' : ''}`}>
                    <Link href={item.href} className="pc-link">
                      <span className="pc-micon">{renderMenuIcon(item)}</span>
                      <span className="pc-mtext">{item.label}</span>
                    </Link>
                  </li>
                ))}

              {visibleProductItems.length > 0 ? (
                <li className={`pc-item pc-hasmenu ${productMenuOpen ? 'pc-trigger active' : ''}`}>
                  <button
                    type="button"
                    className="pc-link"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setProductMenuOpen((value) => !value);
                    }}
                    aria-expanded={productMenuOpen}
                  >
                    <span className="pc-micon">
                      <i className="ph-duotone ph-layout" />
                    </span>
                    <span className="pc-mtext">Products</span>
                    <span className="pc-arrow">
                      <i data-feather="chevron-right" />
                    </span>
                  </button>
                  <ul className="pc-submenu" style={{ display: productMenuOpen ? 'block' : 'none' }}>
                    {visibleProductItems.map((item) => (
                      <li key={item.href} className={`pc-item ${isActive(pathname, item.href) ? 'active' : ''}`}>
                        <Link className="pc-link" href={item.href}>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}

              {visibleMainItems
                .filter((item) => item.href !== '/dashboard' && item.href !== '/dashboard/analytics')
                .map((item) => (
                  <li key={item.href} className={`pc-item ${isActive(pathname, item.href) ? 'active' : ''}`}>
                    <Link href={item.href} className="pc-link">
                      <span className="pc-micon">{renderMenuIcon(item)}</span>
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
                  <img
                    src={getRequiredAdminImageUrl('/assets/images/user/avatar-1.jpg')}
                    alt="user-image"
                    className="user-avtar wid-45 rounded-circle"
                  />
                </div>
                <div className="flex-grow-1 ms-3 me-2">
                  <h6 className="mb-0">{user.name}</h6>
                  <small>{user.role?.name ?? 'Administrator'}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        {mobileSidebarOpen ? <div className="pc-menu-overlay" onClick={() => setMobileSidebarOpen(false)} /> : null}
      </nav>

      <header className={`pc-header ${desktopSidebarHidden ? 'pc-header-icon-only' : ''}`}>
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp">
            <ul className="list-unstyled">
              <li className="pc-h-item pc-sidebar-collapse">
                <button
                  type="button"
                  className="pc-head-link ms-0 btn btn-link p-0 border-0"
                  onClick={() => setDesktopSidebarHidden((value) => !value)}
                  aria-label={desktopSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
                  aria-pressed={desktopSidebarHidden}
                >
                  <i className="ti ti-menu-2" />
                </button>
              </li>
              <li className="pc-h-item pc-sidebar-popup">
                <button
                  type="button"
                  className="pc-head-link ms-0 btn btn-link p-0 border-0"
                  onClick={() => setMobileSidebarOpen((value) => !value)}
                  aria-label={mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  aria-expanded={mobileSidebarOpen}
                >
                  <i className="ti ti-menu-2" />
                </button>
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
                  <img src={getRequiredAdminImageUrl('/assets/images/user/avatar-2.jpg')} alt="user-image" className="user-avtar" />
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
                              <img
                                src={getRequiredAdminImageUrl('/assets/images/user/avatar-2.jpg')}
                                alt="user-image"
                                className="wid-50 rounded-circle"
                              />
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
                            onClick={() => void logout()}
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

      <div className={`pc-container ${desktopSidebarHidden ? 'pc-container-icon-only' : ''}`}>{children}</div>

      <footer className={`pc-footer ${desktopSidebarHidden ? 'pc-footer-icon-only' : ''}`}>
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
