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
    lifecycle: lifecycle
  };
  
  // Create all product charts
  createABCChart();
  createBrandPerformanceChart();
  createProductLifecycleChart();
  createTopProductsTable();
  createSubstitutionTable();
  createBrandComparisonChart();
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
  
  new Chart(ctx.getContext('2d'), {
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

// Brand Performance Chart
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
  
  new Chart(ctx.getContext('2d'), {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Brand Performance',
        data: brands.map(function(brand) {
          return {
            x: brand.avgPrice,
            y: brand.totalSpend,
            r: Math.sqrt(brand.productCount) * 5,
            brand: brand.brand,
            products: brand.productCount
          };
        }),
        backgroundColor: 'rgba(220, 38, 38, 0.6)',
        borderColor: 'rgba(220, 38, 38, 0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Brand Performance Analysis'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const point = context.raw;
              return [
                'Brand: ' + point.brand,
                'Avg Price: $' + point.x.toFixed(2),
                'Total Spend: $' + point.y.toLocaleString(),
                'Products: ' + point.products
              ];
            }
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

// Brand Comparison Radar Chart
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
      labels: ['Total Spend', 'Product Variety', 'Avg Price', 'Category Coverage', 'Price Stability'],
      datasets: topBrands.map(function(brand, idx) {
        return {
          label: brand.brand,
          data: [
            (brand.totalSpend / maxSpend) * 100,
            (brand.productCount / maxProducts) * 100,
            (brand.avgPrice / maxPrice) * 100,
            (brand.categoryCount / maxCategories) * 100,
            100 - (brand.priceSpread / brand.avgPrice * 100) // Price stability
          ],
          borderColor: productColorSchemes.primary[idx],
          backgroundColor: productColorSchemes.primary[idx].replace('0.8', '0.2')
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Brand Comparison (Normalized Metrics)'
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

// Top Products Table
function createTopProductsTable() {
  const container = document.getElementById('topProductsTable');
  if (!container || !productAnalyticsData) return;
  
  const products = productAnalyticsData.abcAnalysis.products.slice(0, 15);
  
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
    const lastPriceChange = product.priceChanges[product.priceChanges.length - 1];
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
  
  if (!productData) return;
  
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('productModalTitle');
  const modalBody = document.getElementById('productModalBody');
  
  if (!modal || !modalTitle || !modalBody) {
    console.log('Product details:', productData);
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
    ProductAnalytics.createProductTrendChart(productData, 'productTrendChart');
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

// Add CSS for new elements
(function() {
  const style = document.createElement('style');
  style.textContent = '.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-bottom:2rem}.detail-card{background:#f9fafb;padding:1rem;border-radius:8px}.detail-card h4{margin-bottom:.5rem;color:#374151}.detail-card p{margin-bottom:.25rem}.badge{padding:.25rem .5rem;border-radius:4px;font-size:.75rem;font-weight:600}.badge-a{background:#fee2e2;color:#991b1b}.badge-b{background:#fef3c7;color:#92400e}.badge-c{background:#dbeafe;color:#1e40af}.btn-small{padding:.25rem .75rem;font-size:.875rem;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer}.btn-small:hover{background:#2563eb}.search-results{position:absolute;background:white;border:1px solid #e5e7eb;border-radius:4px;max-height:300px;overflow-y:auto;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:100;width:100%}.search-result{padding:.5rem 1rem;cursor:pointer;border-bottom:1px solid #f3f4f6}.search-result:hover{background:#f3f4f6}.search-no-results{padding:1rem;text-align:center;color:#6b7280}.warning{color:#f59e0b}';
  document.head.appendChild(style);
})();

// Export for use in main application
window.initializeProductAnalytics = initializeProductAnalytics;
window.showProductDetails = showProductDetails;