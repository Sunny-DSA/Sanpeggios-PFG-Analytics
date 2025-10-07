const DatabaseManager = {
  baseURL: window.location.origin,
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  
  // Utility function to handle retries
  async fetchWithRetry(url, options = {}, retries = 0) {
    try {
      const response = await fetch(url, options);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || contentType?.includes('text/html')) {
          console.error('Authentication required - redirecting to login');
          window.location.reload(); // Reload to trigger OAuth login
          return { response: null, error: 'auth_required' };
        }
        
        // Retry on server errors (5xx)
        if (response.status >= 500 && retries < this.maxRetries) {
          console.warn(`Server error ${response.status}, retrying in ${this.retryDelay * (retries + 1)}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
          return this.fetchWithRetry(url, options, retries + 1);
        }
        
        throw new Error(`Server error: ${response.status}`);
      }
      
      return { response, error: null };
    } catch (error) {
      // Network errors - retry
      if (retries < this.maxRetries) {
        console.warn(`Network error, retrying in ${this.retryDelay * (retries + 1)}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
        return this.fetchWithRetry(url, options, retries + 1);
      }
      
      throw error;
    }
  },
  
  async saveToDatabase(storeId, filename, fileSize, records) {
    try {
      const { response, error } = await this.fetchWithRetry(`${this.baseURL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: storeId,
          filename: filename,
          file_size: fileSize,
          records: records
        })
      });
      
      if (error === 'auth_required') {
        return { success: false, message: 'Authentication required' };
      }
      
      if (!response) {
        throw new Error('Failed to save to database after retries');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving to database:', error);
      throw error;
    }
  },
  
  async getRecords(storeId) {
    try {
      const { response, error } = await this.fetchWithRetry(`${this.baseURL}/api/records/${storeId}`);
      
      if (error === 'auth_required') {
        return [];
      }
      
      if (!response) {
        console.error('Failed to fetch records after retries');
        return [];
      }
      
      const records = await response.json();
      return records;
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  },
  
  async getStores() {
    try {
      const { response, error } = await this.fetchWithRetry(`${this.baseURL}/api/stores`);
      
      if (error === 'auth_required') {
        return {};
      }
      
      if (!response) {
        console.error('Failed to fetch stores after retries');
        return {};
      }
      
      const stores = await response.json();
      return stores;
    } catch (error) {
      console.error('Error fetching stores:', error);
      return {};
    }
  }
};

console.log('Database Manager loaded');
