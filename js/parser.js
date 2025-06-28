/**
 * Loads and parses PFG invoice CSV, computing unit_price if needed.
 */
function loadInvoiceData(filePath) {
  return new Promise((resolve, reject) => {
    Papa.parse(filePath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map(row => {
          const qty = parseFloat(row['Qty Shipped']) || 0;
          const ext = parseFloat(row['Ext. Price']) || 0;
          let unit = parseFloat(row['Unit Price']);
          // Fallback compute if missing/zero
          if (!unit || unit <= 0) {
            unit = qty > 0 ? ext / qty : 0;
          }
          return {
            invoiceDate: new Date(row['Invoice Date']),
            category: row['Product Class Description'],
            unitPrice: unit,
            // you can extend with sku, qty, extPrice, etc.
          };
        });
        resolve(data);
      },
      error: (err) => reject(err)
    });
  });
}
