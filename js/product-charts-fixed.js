/**
 * Product Analytics Charts and Visualizations
 * Creates all product-specific charts and tables
 * FIXED VERSION - No syntax errors
 */

// Global variable for product analytics data
let productAnalyticsData = null;

// Color schemes for charts
const productColorSchemes = {
  primary: [
    'rgba(220, 38, 38, 0.8)',   // red
    'rgba(37, 99, 235, 0.8)',   // blue
    'rgba(16, 185, 129, 0.8)',  // green
    'rgba(139, 92, 246, 0.8)',  // purple
    'rgba(249, 115, 22, 0.8)',  // orange
    'rgba(236, 72, 153, 0.8)',  // pink
    'rgba(14, 165, 233, 0.8)',  // sky
    'rgba(168, 85, 247, 0.8)'   // violet
  ]
};

// Initialize product analytics
async function initializeProductAnalytics() {
  // Check if analytics is available in global scope or window
  const analyticsData = window.analytics || analytics;

  if (typeof analyticsData === 'undefined' || !analyticsData || !analyticsData.data) {
    console.warn('Analytics data not available for product analysis');
    return;
  }

  console.log('Initializing product analytics with', analyticsData.data.length, 'records');

  // Perform all product analyses
  const productMetrics = ProductAnalytics.analyzeProductPerformance(analyticsData.data);
  const abcAnalysis = ProductAnalytics.performABCAnalysis(productMetrics);
  const brandAnalysis = ProductAnalytics.analyzeBrands(analyticsData.data);
  const packSizeAnalysis = ProductAnalytics.analyzePackSizes(analyticsData.data);
  const substitutions = ProductAnalytics.findSubstitutionOpportunities(productMetrics);
  const seasonality = ProductAnalytics.detectSeasonalPatterns(analyticsData.data);
  const lifecycle = ProductAnalytics.analyzeProductLifecycle(productMetrics);

  productAnalyticsData = {
    productMetrics: productMetrics,
    abcAnalysis: abcAnalysis,
    brandAnalysis: brandAnalysis,
    packSizeAnalysis: packSizeAnalysis,
    substitutions: substitutions,
    seasonality: seasonality,
    lifecycle: lifecycle,
    rawData: analyticsData.data // Store raw data for quality indicators
  };

  // Create all product charts
  createABCChart();
  createBrandPerformanceChart();
  createProductLifecycleChart();
  createTopProductsTable();
  createSubstitutionTable();
  createBrandComparisonChart();
  createBrandMarketShareChart(); // New: Market Share
  createBrandSummaryTable(); // New: Summary Table
  createDataQualityIndicators(); // New: Data Quality
  createPackSizeOptimizationChart(); // New: Pack Size Optimization
  createVendorDiversificationChart(); // New: Vendor Diversification
  setupProductFilters(); // New: Product Table Filters
  updateProductSearch();

  // Update total potential savings
  updateTotalSavings();
}

// ABC Analysis Pareto Chart
function createABCChart() {
  const ctx = document.getElementById('abcChart');
  if (!ctx) {
    console.warn('ABC chart canvas not found');
    return;
  }

  if (!productAnalyticsData) {
    console.warn('Product analytics data not available');
    return;
  }

  const data = productAnalyticsData.abcAnalysis.products.slice(0, 20); // Top 20

  // Make the ABC chart interactive
  const abcChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: data.map(function(p) { return p.product.substring(0, 30); }),
      datasets: [{
        label: 'Spend ($)',
        data: data.map(function(p) { return p.totalSpend; }),
        backgroundColor: data.map(function(p) {
          return p.abcCategory === 'A' ? 'rgba(220, 38, 38, 0.8)' :
                 p.abcCategory === 'B' ? 'rgba(249, 115, 22, 0.8)' :
                 'rgba(37, 99, 235, 0.8)';
        }),
        yAxisID: 'y-spend'
      }, {
        label: 'Cumulative %',
        data: data.map(function(p) { return p.cumulativePercent; }),
        type: 'line',
        borderColor: 'rgba(16, 185, 129, 0.8)',
        backgroundColor: 'transparent',
        yAxisID: 'y-percent',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'ABC Analysis - Product Pareto Chart'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              if (context.datasetIndex === 0) {
                const product = data[context.dataIndex];
                return [
                  'Category: ' + product.abcCategory,
                  '% of Total: ' + product.spendPercent.toFixed(1) + '%',
                  'Orders: ' + product.orderCount
                ];
              }
              return '';
            }
          }
        },
        // Add click handler for interactivity
        ... {
          onClick: function(event, elements) {
            if (elements.length > 0) {
              const chart = this;
              const elementIndex = elements[0].index;
              const productData = data[elementIndex];
              if (productData && productData.product) {
                showProductDetails(encodeURIComponent(productData.product));
              }
            }
          }
        }
      },
      scales: {
        'y-spend': {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Spend ($)'
          },
          ticks: {
            callback: function(value) { return '$' + value.toLocaleString(); }
          }
        },
        'y-percent': {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Cumulative %'
          },
          max: 100,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

// Brand Performance Chart with color-coding and interactivity
function createBrandPerformanceChart() {
  const ctx = document.getElementById('brandChart');
  if (!ctx) {
    console.warn('Brand chart canvas not found');
    return;
  }

  if (!productAnalyticsData) {
    console.warn('Product analytics data not available');
    return;
  }

  const brands = Object.values(productAnalyticsData.brandAnalysis)
    .sort(function(a, b) { return b.totalSpend - a.totalSpend; })
    .slice(0, 10);

  // Create separate dataset for each brand with unique color
  const datasets = brands.map(function(brand, idx) {
    return {
      label: brand.brand,
      data: [{
        x: brand.avgPrice,
        y: brand.totalSpend,
        r: Math.sqrt(brand.productCount) * 5,
        brand: brand.brand,
        products: brand.productCount,
        loyaltyRate: brand.loyaltyRate || 0,
        competitivenessIndex: brand.competitivenessIndex || 0
      }],
      backgroundColor: productColorSchemes.primary[idx % productColorSchemes.primary.length].replace('0.8', '0.6'),
      borderColor: productColorSchemes.primary[idx % productColorSchemes.primary.length],
      borderWidth: 2
    };
  });

  new Chart(ctx.getContext('2d'), {
    type: 'bubble',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(event, elements) {
        if (elements.length > 0) {
          const datasetIndex = elements[0].datasetIndex;
          const brand = brands[datasetIndex];
          showBrandDetails(brand);
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Brand Performance Analysis (Click to View Details)'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const point = context.raw;
              return [
                'Brand: ' + point.brand,
                'Avg Price: $' + point.x.toFixed(2),
                'Total Spend: $' + point.y.toLocaleString(),
                'Products: ' + point.products,
                'Loyalty Rate: ' + point.loyaltyRate.toFixed(1) + '%',
                'Competitiveness: ' + point.competitivenessIndex.toFixed(1)
              ];
            }
          }
        },
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 10
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Average Price ($)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Total Spend ($)'
          },
          ticks: {
            callback: function(value) { return '$' + value.toLocaleString(); }
          }
        }
      }
    }
  });
}

// Product Lifecycle Chart
function createProductLifecycleChart() {
  const ctx = document.getElementById('lifecycleChart');
  if (!ctx) {
    console.warn('Lifecycle chart canvas not found');
    return;
  }

  if (!productAnalyticsData) {
    console.warn('Product analytics data not available');
    return;
  }

  const lifecycle = productAnalyticsData.lifecycle;

  new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['New', 'Growing', 'Mature', 'Declining', 'At Risk'],
      datasets: [{
        data: [
          lifecycle.newProducts.length,
          lifecycle.growingProducts.length,
          lifecycle.matureProducts.length,
          lifecycle.decliningProducts.length,
          lifecycle.discontinuedRisk.length
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green for new
          'rgba(37, 99, 235, 0.8)',  // Blue for growing
          'rgba(168, 85, 247, 0.8)', // Purple for mature
          'rgba(249, 115, 22, 0.8)', // Orange for declining
          'rgba(220, 38, 38, 0.8)'   // Red for at risk
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Product Lifecycle Distribution'
        },
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return percentage + '% of products';
            }
          }
        }
      }
    }
  });
}

// Brand Comparison Radar Chart with interactivity
function createBrandComparisonChart() {
  const ctx = document.getElementById('brandComparisonChart');
  if (!ctx) {
    console.warn('Brand comparison chart canvas not found');
    return;
  }

  if (!productAnalyticsData) {
    console.warn('Product analytics data not available');
    return;
  }

  // Get top 5 brands
  const topBrands = Object.values(productAnalyticsData.brandAnalysis)
    .sort(function(a, b) { return b.totalSpend - a.totalSpend; })
    .slice(0, 5);

  // Normalize metrics for radar chart
  const maxSpend = Math.max.apply(null, topBrands.map(function(b) { return b.totalSpend; }));
  const maxProducts = Math.max.apply(null, topBrands.map(function(b) { return b.productCount; }));
  const maxPrice = Math.max.apply(null, topBrands.map(function(b) { return b.avgPrice; }));
  const maxCategories = Math.max.apply(null, topBrands.map(function(b) { return b.categoryCount; }));

  new Chart(ctx.getContext('2d'), {
    type: 'radar',
    data: {
      labels: ['Total Spend', 'Product Variety', 'Avg Price', 'Category Coverage', 'Price Stability', 'Loyalty Rate'],
      datasets: topBrands.map(function(brand, idx) {
        return {
          label: brand.brand,
          data: [
            (brand.totalSpend / maxSpend) * 100,
            (brand.productCount / maxProducts) * 100,
            (brand.avgPrice / maxPrice) * 100,
            (brand.categoryCount / maxCategories) * 100,
            100 - (brand.priceSpread / brand.avgPrice * 100), // Price stability
            brand.loyaltyRate || 0
          ],
          borderColor: productColorSchemes.primary[idx],
          backgroundColor: productColorSchemes.primary[idx].replace('0.8', '0.2'),
          borderWidth: 2,
          brandData: brand
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(event, elements) {
        if (elements.length > 0) {
          const datasetIndex = elements[0].datasetIndex;
          const brand = topBrands[datasetIndex];
          showBrandDetails(brand);
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Brand Comparison (Click to View Details)'
        },
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

// Data Quality Indicators
function createDataQualityIndicators() {
  const container = document.getElementById('dataQualityIndicators');
  if (!container || !productAnalyticsData || !productAnalyticsData.rawData) {
    console.warn('Data quality indicators container or data not found');
    return;
  }

  const data = productAnalyticsData.rawData;
  const totalRecords = data.length;

  // Calculate data quality metrics
  const dateRange = {
    min: new Date(Math.min.apply(null, data.map(function(d) { return new Date(d.invoiceDate); }))),
    max: new Date(Math.max.apply(null, data.map(function(d) { return new Date(d.invoiceDate); })))
  };

  const daysCovered = Math.ceil((dateRange.max - dateRange.min) / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive range
  const expectedRecordsPerDay = 5; // Heuristic: estimate of orders per day
  const expectedTotalRecords = daysCovered * expectedRecordsPerDay;
  const completeness = Math.min(100, (totalRecords / expectedTotalRecords) * 100);

  const categoriesWithData = new Set(data.map(function(d) { return d.category; })).size;
  const productsWithData = new Set(data.map(function(d) { return d.productDescription; })).size;
  const vendorsWithData = new Set(data.map(function(d) { return d.vendor; })).size;

  const missingBrands = data.filter(function(d) { return !d.brand || d.brand === 'Generic'; }).length;
  const dataQualityScore = totalRecords > 0 ? 100 - (missingBrands / totalRecords * 100) : 100;

  container.innerHTML = '<div class="data-quality-panel">' +
    '<h4>📊 Data Quality Overview</h4>' +
    '<div class="quality-grid">' +
      '<div class="quality-card">' +
        '<div class="quality-label">Data Completeness</div>' +
        '<div class="quality-value ' + (completeness > 70 ? 'good' : completeness > 40 ? 'warning' : 'poor') + '">' +
          completeness.toFixed(1) + '%' +
        '</div>' +
        '<div class="quality-detail">' + totalRecords + ' records over ' + daysCovered + ' days</div>' +
      '</div>' +
      '<div class="quality-card">' +
        '<div class="quality-label">Data Quality Score</div>' +
        '<div class="quality-value ' + (dataQualityScore > 80 ? 'good' : dataQualityScore > 60 ? 'warning' : 'poor') + '">' +
          dataQualityScore.toFixed(1) + '%' +
        '</div>' +
        '<div class="quality-detail">' + (totalRecords - missingBrands) + ' records with brand info</div>' +
      '</div>' +
      '<div class="quality-card">' +
        '<div class="quality-label">Coverage</div>' +
        '<div class="quality-value good">' + categoriesWithData + '</div>' +
        '<div class="quality-detail">Categories • ' + productsWithData + ' Products • ' + vendorsWithData + ' Vendors</div>' +
      '</div>' +
      '<div class="quality-card">' +
        '<div class="quality-label">Date Range</div>' +
        '<div class="quality-value">' + daysCovered + ' days</div>' +
        '<div class="quality-detail">' + dateRange.min.toLocaleDateString() + ' to ' + dateRange.max.toLocaleDateString() + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// Pack Size Optimization Chart
function createPackSizeOptimizationChart() {
  const ctx = document.getElementById('packSizeChart');
  if (!ctx) {
    console.warn('Pack size chart canvas not found');
    return;
  }

  if (!productAnalyticsData || !productAnalyticsData.packSizeAnalysis) {
    console.warn('Pack size analysis not available');
    return;
  }

  // Get pack sizes with cost per unit data
  const packSizes = Object.values(productAnalyticsData.packSizeAnalysis)
    .filter(function(ps) { return ps.avgCostPerUnit > 0; })
    .sort(function(a, b) { return b.totalSpend - a.totalSpend; })
    .slice(0, 15);

  if (packSizes.length === 0) {
    ctx.getContext('2d').fillText('No pack size data available', 10, 50);
    return;
  }

  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: packSizes.map(function(ps) { return ps.category + ' - ' + ps.packSize; }),
      datasets: [{
        label: 'Cost per Unit ($)',
        data: packSizes.map(function(ps) { return ps.avgCostPerUnit; }),
        backgroundColor: packSizes.map(function(ps) {
          return ps.avgCostPerUnit < 1 ? 'rgba(16, 185, 129, 0.8)' :
                 ps.avgCostPerUnit < 3 ? 'rgba(249, 115, 22, 0.8)' :
                 'rgba(220, 38, 38, 0.8)';
        })
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        title: {
          display: true,
          text: 'Cost Efficiency by Pack Size'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const ps = packSizes[context.dataIndex];
              return [
                'Total Spend: $' + ps.totalSpend.toLocaleString(),
                'Products: ' + ps.productCount
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Cost per Unit ($)' },
          ticks: {
            callback: function(value) { return '$' + value.toFixed(2); }
          }
        }
      }
    }
  });
}

// Vendor Diversification Chart
function createVendorDiversificationChart() {
  const ctx = document.getElementById('vendorDiversificationChart');
  if (!ctx) {
    console.warn('Vendor diversification chart canvas not found');
    return;
  }

  if (!productAnalyticsData || !productAnalyticsData.rawData) {
    console.warn('Product data not available');
    return;
  }

  // Calculate vendor diversification by category
  const categoryVendors = {};
  productAnalyticsData.rawData.forEach(function(item) {
    const cat = item.category || 'Unknown';
    if (!categoryVendors[cat]) {
      categoryVendors[cat] = new Set();
    }
    categoryVendors[cat].add(item.vendor);
  });

  // Calculate diversification score (1 - Herfindahl index normalized)
  const diversificationScores = Object.keys(categoryVendors).map(function(cat) {
    const vendorsInCat = Array.from(categoryVendors[cat]);
    const vendorCounts = {};

    productAnalyticsData.rawData.forEach(function(item) {
      if (item.category === cat) {
        vendorCounts[item.vendor] = (vendorCounts[item.vendor] || 0) + 1;
      }
    });

    const total = Object.values(vendorCounts).reduce(function(a, b) { return a + b; }, 0);
    if (total === 0) return { category: cat, score: 0, vendorCount: 0 };

    const herfindahl = Object.values(vendorCounts).reduce(function(sum, count) {
      const share = count / total;
      return sum + (share * share);
    }, 0);

    const diversificationScore = (1 - herfindahl) * 100;

    return {
      category: cat,
      score: diversificationScore,
      vendorCount: vendorsInCat.length
    };
  }).sort(function(a, b) { return b.score - a.score; });

  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: diversificationScores.map(function(d) { return d.category; }),
      datasets: [{
        label: 'Diversification Score',
        data: diversificationScores.map(function(d) { return d.score; }),
        backgroundColor: diversificationScores.map(function(d) {
          return d.score > 60 ? 'rgba(16, 185, 129, 0.8)' :
                 d.score > 30 ? 'rgba(249, 115, 22, 0.8)' :
                 'rgba(220, 38, 38, 0.8)';
        })
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Vendor Diversification by Category'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const d = diversificationScores[context.dataIndex];
              return 'Vendors: ' + d.vendorCount;
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Diversification Score (0-100)' },
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}


// Top Products Table
function createTopProductsTable(productsToDisplay = null) {
  const container = document.getElementById('topProductsTable');
  if (!container || !productAnalyticsData) return;

  // Use provided products or default to top 15 from ABC analysis
  const products = productsToDisplay || productAnalyticsData.abcAnalysis.products.slice(0, 15);

  let html = '<table class="data-table">' +
    '<thead>' +
      '<tr>' +
        '<th>Product</th>' +
        '<th>Brand</th>' +
        '<th>ABC</th>' +
        '<th class="number">Total Spend</th>' +
        '<th class="number">Avg Price</th>' +
        '<th class="number">Price Change</th>' +
        '<th>Status</th>' +
        '<th>Action</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  products.forEach(function(product) {
    // Ensure priceChanges is an array and has elements before accessing
    const lastPriceChange = Array.isArray(product.priceChanges) && product.priceChanges.length > 0 ?
                            product.priceChanges[product.priceChanges.length - 1] : null;

    const priceChangeHtml = lastPriceChange ?
      '<span class="' + (lastPriceChange.changePercent > 0 ? 'negative' : 'positive') + '">' +
        (lastPriceChange.changePercent > 0 ? '↑' : '↓') + ' ' +
        Math.abs(lastPriceChange.changePercent).toFixed(1) + '%' +
      '</span>' : '-';

    const statusClass = product.status === 'Active' ? 'positive' :
                       product.status === 'Slow Moving' ? 'warning' : 'negative';

    html += '<tr>' +
      '<td>' + product.description.substring(0, 40) + '</td>' +
      '<td>' + (product.brand || '-') + '</td>' +
      '<td><span class="badge badge-' + product.abcCategory.toLowerCase() + '">' + product.abcCategory + '</span></td>' +
      '<td class="number">$' + product.totalSpend.toLocaleString() + '</td>' +
      '<td class="number">$' + product.avgPrice.toFixed(2) + '</td>' +
      '<td class="number">' + priceChangeHtml + '</td>' +
      '<td><span class="' + statusClass + '">' + product.status + '</span></td>' +
      '<td>' +
        '<button class="btn-small" onclick="showProductDetails(\'' + encodeURIComponent(product.product) + '\')">' +
          'View Details' +
        '</button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Substitution Opportunities Table
function createSubstitutionTable() {
  const container = document.getElementById('substitutionTable');
  if (!container || !productAnalyticsData) return;

  const substitutions = productAnalyticsData.substitutions.slice(0, 10);

  if (substitutions.length === 0) {
    container.innerHTML = '<p class="text-muted">No significant substitution opportunities found.</p>';
    return;
  }

  let html = '<table class="data-table">' +
    '<thead>' +
      '<tr>' +
        '<th>Current Product</th>' +
        '<th>Suggested Alternative</th>' +
        '<th class="number">Current Price</th>' +
        '<th class="number">Alt. Price</th>' +
        '<th class="number">Savings</th>' +
        '<th class="number">Annual Impact</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  substitutions.forEach(function(sub) {
    html += '<tr>' +
      '<td>' +
        '<div>' + sub.currentProduct.substring(0, 35) + '</div>' +
        '<div class="text-small text-muted">' + sub.currentBrand + '</div>' +
      '</td>' +
      '<td>' +
        '<div>' + sub.suggestedProduct.substring(0, 35) + '</div>' +
        '<div class="text-small text-muted">' + sub.suggestedBrand + '</div>' +
      '</td>' +
      '<td class="number">$' + sub.currentPrice.toFixed(2) + '</td>' +
      '<td class="number">$' + sub.suggestedPrice.toFixed(2) + '</td>' +
      '<td class="number positive">' + sub.savingsPercent.toFixed(1) + '%</td>' +
      '<td class="number positive">$' + sub.annualSavings.toLocaleString() + '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Product Search and Details
function updateProductSearch() {
  const searchInput = document.getElementById('productSearch');
  const searchResults = document.getElementById('searchResults');

  if (!searchInput || !productAnalyticsData) return;

  const products = Object.keys(productAnalyticsData.productMetrics);

  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    const matches = products
      .filter(function(p) { return p.toLowerCase().includes(query); })
      .slice(0, 10);

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No products found</div>';
      return;
    }

    searchResults.innerHTML = matches.map(function(product) {
      return '<div class="search-result" onclick="showProductDetails(\'' +
        encodeURIComponent(product) + '\')">' + product + '</div>';
    }).join('');
  });
}

// Show detailed product analysis
function showProductDetails(encodedProduct) {
  const product = decodeURIComponent(encodedProduct);
  const productData = productAnalyticsData.productMetrics[product];

  if (!productData) {
    console.warn(`Product data not found for: ${product}`);
    return;
  }

  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('productModalTitle');
  const modalBody = document.getElementById('productModalBody');

  if (!modal || !modalTitle || !modalBody) {
    console.log('Product details:', productData); // Fallback if modal elements are missing
    return;
  }

  modalTitle.textContent = product;

  // Create detailed view
  let detailsHtml = '<div class="product-details">' +
    '<div class="detail-grid">' +
      '<div class="detail-card">' +
        '<h4>Overview</h4>' +
        '<p><strong>Brand:</strong> ' + (productData.brand || 'N/A') + '</p>' +
        '<p><strong>Vendor:</strong> ' + productData.vendor + '</p>' +
        '<p><strong>Pack Size:</strong> ' + productData.packSize + '</p>' +
        '<p><strong>Status:</strong> <span class="' +
          (productData.status === 'Active' ? 'positive' : 'negative') + '">' +
          productData.status + '</span></p>' +
      '</div>' +

      '<div class="detail-card">' +
        '<h4>Performance Metrics</h4>' +
        '<p><strong>Total Spend:</strong> $' + productData.totalSpend.toLocaleString() + '</p>' +
        '<p><strong>Total Quantity:</strong> ' + productData.totalQty + '</p>' +
        '<p><strong>Avg Price:</strong> $' + productData.avgPrice.toFixed(2) + '</p>' +
        '<p><strong>Order Count:</strong> ' + productData.orderCount + '</p>' +
      '</div>' +

      '<div class="detail-card">' +
        '<h4>Pricing Analytics</h4>' +
        '<p><strong>Price Volatility:</strong> ' + (productData.priceVolatility * 100).toFixed(1) + '%</p>' +
        '<p><strong>Price Changes:</strong> ' + productData.priceChanges.length + '</p>' +
        '<p><strong>Last Change:</strong> ' +
          (productData.priceChanges.length > 0 ?
          productData.priceChanges[productData.priceChanges.length - 1].changePercent.toFixed(1) + '%' :
          'None') + '</p>' +
      '</div>' +

      '<div class="detail-card">' +
        '<h4>Ordering Pattern</h4>' +
        '<p><strong>First Order:</strong> ' + productData.firstSeen.toLocaleDateString() + '</p>' +
        '<p><strong>Last Order:</strong> ' + productData.lastSeen.toLocaleDateString() + '</p>' +
        '<p><strong>Avg Days Between Orders:</strong> ' + productData.avgDaysBetweenOrders.toFixed(0) + '</p>' +
        '<p><strong>Product Age:</strong> ' + productData.productAge + ' days</p>' +
      '</div>' +
    '</div>' +

    '<div class="chart-container mt-3">' +
      '<canvas id="productTrendChart"></canvas>' +
    '</div>';

  if (productData.priceChanges.length > 0) {
    detailsHtml += '<h4 class="mt-3">Price History</h4>' +
      '<table class="data-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Date</th>' +
            '<th>Old Price</th>' +
            '<th>New Price</th>' +
            '<th>Change</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    productData.priceChanges.forEach(function(change) {
      detailsHtml += '<tr>' +
        '<td>' + change.date.toLocaleDateString() + '</td>' +
        '<td>$' + change.oldPrice.toFixed(2) + '</td>' +
        '<td>$' + change.newPrice.toFixed(2) + '</td>' +
        '<td class="' + (change.changePercent > 0 ? 'negative' : 'positive') + '">' +
          (change.changePercent > 0 ? '↑' : '↓') + ' ' +
          Math.abs(change.changePercent).toFixed(1) + '%' +
        '</td>' +
      '</tr>';
    });

    detailsHtml += '</tbody></table>';
  }

  detailsHtml += '</div>';

  modalBody.innerHTML = detailsHtml;
  modal.style.display = 'block';

  // Create product trend chart
  setTimeout(function() {
    // Ensure ProductAnalytics.createProductTrendChart is available
    if (typeof ProductAnalytics !== 'undefined' && ProductAnalytics.createProductTrendChart) {
      ProductAnalytics.createProductTrendChart(productData, 'productTrendChart');
    } else {
      console.warn('ProductAnalytics.createProductTrendChart is not defined.');
    }
  }, 100);
}

// Update total potential savings
function updateTotalSavings() {
  const savingsEl = document.getElementById('totalPotentialSavings');
  if (!savingsEl || !productAnalyticsData) return;

  const totalSavings = productAnalyticsData.substitutions
    .reduce(function(sum, sub) { return sum + sub.annualSavings; }, 0);

  savingsEl.textContent = '$' + totalSavings.toLocaleString();
}

// Setup product table filters
function setupProductFilters() {
  if (!productAnalyticsData || !productAnalyticsData.abcAnalysis) return;

  const products = productAnalyticsData.abcAnalysis.products;

  // Populate category filter
  const categories = new Set();
  const brands = new Set();

  products.forEach(function(p) {
    // Attempt to get category from invoice data if available
    const firstInvoice = p.invoices && p.invoices[0];
    if (firstInvoice && firstInvoice.category) {
      categories.add(firstInvoice.category);
    } else {
      // Fallback or if no invoice data is linked directly
      categories.add('Uncategorized');
    }
    if (p.brand) brands.add(p.brand);
  });

  const categoryFilter = document.getElementById('productCategoryFilter');
  const brandFilter = document.getElementById('productBrandFilter');
  const abcFilter = document.getElementById('productABCFilter');

  if (categoryFilter) {
    // Clear existing options except 'all'
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(function(cat) {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
    categoryFilter.addEventListener('change', filterProductTable);
  }

  if (brandFilter) {
    // Clear existing options except 'all'
    brandFilter.innerHTML = '<option value="all">All Brands</option>';
    Array.from(brands).sort().forEach(function(brand) {
      const option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      brandFilter.appendChild(option);
    });
    brandFilter.addEventListener('change', filterProductTable);
  }

  if (abcFilter) {
    // Ensure the filter has options if not already populated by HTML
    if (abcFilter.options.length <= 1) { // If only the default 'All' option exists
      const abcCategories = ['A', 'B', 'C'];
      abcCategories.forEach(function(abc) {
          const option = document.createElement('option');
          option.value = abc;
          option.textContent = abc + ' Category';
          abcFilter.appendChild(option);
      });
    }
    abcFilter.addEventListener('change', filterProductTable);
  }
}

// Filter product table
function filterProductTable() {
  const categoryFilter = document.getElementById('productCategoryFilter')?.value || 'all';
  const brandFilter = document.getElementById('productBrandFilter')?.value || 'all';
  const abcFilter = document.getElementById('productABCFilter')?.value || 'all';

  let filteredProducts = productAnalyticsData.abcAnalysis.products;

  if (categoryFilter !== 'all') {
    filteredProducts = filteredProducts.filter(function(p) {
      const firstInvoice = p.invoices && p.invoices[0];
      return firstInvoice && firstInvoice.category === categoryFilter;
    });
  }

  if (brandFilter !== 'all') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.brand === brandFilter;
    });
  }

  if (abcFilter !== 'all') {
    filteredProducts = filteredProducts.filter(function(p) {
      return p.abcCategory === abcFilter;
    });
  }

  createTopProductsTable(filteredProducts.slice(0, 15));
}

// Reset product filters
window.resetProductFilters = function() {
  const categoryFilter = document.getElementById('productCategoryFilter');
  const brandFilter = document.getElementById('productBrandFilter');
  const abcFilter = document.getElementById('productABCFilter');

  if (categoryFilter) categoryFilter.value = 'all';
  if (brandFilter) brandFilter.value = 'all';
  if (abcFilter) abcFilter.value = 'all';

  createTopProductsTable(); // Re-render with default products
};

// Show product drill-down in modal (renamed to avoid conflict with showProductDetails)
function showProductDrillDown(product) {
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('productModalTitle');
  const modalBody = document.getElementById('productModalBody');

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = product.product;

  // Ensure priceChanges is an array
  const priceChanges = Array.isArray(product.priceChanges) ? product.priceChanges : [];
  const lastPriceChange = priceChanges.length > 0 ? priceChanges[priceChanges.length - 1] : null;

  // Ensure invoices is an array
  const invoices = Array.isArray(product.invoices) ? product.invoices : [];

  modalBody.innerHTML = '<div class="product-details">' +
    '<div class="detail-grid">' +
      '<div class="detail-card">' +
        '<h4>Financial Summary</h4>' +
        '<p><strong>Total Spend:</strong> $' + product.totalSpend.toLocaleString() + '</p>' +
        '<p><strong>Total Quantity:</strong> ' + product.totalQty + '</p>' +
        '<p><strong>Average Price:</strong> $' + product.avgPrice.toFixed(2) + '</p>' +
        '<p><strong>ABC Category:</strong> <span class="badge badge-' + product.abcCategory.toLowerCase() + '">' + product.abcCategory + '</span></p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>Product Info</h4>' +
        '<p><strong>Brand:</strong> ' + (product.brand || 'Generic') + '</p>' +
        '<p><strong>Pack Size:</strong> ' + (product.packSize || 'N/A') + '</p>' +
        '<p><strong>Vendor:</strong> ' + (product.vendor || 'N/A') + '</p>' +
        '<p><strong>Status:</strong> ' + product.status + '</p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>Order History</h4>' +
        '<p><strong>Total Orders:</strong> ' + product.orderCount + '</p>' +
        '<p><strong>First Seen:</strong> ' + new Date(product.firstSeen).toLocaleDateString() + '</p>' +
        '<p><strong>Last Seen:</strong> ' + new Date(product.lastSeen).toLocaleDateString() + '</p>' +
        '<p><strong>Avg Days Between Orders:</strong> ' + Math.round(product.avgDaysBetweenOrders) + '</p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>Price Analysis</h4>' +
        '<p><strong>Price Volatility:</strong> ' + (product.priceVolatility * 100).toFixed(1) + '%</p>' +
        '<p><strong>Price Changes:</strong> ' + priceChanges.length + '</p>' +
        (lastPriceChange ? '<p><strong>Last Change:</strong> ' +
          (lastPriceChange.changePercent > 0 ? '↑' : '↓') + ' ' +
          Math.abs(lastPriceChange.changePercent).toFixed(1) + '% on ' +
          new Date(lastPriceChange.date).toLocaleDateString() + '</p>' : '') +
      '</div>' +
    '</div>' +
    '<h4>Recent Invoices</h4>' +
    '<table class="drill-down-table">' +
      '<thead><tr><th>Date</th><th>Qty</th><th>Unit Price</th><th>Ext Price</th></tr></thead>' +
      '<tbody>' +
        invoices.slice(0, 10).map(function(inv) {
          return '<tr>' +
            '<td>' + new Date(inv.date).toLocaleDateString() + '</td>' +
            '<td>' + inv.qty + '</td>' +
            '<td>$' + inv.price.toFixed(2) + '</td>' +
            '<td>$' + inv.extPrice.toFixed(2) + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table>' +
  '</div>';

  modal.style.display = 'block';
}


// Add CSS for new elements
(function() {
  const style = document.createElement('style');
  style.textContent = `
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .detail-card {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .detail-card h4 {
      margin-bottom: 0.5rem;
      color: #374151;
      font-size: 1.1rem;
    }
    .detail-card p {
      margin-bottom: 0.25rem;
      font-size: 0.95rem;
      color: #4b5563;
    }
    .detail-card p strong {
      color: #1f2937;
    }
    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      display: inline-block;
    }
    .badge-a { background: #fee2e2; color: #991b1b; }
    .badge-b { background: #fef3c7; color: #92400e; }
    .badge-c { background: #dbeafe; color: #1e40af; }

    .btn-small {
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .btn-small:hover { background: #2563eb; }

    .search-results {
      position: absolute;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 100;
      width: 100%; /* Consider max-width if needed */
    }
    .search-result {
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.2s ease;
    }
    .search-result:hover { background: #f3f4f6; }
    .search-no-results {
      padding: 1rem;
      text-align: center;
      color: #6b7280;
    }
    .warning { color: #f59e0b; }
    .positive { color: #10b981; } /* Green */
    .negative { color: #ef4444; } /* Red */

    /* Data Quality Indicators Styles */
    .data-quality-panel {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .data-quality-panel h4 {
      margin-bottom: 1rem;
      color: #1f2937;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
    }
    .data-quality-panel h4 svg { margin-right: 0.5rem; }
    .quality-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .quality-card {
      background: white;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      text-align: center;
    }
    .quality-label {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .quality-value {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      line-height: 1;
    }
    .quality-value.good { color: #10b981; } /* Green */
    .quality-value.warning { color: #f59e0b; } /* Orange */
    .quality-value.poor { color: #ef4444; } /* Red */
    .quality-detail {
      font-size: 0.85rem;
      color: #6b7280;
    }

    /* Pack Size Chart Styles */
    #packSizeChart { /* Ensure canvas has a defined size or container does */ }

    /* Vendor Diversification Chart Styles */
    #vendorDiversificationChart { /* Ensure canvas has a defined size or container does */ }

    /* Product Table Filters */
    .filter-container {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-container label {
      font-weight: 500;
      color: #374151;
      margin-right: 0.5rem;
    }
    .filter-container select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5eb;
      border-radius: 4px;
      background-color: white;
      font-size: 0.9rem;
      min-width: 150px;
    }
    .filter-container button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .filter-container button:hover { background: #d1d5eb; }

    /* Drill-down Table Styles */
    .drill-down-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    .drill-down-table th, .drill-down-table td {
      padding: 0.75rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
    }
    .drill-down-table th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .drill-down-table td {
      color: #4b5563;
    }
    .drill-down-table td.number, .drill-down-table th.number { text-align: right; }

    /* Ensure charts have proper dimensions */
    .chart-container {
      position: relative;
      height: 300px; /* Default height, adjust as needed */
      width: 100%;
    }
    canvas { display: block; } /* Prevent extra space below canvas */
  `;
  document.head.appendChild(style);
})();

// Show brand details modal
function showBrandDetails(brand) {
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('productModalTitle');
  const modalBody = document.getElementById('productModalBody');

  if (!modal || !modalTitle || !modalBody) {
    console.warn('Brand details modal not found');
    return;
  }

  modalTitle.textContent = 'Brand Analysis: ' + brand.brand;

  let html = '<div class="brand-details">' +
    '<div class="detail-grid">' +
      '<div class="detail-card">' +
        '<h4>📊 Performance Metrics</h4>' +
        '<p><strong>Total Spend:</strong> $' + brand.totalSpend.toLocaleString() + '</p>' +
        '<p><strong>Product Count:</strong> ' + brand.productCount + '</p>' +
        '<p><strong>Category Coverage:</strong> ' + brand.categoryCount + '</p>' +
        '<p><strong>Vendor Count:</strong> ' + brand.vendorCount + '</p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>💰 Pricing Analysis</h4>' +
        '<p><strong>Average Price:</strong> $' + brand.avgPrice.toFixed(2) + '</p>' +
        '<p><strong>Price Range:</strong> $' + brand.priceRange.min.toFixed(2) + ' - $' + brand.priceRange.max.toFixed(2) + '</p>' +
        '<p><strong>Price Spread:</strong> $' + brand.priceSpread.toFixed(2) + '</p>' +
        '<p><strong>Competitiveness Index:</strong> ' + (brand.competitivenessIndex || 0).toFixed(1) + '</p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>🔄 Loyalty & Retention</h4>' +
        '<p><strong>Loyalty Rate:</strong> ' + (brand.loyaltyRate || 0).toFixed(1) + '%</p>' +
        '<p><strong>Repeat Purchases:</strong> ' + (brand.repeatPurchases || 0) + '</p>' +
        '<p><strong>Total Orders:</strong> ' + brand.invoiceCount + '</p>' +
      '</div>' +
      '<div class="detail-card">' +
        '<h4>📈 Market Position</h4>' +
        '<p><strong>Market Share:</strong> ' + (brand.marketShare || 0).toFixed(1) + '%</p>' +
        '<p><strong>Switching Rate:</strong> ' + (brand.switchingRate || 0).toFixed(1) + '%</p>' +
        '<p><strong>Growth Trend:</strong> <span class="' + (brand.growthTrend > 0 ? 'positive' : 'negative') + '">' +
          (brand.growthTrend > 0 ? '↑' : '↓') + ' ' + Math.abs(brand.growthTrend || 0).toFixed(1) + '%</span></p>' +
      '</div>' +
    '</div>';

  // Add brand switching patterns if available
  if (brand.switchingPatterns && brand.switchingPatterns.length > 0) {
    html += '<h4 class="mt-3">🔄 Brand Switching Patterns</h4>' +
      '<table class="data-table">' +
        '<thead><tr><th>From Brand</th><th>To Brand</th><th>Switch Count</th><th>% of Switches</th></tr></thead>' +
        '<tbody>';
    
    brand.switchingPatterns.forEach(function(pattern) {
      html += '<tr>' +
        '<td>' + pattern.fromBrand + '</td>' +
        '<td>' + pattern.toBrand + '</td>' +
        '<td>' + pattern.count + '</td>' +
        '<td>' + pattern.percentage.toFixed(1) + '%</td>' +
      '</tr>';
    });
    
    html += '</tbody></table>';
  }

  // Add products list
  html += '<h4 class="mt-3">📦 Products in Brand</h4>' +
    '<div style="max-height: 200px; overflow-y: auto;">' +
    '<ul style="columns: 2; column-gap: 1rem; list-style: disc; padding-left: 1.5rem;">';
  
  brand.products.forEach(function(product) {
    html += '<li style="margin-bottom: 0.25rem;">' + product + '</li>';
  });
  
  html += '</ul></div>';

  // Add time-series trend chart
  html += '<h4 class="mt-3">📈 Spend Trend Over Time</h4>' +
    '<div class="chart-container" style="height: 250px;">' +
      '<canvas id="brandTrendChart"></canvas>' +
    '</div>';

  html += '</div>';

  modalBody.innerHTML = html;
  modal.style.display = 'block';

  // Create trend chart
  setTimeout(function() {
    createBrandTrendChart(brand);
  }, 100);
}

// Brand Market Share Pie Chart
function createBrandMarketShareChart() {
  const ctx = document.getElementById('brandMarketShareChart');
  if (!ctx || !productAnalyticsData || !productAnalyticsData.brandAnalysis) return;

  const brands = Object.values(productAnalyticsData.brandAnalysis)
    .sort(function(a, b) { return b.totalSpend - a.totalSpend; })
    .slice(0, 8);

  new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: brands.map(function(b) { return b.brand; }),
      datasets: [{
        data: brands.map(function(b) { return b.marketShare; }),
        backgroundColor: productColorSchemes.primary
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(event, elements) {
        if (elements.length > 0) {
          const index = elements[0].index;
          showBrandDetails(brands[index]);
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Market Share by Brand (Click for Details)'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed.toFixed(1) + '%';
            }
          }
        },
        legend: {
          position: 'right'
        }
      }
    }
  });
}

// Brand Summary Table
function createBrandSummaryTable() {
  const container = document.getElementById('brandSummaryTable');
  if (!container || !productAnalyticsData || !productAnalyticsData.brandAnalysis) return;

  const brands = Object.values(productAnalyticsData.brandAnalysis)
    .sort(function(a, b) { return b.totalSpend - a.totalSpend; })
    .slice(0, 10);

  let html = '<table class="data-table" style="font-size: 0.9rem;">' +
    '<thead>' +
      '<tr>' +
        '<th>Brand</th>' +
        '<th class="number">Market Share</th>' +
        '<th class="number">Loyalty</th>' +
        '<th class="number">Competitiveness</th>' +
        '<th>Action</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>';

  brands.forEach(function(brand) {
    const compColor = brand.competitivenessIndex < 100 ? 'positive' : brand.competitivenessIndex > 110 ? 'negative' : '';
    
    html += '<tr>' +
      '<td><strong>' + brand.brand + '</strong></td>' +
      '<td class="number">' + brand.marketShare.toFixed(1) + '%</td>' +
      '<td class="number ' + (brand.loyaltyRate > 20 ? 'positive' : '') + '">' + brand.loyaltyRate.toFixed(1) + '%</td>' +
      '<td class="number ' + compColor + '">' + brand.competitivenessIndex.toFixed(0) + '</td>' +
      '<td>' +
        '<button class="btn-small" onclick="showBrandDetails(' + JSON.stringify(brand).replace(/"/g, '&quot;') + ')">' +
          'Details' +
        '</button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Create brand time-series trend chart
function createBrandTrendChart(brand) {
  const canvas = document.getElementById('brandTrendChart');
  if (!canvas || !productAnalyticsData || !productAnalyticsData.rawData) return;

  const ctx = canvas.getContext('2d');
  
  // Get all invoices for this brand
  const brandInvoices = productAnalyticsData.rawData.filter(function(item) {
    return item.brand === brand.brand;
  });

  // Group by month
  const monthlyData = {};
  brandInvoices.forEach(function(item) {
    const month = item.invoiceDate.toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { spend: 0, qty: 0, count: 0 };
    }
    monthlyData[month].spend += item.extPrice;
    monthlyData[month].qty += item.qty;
    monthlyData[month].count += 1;
  });

  const labels = Object.keys(monthlyData).sort();
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Spend',
        data: labels.map(function(m) { return monthlyData[m].spend; }),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const month = labels[context.dataIndex];
              return [
                'Orders: ' + monthlyData[month].count,
                'Quantity: ' + monthlyData[month].qty
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) { return '$' + value.toLocaleString(); }
          }
        }
      }
    }
  });
}

// Export for use in main application
window.initializeProductAnalytics = initializeProductAnalytics;
window.showProductDetails = showProductDetails;
window.showProductDrillDown = showProductDrillDown;
window.showBrandDetails = showBrandDetails;