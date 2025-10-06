/**
 * Store Management Module for Multi-Location Analytics
 * Handles store identification, data segregation, and store-specific analytics
 */

// Store configuration with address matching patterns
const STORE_CONFIG = {
  'trussville': {
    id: 'trussville',
    name: 'Trussville Store',
    location: 'Trussville',
    addressPatterns: ['7270 GADSDEN HWY', 'GADSDEN HWY'],
    color: 'rgba(249, 115, 22, 0.8)' // Orange
  },
  'chelsea': {
    id: 'chelsea',
    name: 'Chelsea Store',
    location: 'Chelsea',
    addressPatterns: ['50 CHELSEA RD', 'CHELSEA RD'],
    color: 'rgba(37, 99, 235, 0.8)' // Blue
  },
  '5points': {
    id: '5points',
    name: '5 Points Store',
    location: 'Five Points South',
    addressPatterns: ['1024 20TH ST S', '20TH ST S'],
    color: 'rgba(236, 72, 153, 0.8)' // Pink
  },
  'valleydale': {
    id: 'valleydale',
    name: 'Valleydale Store',
    location: 'Valleydale',
    addressPatterns: ['2657 VALLEYDALE RD', 'VALLEYDALE RD'],
    color: 'rgba(16, 185, 129, 0.8)' // Green
  },
  'homewood': {
    id: 'homewood',
    name: 'Homewood Store',
    location: 'Homewood',
    addressPatterns: ['803 GREEN SPRINGS HWY', 'GREEN SPRINGS HWY'],
    color: 'rgba(139, 92, 246, 0.8)' // Purple
  },
  '280': {
    id: '280',
    name: '280 Store',
    location: 'Highway 280 Corridor',
    addressPatterns: ['1401 DOUG BAKER BLVD', 'DOUG BAKER BLVD'],
    color: 'rgba(220, 38, 38, 0.8)' // Red
  }
};

// Global store data manager
const StoreDataManager = {
  // Store data structure: { storeId: { data: [], files: [], analytics: {} } }
  stores: {},
  
  // Currently selected store
  currentStore: 'all',
  
  // Initialize store data structures
  init: function() {
    // Initialize each store
    Object.keys(STORE_CONFIG).forEach(function(storeId) {
      this.stores[storeId] = {
        data: [],
        files: [],
        analytics: null,
        kpis: null
      };
    }.bind(this));
    
    // Initialize 'all' store for combined view
    this.stores.all = {
      data: [],
      files: [],
      analytics: null,
      kpis: null
    };
    
    console.log('Store Data Manager initialized');
  },
  
  // Identify store from invoice data based on address only
  identifyStore: function(row) {
    const address = (row.Address || '').toUpperCase();
    
    // Check each store's patterns against address only
    for (const storeId in STORE_CONFIG) {
      const store = STORE_CONFIG[storeId];
      for (let i = 0; i < store.addressPatterns.length; i++) {
        const pattern = store.addressPatterns[i];
        if (address.indexOf(pattern) !== -1) {
          return storeId;
        }
      }
    }
    
    return null; // No store identified
  },
  
  // Process uploaded file and assign to stores
  processFile: async function(file) {
    return new Promise(function(resolve, reject) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
          if (!results.data || results.data.length === 0) {
            reject(new Error('No data found in file'));
            return;
          }
          
          // Group data by store
          const storeGroups = {};
          const unassignedRows = [];
          
          results.data.forEach(function(row) {
            const storeId = this.identifyStore(row);
            if (storeId) {
              if (!storeGroups[storeId]) {
                storeGroups[storeId] = [];
              }
              storeGroups[storeId].push(row);
            } else {
              unassignedRows.push(row);
            }
          }.bind(this));
          
          // Check if we have unassigned rows
          if (unassignedRows.length === results.data.length) {
            reject(new Error('Could not determine store for file: ' + file.name + '. No matching addresses found.'));
            return;
          }
          
          // Collect sample unassigned records for diagnostic purposes
          const unassignedSamples = unassignedRows.slice(0, 10).map(function(row) {
            return {
              address: row.Address || 'N/A',
              city: row.City || 'N/A',
              customerName: row['Customer Name'] || 'N/A'
            };
          });
          
          // Process each store's data
          const fileInfo = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            uploadDate: new Date(),
            size: file.size,
            stores: [],
            totalRecords: results.data.length,
            unassignedRecords: unassignedRows.length,
            unassignedSamples: unassignedSamples
          };
          
          // Add data to each store
          for (const storeId in storeGroups) {
            const storeData = storeGroups[storeId];
            
            // Add to store's data
            this.stores[storeId].data = this.stores[storeId].data.concat(storeData);
            
            // Add file reference
            const storeFileInfo = {
              fileId: fileInfo.id,
              fileName: file.name,
              recordCount: storeData.length,
              uploadDate: fileInfo.uploadDate
            };
            this.stores[storeId].files.push(storeFileInfo);
            
            fileInfo.stores.push({
              storeId: storeId,
              storeName: STORE_CONFIG[storeId].name,
              recordCount: storeData.length,
              records: storeData
            });
          }
          
          // Update 'all' store with combined data
          this.stores.all.data = [];
          this.stores.all.files = [];
          
          Object.keys(STORE_CONFIG).forEach(function(storeId) {
            this.stores.all.data = this.stores.all.data.concat(this.stores[storeId].data);
            this.stores.all.files = this.stores.all.files.concat(this.stores[storeId].files);
          }.bind(this));
          
          resolve(fileInfo);
        }.bind(this),
        error: function(error) {
          reject(error);
        }
      });
    }.bind(this));
  },
  
  // Delete file from store
  deleteFile: function(storeId, fileId) {
    if (!this.stores[storeId]) return false;
    
    // Find and remove file
    const fileIndex = this.stores[storeId].files.findIndex(function(f) {
      return f.fileId === fileId;
    });
    
    if (fileIndex === -1) return false;
    
    // Remove file reference
    this.stores[storeId].files.splice(fileIndex, 1);
    
    // Rebuild data for this store (would need to reprocess remaining files)
    // For now, we'll mark that analytics need to be refreshed
    this.stores[storeId].analytics = null;
    this.stores[storeId].kpis = null;
    
    return true;
  },
  
  // Get data for current store
  getCurrentStoreData: function() {
    return this.stores[this.currentStore] || { data: [], files: [], analytics: null };
  },
  
  // Set current store
  setCurrentStore: function(storeId) {
    this.currentStore = storeId;
    console.log('Current store set to:', storeId);
  },
  
  // Get store summary
  getStoreSummary: function() {
    const summary = {};
    
    Object.keys(STORE_CONFIG).forEach(function(storeId) {
      const store = this.stores[storeId];
      summary[storeId] = {
        name: STORE_CONFIG[storeId].name,
        location: STORE_CONFIG[storeId].location,
        recordCount: store.data.length,
        fileCount: store.files.length,
        lastUpdate: store.files.length > 0 ? 
          Math.max.apply(null, store.files.map(function(f) { return f.uploadDate; })) : null
      };
    }.bind(this));
    
    return summary;
  },
  
  // Load all records from database for current user
  loadFromDatabase: async function() {
    if (typeof DatabaseManager === 'undefined') {
      console.log('Database Manager not available');
      return { success: false, error: 'Database Manager not available' };
    }
    
    try {
      console.log('Loading records from database...');
      
      // Fetch all records for the user
      const records = await DatabaseManager.getRecords('all');
      
      if (!records || records.length === 0) {
        console.log('No existing records found in database');
        return { success: true, recordCount: 0, message: 'No existing data found' };
      }
      
      console.log(`Loaded ${records.length} records from database`);
      
      // Clear existing data
      Object.keys(this.stores).forEach(function(storeId) {
        this.stores[storeId].data = [];
      }.bind(this));
      
      // Group records by store and convert to internal format
      const storeGroups = {};
      let assignedCount = 0;
      let unassignedCount = 0;
      
      records.forEach(function(record) {
        const storeId = record['Store ID'] || this.identifyStoreFromRecord(record);
        
        if (storeId && this.stores[storeId]) {
          if (!storeGroups[storeId]) {
            storeGroups[storeId] = [];
          }
          
          // Convert database record to CSV-compatible format expected by analytics
          const convertedRecord = {
            'Invoice Number': record['Invoice Number'],
            'Invoice Date': record['Invoice Date'],
            'Customer Name': record['Customer Name'],
            'Address': record['Address'],
            'City': record['City'],
            'State': record['State'],
            'Zip': record['Zip'],
            'Product Code': record['Product Code'],
            'Product Description': record['Product Description'],
            'Brand': record['Brand'],
            // Map database fields to CSV field names expected by analytics
            'Product Class Description': record['Category'],  // Category -> Product Class Description
            'Pack Size': record['Pack Size'],
            'Qty Shipped': record['Quantity'],  // Quantity -> Qty Shipped
            'Qty Ordered': record['Quantity'],  // Same as shipped for stored data
            'Unit Price': record['Unit Price'],
            'Ext. Price': record['Extended Price'],  // Extended Price -> Ext. Price
            'Manufacturer Name': record['Vendor'],  // Vendor -> Manufacturer Name
            'Vendor Code': record['Vendor Code']
          };
          
          storeGroups[storeId].push(convertedRecord);
          assignedCount++;
        } else {
          unassignedCount++;
        }
      }.bind(this));
      
      // Add data to each store
      for (const storeId in storeGroups) {
        this.stores[storeId].data = storeGroups[storeId];
      }
      
      // Update 'all' store with combined data
      this.stores.all.data = [];
      Object.keys(STORE_CONFIG).forEach(function(storeId) {
        this.stores.all.data = this.stores.all.data.concat(this.stores[storeId].data);
      }.bind(this));
      
      console.log(`Database load complete: ${assignedCount} records assigned to stores, ${unassignedCount} unassigned`);
      
      return {
        success: true,
        recordCount: records.length,
        assignedCount: assignedCount,
        unassignedCount: unassignedCount,
        message: `Loaded ${assignedCount} records from database`
      };
      
    } catch (error) {
      console.error('Error loading from database:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Helper to identify store from database record format
  identifyStoreFromRecord: function(record) {
    const address = (record.Address || '').toUpperCase();
    
    for (const storeId in STORE_CONFIG) {
      const store = STORE_CONFIG[storeId];
      for (let i = 0; i < store.addressPatterns.length; i++) {
        const pattern = store.addressPatterns[i];
        if (address.indexOf(pattern) !== -1) {
          return storeId;
        }
      }
    }
    
    return null;
  },
  
  // Calculate store-specific KPIs
  calculateStoreKPIs: function(storeId) {
    const storeData = this.stores[storeId];
    if (!storeData || !storeData.analytics) return null;
    
    const analytics = storeData.analytics;
    const kpis = {
      // Financial KPIs
      totalRevenue: analytics.summary.totalSpend,
      avgOrderValue: analytics.summary.totalSpend / analytics.summary.totalRecords,
      revenueGrowth: this.calculateRevenueGrowth(storeId),
      
      // Operational KPIs
      orderFrequency: this.calculateOrderFrequency(storeId),
      topSellingCategory: this.getTopCategory(analytics),
      vendorCount: analytics.summary.uniqueVendors,
      productCount: analytics.summary.uniqueProducts,
      
      // Performance KPIs
      priceStability: this.calculatePriceStability(analytics),
      vendorConcentration: analytics.supplyConcentration.hhi,
      costSavingsOpportunity: this.calculateSavingsOpportunity(analytics),
      
      // Efficiency KPIs
      avgDeliverySize: analytics.summary.totalSpend / analytics.summary.totalRecords,
      categoryDiversity: analytics.summary.uniqueCategories,
      
      // Store Ranking (compared to other stores)
      revenueRank: 0, // Will be calculated after all stores are processed
      efficiencyRank: 0,
      growthRank: 0
    };
    
    storeData.kpis = kpis;
    return kpis;
  },
  
  // Helper function to calculate revenue growth
  calculateRevenueGrowth: function(storeId) {
    const data = this.stores[storeId].data;
    if (data.length === 0) return 0;
    
    // Group by month
    const monthlyRevenue = {};
    data.forEach(function(row) {
      const date = new Date(row['Invoice Date']);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0;
      }
      monthlyRevenue[monthKey] += parseFloat(row['Ext. Price']) || 0;
    });
    
    // Calculate month-over-month growth
    const months = Object.keys(monthlyRevenue).sort();
    if (months.length < 2) return 0;
    
    const lastMonth = monthlyRevenue[months[months.length - 1]];
    const prevMonth = monthlyRevenue[months[months.length - 2]];
    
    return ((lastMonth - prevMonth) / prevMonth * 100) || 0;
  },
  
  // Helper function to calculate order frequency
  calculateOrderFrequency: function(storeId) {
    const data = this.stores[storeId].data;
    if (data.length === 0) return 0;
    
    // Get unique invoice dates
    const uniqueDates = new Set();
    data.forEach(function(row) {
      const date = new Date(row['Invoice Date']).toDateString();
      uniqueDates.add(date);
    });
    
    // Calculate date range
    const dates = Array.from(uniqueDates).map(function(d) { return new Date(d); });
    const minDate = new Date(Math.min.apply(null, dates));
    const maxDate = new Date(Math.max.apply(null, dates));
    const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;
    
    // Orders per week
    return (uniqueDates.size / daysDiff * 7);
  },
  
  // Helper function to get top category
  getTopCategory: function(analytics) {
    if (!analytics.budgetVariance) return 'N/A';
    
    let topCategory = '';
    let topSpend = 0;
    
    Object.entries(analytics.budgetVariance).forEach(function(entry) {
      if (entry[1].actual > topSpend) {
        topSpend = entry[1].actual;
        topCategory = entry[0];
      }
    });
    
    return topCategory;
  },
  
  // Helper function to calculate price stability
  calculatePriceStability: function(analytics) {
    if (!analytics.data) return 100;
    
    const spikeCount = analytics.summary.spikeCount || 0;
    const totalRecords = analytics.summary.totalRecords || 1;
    
    // Return stability percentage (100% = perfectly stable)
    return Math.max(0, 100 - (spikeCount / totalRecords * 100));
  },
  
  // Helper function to calculate savings opportunity
  calculateSavingsOpportunity: function(analytics) {
    // This would come from product analytics if available
    return 0; // Placeholder
  },
  
  // Update store rankings
  updateStoreRankings: function() {
    const storeKPIs = [];
    
    // Collect all store KPIs
    Object.keys(STORE_CONFIG).forEach(function(storeId) {
      const kpis = this.stores[storeId].kpis;
      if (kpis) {
        storeKPIs.push({
          storeId: storeId,
          revenue: kpis.totalRevenue,
          growth: kpis.revenueGrowth,
          efficiency: kpis.avgOrderValue
        });
      }
    }.bind(this));
    
    // Sort and assign ranks
    // Revenue rank
    storeKPIs.sort(function(a, b) { return b.revenue - a.revenue; });
    storeKPIs.forEach(function(store, index) {
      this.stores[store.storeId].kpis.revenueRank = index + 1;
    }.bind(this));
    
    // Growth rank
    storeKPIs.sort(function(a, b) { return b.growth - a.growth; });
    storeKPIs.forEach(function(store, index) {
      this.stores[store.storeId].kpis.growthRank = index + 1;
    }.bind(this));
    
    // Efficiency rank
    storeKPIs.sort(function(a, b) { return b.efficiency - a.efficiency; });
    storeKPIs.forEach(function(store, index) {
      this.stores[store.storeId].kpis.efficiencyRank = index + 1;
    }.bind(this));
  }
};

// Export for global use
window.StoreDataManager = StoreDataManager;