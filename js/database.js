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
      const stores = await response.json();
      return stores;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  }
};

console.log('Database Manager loaded');
