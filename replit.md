# Sanpeggio's PFG Analytics V3

## Overview
This is an advanced supply chain intelligence and cost optimization platform for Sanpeggio's restaurants. The application analyzes PFG (Performance Food Group) invoice data to provide comprehensive analytics including:

- Price trend analysis with spike detection
- Volatility tracking and budget variance calculations
- Supply concentration analysis and vendor insights
- Spend forecasting and predictions
- Category performance heatmaps
- Product-level analytics (ABC analysis, brand performance, lifecycle tracking)
- Cost optimization through substitution opportunity identification

## Project Architecture

### Technology Stack
- **Frontend**: Pure HTML/CSS/JavaScript (static application)
- **Visualization**: Chart.js with plugins (zoom, matrix charts)
- **Data Processing**: PapaParse for CSV parsing, date-fns for date handling
- **Server**: Python HTTP server (serves static files on port 5000)

### File Structure
```
.
├── Index.html                  # Main application page
├── server.py                   # Python HTTP server for hosting
├── css/
│   └── styles.css             # Application styling
├── js/
│   ├── chart-init.js          # Chart initialization and rendering
│   ├── debug.js               # Debug utilities
│   ├── parser.js              # CSV data parsing and analytics
│   ├── product-analytics.js   # Product-level analysis functions
│   ├── product-charts-fixed.js # Product visualization components
│   ├── store-manager.js       # Multi-store data management
│   └── store-ui.js            # UI interaction handlers
└── data/
    └── CustomerFirstInvoiceExport_20250628.csv  # Sample invoice data
```

### Key Features
1. **Multi-Store Support**: Handles data for 6 store locations (280, Chelsea, Valleydale, Homewood, Trussville, 5 Points)
2. **Advanced Analytics**: Price spike detection, volatility analysis, budget variance tracking
3. **Product Intelligence**: ABC analysis, brand performance, substitution recommendations
4. **Interactive Visualizations**: Multiple chart types with drill-down capabilities
5. **Cost Optimization**: Identifies opportunities to reduce spending through strategic substitutions

## Recent Changes
- **2025-10-06**: Database integration, authentication, and deployment setup
  - Initial Replit setup with Python 3.11 HTTP server
  - Created PostgreSQL database with 5 tables (stores, uploads, invoice_records, users, oauth)
  - Converted to Flask app with REST API endpoints
  - Added automatic database seeding on startup
  - Created frontend database save feature with checkbox (enabled by default)
  - Implemented Replit Auth for secure user authentication (Google, GitHub, X, Apple, email/password)
  - Fixed data persistence bug: records now properly saved to database on upload
  - Added duplicate detection: skips records that already exist in database
  - Enhanced upload feedback: displays count of new records and duplicates skipped
  - Fixed 280 store address matching to include "Doug Baker" pattern
  - Added diagnostic feature to display unassigned invoice records
  - Updated store identification to use Address field only (removed city-based matching)
  - Set up autoscale deployment configuration for production

## Running the Application
The application runs on a Python HTTP server bound to `0.0.0.0:5000`. The server:
- Serves Index.html as the default page
- Includes cache-control headers to prevent browser caching issues
- Serves all static assets (CSS, JS, CSV data files)

## User Preferences
None recorded yet.

## Notes
- This is a client-side application with no backend API or database
- All data processing happens in the browser using JavaScript
- CSV data files are loaded via PapaParse
- The application includes sample data from June 2025
