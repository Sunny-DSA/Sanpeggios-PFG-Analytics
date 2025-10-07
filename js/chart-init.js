/**
 * Enhanced Chart Initialization for PFG Analytics
 * Implements all visualizations from Sprints 1-4
 */

// Global variables
let analytics = null;
let charts = {};
let currentFilters = {
  category: 'all',
  vendor: 'all',
  startDate: null,
  endDate: null,
  volatilityWindow: 30
};

// Chart color schemes
const colorSchemes = {
  primary: [
    'rgba(220, 38, 38, 0.8)',   // red
    'rgba(37, 99, 235, 0.8)',   // blue
    'rgba(16, 185, 129, 0.8)',  // green
    'rgba(139, 92, 246, 0.8)',  // purple
    'rgba(249, 115, 22, 0.8)',  // orange
    'rgba(236, 72, 153, 0.8)',  // pink
    'rgba(14, 165, 233, 0.8)',  // sky
    'rgba(168, 85, 247, 0.8)'   // violet
  ],
  spike: {
    normal: 'rgba(37, 99, 235, 0.6)',
    up: 'rgba(220, 38, 38, 1)',
    down: 'rgba(16, 185, 129, 1)'
  }
};

// Initialize all charts on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize Store Data Manager
    StoreDataManager.init();
    
    // Initialize Store UI
    StoreUI.init();
    
    // Wait for all dependencies to load
    await waitForDependencies();
    
    // Load existing data from database
    console.log('Checking for existing data in database...');
    const loadResult = await StoreDataManager.loadFromDatabase();
    if (loadResult.success && loadResult.recordCount > 0) {
      console.log(`Loaded ${loadResult.recordCount} existing records from database`);
      
      // Check if we have any data to display after loading
      const currentStoreData = StoreDataManager.getCurrentStoreData();
      if (currentStoreData.data.length === 0) {
        console.log('No data available yet. Waiting for file uploads.');
        StoreUI.showEmptyStoreMessage('all');
        return;
      }
      
      // Load and analyze data
      await refreshAnalytics();
    } else {
      console.log('No existing data in database or load failed');
      
      // Still check if data is available (shouldn't be, but just in case)
      const currentStoreData = StoreDataManager.getCurrentStoreData();
      if (currentStoreData.data.length === 0) {
        console.log('No data available yet. Waiting for file uploads.');
        StoreUI.showEmptyStoreMessage('all');
        return;
      }
      
      // Load and analyze data if somehow available
      await refreshAnalytics();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize all charts
    await initializeAllCharts();
    
    // Initialize product analytics if available
    if (typeof initializeProductAnalytics === 'function') {
      await initializeProductAnalytics();
    } else {
      console.warn('Product analytics not available yet');
    }
    
    // Check for alerts
    checkAndDisplayAlerts();
    
  } catch (error) {
    console.error('Error initializing charts:', error);
    showError('Failed to initialize analytics: ' + error.message);
  }
});

// Wait for all required dependencies
async function waitForDependencies() {
  const maxWait = 5000; // 5 seconds
  const checkInterval = 100; // Check every 100ms
  let waited = 0;
  
  while (waited < maxWait) {
    // Check if all required functions are available
    if (typeof loadInvoiceData === 'function' &&
        typeof runFullAnalytics === 'function' &&
        typeof Chart !== 'undefined' &&
        typeof StoreDataManager !== 'undefined' &&
        typeof StoreUI !== 'undefined') {
      // Also check for optional dependencies
      if (typeof ProductAnalytics !== 'undefined') {
        console.log('All dependencies loaded including ProductAnalytics');
      }
      if (typeof initializeProductAnalytics === 'function') {
        console.log('Product charts module loaded');
      }
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  
  throw new Error('Dependencies failed to load in time');
}

// Refresh analytics with current filters
async function refreshAnalytics() {
  // Get current store data
  const storeData = StoreDataManager.getCurrentStoreData();
  
  if (!storeData || storeData.data.length === 0) {
    console.warn('No data available for current store');
    analytics = null;
    window.analytics = null;
    return;
  }
  
  // Get the current store ID, defaulting to 'all' if undefined
  const currentStoreId = StoreDataManager.currentStore || 'all';
  console.log(`Refreshing analytics with ${storeData.data.length} records for store: ${currentStoreId}`);
  
  const options = {
    volatilityWindow: currentFilters.volatilityWindow,
    filters: currentFilters
  };
  
  // Run analytics on store data
  analytics = await runFullAnalytics(storeData.data, options);
  
  // Make analytics globally accessible for other modules
  window.analytics = analytics;
  
  console.log(`Analytics complete - Total spend: $${analytics.summary.totalSpend.toLocaleString()}, Records: ${analytics.summary.totalRecords}`);
  
  // Update UI elements
  updateSummaryStats();
  updateFilterOptions();
}

// Initialize all chart visualizations
async function initializeAllCharts() {
  // Sprint 1: Price trend with spike annotations
  createPriceTrendChart();
  
  // Sprint 2: Volatility chart
  createVolatilityChart();
  
  // Sprint 2: Budget variance chart
  createBudgetVarianceChart();
  
  // Sprint 3: Supply concentration chart
  createSupplyConcentrationChart();
  
  // Sprint 3: Spend forecast chart
  createSpendForecastChart();
  
  // Sprint 4: Category performance heatmap
  createCategoryHeatmap();
}

// Sprint 1 & 2: Enhanced price trend chart with spikes
function createPriceTrendChart() {
  const ctx = document.getElementById('priceTrendChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart
  if (charts.priceTrend) charts.priceTrend.destroy();
  
  // Check for data
  if (!analytics || !analytics.data || analytics.data.length === 0) {
    showChartEmptyState(ctx, 'No data available for price trend chart');
    return;
  }
  
  // Aggregate data by month and category
  const monthlyData = {};
  analytics.data.forEach(item => {
    const month = item.invoiceDate.toISOString().slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = {};
    if (!monthlyData[month][item.category]) {
      monthlyData[month][item.category] = {
        prices: [],
        spikes: []
      };
    }
    monthlyData[month][item.category].prices.push(item.unitPrice);
    if (item.isSpike) {
      monthlyData[month][item.category].spikes.push({
        price: item.unitPrice,
        direction: item.spikeDirection
      });
    }
  });
  
  // Prepare chart data
  const labels = Object.keys(monthlyData).sort();
  const categories = [...new Set(analytics.data.map(d => d.category))].slice(0, 8); // Top 8
  
  const datasets = categories.map((cat, idx) => {
    const data = labels.map(month => {
      const catData = monthlyData[month] && monthlyData[month][cat];
      if (!catData || catData.prices.length === 0) return null;
      return catData.prices.reduce((a, b) => a + b, 0) / catData.prices.length;
    });
    
    // Mark spike points
    const pointBackgroundColors = labels.map(month => {
      const catData = monthlyData[month] && monthlyData[month][cat];
      if (!catData || catData.spikes.length === 0) return colorSchemes.primary[idx % colorSchemes.primary.length];
      const spike = catData.spikes[0];
      return colorSchemes.spike[spike.direction] || colorSchemes.spike.normal;
    });
    
    const pointRadii = labels.map(month => {
      const catData = monthlyData[month] && monthlyData[month][cat];
      return catData && catData.spikes.length > 0 ? 8 : 3;
    });
    
    return {
      label: cat,
      data,
      borderColor: colorSchemes.primary[idx % colorSchemes.primary.length],
      backgroundColor: colorSchemes.primary[idx % colorSchemes.primary.length],
      fill: false,
      borderWidth: 2,
      pointBackgroundColor: pointBackgroundColors,
      pointRadius: pointRadii,
      pointHoverRadius: 10,
      tension: 0.1
    };
  });
  
  charts.priceTrend = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Average Unit Price Trends with Spike Detection',
          font: { size: 16 }
        },
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const month = labels[context.dataIndex];
              const cat = context.dataset.label;
              const monthData = monthlyData[month];
              const spikes = monthData && monthData[cat] ? monthData[cat].spikes : [];
              if (spikes.length > 0) {
                return `⚠️ Price spike detected (${spikes[0].direction})`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Month' }
        },
        y: {
          title: { display: true, text: 'Average Unit Price ($)' },
          beginAtZero: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      }
    }
  });
}

// Sprint 2: Volatility chart
function createVolatilityChart() {
  const ctx = document.getElementById('volatilityChart')?.getContext('2d');
  if (!ctx) return;
  
  if (charts.volatility) charts.volatility.destroy();
  
  // Check for data
  if (!analytics || !analytics.data || analytics.data.length === 0) {
    showChartEmptyState(ctx, 'No data available for volatility chart');
    return;
  }
  
  // Calculate volatility by category over time
  const volatilityData = {};
  analytics.data.forEach(item => {
    const month = item.invoiceDate.toISOString().slice(0, 7);
    if (!volatilityData[month]) volatilityData[month] = {};
    if (!volatilityData[month][item.category]) {
      volatilityData[month][item.category] = [];
    }
    if (item.volatility !== null) {
      volatilityData[month][item.category].push(item.volatility);
    }
  });
  
  const labels = Object.keys(volatilityData).sort();
  const categories = [...new Set(analytics.data.map(d => d.category))].slice(0, 5);
  
  const datasets = categories.map((cat, idx) => ({
    label: cat,
    data: labels.map(month => {
      const catData = volatilityData[month] && volatilityData[month][cat];
      if (!catData || catData.length === 0) return null;
      return catData.reduce((a, b) => a + b, 0) / catData.length * 100; // Convert to percentage
    }),
    borderColor: colorSchemes.primary[idx],
    backgroundColor: colorSchemes.primary[idx].replace('0.8', '0.2'),
    fill: true
  }));
  
  charts.volatility = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Price Volatility (${currentFilters.volatilityWindow}-day CoV %)`,
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Coefficient of Variation (%)' },
          beginAtZero: true
        }
      }
    }
  });
}

// Sprint 2: Budget variance chart
function createBudgetVarianceChart() {
  const ctx = document.getElementById('budgetVarianceChart')?.getContext('2d');
  if (!ctx) return;
  
  if (charts.budgetVariance) charts.budgetVariance.destroy();
  
  // Check for data
  if (!analytics || !analytics.budgetVariance || Object.keys(analytics.budgetVariance).length === 0) {
    showChartEmptyState(ctx, 'No budget variance data available');
    return;
  }
  
  const variances = Object.entries(analytics.budgetVariance)
    .sort((a, b) => Math.abs(b[1].variancePercent) - Math.abs(a[1].variancePercent))
    .slice(0, 10);
  
  const labels = variances.map(([cat]) => cat);
  const data = variances.map(([, v]) => v.variancePercent);
  const colors = data.map(v => v > 0 ? 'rgba(220, 38, 38, 0.8)' : 'rgba(16, 185, 129, 0.8)');
  
  charts.budgetVariance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Budget Variance %',
        data,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Budget Variance by Category (Actual vs Projected)',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const variance = variances[context.dataIndex][1];
              return [
                `Actual: $${variance.actual.toLocaleString()}`,
                `Projected: $${variance.projected.toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Variance %' },
          ticks: {
            callback: value => value + '%'
          }
        }
      }
    }
  });
}

// Sprint 3: Supply concentration chart
function createSupplyConcentrationChart() {
  const ctx = document.getElementById('concentrationChart')?.getContext('2d');
  if (!ctx) return;
  
  if (charts.concentration) charts.concentration.destroy();
  
  // Check for data
  if (!analytics || !analytics.supplyConcentration || !analytics.supplyConcentration.vendors || analytics.supplyConcentration.vendors.length === 0) {
    showChartEmptyState(ctx, 'No vendor concentration data available');
    return;
  }
  
  const topVendors = analytics.supplyConcentration.vendors.slice(0, 10);
  
  charts.concentration = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: topVendors.map(v => v.vendor),
      datasets: [{
        data: topVendors.map(v => v.sharePercent),
        backgroundColor: colorSchemes.primary,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Vendor Concentration (HHI: ${analytics.supplyConcentration.hhi.toFixed(0)})`,
          font: { size: 16 }
        },
        legend: {
          position: 'right',
          labels: {
            generateLabels: (chart) => {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label}: ${data.datasets[0].data[i].toFixed(1)}%`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const vendor = topVendors[context.dataIndex];
              return [
                `${vendor.vendor}: ${vendor.sharePercent.toFixed(1)}%`,
                `Spend: $${vendor.spend.toLocaleString()}`,
                `Orders: ${vendor.orderCount}`
              ];
            }
          }
        }
      }
    }
  });
}

// Sprint 3: Spend forecast chart (using simple trend for now)
function createSpendForecastChart() {
  const ctx = document.getElementById('forecastChart')?.getContext('2d');
  if (!ctx) return;
  
  if (charts.forecast) charts.forecast.destroy();
  
  // Check for data
  if (!analytics || !analytics.forecastData || analytics.forecastData.length === 0) {
    showChartEmptyState(ctx, 'Insufficient data for spend forecast');
    return;
  }
  
  // Historical data
  const historicalData = analytics.forecastData;
  
  // Simple linear forecast for next 3 months
  const n = historicalData.length;
  const xSum = historicalData.reduce((sum, _, i) => sum + i, 0);
  const ySum = historicalData.reduce((sum, d) => sum + d.y, 0);
  const xySum = historicalData.reduce((sum, d, i) => sum + i * d.y, 0);
  const xxSum = historicalData.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;
  
  // Generate forecast
  const forecastMonths = 3;
  const lastDate = new Date(historicalData[n - 1].ds);
  const forecastData = [];
  
  for (let i = 1; i <= forecastMonths; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    forecastData.push({
      ds: forecastDate.toISOString().slice(0, 7) + '-01',
      y: intercept + slope * (n - 1 + i),
      forecast: true
    });
  }
  
  const allData = [...historicalData, ...forecastData];
  const labels = allData.map(d => d.ds.slice(0, 7));
  
  charts.forecast = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Historical Spend',
        data: allData.map(d => d.forecast ? null : d.y),
        borderColor: 'rgba(37, 99, 235, 0.8)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true
      }, {
        label: 'Forecast',
        data: allData.map(d => d.forecast ? d.y : null),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderDash: [5, 5],
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Spend with 3-Month Forecast',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Total Spend ($)' },
          ticks: {
            callback: value => '$' + value.toLocaleString()
          }
        }
      }
    }
  });
}

// Sprint 4: Category performance heatmap
function createCategoryHeatmap() {
  const ctx = document.getElementById('categoryHeatmap')?.getContext('2d');
  if (!ctx) return;
  
  if (charts.heatmap) charts.heatmap.destroy();
  
  // Check for data
  if (!analytics || !analytics.categoryPerformance || Object.keys(analytics.categoryPerformance).length === 0) {
    showChartEmptyState(ctx, 'No category performance data available');
    return;
  }
  
  // Prepare weekly data by category
  const weeklyData = {};
  analytics.data.forEach(item => {
    const week = getWeekNumber(item.invoiceDate);
    const weekKey = `${item.invoiceDate.getFullYear()}-W${week}`;
    
    if (!weeklyData[weekKey]) weeklyData[weekKey] = {};
    if (!weeklyData[weekKey][item.category]) {
      weeklyData[weekKey][item.category] = 0;
    }
    weeklyData[weekKey][item.category] += item.extPrice;
  });
  
  // Get last 12 weeks
  const weeks = Object.keys(weeklyData).sort().slice(-12);
  const categories = [...new Set(analytics.data.map(d => d.category))].slice(0, 8);
  
  // Create matrix data
  const matrixData = [];
  categories.forEach((cat, y) => {
    weeks.forEach((week, x) => {
      const value = weeklyData[week] && weeklyData[week][cat] ? weeklyData[week][cat] : 0;
      matrixData.push({
        x: week,
        y: cat,
        v: value
      });
    });
  });
  
  // Find max value for color scaling
  const maxValue = Math.max(...matrixData.map(d => d.v));
  
  charts.heatmap = new Chart(ctx, {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Weekly Spend',
        data: matrixData,
        backgroundColor: (ctx) => {
          const dataPoint = ctx.dataset.data[ctx.dataIndex];
          const value = dataPoint ? dataPoint.v : 0;
          const alpha = value / maxValue;
          return `rgba(220, 38, 38, ${alpha})`;
        },
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        width: ({ chart }) => {
          const area = chart.chartArea || { width: 400 };
          return area.width / weeks.length - 1;
        },
        height: ({ chart }) => {
          const area = chart.chartArea || { height: 400 };
          return area.height / categories.length - 1;
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Category Performance Heatmap (Weekly Spend)',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            title: () => '',
            label: (ctx) => {
              const data = ctx.dataset.data[ctx.dataIndex];
              return `${data.y} - ${data.x}: $${data.v.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: weeks,
          title: { display: true, text: 'Week' }
        },
        y: {
          type: 'category',
          labels: categories,
          title: { display: true, text: 'Category' }
        }
      }
    }
  });
}

// Event listeners setup
function setupEventListeners() {
  // Volatility window selector
  const volWindow = document.getElementById('volWindow');
  if (volWindow) {
    volWindow.addEventListener('change', async (e) => {
      setFiltersLoading(true);
      try {
        currentFilters.volatilityWindow = parseInt(e.target.value);
        await refreshAnalytics();
        createVolatilityChart();
        updateAlertThresholds();
      } finally {
        setFiltersLoading(false);
      }
    });
  }
  
  // Category filter
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', async (e) => {
      setFiltersLoading(true);
      try {
        currentFilters.category = e.target.value;
        await refreshAnalytics();
        await initializeAllCharts();
      } finally {
        setFiltersLoading(false);
      }
    });
  }
  
  // Date range
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  
  if (startDate) {
    startDate.addEventListener('change', async (e) => {
      const newStartDate = e.target.value;
      
      // Validate: start date should be before or equal to end date
      if (currentFilters.endDate && newStartDate > currentFilters.endDate) {
        showError('Start date must be before or equal to end date');
        e.target.value = currentFilters.startDate || '';
        return;
      }
      
      setFiltersLoading(true);
      try {
        currentFilters.startDate = newStartDate;
        await refreshAnalytics();
        await initializeAllCharts();
      } finally {
        setFiltersLoading(false);
      }
    });
  }
  
  if (endDate) {
    endDate.addEventListener('change', async (e) => {
      const newEndDate = e.target.value;
      
      // Validate: end date should be after or equal to start date
      if (currentFilters.startDate && newEndDate < currentFilters.startDate) {
        showError('End date must be after or equal to start date');
        e.target.value = currentFilters.endDate || '';
        return;
      }
      
      setFiltersLoading(true);
      try {
        currentFilters.endDate = newEndDate;
        await refreshAnalytics();
        await initializeAllCharts();
      } finally {
        setFiltersLoading(false);
      }
    });
  }
  
  // Export buttons
  const exportCsv = document.getElementById('exportCsv');
  if (exportCsv) {
    exportCsv.addEventListener('click', () => exportDataAsCSV());
  }
  
  // Alert settings
  const saveSettings = document.getElementById('saveSettings');
  if (saveSettings) {
    saveSettings.addEventListener('click', saveAlertSettings);
  }
  
  // Chart click handlers for drill-down
  if (charts.priceTrend && charts.priceTrend.canvas) {
    charts.priceTrend.canvas.onclick = (evt) => handleChartClick(evt, charts.priceTrend);
  }
}

// Update filter options based on data
function updateFilterOptions() {
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter && analytics) {
    const categories = [...new Set(analytics.data.map(d => d.category))].sort();
    
    // Clear existing options except 'all'
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }
    
    // Add category options
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
  }
}

// Update summary statistics
function updateSummaryStats() {
  if (!analytics) return;
  
  const updateElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  updateElement('totalSpend', '$' + analytics.summary.totalSpend.toLocaleString());
  updateElement('totalRecords', analytics.summary.totalRecords.toLocaleString());
  updateElement('uniqueCategories', analytics.summary.uniqueCategories);
  updateElement('uniqueVendors', analytics.summary.uniqueVendors);
  updateElement('spikeCount', analytics.summary.spikeCount);
  updateElement('dateRange', 
    `${analytics.summary.dateRange.start.toLocaleDateString()} - ${analytics.summary.dateRange.end.toLocaleDateString()}`
  );
}

// Alert handling
function checkAndDisplayAlerts() {
  const alerts = AlertConfig.checkAlerts(analytics);
  const alertContainer = document.getElementById('alertContainer');
  
  if (!alertContainer) return;
  
  alertContainer.innerHTML = '';
  
  if (alerts.length === 0) {
    alertContainer.innerHTML = '<div class="alert-info">No alerts at this time</div>';
    return;
  }
  
  alerts.forEach(alert => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${alert.severity}`;
    alertDiv.innerHTML = `
      <strong>${alert.type.toUpperCase()}:</strong> ${alert.message}
      <button class="alert-dismiss" onclick="this.parentElement.remove()">×</button>
    `;
    alertContainer.appendChild(alertDiv);
  });
}

// Save alert settings
function saveAlertSettings() {
  const threshZ = document.getElementById('threshZ');
  const threshVar = document.getElementById('threshVar');
  const threshConc = document.getElementById('threshConc');
  const emailEnabled = document.getElementById('emailEnabled');
  const emailRecipients = document.getElementById('emailRecipients');
  
  const config = {
    spikeZThreshold: threshZ ? parseFloat(threshZ.value) : 2,
    budgetVarianceThreshold: threshVar ? parseFloat(threshVar.value) : 10,
    concentrationThreshold: threshConc ? parseFloat(threshConc.value) : 40,
    emailEnabled: emailEnabled ? emailEnabled.checked : false,
    emailRecipients: emailRecipients ? emailRecipients.value.split(',').map(e => e.trim()) : []
  };
  
  AlertConfig.save(config);
  checkAndDisplayAlerts();
  showSuccess('Alert settings saved successfully');
}

// Export functionality
function exportDataAsCSV() {
  if (!analytics) return;
  
  const csv = exportToCSV(analytics.data, true);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pfg-analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Drill-down functionality
function handleChartClick(evt, chart) {
  const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
  
  if (points.length === 0) return;
  
  const point = points[0];
  const label = chart.data.labels[point.index];
  const dataset = chart.data.datasets[point.datasetIndex];
  const category = dataset.label;
  
  // Filter data for drill-down
  const filteredData = analytics.data.filter(item => {
    const itemMonth = item.invoiceDate.toISOString().slice(0, 7);
    return itemMonth === label && item.category === category;
  });
  
  // Display in modal or table
  displayDrillDownData(filteredData, `${category} - ${label}`);
}

// Display drill-down data
function displayDrillDownData(data, title) {
  const modal = document.getElementById('drillDownModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalTitle || !modalBody) {
    console.log('Drill-down data:', data);
    return;
  }
  
  modalTitle.textContent = title;
  
  // Create table
  const table = document.createElement('table');
  table.className = 'drill-down-table';
  
  // Headers
  const headers = ['Date', 'Product', 'Vendor', 'Qty', 'Unit Price', 'Ext Price'];
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Body
  const tbody = document.createElement('tbody');
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.invoiceDate.toLocaleDateString()}</td>
      <td>${item.productDescription}</td>
      <td>${item.vendor}</td>
      <td>${item.qty}</td>
      <td>$${item.unitPrice.toFixed(2)}</td>
      <td>$${item.extPrice.toFixed(2)}</td>
    `;
    if (item.isSpike) row.classList.add('spike-row');
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  modalBody.innerHTML = '';
  modalBody.appendChild(table);
  
  // Show modal
  modal.style.display = 'block';
}

// Show empty state message on canvas
function showChartEmptyState(ctx, message) {
  // Clear the canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Draw message
  ctx.save();
  ctx.fillStyle = '#6B7280';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
  
  // Draw icon
  ctx.font = '48px system-ui, -apple-system, sans-serif';
  ctx.fillText('📊', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
  ctx.restore();
}

// Set loading state for filter controls
function setFiltersLoading(isLoading) {
  const filterControls = [
    'volWindow',
    'categoryFilter',
    'startDate',
    'endDate'
  ];
  
  filterControls.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = isLoading;
      if (isLoading) {
        element.style.opacity = '0.6';
        element.style.cursor = 'wait';
      } else {
        element.style.opacity = '1';
        element.style.cursor = '';
      }
    }
  });
}

// Utility functions
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}