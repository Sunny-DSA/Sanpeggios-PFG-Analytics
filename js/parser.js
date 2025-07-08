/**
 * Enhanced PFG Invoice Data Parser with Sprint 2-4 Features
 * Includes volatility metrics, budget variance, and forecasting prep
 */

// Main data loading function
function loadInvoiceData(filePath) {
  return new Promise((resolve, reject) => {
    Papa.parse(filePath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data.map(row => {
          const qty = parseFloat(row['Qty Shipped']) || 0;
          const ext = parseFloat(row['Ext. Price']) || 0;
          let unit = parseFloat(row['Unit Price']);
          
          // Compute unit price if missing
          if (!unit || unit <= 0) {
            unit = qty > 0 ? ext / qty : 0;
          }
          
          return {
            invoiceDate: new Date(row['Invoice Date']),
            invoiceNumber: row['Invoice Number'],
            category: (row['Product Class Description'] || row['Category/Class'] || '').trim(),
            productDescription: row['Product Description'],
            brand: row['Brand'],
            vendor: row['Manufacturer Name'],
            unitPrice: unit,
            extPrice: ext,
            qty: qty,
            qtyOrdered: parseFloat(row['Qty Ordered']) || 0,
            weight: row['Weight'],
            packSize: row['Pack Size'],
            customerName: row['Customer Name'],
            raw: row
          };
        });
        resolve(data);
      },
      error: (err) => reject(err)
    });
  });
}

// Sprint 2: Rolling statistics for volatility analysis
function rollingStats(data, windowDays = 30) {
  // Sort by date
  const sorted = [...data].sort((a, b) => a.invoiceDate - b.invoiceDate);
  
  return sorted.map((item, idx) => {
    const windowStart = new Date(item.invoiceDate);
    windowStart.setDate(windowStart.getDate() - windowDays);
    
    // Get items within window
    const windowData = sorted.filter(d => 
      d.invoiceDate >= windowStart && 
      d.invoiceDate <= item.invoiceDate &&
      d.category === item.category
    );
    
    if (windowData.length === 0) return { ...item, volatility: null };
    
    const prices = windowData.map(d => d.unitPrice);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cov = mean > 0 ? stdDev / mean : 0;
    
    return {
      ...item,
      rollingMean: mean,
      rollingStdDev: stdDev,
      volatility: cov,
      zScore: mean > 0 ? (item.unitPrice - mean) / stdDev : 0
    };
  });
}

// Sprint 2: Spike detection based on z-score
function detectSpikes(data, zThreshold = 2) {
  return data.map(item => ({
    ...item,
    isSpike: Math.abs(item.zScore || 0) > zThreshold,
    spikeDirection: item.zScore > zThreshold ? 'up' : item.zScore < -zThreshold ? 'down' : null
  }));
}

// Sprint 2: Budget variance calculation
function calculateBudgetVariance(data, budgetData = {}) {
  // Group by category and month
  const actualByCategory = {};
  const monthlyActual = {};
  
  data.forEach(item => {
    const month = item.invoiceDate.toISOString().slice(0, 7);
    const cat = item.category;
    
    // Category totals
    if (!actualByCategory[cat]) actualByCategory[cat] = 0;
    actualByCategory[cat] += item.extPrice;
    
    // Monthly category totals
    if (!monthlyActual[month]) monthlyActual[month] = {};
    if (!monthlyActual[month][cat]) monthlyActual[month][cat] = 0;
    monthlyActual[month][cat] += item.extPrice;
  });
  
  // Calculate projected (3-month rolling average)
  const months = Object.keys(monthlyActual).sort();
  const projectedByCategory = {};
  
  Object.keys(actualByCategory).forEach(cat => {
    const last3Months = months.slice(-3);
    const avgMonthly = last3Months.reduce((sum, month) => 
      sum + (monthlyActual[month][cat] || 0), 0) / 3;
    projectedByCategory[cat] = avgMonthly * months.length;
  });
  
  // Calculate variance
  const variance = {};
  Object.keys(actualByCategory).forEach(cat => {
    const actual = actualByCategory[cat];
    const projected = projectedByCategory[cat] || actual;
    variance[cat] = {
      actual,
      projected,
      variance: actual - projected,
      variancePercent: projected > 0 ? ((actual - projected) / projected) * 100 : 0
    };
  });
  
  return variance;
}

// Sprint 3: Supply concentration analysis
function analyzeSupplyConcentration(data) {
  // Group by vendor
  const vendorSpend = {};
  const vendorOrders = {};
  
  data.forEach(item => {
    const vendor = item.vendor || 'Unknown';
    if (!vendorSpend[vendor]) {
      vendorSpend[vendor] = 0;
      vendorOrders[vendor] = new Set();
    }
    vendorSpend[vendor] += item.extPrice;
    vendorOrders[vendor].add(item.invoiceNumber);
  });
  
  // Calculate total spend
  const totalSpend = Object.values(vendorSpend).reduce((a, b) => a + b, 0);
  
  // Sort vendors by spend
  const vendors = Object.entries(vendorSpend)
    .map(([vendor, spend]) => ({
      vendor,
      spend,
      orderCount: vendorOrders[vendor].size,
      sharePercent: (spend / totalSpend) * 100
    }))
    .sort((a, b) => b.spend - a.spend);
  
  // Calculate HHI (Herfindahl-Hirschman Index)
  const hhi = vendors.reduce((sum, v) => sum + Math.pow(v.sharePercent, 2), 0);
  
  // Top vendor concentration
  const top5Share = vendors.slice(0, 5).reduce((sum, v) => sum + v.sharePercent, 0);
  const top10Share = vendors.slice(0, 10).reduce((sum, v) => sum + v.sharePercent, 0);
  
  return {
    vendors,
    totalVendors: vendors.length,
    hhi,
    top5Share,
    top10Share,
    concentrationRisk: hhi > 2500 ? 'High' : hhi > 1500 ? 'Moderate' : 'Low'
  };
}

// Sprint 3: Prepare data for forecasting
function prepareForecastData(data) {
  // Aggregate by month for time series
  const monthly = {};
  
  data.forEach(item => {
    const month = item.invoiceDate.toISOString().slice(0, 7);
    if (!monthly[month]) {
      monthly[month] = {
        totalSpend: 0,
        avgUnitPrice: { sum: 0, count: 0 },
        categories: {}
      };
    }
    
    monthly[month].totalSpend += item.extPrice;
    monthly[month].avgUnitPrice.sum += item.unitPrice;
    monthly[month].avgUnitPrice.count += 1;
    
    // Category breakdown
    if (!monthly[month].categories[item.category]) {
      monthly[month].categories[item.category] = {
        spend: 0,
        avgPrice: { sum: 0, count: 0 }
      };
    }
    monthly[month].categories[item.category].spend += item.extPrice;
    monthly[month].categories[item.category].avgPrice.sum += item.unitPrice;
    monthly[month].categories[item.category].avgPrice.count += 1;
  });
  
  // Convert to array format for Prophet/forecasting
  const timeSeriesData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      ds: month + '-01', // Prophet expects 'ds' column
      y: data.totalSpend, // Prophet expects 'y' column
      avgPrice: data.avgUnitPrice.sum / data.avgUnitPrice.count,
      categories: Object.entries(data.categories).map(([cat, info]) => ({
        category: cat,
        spend: info.spend,
        avgPrice: info.avgPrice.sum / info.avgPrice.count
      }))
    }));
  
  return timeSeriesData;
}

// Sprint 4: Advanced filtering and drill-down
function filterData(data, filters = {}) {
  return data.filter(item => {
    // Date range filter
    if (filters.startDate && item.invoiceDate < new Date(filters.startDate)) return false;
    if (filters.endDate && item.invoiceDate > new Date(filters.endDate)) return false;
    
    // Category filter
    if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
    
    // Vendor filter
    if (filters.vendor && filters.vendor !== 'all' && item.vendor !== filters.vendor) return false;
    
    // Price range filter
    if (filters.minPrice && item.unitPrice < filters.minPrice) return false;
    if (filters.maxPrice && item.unitPrice > filters.maxPrice) return false;
    
    // Spike filter
    if (filters.spikesOnly && !item.isSpike) return false;
    
    return true;
  });
}

// Export data for CSV download
function exportToCSV(data, includeAnalytics = false) {
  const headers = includeAnalytics ? 
    Object.keys(data[0]).filter(k => k !== 'raw') :
    Object.keys(data[0].raw || {});
  
  const rows = data.map(item => {
    const row = includeAnalytics ? 
      { ...item, raw: undefined } : 
      item.raw;
    return headers.map(h => row[h] || '').join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Alert configuration management
const AlertConfig = {
  defaults: {
    spikeZThreshold: 2,
    budgetVarianceThreshold: 10,
    concentrationThreshold: 40,
    emailEnabled: false,
    emailRecipients: []
  },
  
  load() {
    const saved = localStorage.getItem('pfgAlertConfig');
    return saved ? { ...this.defaults, ...JSON.parse(saved) } : this.defaults;
  },
  
  save(config) {
    localStorage.setItem('pfgAlertConfig', JSON.stringify(config));
  },
  
  checkAlerts(analytics) {
    const config = this.load();
    const alerts = [];
    
    // Check spike alerts
    const spikes = analytics.data.filter(item => 
      Math.abs(item.zScore || 0) > config.spikeZThreshold
    );
    if (spikes.length > 0) {
      alerts.push({
        type: 'spike',
        severity: 'warning',
        message: `${spikes.length} price spikes detected`,
        details: spikes
      });
    }
    
    // Check budget variance
    Object.entries(analytics.budgetVariance).forEach(([cat, variance]) => {
      if (Math.abs(variance.variancePercent) > config.budgetVarianceThreshold) {
        alerts.push({
          type: 'budget',
          severity: variance.variancePercent > 0 ? 'warning' : 'info',
          message: `${cat}: ${variance.variancePercent.toFixed(1)}% budget variance`,
          details: variance
        });
      }
    });
    
    // Check concentration risk
    if (analytics.supplyConcentration.top5Share > config.concentrationThreshold) {
      alerts.push({
        type: 'concentration',
        severity: 'warning',
        message: `High vendor concentration: Top 5 vendors = ${analytics.supplyConcentration.top5Share.toFixed(1)}%`,
        details: analytics.supplyConcentration
      });
    }
    
    return alerts;
  }
};

// Master analytics function that combines all features
async function runFullAnalytics(data, options = {}) {
  const {
    volatilityWindow = 30,
    spikeThreshold = 2,
    filters = {}
  } = options;
  
  // Check if data is already parsed or needs parsing
  let parsedData = data;
  if (data.length > 0 && typeof data[0].invoiceDate === 'undefined') {
    // Data needs to be parsed from raw CSV format
    parsedData = data.map(row => {
      const qty = parseFloat(row['Qty Shipped']) || 0;
      const ext = parseFloat(row['Ext. Price']) || 0;
      let unit = parseFloat(row['Unit Price']);
      
      if (!unit || unit <= 0) {
        unit = qty > 0 ? ext / qty : 0;
      }
      
      return {
        invoiceDate: new Date(row['Invoice Date']),
        invoiceNumber: row['Invoice Number'],
        category: (row['Product Class Description'] || row['Category/Class'] || '').trim(),
        productDescription: row['Product Description'],
        brand: row['Brand'],
        vendor: row['Manufacturer Name'],
        unitPrice: unit,
        extPrice: ext,
        qty: qty,
        qtyOrdered: parseFloat(row['Qty Ordered']) || 0,
        weight: row['Weight'],
        packSize: row['Pack Size'],
        customerName: row['Customer Name'],
        raw: row
      };
    });
  }
  
  // Apply filters
  let filteredData = filterData(parsedData, filters);
  
  // Calculate rolling statistics
  filteredData = rollingStats(filteredData, volatilityWindow);
  
  // Detect spikes
  filteredData = detectSpikes(filteredData, spikeThreshold);
  
  // Calculate budget variance
  const budgetVariance = calculateBudgetVariance(filteredData);
  
  // Analyze supply concentration
  const supplyConcentration = analyzeSupplyConcentration(filteredData);
  
  // Prepare forecast data
  const forecastData = prepareForecastData(filteredData);
  
  return {
    data: filteredData,
    budgetVariance,
    supplyConcentration,
    forecastData,
    summary: {
      totalRecords: filteredData.length,
      dateRange: {
        start: new Date(Math.min(...filteredData.map(d => d.invoiceDate))),
        end: new Date(Math.max(...filteredData.map(d => d.invoiceDate)))
      },
      totalSpend: filteredData.reduce((sum, d) => sum + d.extPrice, 0),
      uniqueCategories: [...new Set(filteredData.map(d => d.category))].length,
      uniqueVendors: [...new Set(filteredData.map(d => d.vendor))].length,
      spikeCount: filteredData.filter(d => d.isSpike).length
    }
  };
}