/**
 * Debug script to identify loading issues
 * Add this as the first script in your HTML to track loading
 */

console.log('=== PFG Analytics Debug Log ===');
console.log('Starting at:', new Date().toISOString());

// Track script loading
window.PFG_DEBUG = {
  scriptsLoaded: [],
  errors: [],
  startTime: Date.now()
};

// Override console.error to capture errors
const originalError = console.error;
console.error = function(...args) {
  window.PFG_DEBUG.errors.push({
    time: Date.now() - window.PFG_DEBUG.startTime,
    message: args.join(' ')
  });
  originalError.apply(console, args);
};

// Check for dependencies periodically
function checkDependencies() {
  const deps = {
    'Chart.js': typeof Chart !== 'undefined',
    'PapaParse': typeof Papa !== 'undefined',
    'loadInvoiceData': typeof loadInvoiceData === 'function',
    'runFullAnalytics': typeof runFullAnalytics === 'function',
    'ProductAnalytics': typeof ProductAnalytics !== 'undefined',
    'initializeProductAnalytics': typeof initializeProductAnalytics === 'function',
    'analytics (global)': typeof analytics !== 'undefined' && analytics !== null,
    'window.analytics': typeof window.analytics !== 'undefined' && window.analytics !== null
  };
  
  console.log('Dependency check at', (Date.now() - window.PFG_DEBUG.startTime) + 'ms:');
  Object.entries(deps).forEach(([name, loaded]) => {
    console.log(`  ${name}: ${loaded ? '✓ Loaded' : '✗ Not loaded'}`);
  });
  
  return deps;
}

// Track when each script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded at', (Date.now() - window.PFG_DEBUG.startTime) + 'ms');
  
  // Check dependencies immediately
  checkDependencies();
  
  // Check again after a delay
  setTimeout(() => {
    console.log('\n=== Final dependency check ===');
    const deps = checkDependencies();
    
    if (window.PFG_DEBUG.errors.length > 0) {
      console.log('\n=== Errors encountered ===');
      window.PFG_DEBUG.errors.forEach(err => {
        console.log(`At ${err.time}ms: ${err.message}`);
      });
    }
    
    // Try to identify specific issues
    if (!deps['loadInvoiceData']) {
      console.error('parser.js failed to load or has syntax errors');
    }
    if (!deps['ProductAnalytics']) {
      console.error('product-analytics.js failed to load or has syntax errors');
    }
    if (!deps['initializeProductAnalytics']) {
      console.error('product-charts.js failed to load or has syntax errors');
    }
    
    // Check for syntax errors by trying to load scripts manually
    console.log('\n=== Checking for syntax errors ===');
    
    // List all script elements
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      console.log('Script:', script.src, 'Loaded:', !script.error);
    });
    
  }, 2000);
});