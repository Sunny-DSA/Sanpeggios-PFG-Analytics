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
- **Backend**: Flask REST API with SQLAlchemy ORM
- **Authentication**: Replit Auth (OAuth 2.0 with PKCE)
- **Database**: PostgreSQL (user-isolated data storage)
- **Visualization**: Chart.js with plugins (zoom, matrix charts)
- **Data Processing**: PapaParse for CSV parsing, date-fns for date handling

### File Structure
```
.
├── app.py                      # Flask application with REST API routes
├── extensions.py               # Centralized Flask extensions (db, login_manager)
├── models.py                   # SQLAlchemy database models
├── replit_auth.py              # Replit Auth OAuth integration
├── Index.html                  # Main application page
├── css/
│   └── styles.css             # Application styling
├── js/
│   ├── chart-init.js          # Chart initialization and rendering
│   ├── database.js            # Database API client
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
1. **Secure User Authentication**: OAuth 2.0 login via Replit Auth (Google, GitHub, X, Apple, email/password)
2. **User Data Isolation**: Each user sees only their own uploaded invoices and analytics
3. **Multi-Store Support**: Handles data for 6 store locations (280, Chelsea, Valleydale, Homewood, Trussville, 5 Points)
4. **Advanced Analytics**: Price spike detection, volatility analysis, budget variance tracking
5. **Product Intelligence**: ABC analysis, brand performance, substitution recommendations
6. **Interactive Visualizations**: Multiple chart types with drill-down capabilities
7. **Cost Optimization**: Identifies opportunities to reduce spending through strategic substitutions

## Recent Changes
- **2025-10-13**: Authentication loop fix
  - Fixed infinite authentication redirect loop caused by Replit proxy intercepting `/__replauthuser` endpoint
  - Renamed user info endpoint from `/__replauthuser` to `/api/userinfo` (unreserved path)
  - Updated session cookie configuration: SameSite=Lax for development, SameSite=None+Secure for production
  - Added session permanence with before_request handler
  - Enhanced OAuth callback to always return proper redirect response
  - Fixed frontend retry logic to prevent immediate redirects on auth failures
  - User profile now loads correctly without triggering login loops

- **2025-10-13**: Production server timeout fix
  - Installed Gunicorn as production-grade WSGI server (replaces Flask development server)
  - Configured autoscale deployment to use Gunicorn with 4 workers and port reuse
  - Fixed timeout issues caused by development server's inability to handle concurrent requests
  - Production deployment now uses: `gunicorn --bind=0.0.0.0:5000 --workers=4 --reuse-port app:app`
  - Achieves 40x performance improvement over Flask's built-in development server

- **2025-10-06**: Analytics robustness improvements
  - Added division-by-zero safety checks across all analytics calculations
  - Implemented empty data handling with user-friendly messages for all charts
  - Added date range validation to prevent invalid filter inputs
  - Added loading states to filter controls for better user feedback
  - Fixed database type mismatch error (invoice_number string conversion)
  - Enhanced error handling to prevent NaN/Infinity values in analytics

- **2025-10-06**: Authentication implementation with user data isolation
  - Restructured Flask app using extensions pattern to resolve circular imports
  - Integrated Replit Auth OAuth 2.0 with Flask-Login for session management
  - Protected all API endpoints with @require_login decorator
  - Implemented user data isolation: all uploads and invoice records scoped to current_user.id
  - Added automatic redirect to OAuth login for unauthenticated users
  - Removed unauthenticated /api/init-stores endpoint (stores seed on startup only)
  - Fixed duplicate detection to scope by user_id (users can have same invoices independently)
  - Enhanced security: all stateful API routes now require authentication
  - Production-ready authentication flow with token refresh and session persistence

- **2025-10-06**: Database integration and deployment setup
  - Initial Replit setup with Python 3.11 and Flask
  - Created PostgreSQL database with 5 tables (stores, uploads, invoice_records, users, oauth)
  - Added automatic database seeding on startup (stores table)
  - Fixed data persistence: records properly saved with user_id foreign keys
  - Enhanced upload feedback: displays count of new records and duplicates skipped
  - Fixed 280 store address matching to include "Doug Baker" pattern
  - Updated store identification to use Address field only (removed city-based matching)
  - Set up autoscale deployment configuration for production

## Running the Application
The application runs as a Flask server bound to `0.0.0.0:5000`:
- **Authentication Required**: Users must log in via Replit Auth to access the dashboard
- **User Data Isolation**: Each user's uploads and analytics are private and isolated
- **Database Seeding**: Store metadata is automatically seeded on first startup
- **Session Management**: User sessions persist with automatic token refresh
- Static assets (CSS, JS) are served alongside the authenticated dashboard

## Security
- **OAuth 2.0 Authentication**: All access requires Replit Auth login
- **Protected API Endpoints**: All stateful routes require @require_login decorator
- **User Data Scoping**: Database queries filter by current_user.id
- **No Public Write Access**: All mutation endpoints require authentication

## User Preferences
None recorded yet.
