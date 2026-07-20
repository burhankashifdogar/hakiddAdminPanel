"use strict";
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        floatchart();
    }, 500);
});

function floatchart() {
    (function () {
        // dynamic map using GA country-users and centroids
        async function initAnalyticsMap() {
            try {
                const [centroidsRes, analyticsRes] = await Promise.all([
                    fetch("/assets/js/data/country-centroids.json"),
                    fetch("/analytics/country-users"),
                ]);

                const centroids = centroidsRes.ok
                    ? await centroidsRes.json()
                    : {};
                const analytics = analyticsRes.ok
                    ? await analyticsRes.json()
                    : {};

                const markers = [];
                for (const [iso, count] of Object.entries(analytics || {})) {
                    const coords = centroids[iso];
                    if (!coords) continue;
                    markers.push({
                        name: `${iso}: ${count} users`,
                        coords: coords,
                        value: count,
                        iso: iso,
                    });
                }

                // initialize the map with markers
                var map = new jsVectorMap({
                    selector: "#world-map-markers",
                    map: "world",
                    markersSelectable: true,
                    markers: markers,
                    markerStyle: {
                        initial: { fill: "#3f4d67" },
                        hover: { fill: "#04A9F5" },
                    },
                    markerLabelStyle: {
                        initial: {
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            fill: "#3f4d67",
                        },
                    },
                    onMarkerClick: function (event, index, marker) {
                        // optional: handle click to navigate or show details
                        console.log("Marker clicked", marker);
                    },
                });
            } catch (err) {
                console.error("Failed to initialize analytics map", err);
            }
        }

        initAnalyticsMap();

        // chart
        var options = {
            chart: {
                type: "line",
                height: 200,
                toolbar: {
                    show: false,
                },
            },
            colors: ["#0d6efd"],
            dataLabels: {
                enabled: false,
            },
            markers: {
                size: 7,
                colors: "#0d6efd",
                strokeColors: "#fff",
                strokeWidth: 3,
                hover: {
                    size: 4,
                },
            },
            stroke: {
                width: 1,
                curve: "smooth",
            },
            plotOptions: {
                bar: {
                    columnWidth: "45%",
                    borderRadius: 4,
                },
            },
            grid: {
                strokeDashArray: 4,
            },
            series: [
                {
                    data: [30, 60, 40, 70, 50, 90],
                },
            ],
            yaxis: {
                show: false,
            },
            xaxis: {
                categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
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
        var chart = new ApexCharts(
            document.querySelector("#earnings-users-chart"),
            options
        );
        chart.render();
    })();
}
