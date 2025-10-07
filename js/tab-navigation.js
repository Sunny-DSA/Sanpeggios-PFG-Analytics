// Tab Navigation Module for PFG Analytics Dashboard
(function() {
    'use strict';
    
    // Store current tab state
    let currentTab = 'overview';
    
    // Tab Navigation Functions
    window.showTab = function(tabId) {
        // Update current tab state
        currentTab = tabId;
        
        // Hide all tab content
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all sidebar tabs
        const allSidebarTabs = document.querySelectorAll('.sidebar-tab');
        allSidebarTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active class to selected sidebar tab
        const selectedSidebarTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedSidebarTab) {
            selectedSidebarTab.classList.add('active');
        }
        
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
        
        // Trigger chart refresh for tabs containing charts
        triggerChartRefresh(tabId);
    };
    
    // Trigger chart refresh based on tab
    function triggerChartRefresh(tabId) {
        // Give DOM time to render
        setTimeout(() => {
            switch(tabId) {
                case 'price-analytics':
                    // Refresh price trend and volatility charts
                    if (typeof createPriceTrendChart === 'function') {
                        createPriceTrendChart();
                    }
                    if (typeof createVolatilityChart === 'function') {
                        createVolatilityChart();
                    }
                    if (typeof createBudgetVarianceChart === 'function') {
                        createBudgetVarianceChart();
                    }
                    break;
                    
                case 'supply-chain':
                    // Refresh supply chain charts
                    if (typeof createConcentrationChart === 'function') {
                        createConcentrationChart();
                    }
                    if (typeof createForecastChart === 'function') {
                        createForecastChart();
                    }
                    break;
                    
                case 'category-insights':
                    // Refresh category heatmap
                    if (typeof createCategoryHeatmap === 'function') {
                        createCategoryHeatmap();
                    }
                    break;
                    
                case 'product-intelligence':
                    // Refresh product analytics charts
                    if (typeof initProductAnalytics === 'function') {
                        initProductAnalytics();
                    }
                    if (typeof refreshProductCharts === 'function') {
                        refreshProductCharts();
                    }
                    break;
                    
                case 'brand-analysis':
                    // Refresh brand analytics charts
                    if (typeof createBrandChart === 'function') {
                        createBrandChart();
                    }
                    if (typeof createBrandComparisonChart === 'function') {
                        createBrandComparisonChart();
                    }
                    if (typeof createBrandMarketShareChart === 'function') {
                        createBrandMarketShareChart();
                    }
                    break;
            }
        }, 100);
    }
    
    // Mobile Sidebar Toggle
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebarNav');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    };
    
    window.closeSidebar = function() {
        const sidebar = document.getElementById('sidebarNav');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }
    };
    
    // Get current tab
    window.getCurrentTab = function() {
        return currentTab;
    };
    
    // Initialize keyboard navigation
    function initKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            // Alt + number to switch tabs
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabs = document.querySelectorAll('.sidebar-tab');
                if (tabs[tabIndex]) {
                    tabs[tabIndex].click();
                }
            }
            
            // Escape to close sidebar on mobile
            if (e.key === 'Escape' && window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        // Set initial tab
        showTab('overview');
        
        // Initialize keyboard navigation
        initKeyboardNavigation();
        
        // Handle resize events
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                // Close sidebar if resized to desktop
                if (window.innerWidth > 1024) {
                    closeSidebar();
                }
            }, 250);
        });
        
        console.log('Tab navigation system initialized');
    }
})();