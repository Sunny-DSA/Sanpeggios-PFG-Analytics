/**
 * Store UI Components
 * Handles UI updates for multi-store functionality
 */

const StoreUI = {
  // Initialize store UI components
  init: function() {
    // Set up store tab handlers
    this.setupStoreTabs();
    
    // Set up file upload handlers
    this.setupFileUpload();
    
    // Initialize store KPI displays
    this.createStoreKPISection();
    
    console.log('Store UI initialized');
  },
  
  // Set up store tab click handlers
  setupStoreTabs: function() {
    const tabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(function(tab) {
      tab.addEventListener('click', async function(e) {
        const storeId = e.target.dataset.store || 'all';
        
        // Update active tab
        tabs.forEach(function(t) { t.classList.remove('active'); });
        e.target.classList.add('active');
        
        // Update current store
        StoreDataManager.setCurrentStore(storeId);
        
        // Refresh analytics for selected store
        await this.refreshStoreView(storeId);
        
        // Update file list for this store
        this.updateFileList(storeId);
        
        // Update store KPIs
        this.updateStoreKPIs(storeId);
      }.bind(this));
    }.bind(this));
  },
  
  // Set up enhanced file upload
  setupFileUpload: function() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    
    if (!uploadArea) return;
    
    // Create enhanced upload UI
    const uploadUI = document.createElement('div');
    uploadUI.innerHTML = 
      '<div class="upload-dropzone" id="uploadDropzone">' +
        '<div class="upload-icon">📁</div>' +
        '<h3>Drop Invoice Files Here</h3>' +
        '<p>or click to browse</p>' +
        '<input type="file" id="multiFileInput" accept=".csv" multiple style="display: none;">' +
      '</div>' +
      '<div id="uploadProgress" class="upload-progress hidden"></div>' +
      '<div id="uploadResults" class="upload-results"></div>';
    
    uploadArea.innerHTML = '';
    uploadArea.appendChild(uploadUI);
    
    // Set up handlers
    const dropzone = document.getElementById('uploadDropzone');
    const multiFileInput = document.getElementById('multiFileInput');
    
    dropzone.addEventListener('click', function() {
      multiFileInput.click();
    });
    
    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', function() {
      dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    }.bind(this));
    
    multiFileInput.addEventListener('change', function(e) {
      this.handleFiles(e.target.files);
    }.bind(this));
  },
  
  // Handle file uploads
  handleFiles: async function(files) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultsDiv = document.getElementById('uploadResults');
    
    progressDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      progressDiv.innerHTML = 
        '<div class="progress-bar">' +
          '<div class="progress-fill" style="width: ' + ((i + 1) / files.length * 100) + '%"></div>' +
        '</div>' +
        '<p>Processing ' + file.name + ' (' + (i + 1) + '/' + files.length + ')</p>';
      
      try {
        const fileInfo = await StoreDataManager.processFile(file);
        successCount++;
        
        results.push({
          success: true,
          fileName: file.name,
          fileInfo: fileInfo
        });
        
      } catch (error) {
        errorCount++;
        results.push({
          success: false,
          fileName: file.name,
          error: error.message
        });
      }
    }
    
    // Hide progress
    progressDiv.classList.add('hidden');
    
    // Show results
    this.showUploadResults(results, successCount, errorCount);
    
    // Refresh current store view if files were uploaded
    if (successCount > 0) {
      await this.refreshStoreView(StoreDataManager.currentStore);
      this.updateFileList(StoreDataManager.currentStore);
      this.updateStoreKPIs(StoreDataManager.currentStore);
    }
  },
  
  // Show upload results
  showUploadResults: function(results, successCount, errorCount) {
    const resultsDiv = document.getElementById('uploadResults');
    
    let html = '<div class="upload-summary">' +
      '<h4>Upload Complete</h4>' +
      '<p>✅ ' + successCount + ' files processed successfully</p>';
    
    if (errorCount > 0) {
      html += '<p>❌ ' + errorCount + ' files failed</p>';
    }
    
    html += '</div><div class="upload-details">';
    
    results.forEach(function(result) {
      if (result.success) {
        html += '<div class="upload-item success">' +
          '<strong>' + result.fileName + '</strong>' +
          '<div class="store-assignments">';
        
        result.fileInfo.stores.forEach(function(store) {
          html += '<span class="store-badge">' + 
            store.storeName + ' (' + store.recordCount + ' records)</span>';
        });
        
        if (result.fileInfo.unassignedRecords > 0) {
          html += '<span class="warning-badge">⚠️ ' + 
            result.fileInfo.unassignedRecords + ' unassigned records</span>';
          
          // Show diagnostic information for unassigned records
          if (result.fileInfo.unassignedSamples && result.fileInfo.unassignedSamples.length > 0) {
            html += '<div class="unassigned-diagnostic">' +
              '<strong>Sample Unassigned Records (first 10):</strong>' +
              '<table class="diagnostic-table">' +
              '<thead><tr><th>Address</th><th>City</th><th>Customer Name</th></tr></thead>' +
              '<tbody>';
            
            result.fileInfo.unassignedSamples.forEach(function(sample) {
              html += '<tr>' +
                '<td>' + sample.address + '</td>' +
                '<td>' + sample.city + '</td>' +
                '<td>' + sample.customerName + '</td>' +
                '</tr>';
            });
            
            html += '</tbody></table>' +
              '<p class="diagnostic-help">💡 These records couldn\'t be matched to a store. ' +
              'The store identification looks for specific patterns in the Address and City fields. ' +
              'If you see a pattern that should match a store, you may need to update the store configuration.</p>' +
              '</div>';
          }
        }
        
        html += '</div></div>';
      } else {
        html += '<div class="upload-item error">' +
          '<strong>' + result.fileName + '</strong>' +
          '<p class="error-message">' + result.error + '</p>' +
        '</div>';
      }
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
  },
  
  // Refresh store view
  refreshStoreView: async function(storeId) {
    const storeData = StoreDataManager.getCurrentStoreData();
    
    if (storeData.data.length === 0) {
      this.showEmptyStoreMessage(storeId);
      return;
    }
    
    // Run analytics for this store's data
    const options = {
      volatilityWindow: currentFilters.volatilityWindow,
      filters: currentFilters
    };
    
    // Convert raw data to parsed format
    const parsedData = storeData.data.map(function(row) {
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
    
    // Run full analytics
    analytics = await runFullAnalytics(parsedData, options);
    window.analytics = analytics;
    
    // Store analytics for this store
    StoreDataManager.stores[storeId].analytics = analytics;
    
    // Calculate store KPIs
    StoreDataManager.calculateStoreKPIs(storeId);
    
    // Update all store rankings
    StoreDataManager.updateStoreRankings();
    
    // Update UI
    updateSummaryStats();
    updateFilterOptions();
    await initializeAllCharts();
    
    if (typeof initializeProductAnalytics === 'function') {
      await initializeProductAnalytics();
    }
    
    checkAndDisplayAlerts();
  },
  
  // Show empty store message
  showEmptyStoreMessage: function(storeId) {
    const storeName = storeId === 'all' ? 'All Stores' : 
      (STORE_CONFIG[storeId] ? STORE_CONFIG[storeId].name : storeId);
    
    // Clear charts
    Object.values(charts).forEach(function(chart) {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    
    // Show message in main content area
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
      alertContainer.innerHTML = 
        '<div class="alert alert-info">' +
          '<strong>No data available for ' + storeName + '</strong>' +
          '<p>Please upload invoice files for this store to see analytics.</p>' +
        '</div>';
    }
  },
  
  // Update file list for current store
  updateFileList: function(storeId) {
    const fileListContainer = document.getElementById('storeFileList');
    if (!fileListContainer) {
      // Create file list section if it doesn't exist
      this.createFileListSection();
    }
    
    const storeData = StoreDataManager.stores[storeId];
    if (!storeData || storeData.files.length === 0) {
      document.getElementById('storeFileList').innerHTML = 
        '<p class="text-muted">No files uploaded for this store yet.</p>';
      return;
    }
    
    let html = '<div class="file-list">';
    
    storeData.files.forEach(function(file) {
      html += '<div class="file-item">' +
        '<div class="file-info">' +
          '<strong>' + file.fileName + '</strong>' +
          '<span class="file-meta">' + 
            file.recordCount + ' records | ' +
            new Date(file.uploadDate).toLocaleDateString() +
          '</span>' +
        '</div>' +
        '<button class="btn-delete" onclick="StoreUI.deleteFile(\'' + 
          storeId + '\', \'' + file.fileId + '\')">' +
          '🗑️ Delete' +
        '</button>' +
      '</div>';
    });
    
    html += '</div>';
    document.getElementById('storeFileList').innerHTML = html;
  },
  
  // Delete file
  deleteFile: async function(storeId, fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    const success = StoreDataManager.deleteFile(storeId, fileId);
    
    if (success) {
      // For now, show message that data refresh is needed
      alert('File removed. Please re-upload all files for this store to refresh the data.');
      this.updateFileList(storeId);
    }
  },
  
  // Create file list section
  createFileListSection: function() {
    const container = document.querySelector('.container');
    const section = document.createElement('section');
    section.className = 'section';
    section.innerHTML = 
      '<h2>📄 Store Files</h2>' +
      '<div id="storeFileList"></div>';
    
    // Insert after header
    const header = container.querySelector('header');
    header.parentNode.insertBefore(section, header.nextSibling.nextSibling);
  },
  
  // Create store KPI section
  createStoreKPISection: function() {
    const container = document.querySelector('.container');
    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'storeKPISection';
    section.innerHTML = 
      '<h2>🏪 Store Performance KPIs</h2>' +
      '<div id="storeKPIContainer">' +
        '<p class="text-muted">Select a store to view KPIs</p>' +
      '</div>';
    
    // Insert after summary stats
    const summarySection = container.querySelector('.stats-grid').closest('.section');
    summarySection.parentNode.insertBefore(section, summarySection.nextSibling);
  },
  
  // Update store KPIs display
  updateStoreKPIs: function(storeId) {
    const container = document.getElementById('storeKPIContainer');
    if (!container) return;
    
    if (storeId === 'all') {
      this.showAllStoresComparison();
      return;
    }
    
    const storeData = StoreDataManager.stores[storeId];
    if (!storeData || !storeData.kpis) {
      container.innerHTML = '<p class="text-muted">No KPI data available for this store</p>';
      return;
    }
    
    const kpis = storeData.kpis;
    const storeName = STORE_CONFIG[storeId].name;
    
    let html = '<div class="kpi-grid">' +
      // Revenue KPIs
      '<div class="kpi-card">' +
        '<h4>Revenue Performance</h4>' +
        '<div class="kpi-value">$' + kpis.totalRevenue.toLocaleString() + '</div>' +
        '<div class="kpi-label">Total Revenue</div>' +
        '<div class="kpi-metric">' +
          '<span class="' + (kpis.revenueGrowth > 0 ? 'positive' : 'negative') + '">' +
            (kpis.revenueGrowth > 0 ? '↑' : '↓') + ' ' +
            Math.abs(kpis.revenueGrowth).toFixed(1) + '%' +
          '</span> MoM Growth' +
        '</div>' +
        '<div class="kpi-rank">Rank #' + kpis.revenueRank + ' of ' + 
          Object.keys(STORE_CONFIG).length + '</div>' +
      '</div>' +
      
      // Efficiency KPIs
      '<div class="kpi-card">' +
        '<h4>Operational Efficiency</h4>' +
        '<div class="kpi-value">$' + kpis.avgOrderValue.toFixed(0) + '</div>' +
        '<div class="kpi-label">Avg Order Value</div>' +
        '<div class="kpi-metric">' + kpis.orderFrequency.toFixed(1) + ' orders/week</div>' +
        '<div class="kpi-rank">Efficiency Rank #' + kpis.efficiencyRank + '</div>' +
      '</div>' +
      
      // Product KPIs
      '<div class="kpi-card">' +
        '<h4>Product Mix</h4>' +
        '<div class="kpi-value">' + kpis.productCount + '</div>' +
        '<div class="kpi-label">Unique Products</div>' +
        '<div class="kpi-metric">Top: ' + kpis.topSellingCategory + '</div>' +
        '<div class="kpi-metric">' + kpis.categoryDiversity + ' categories</div>' +
      '</div>' +
      
      // Risk KPIs
      '<div class="kpi-card">' +
        '<h4>Risk Metrics</h4>' +
        '<div class="kpi-value">' + kpis.priceStability.toFixed(1) + '%</div>' +
        '<div class="kpi-label">Price Stability</div>' +
        '<div class="kpi-metric">Vendor HHI: ' + kpis.vendorConcentration.toFixed(0) + '</div>' +
        '<div class="kpi-metric ' + (kpis.vendorConcentration > 2500 ? 'negative' : 'positive') + '">' +
          (kpis.vendorConcentration > 2500 ? 'High' : 'Low') + ' concentration risk' +
        '</div>' +
      '</div>' +
    '</div>';
    
    container.innerHTML = html;
  },
  
  // Show all stores comparison
  showAllStoresComparison: function() {
    const container = document.getElementById('storeKPIContainer');
    const summary = StoreDataManager.getStoreSummary();
    
    let html = '<div class="store-comparison">' +
      '<table class="data-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Store</th>' +
            '<th>Location</th>' +
            '<th class="number">Records</th>' +
            '<th class="number">Files</th>' +
            '<th class="number">Revenue</th>' +
            '<th class="number">Growth</th>' +
            '<th>Last Update</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';
    
    Object.entries(summary).forEach(function(entry) {
      const storeId = entry[0];
      const store = entry[1];
      const kpis = StoreDataManager.stores[storeId].kpis;
      
      html += '<tr>' +
        '<td>' + store.name + '</td>' +
        '<td>' + store.location + '</td>' +
        '<td class="number">' + store.recordCount.toLocaleString() + '</td>' +
        '<td class="number">' + store.fileCount + '</td>' +
        '<td class="number">' + 
          (kpis ? '$' + kpis.totalRevenue.toLocaleString() : '-') + 
        '</td>' +
        '<td class="number">' +
          (kpis ? 
            '<span class="' + (kpis.revenueGrowth > 0 ? 'positive' : 'negative') + '">' +
            (kpis.revenueGrowth > 0 ? '↑' : '↓') + ' ' +
            Math.abs(kpis.revenueGrowth).toFixed(1) + '%</span>' : 
            '-') +
        '</td>' +
        '<td>' + (store.lastUpdate ? new Date(store.lastUpdate).toLocaleDateString() : '-') + '</td>' +
      '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }
};

// Add styles for new UI components
(function() {
  const style = document.createElement('style');
  style.textContent = 
    '.upload-dropzone{border:2px dashed #d1d5db;border-radius:12px;padding:3rem;text-align:center;cursor:pointer;transition:all 0.3s}' +
    '.upload-dropzone:hover{border-color:#dc2626;background:#fef2f2}' +
    '.upload-dropzone.dragover{border-color:#dc2626;background:#fee2e2}' +
    '.upload-icon{font-size:3rem;margin-bottom:1rem}' +
    '.upload-progress{margin:1rem 0}' +
    '.progress-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}' +
    '.progress-fill{height:100%;background:#dc2626;transition:width 0.3s}' +
    '.upload-results{margin-top:1rem}' +
    '.upload-summary{background:#f3f4f6;padding:1rem;border-radius:8px;margin-bottom:1rem}' +
    '.upload-item{padding:1rem;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:0.5rem}' +
    '.upload-item.success{background:#f0fdf4;border-color:#86efac}' +
    '.upload-item.error{background:#fef2f2;border-color:#fca5a5}' +
    '.store-badge{display:inline-block;background:#dbeafe;color:#1e40af;padding:0.25rem 0.75rem;border-radius:4px;margin:0.25rem;font-size:0.875rem}' +
    '.warning-badge{background:#fef3c7;color:#92400e}' +
    '.error-message{color:#dc2626;font-size:0.875rem;margin:0.5rem 0 0}' +
    '.file-list{display:flex;flex-direction:column;gap:0.5rem}' +
    '.file-item{display:flex;justify-content:space-between;align-items:center;padding:1rem;background:#f9fafb;border-radius:8px}' +
    '.file-info strong{display:block;margin-bottom:0.25rem}' +
    '.file-meta{font-size:0.875rem;color:#6b7280}' +
    '.btn-delete{background:#dc2626;color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-size:0.875rem}' +
    '.btn-delete:hover{background:#b91c1c}' +
    '.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}' +
    '.kpi-card{background:#f9fafb;padding:1.5rem;border-radius:8px;border:1px solid #e5e7eb}' +
    '.kpi-card h4{margin-bottom:1rem;color:#374151;font-size:1rem}' +
    '.kpi-value{font-size:2rem;font-weight:700;color:#111827;margin-bottom:0.25rem}' +
    '.kpi-label{font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem}' +
    '.kpi-metric{font-size:0.875rem;color:#4b5563;margin-bottom:0.25rem}' +
    '.kpi-rank{font-size:0.75rem;color:#9ca3af;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid #e5e7eb}' +
    '.store-comparison{overflow-x:auto}';
  
  document.head.appendChild(style);
})();

// Export for global use
window.StoreUI = StoreUI;