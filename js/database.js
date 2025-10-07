const DatabaseManager = {
  baseURL: window.location.origin,
  
  async saveToDatabase(storeId, filename, fileSize, records) {
    try {
      const response = await fetch(`${this.baseURL}/api/upload`, {
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
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || contentType?.includes('text/html')) {
          console.error('Authentication required - redirecting to login');
          window.location.reload(); // Reload to trigger OAuth login
          return { success: false, message: 'Authentication required' };
        }
        throw new Error(`Server error: ${response.status}`);
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
      const response = await fetch(`${this.baseURL}/api/records/${storeId}`);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || contentType?.includes('text/html')) {
          console.error('Authentication required - redirecting to login');
          window.location.reload(); // Reload to trigger OAuth login
          return [];
        }
        throw new Error(`Server error: ${response.status}`);
      }
      
      const records = await response.json();
      return records;
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  },
  
  async getStores() {
    try {
      const response = await fetch(`${this.baseURL}/api/stores`);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || contentType?.includes('text/html')) {
          console.error('Authentication required - redirecting to login');
          window.location.reload(); // Reload to trigger OAuth login
          return {};
        }
        throw new Error(`Server error: ${response.status}`);
      }
      
      const stores = await response.json();
      return stores;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  }
};

console.log('Database Manager loaded');
