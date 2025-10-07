/**
 * Product Analytics Module for PFG Analytics Platform
 * Advanced product-level analysis and insights
 */

// Product performance analysis
function analyzeProductPerformance(data) {
  const productMetrics = {};
  
  // Group by product
  data.forEach(item => {
    const productKey = item.productDescription || 'Unknown';
    const productId = item.raw['Product #'];
    const gtin = item.raw['GTIN'];
    
    if (!productMetrics[productKey]) {
      productMetrics[productKey] = {
        productId,
        gtin,
        description: productKey,
        brand: item.brand,
        packSize: item.packSize,
        vendor: item.vendor,
        invoices: [],
        totalSpend: 0,
        totalQty: 0,
        avgPrice: 0,
        priceHistory: [],
        firstSeen: item.invoiceDate,
        lastSeen: item.invoiceDate,
        orderFrequency: new Set(),
        priceChanges: []
      };
    }
    
    const metric = productMetrics[productKey];
    metric.invoices.push({
      date: item.invoiceDate,
      price: item.unitPrice,
      qty: item.qty,
      extPrice: item.extPrice
    });
    metric.totalSpend += item.extPrice;
    metric.totalQty += item.qty;
    metric.priceHistory.push({
      date: item.invoiceDate,
      price: item.unitPrice
    });
    metric.orderFrequency.add(item.invoiceDate.toISOString().slice(0, 10));
    
    // Track first and last seen dates
    if (item.invoiceDate < metric.firstSeen) metric.firstSeen = item.invoiceDate;
    if (item.invoiceDate > metric.lastSeen) metric.lastSeen = item.invoiceDate;
  });
  
  // Calculate derived metrics
  Object.values(productMetrics).forEach(metric => {
    // Average price
    metric.avgPrice = metric.totalQty > 0 ? metric.totalSpend / metric.totalQty : 0;
    
    // Price volatility
    const prices = metric.priceHistory.map(p => p.price);
    metric.priceVolatility = calculateVolatility(prices);
    
    // Price changes
    metric.priceHistory.sort((a, b) => a.date - b.date);
    for (let i = 1; i < metric.priceHistory.length; i++) {
      const prevPrice = metric.priceHistory[i - 1].price;
      const currPrice = metric.priceHistory[i].price;
      if (Math.abs(currPrice - prevPrice) > 0.01) {
        metric.priceChanges.push({
          date: metric.priceHistory[i].date,
          oldPrice: prevPrice,
          newPrice: currPrice,
          change: currPrice - prevPrice,
          changePercent: prevPrice > 0 ? ((currPrice - prevPrice) / prevPrice) * 100 : 0
        });
      }
    }
    
    // Purchase frequency (days between orders)
    const orderDates = Array.from(metric.orderFrequency).sort();
    metric.avgDaysBetweenOrders = calculateAvgDaysBetween(orderDates);
    metric.orderCount = orderDates.length;
    
    // Product age
    metric.productAge = Math.floor((metric.lastSeen - metric.firstSeen) / (1000 * 60 * 60 * 24));
    
    // Activity status
    const daysSinceLastOrder = Math.floor((new Date() - metric.lastSeen) / (1000 * 60 * 60 * 24));
    metric.status = daysSinceLastOrder > 60 ? 'Inactive' : 
                   daysSinceLastOrder > 30 ? 'Slow Moving' : 'Active';
  });
  
  return productMetrics;
}

// ABC Analysis (Pareto Principle)
function performABCAnalysis(productMetrics) {
  // Convert to array and sort by spend
  const products = Object.entries(productMetrics)
    .map(([key, metric]) => ({
      product: key,
      ...metric
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);
  
  const totalSpend = products.reduce((sum, p) => sum + p.totalSpend, 0);
  let cumulativeSpend = 0;
  
  products.forEach(product => {
    cumulativeSpend += product.totalSpend;
    const cumulativePercent = totalSpend > 0 ? (cumulativeSpend / totalSpend) * 100 : 0;
    
    if (cumulativePercent <= 80) {
      product.abcCategory = 'A';
    } else if (cumulativePercent <= 95) {
      product.abcCategory = 'B';
    } else {
      product.abcCategory = 'C';
    }
    
    product.spendPercent = totalSpend > 0 ? (product.totalSpend / totalSpend) * 100 : 0;
    product.cumulativePercent = cumulativePercent;
  });
  
  return {
    products,
    summary: {
      aItems: products.filter(p => p.abcCategory === 'A').length,
      bItems: products.filter(p => p.abcCategory === 'B').length,
      cItems: products.filter(p => p.abcCategory === 'C').length,
      totalItems: products.length
    }
  };
}

// Brand Analysis with loyalty, competitiveness, and switching patterns
function analyzeBrands(data) {
  const brandMetrics = {};
  const totalSpend = data.reduce((sum, item) => sum + item.extPrice, 0);
  
  // Track customer purchase sequences for loyalty analysis
  const customerPurchases = {};
  
  data.forEach(item => {
    const brand = item.brand || 'Generic';
    const productKey = item.productDescription;
    const invoiceDate = item.invoiceDate.toISOString().slice(0, 10);
    
    if (!brandMetrics[brand]) {
      brandMetrics[brand] = {
        brand,
        products: new Set(),
        categories: new Set(),
        totalSpend: 0,
        totalQty: 0,
        invoiceCount: 0,
        avgPrice: 0,
        priceRange: { min: Infinity, max: -Infinity },
        vendors: new Set(),
        purchaseDates: [],
        repeatProducts: new Set(),
        categoryPrices: {} // Track prices by category for competitiveness
      };
    }
    
    const metric = brandMetrics[brand];
    metric.products.add(productKey);
    metric.categories.add(item.category);
    metric.totalSpend += item.extPrice;
    metric.totalQty += item.qty;
    metric.invoiceCount += 1;
    metric.vendors.add(item.vendor);
    metric.purchaseDates.push(invoiceDate);
    
    // Track price range
    if (item.unitPrice < metric.priceRange.min) metric.priceRange.min = item.unitPrice;
    if (item.unitPrice > metric.priceRange.max) metric.priceRange.max = item.unitPrice;
    
    // Track category prices for competitiveness index
    if (!metric.categoryPrices[item.category]) {
      metric.categoryPrices[item.category] = [];
    }
    metric.categoryPrices[item.category].push(item.unitPrice);
    
    // Track customer purchase sequences
    if (!customerPurchases[productKey]) {
      customerPurchases[productKey] = [];
    }
    customerPurchases[productKey].push({ brand, date: invoiceDate });
  });
  
  // Calculate brand switching patterns
  const brandSwitching = {};
  Object.keys(customerPurchases).forEach(product => {
    const purchases = customerPurchases[product].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < purchases.length; i++) {
      const fromBrand = purchases[i-1].brand;
      const toBrand = purchases[i].brand;
      if (fromBrand !== toBrand) {
        const key = `${fromBrand}→${toBrand}`;
        brandSwitching[key] = (brandSwitching[key] || 0) + 1;
      }
    }
  });
  
  // Calculate derived metrics
  Object.values(brandMetrics).forEach(metric => {
    metric.avgPrice = metric.totalQty > 0 ? metric.totalSpend / metric.totalQty : 0;
    metric.productCount = metric.products.size;
    metric.categoryCount = metric.categories.size;
    metric.vendorCount = metric.vendors.size;
    metric.priceSpread = metric.priceRange.max - metric.priceRange.min;
    metric.marketShare = totalSpend > 0 ? (metric.totalSpend / totalSpend) * 100 : 0;
    
    // Calculate loyalty rate (repeat purchases / total purchases)
    const uniqueDates = new Set(metric.purchaseDates);
    metric.repeatPurchases = metric.purchaseDates.length - uniqueDates.size;
    metric.loyaltyRate = metric.purchaseDates.length > 0 ? 
      (metric.repeatPurchases / metric.purchaseDates.length) * 100 : 0;
    
    // Calculate price competitiveness index
    // Lower index = more competitive (cheaper than average in same categories)
    let totalCompScore = 0;
    let catCount = 0;
    Object.keys(metric.categoryPrices).forEach(category => {
      const brandAvgPrice = average(metric.categoryPrices[category]);
      // Get all prices in this category across all brands
      const allCategoryPrices = data
        .filter(item => item.category === category)
        .map(item => item.unitPrice);
      const categoryAvgPrice = average(allCategoryPrices);
      
      if (categoryAvgPrice > 0) {
        // Score: <100 = cheaper than average, >100 = more expensive
        totalCompScore += (brandAvgPrice / categoryAvgPrice) * 100;
        catCount++;
      }
    });
    metric.competitivenessIndex = catCount > 0 ? totalCompScore / catCount : 100;
    
    // Calculate switching patterns for this brand
    metric.switchingPatterns = [];
    let totalSwitches = 0;
    Object.keys(brandSwitching).forEach(key => {
      if (key.startsWith(metric.brand + '→')) {
        const toBrand = key.split('→')[1];
        metric.switchingPatterns.push({
          fromBrand: metric.brand,
          toBrand: toBrand,
          count: brandSwitching[key]
        });
        totalSwitches += brandSwitching[key];
      }
    });
    
    // Calculate percentage for each switch
    metric.switchingPatterns.forEach(pattern => {
      pattern.percentage = totalSwitches > 0 ? (pattern.count / totalSwitches) * 100 : 0;
    });
    metric.switchingPatterns.sort((a, b) => b.count - a.count);
    metric.switchingRate = metric.invoiceCount > 0 ? (totalSwitches / metric.invoiceCount) * 100 : 0;
    
    // Calculate growth trend (comparing first half vs second half of purchase period)
    if (metric.purchaseDates.length > 3) {
      const sortedDates = metric.purchaseDates.sort();
      const midPoint = Math.floor(sortedDates.length / 2);
      const firstHalf = sortedDates.slice(0, midPoint).length;
      const secondHalf = sortedDates.slice(midPoint).length;
      metric.growthTrend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    } else {
      metric.growthTrend = 0;
    }
    
    // Convert Sets to Arrays for serialization
    metric.products = Array.from(metric.products);
    metric.categories = Array.from(metric.categories);
    metric.vendors = Array.from(metric.vendors);
    delete metric.categoryPrices; // Remove raw data
    delete metric.purchaseDates; // Remove raw data
  });
  
  return brandMetrics;
}

// Pack Size Analysis
function analyzePackSizes(data) {
  const packSizeMetrics = {};
  
  data.forEach(item => {
    const packSize = item.packSize || 'Unknown';
    const category = item.category;
    const key = `${category}|${packSize}`;
    
    if (!packSizeMetrics[key]) {
      packSizeMetrics[key] = {
        category,
        packSize,
        products: new Set(),
        totalSpend: 0,
        totalQty: 0,
        unitPrices: [],
        costPerUnit: []
      };
    }
    
    const metric = packSizeMetrics[key];
    metric.products.add(item.productDescription);
    metric.totalSpend += item.extPrice;
    metric.totalQty += item.qty;
    metric.unitPrices.push(item.unitPrice);
    
    // Calculate cost per unit if pack size contains quantity
    const packQty = extractPackQuantity(packSize);
    if (packQty > 0) {
      metric.costPerUnit.push(item.unitPrice / packQty);
    }
  });
  
  // Calculate optimization metrics
  Object.values(packSizeMetrics).forEach(metric => {
    metric.avgUnitPrice = average(metric.unitPrices);
    metric.avgCostPerUnit = average(metric.costPerUnit);
    metric.productCount = metric.products.size;
    metric.efficiency = metric.avgCostPerUnit > 0 ? 
      1 / metric.avgCostPerUnit : 0; // Higher is better
    
    // Convert Set to Array
    metric.products = Array.from(metric.products);
  });
  
  return packSizeMetrics;
}

// Product Substitution Analysis
function findSubstitutionOpportunities(productMetrics) {
  const substitutions = [];
  const products = Object.entries(productMetrics);
  
  // Group products by category and similar descriptions
  const categoryGroups = {};
  products.forEach(([key, metric]) => {
    const baseDesc = normalizeProductDescription(metric.description);
    const firstInvoice = metric.invoices[0];
    const category = firstInvoice ? firstInvoice.category : 'Unknown';
    const groupKey = `${category}|${baseDesc}`;
    
    if (!categoryGroups[groupKey]) {
      categoryGroups[groupKey] = [];
    }
    categoryGroups[groupKey].push({ key, ...metric });
  });
  
  // Find substitution opportunities within groups
  Object.values(categoryGroups).forEach(group => {
    if (group.length > 1) {
      // Sort by average price
      group.sort((a, b) => a.avgPrice - b.avgPrice);
      
      for (let i = 1; i < group.length; i++) {
        const cheaper = group[0];
        const current = group[i];
        const savings = current.avgPrice - cheaper.avgPrice;
        const savingsPercent = current.avgPrice > 0 ? (savings / current.avgPrice) * 100 : 0;
        
        if (savingsPercent > 5) { // Only suggest if >5% savings
          substitutions.push({
            currentProduct: current.description,
            currentBrand: current.brand,
            currentPrice: current.avgPrice,
            suggestedProduct: cheaper.description,
            suggestedBrand: cheaper.brand,
            suggestedPrice: cheaper.avgPrice,
            potentialSavings: savings,
            savingsPercent,
            annualSavings: savings * (current.totalQty / 12) * 12 // Projected annual
          });
        }
      }
    }
  });
  
  return substitutions.sort((a, b) => b.annualSavings - a.annualSavings);
}

// Seasonal Pattern Detection
function detectSeasonalPatterns(data) {
  const monthlyPatterns = {};
  
  data.forEach(item => {
    const month = item.invoiceDate.getMonth();
    const product = item.productDescription;
    const key = `${product}|${month}`;
    
    if (!monthlyPatterns[key]) {
      monthlyPatterns[key] = {
        product,
        month,
        totalQty: 0,
        orderCount: 0,
        totalSpend: 0
      };
    }
    
    monthlyPatterns[key].totalQty += item.qty;
    monthlyPatterns[key].orderCount += 1;
    monthlyPatterns[key].totalSpend += item.extPrice;
  });
  
  // Analyze patterns
  const productSeasonality = {};
  Object.values(monthlyPatterns).forEach(pattern => {
    if (!productSeasonality[pattern.product]) {
      productSeasonality[pattern.product] = {
        product: pattern.product,
        monthlyData: new Array(12).fill(null).map(() => ({
          qty: 0,
          orders: 0,
          spend: 0
        }))
      };
    }
    
    const monthData = productSeasonality[pattern.product].monthlyData[pattern.month];
    monthData.qty += pattern.totalQty;
    monthData.orders += pattern.orderCount;
    monthData.spend += pattern.totalSpend;
  });
  
  // Calculate seasonality score
  Object.values(productSeasonality).forEach(product => {
    const avgMonthlyQty = product.monthlyData.reduce((sum, m) => sum + m.qty, 0) / 12;
    const variance = product.monthlyData.reduce((sum, m) => 
      sum + Math.pow(m.qty - avgMonthlyQty, 2), 0) / 12;
    
    product.seasonalityScore = Math.sqrt(variance) / (avgMonthlyQty || 1);
    product.peakMonths = product.monthlyData
      .map((data, idx) => ({ month: idx, qty: data.qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3)
      .map(m => m.month);
  });
  
  return productSeasonality;
}

// Product Lifecycle Analysis
function analyzeProductLifecycle(productMetrics) {
  const lifecycle = {
    newProducts: [],      // First seen in last 30 days
    growingProducts: [],  // Increasing order frequency
    matureProducts: [],   // Stable ordering
    decliningProducts: [], // Decreasing frequency
    discontinuedRisk: []  // Not ordered in 30+ days
  };
  
  const now = new Date();
  
  Object.entries(productMetrics).forEach(([key, metric]) => {
    const daysSinceFirst = (now - metric.firstSeen) / (1000 * 60 * 60 * 24);
    const daysSinceLast = (now - metric.lastSeen) / (1000 * 60 * 60 * 24);
    
    // Categorize products
    if (daysSinceFirst <= 30) {
      lifecycle.newProducts.push({
        product: key,
        ...metric,
        daysSinceIntroduction: Math.floor(daysSinceFirst)
      });
    } else if (daysSinceLast > 30) {
      lifecycle.discontinuedRisk.push({
        product: key,
        ...metric,
        daysSinceLastOrder: Math.floor(daysSinceLast)
      });
    } else {
    // Analyze patterns
    const orders = metric.invoices.sort((a, b) => a.date - b.date);
    const firstHalf = orders.slice(0, Math.floor(orders.length / 2));
    const secondHalf = orders.slice(Math.floor(orders.length / 2));
    
    const firstHalfFreq = calculateOrderFrequency(firstHalf);
    const secondHalfFreq = calculateOrderFrequency(secondHalf);
      
      const freqChange = firstHalfFreq > 0 ? ((secondHalfFreq - firstHalfFreq) / firstHalfFreq) * 100 : 0;
      
      if (freqChange > 20) {
        lifecycle.growingProducts.push({
          product: key,
          ...metric,
          frequencyChange: freqChange
        });
      } else if (freqChange < -20) {
        lifecycle.decliningProducts.push({
          product: key,
          ...metric,
          frequencyChange: freqChange
        });
      } else {
        lifecycle.matureProducts.push({
          product: key,
          ...metric,
          frequencyChange: freqChange
        });
      }
    }
  });
  
  return lifecycle;
}

// Create product trend chart
function createProductTrendChart(productData, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn('Product trend chart canvas not found:', canvasId);
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Prepare time series data
  const timeSeriesData = {};
  productData.invoices.forEach(invoice => {
    const month = invoice.date.toISOString().slice(0, 7);
    if (!timeSeriesData[month]) {
      timeSeriesData[month] = {
        totalQty: 0,
        totalSpend: 0,
        avgPrice: 0,
        count: 0
      };
    }
    timeSeriesData[month].totalQty += invoice.qty;
    timeSeriesData[month].totalSpend += invoice.extPrice;
    timeSeriesData[month].count += 1;
  });
  
  // Calculate averages
  Object.values(timeSeriesData).forEach(month => {
    month.avgPrice = month.totalQty > 0 ? month.totalSpend / month.totalQty : 0;
  });
  
  const labels = Object.keys(timeSeriesData).sort();
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Quantity Ordered',
        data: labels.map(m => timeSeriesData[m].totalQty),
        borderColor: 'rgba(37, 99, 235, 0.8)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        yAxisID: 'y-qty',
        tension: 0.1
      }, {
        label: 'Average Unit Price',
        data: labels.map(m => timeSeriesData[m].avgPrice),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        yAxisID: 'y-price',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: `Product Trend: ${productData.description}`
        }
      },
      scales: {
        'y-qty': {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Quantity'
          }
        },
        'y-price': {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Unit Price ($)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Utility Functions
function calculateVolatility(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  if (mean === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateAvgDaysBetween(dates) {
  if (dates.length < 2) return 0;
  let totalDays = 0;
  for (let i = 1; i < dates.length; i++) {
    const days = (new Date(dates[i]) - new Date(dates[i-1])) / (1000 * 60 * 60 * 24);
    totalDays += days;
  }
  return totalDays / (dates.length - 1);
}

function extractPackQuantity(packSize) {
  // Extract quantity from pack sizes like "6/1 GA", "24/12 OZ", etc.
  const match = packSize.match(/(\d+)\//);
  return match ? parseInt(match[1]) : 0;
}

function normalizeProductDescription(desc) {
  // Normalize product descriptions for comparison
  return desc.toLowerCase()
    .replace(/\d+/g, '')  // Remove numbers
    .replace(/[^\w\s]/g, '') // Remove special characters
    .split(' ')
    .filter(word => word.length > 2) // Remove short words
    .slice(0, 3) // Take first 3 significant words
    .join(' ');
}

function calculateOrderFrequency(orders) {
  if (orders.length < 2) return 0;
  const firstDate = orders[0].date;
  const lastDate = orders[orders.length - 1].date;
  const daySpan = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  return orders.length / (daySpan || 1) * 30; // Orders per 30 days
}

// Export functions for use in main application
window.ProductAnalytics = {
  analyzeProductPerformance,
  performABCAnalysis,
  analyzeBrands,
  analyzePackSizes,
  findSubstitutionOpportunities,
  detectSeasonalPatterns,
  analyzeProductLifecycle,
  createProductTrendChart
};