document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load and parse the data
  const raw = await loadInvoiceData('data/CustomerFirstInvoiceExport_20250628.csv');

  // 2. Aggregate avg unit price by month & category
  const monthly = {};
  raw.forEach(({ invoiceDate, category, unitPrice }) => {
    const month = invoiceDate.toISOString().slice(0,7); // "YYYY-MM"
    if (!monthly[month]) monthly[month] = {};
    if (!monthly[month][category]) monthly[month][category] = { sum:0, count:0 };
    monthly[month][category].sum += unitPrice;
    monthly[month][category].count += 1;
  });

  // 3. Prepare Chart.js data
  const labels = Object.keys(monthly).sort();
  const categories = [...new Set(raw.map(r => r.category))];
  const datasets = categories.map(cat => ({
    label: cat,
    data: labels.map(m => {
      const entry = monthly[m][cat];
      return entry ? entry.sum / entry.count : null;
    }),
    fill: false,
    borderWidth: 2,
  }));

  // 4. Render the chart
  const ctx = document.getElementById('priceTrendChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Avg Unit Price by Category (Monthly)' }
      },
      scales: {
        x: { title: { display: true, text: 'Month' } },
        y: { title: { display: true, text: 'Unit Price' } }
      }
    }
  });
});
