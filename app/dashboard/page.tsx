'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApexOptions } from 'apexcharts';
import { adminGet } from '@/lib/api';
import { normalizeCountryUsers, toIso2, type CountryUsersRow } from '@/lib/country-users';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type DashboardBestSeller = {
  product_id: string;
  name: string;
  qty: number;
  revenue: number;
  buyers_count: number;
  orders_count: number;
};

type DashboardData = {
  usersCount: number;
  productsCount: number;
  categoriesCount: number;
  mixpanelData: {
    series: string[];
    values: Record<string, Record<string, number>>;
  };
  monthlySales: number;
  predictedSales: number;
  bestSellers: DashboardBestSeller[];
  monthlySeries: string[];
  monthlyTotals: number[];
  monthlyBestSellers: Record<string, DashboardBestSeller[]>;
  currentMonthOrders: number;
  previousMonthOrders: number;
  bestSellerOfYear: DashboardBestSeller | null;
};

type JsVectorMapInstance = {
  destroy?: () => void;
};

type JsVectorMapConstructor = new (config: Record<string, unknown>) => JsVectorMapInstance;

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [countryUsers, setCountryUsers] = useState<CountryUsersRow[]>([]);
  const [mapError, setMapError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempts = 0;

    const loadDashboard = async () => {
      const token = localStorage.getItem('hakidd_admin_token');
      if (!token) {
        if (attempts < 10) {
          attempts += 1;
          retryTimer = window.setTimeout(() => {
            void loadDashboard();
          }, 150);
          return;
        }

        setLoading(false);
        router.replace('/login');
        return;
      }

      setLoading(true);
      setError('');

      const [dashboardResult, countryUsersResult] = await Promise.allSettled([
        adminGet('/admin-api/dashboard', token),
        adminGet('/admin-api/analytics/country-users?all_time=1', token),
      ]);

      if (cancelled) {
        return;
      }

      if (countryUsersResult.status === 'fulfilled') {
        const normalized = normalizeCountryUsers(countryUsersResult.value);
        if (normalized.length > 0) {
          setCountryUsers(normalized);
          setMapError('');
        } else if (attempts >= 2) {
          setCountryUsers([]);
          setMapError('');
        }
      } else if (attempts >= 2) {
        setCountryUsers([]);
        setMapError('Website access map is temporarily unavailable.');
      }

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value as DashboardData);
      } else {
        if (attempts < 2) {
          attempts += 1;
          retryTimer = window.setTimeout(() => {
            void loadDashboard();
          }, 500);
          return;
        }

        setDashboard(null);
        setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : 'Failed to load dashboard');
      }

      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [router]);

  useEffect(() => {
    if (countryUsers.length === 0) {
      return;
    }

    let cancelled = false;
    let retryTimer: number | undefined;
    let mapInstance: JsVectorMapInstance | null = null;
    setMapError('');

    const initMap = async (attempt = 0) => {
      if (cancelled) {
        return;
      }

      const globalWindow = window as unknown as {
        jsVectorMap?: JsVectorMapConstructor;
      };

      if (!globalWindow.jsVectorMap) {
        if (attempt < 20) {
          retryTimer = window.setTimeout(() => {
            void initMap(attempt + 1);
          }, 150);
        }
        return;
      }

      const rowsByIso = new Map<string, { country: string; country_code: string; active_users: number }>();
      for (const row of countryUsers) {
        const iso = toIso2(row.country, row.country_code);
        if (!iso) {
          continue;
        }
        const amount = Number(row.active_users ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          continue;
        }

        const current = rowsByIso.get(iso);
        if (current) {
          current.active_users += amount;
          continue;
        }

        rowsByIso.set(iso, {
          country: String(row.country ?? iso).trim() || iso,
          country_code: iso,
          active_users: amount,
        });
      }

      let centroids: Record<string, [number, number]> = {};
      try {
        const response = await fetch('/assets/js/data/country-centroids.json', { cache: 'no-store' });
        centroids = response.ok ? ((await response.json()) as Record<string, [number, number]>) : {};
      } catch {
        centroids = {};
      }

      const markers = Array.from(rowsByIso.values())
        .sort((left, right) => right.active_users - left.active_users)
        .map((row) => {
          const coords = centroids[row.country_code];
          if (!coords) {
            return null;
          }

          return {
            name: `${row.country} (${row.country_code}): ${row.active_users} users`,
            coords,
            value: row.active_users,
            iso: row.country_code,
          };
        })
        .filter(Boolean);

      if (mapInstance?.destroy) {
        mapInstance.destroy();
      }

      const mapRoot = document.querySelector('#world-map-markers');
      if (!mapRoot) {
        return;
      }
      mapRoot.innerHTML = '';

      try {
        mapInstance = new globalWindow.jsVectorMap({
          selector: '#world-map-markers',
          map: 'world',
          markersSelectable: true,
          markers,
          zoomButtons: true,
          markerStyle: {
            initial: {
              fill: '#3f4d67',
            },
            hover: {
              fill: '#04A9F5',
            },
          },
          markerLabelStyle: {
            initial: {
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              fill: '#3f4d67',
            },
          },
        });
      } catch {
        setMapError('Map failed to initialize.');
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      if (mapInstance?.destroy) {
        mapInstance.destroy();
      }
    };
  }, [countryUsers]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const loginSeries = dashboard?.mixpanelData?.series ?? [];
  const loginValues = dashboard?.mixpanelData?.values?.['User Login'] ?? {};
  const loginChartData = loginSeries.map((date) => Number(loginValues[date] ?? 0));
  const loginChartCategories = loginSeries.map((date) => formatDate(date));
  const showMixpanelWarning = Boolean(dashboard && loginSeries.length === 0);
  const aggregatedCountryUsersMap = countryUsers.reduce((map, row) => {
    const iso = toIso2(row.country, row.country_code);
    if (!iso) {
      return map;
    }

    const amount = Number(row.active_users ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return map;
    }

    const current = map.get(iso);
    if (current) {
      current.active_users += amount;
      return map;
    }

    map.set(iso, {
      country: String(row.country ?? iso).trim() || iso,
      country_code: iso,
      active_users: amount,
    });
    return map;
  }, new Map<string, { country: string; country_code: string; active_users: number }>());
  const aggregatedCountryUsers = Array.from(aggregatedCountryUsersMap.values()).sort(
    (left, right) => right.active_users - left.active_users,
  );
  const ga4ActiveUsersTotal = aggregatedCountryUsers.reduce((sum, row) => sum + row.active_users, 0);
  const ga4LocationsTotal = aggregatedCountryUsers.length;

  const loginChartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 200,
      toolbar: { show: false },
    },
    colors: ['#0d6efd'],
    dataLabels: { enabled: false },
    markers: {
      size: 7,
      colors: '#0d6efd',
      strokeColors: '#fff',
      strokeWidth: 3,
      hover: {
        size: 4,
      },
    },
    stroke: {
      width: 1,
      curve: 'smooth',
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 4,
      },
    },
    grid: {
      strokeDashArray: 4,
    },
    yaxis: {
      show: false,
    },
    xaxis: {
      categories: loginChartCategories,
      labels: {
        hideOverlappingLabels: true,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
  };

  const salesChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 240,
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: 'smooth',
    },
    markers: {
      size: 3,
    },
    xaxis: {
      categories: dashboard?.monthlySeries ?? [],
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `$${Number(value).toFixed(2)}`,
      },
    },
  };

  const labelToMonthKey = (label: string) => {
    const parsed = new Date(`${label} 01`);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  };

  const canRenderLoginChart = Boolean(dashboard && loginChartData.length > 0);
  const canRenderSalesChart = Boolean(dashboard && (dashboard.monthlyTotals?.length ?? 0) > 0);

  return (
    <div className="pc-content">
      <div className="page-header">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-12">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/dashboard">Home</a>
                </li>
                <li className="breadcrumb-item">
                  <a href="javascript: void(0)">Dashboard</a>
                </li>
                <li className="breadcrumb-item" aria-current="page">
                  Home
                </li>
              </ul>
            </div>
            <div className="col-md-12">
              <div className="page-header-title">
                <h2 className="mb-0">Home</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {loading && !dashboard ? (
        <div className="alert alert-info" role="alert">
          Loading dashboard...
        </div>
      ) : null}

      <div className="row">
        <div className="col-md-4 col-sm-6">
          <div className="card statistics-card-1 overflow-hidden ">
            <div className="card-body">
              <img src="/assets/images/widget/img-status-4.svg" alt="img" className="img-fluid img-bg" />
              <h5 className="mb-4">Customers</h5>
              <div className="d-flex align-items-center mt-3">
                <h3 className="f-w-300 d-flex align-items-center m-b-0">{dashboard?.usersCount ?? 0}</h3>
              </div>
              <p className="text-muted mb-2 text-sm mt-3">Total Users listed on this website</p>
              <div className="progress" style={{ height: 7 }}>
                <div
                  className="progress-bar bg-brand-color-3"
                  role="progressbar"
                  style={{ width: '60%' }}
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-6">
          <div className="card statistics-card-1 overflow-hidden ">
            <div className="card-body">
              <img src="/assets/images/widget/img-status-5.svg" alt="img" className="img-fluid img-bg" />
              <h5 className="mb-4">Categories</h5>
              <div className="d-flex align-items-center mt-3">
                <h3 className="f-w-300 d-flex align-items-center m-b-0">{dashboard?.categoriesCount ?? 0}</h3>
              </div>
              <p className="text-muted mb-2 text-sm mt-3">Total Categories listed including sub categories</p>
              <div className="progress" style={{ height: 7 }}>
                <div
                  className="progress-bar bg-brand-color-3"
                  role="progressbar"
                  style={{ width: '75%' }}
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-12">
          <div className="card statistics-card-1 overflow-hidden  bg-brand-color-3">
            <div className="card-body">
              <img src="/assets/images/widget/img-status-6.svg" alt="img" className="img-fluid img-bg" />
              <h5 className="mb-4 text-white">Products</h5>
              <div className="d-flex align-items-center mt-3">
                <h3 className="text-white f-w-300 d-flex align-items-center m-b-0"> {dashboard?.productsCount ?? 0} </h3>
              </div>
              <p className="text-white text-opacity-75 mb-2 text-sm mt-3">Total products listed on Hakidd</p>
              <div className="progress bg-white bg-opacity-10" style={{ height: 7 }}>
                <div
                  className="progress-bar bg-white"
                  role="progressbar"
                  style={{ width: '75%' }}
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-7">
          <div className="card">
            <div className="card-header">
              <h5>Products From United States</h5>
            </div>
            <div className="card-body">
              {mapError ? (
                <div className="text-muted">{mapError}</div>
              ) : aggregatedCountryUsers.length === 0 ? (
                <div className="text-muted">No GA4 country user data available.</div>
              ) : (
                <div id="world-map-markers" className="set-map" style={{ height: 365 }} />
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-5">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between py-3">
              <h5>Login Users</h5>
              <div className="dropdown">
                <a
                  className="avtar avtar-xs btn-link-secondary dropdown-toggle arrow-none"
                  href="#"
                  data-bs-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <i className="material-icons-two-tone f-18">more_vert</i>
                </a>
                <div className="dropdown-menu dropdown-menu-end">
                  <a className="dropdown-item" href="#">View</a>
                  <a className="dropdown-item" href="#">Edit</a>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="media align-items-center">
                <div className="avtar avtar-s bg-light-primary flex-shrink-0">
                  <i className="ph-duotone ph-money f-20" />
                </div>
                <div className="media-body ms-3">
                  <p className="mb-0 text-muted">User Login Graph</p>
                </div>
              </div>
              {showMixpanelWarning ? (
                <div className="alert alert-warning mb-2 mt-2" role="alert">
                  Mixpanel returned no data for the configured date range. Check API credentials and date range in HomeController.
                </div>
              ) : null}
              <div id="earnings-user-chart">
                {canRenderLoginChart ? (
                  <ReactApexChart
                    options={loginChartOptions}
                    series={[
                      {
                        name: 'User Login',
                        data: loginChartData,
                      },
                    ]}
                    type="line"
                    height={200}
                  />
                ) : (
                  <div className="text-muted mt-3">No login data available.</div>
                )}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <div className="media align-items-center">
                    <div className="avtar avtar-s bg-light-warning flex-shrink-0">
                      <i className="ph-duotone ph-lightning f-20" />
                    </div>
                    <div className="media-body ms-2">
                      <p className="mb-0 text-muted">Total ideas</p>
                      <h6 className="mb-0">{formatNumber(ga4ActiveUsersTotal)}</h6>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="media align-items-center">
                    <div className="avtar avtar-s bg-light-danger flex-shrink-0">
                      <i className="ph-duotone ph-map-pin f-20" />
                    </div>
                    <div className="media-body ms-2">
                      <p className="mb-0 text-muted">Total location</p>
                      <h6 className="mb-0">{formatNumber(ga4LocationsTotal)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-4">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Monthly Best Seller</h6>
                  <ul className="list-group list-group-flush mt-3">
                    {(dashboard?.bestSellers ?? []).length === 0 ? (
                      <li className="list-group-item">No best sellers for this month.</li>
                    ) : (
                      (dashboard?.bestSellers ?? []).map((seller) => (
                        <li key={`${seller.product_id}-${seller.name}`} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{seller.name}</strong>
                            <div className="text-muted small">
                              ID: {seller.product_id} • Buyers: {seller.buyers_count}
                            </div>
                          </div>
                          <div className="text-end">
                            <div>{seller.qty} pcs</div>
                            <div className="text-muted small">{formatCurrency(seller.revenue)}</div>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Monthly Sales (This Month)</h6>
                  <div className="display-6 mt-3">{formatCurrency(dashboard?.monthlySales ?? 0)}</div>
                  <p className="text-muted small mt-2">Total revenue for the current month</p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Next Month Prediction</h6>
                  <div className="display-6 mt-3">{formatCurrency(dashboard?.predictedSales ?? 0)}</div>
                  <p className="text-muted small mt-2">Simple linear prediction based on last month trend</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-3">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Current Month Orders</h6>
                  <div className="display-6 mt-3">{dashboard?.currentMonthOrders ?? 0}</div>
                  <p className="text-muted small mt-2">Number of orders placed this month</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Previous Month Orders</h6>
                  <div className="display-6 mt-3">{dashboard?.previousMonthOrders ?? 0}</div>
                  <p className="text-muted small mt-2">Number of orders placed last month</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title">Best Seller of the Year</h6>
                  {dashboard?.bestSellerOfYear ? (
                    <>
                      <div className="mt-2">
                        <strong>{dashboard.bestSellerOfYear.name}</strong>
                        <div className="text-muted small">ID: {dashboard.bestSellerOfYear.product_id}</div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div>{dashboard.bestSellerOfYear.qty ?? 0} pcs</div>
                        <div className="text-muted small">{formatCurrency(dashboard.bestSellerOfYear.revenue ?? 0)}</div>
                      </div>
                      <p className="text-muted small mt-2">Buyers: {dashboard.bestSellerOfYear.buyers_count ?? 0}</p>
                    </>
                  ) : (
                    <div className="text-muted small mt-3">No best seller for this year.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-4">
          <div className="card">
            <div className="card-header">
              <h5>Sales - Last 12 Months</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-end">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboard?.monthlySeries ?? []).map((label, index) => (
                        <tr key={`${label}-${index}`}>
                          <td>{label}</td>
                          <td className="text-end">{formatCurrency(Number(dashboard?.monthlyTotals?.[index] ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <div id="sales-month-chart" style={{ height: 240 }}>
                    {canRenderSalesChart ? (
                      <ReactApexChart
                        options={salesChartOptions}
                        series={[
                          {
                            name: 'Sales',
                            data: dashboard?.monthlyTotals ?? [],
                          },
                        ]}
                        type="area"
                        height={240}
                      />
                    ) : (
                      <div className="text-muted">No sales data available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-4">
          <div className="card">
            <div className="card-header">
              <h5>Monthly Best Sellers (last 12 months)</h5>
            </div>
            <div className="card-body">
              <div className="accordion" id="monthlyBestSellers">
                {(dashboard?.monthlySeries ?? []).map((label, index) => {
                  const key = labelToMonthKey(label);
                  const sellers = key ? dashboard?.monthlyBestSellers?.[key] ?? [] : [];
                  return (
                    <div className="accordion-item" key={`${label}-${index}`}>
                      <h2 className="accordion-header" id={`heading-${index}`}>
                        <button
                          className="accordion-button collapsed"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapse-${index}`}
                          aria-expanded="false"
                          aria-controls={`collapse-${index}`}
                        >
                          {label}
                        </button>
                      </h2>
                      <div
                        id={`collapse-${index}`}
                        className="accordion-collapse collapse"
                        aria-labelledby={`heading-${index}`}
                        data-bs-parent="#monthlyBestSellers"
                      >
                        <div className="accordion-body">
                          {sellers.length === 0 ? (
                            <div className="text-muted">No best sellers meeting the buyers threshold for this month.</div>
                          ) : (
                            <ul className="list-group list-group-flush">
                              {sellers.map((seller) => (
                                <li key={`${seller.product_id}-${seller.name}`} className="list-group-item d-flex justify-content-between align-items-center">
                                  <div>
                                    <strong>{seller.name}</strong>
                                    <div className="text-muted small">
                                      ID: {seller.product_id} • Buyers: {seller.buyers_count}
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <div>{seller.qty} pcs</div>
                                    <div className="text-muted small">{formatCurrency(seller.revenue)}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
