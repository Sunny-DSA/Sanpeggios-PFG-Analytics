import os
from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from extensions import db, login_manager

app = Flask(__name__, static_folder='.')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # Needed for Replit Auth url_for to generate with https
CORS(app)

app.secret_key = os.environ.get("SESSION_SECRET")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize extensions
db.init_app(app)
login_manager.init_app(app)

# Import models after db is initialized
import models

# Initialize Replit Auth after models
from replit_auth import make_replit_blueprint, require_login
from flask_login import current_user
from flask import url_for

app.register_blueprint(make_replit_blueprint(), url_prefix="/auth")

def init_database():
    with app.app_context():
        db.create_all()

        from models import Store

        stores_data = [
            {'id': 'trussville', 'name': 'Trussville Store', 'location': 'Trussville', 'patterns': '7270 GADSDEN HWY,GADSDEN HWY'},
            {'id': 'chelsea', 'name': 'Chelsea Store', 'location': 'Chelsea', 'patterns': '50 CHELSEA RD,CHELSEA RD'},
            {'id': '5points', 'name': '5 Points Store', 'location': 'Five Points South', 'patterns': '1024 20TH ST S,20TH ST S'},
            {'id': 'valleydale', 'name': 'Valleydale Store', 'location': 'Valleydale', 'patterns': '2657 VALLEYDALE RD,VALLEYDALE RD'},
            {'id': 'homewood', 'name': 'Homewood Store', 'location': 'Homewood', 'patterns': '803 GREEN SPRINGS HWY,GREEN SPRINGS HWY'},
            {'id': '280', 'name': '280 Store', 'location': 'Highway 280 Corridor', 'patterns': '1401 DOUG BAKER BLVD,DOUG BAKER BLVD'}
        ]

        for store_data in stores_data:
            existing = db.session.get(Store, store_data['id'])
            if not existing:
                store = Store(
                    id=store_data['id'],
                    name=store_data['name'],
                    location=store_data['location'],
                    address_patterns=store_data['patterns']
                )
                db.session.add(store)

        db.session.commit()
        print("Database initialized and stores seeded successfully")

@app.route('/')
def index():
    if current_user.is_authenticated:
        return send_from_directory('.', 'Index.html')
    else:
        return redirect(url_for('replit_auth.login'))

def safe_float(value):
    """Safely convert a value to float, returning 0.0 if conversion fails"""
    if value is None:
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

@app.route('/api/upload', methods=['POST'])
@require_login
def upload_invoice():
    from models import Store, Upload, InvoiceRecord
    from sqlalchemy import select, and_

    data = request.json
    store_id = data.get('store_id')
    filename = data.get('filename')
    file_size = data.get('file_size')
    records = data.get('records', [])

    upload = Upload(
        user_id=current_user.id,
        store_id=store_id,
        filename=filename,
        file_size=file_size,
        total_records=len(records)
    )
    db.session.add(upload)
    db.session.flush()

    new_records = 0
    duplicate_records = 0

    for record_data in records:
        invoice_number = str(record_data.get('Invoice Number')) if record_data.get('Invoice Number') is not None else None
        invoice_date = record_data.get('Invoice Date')
        product_code = record_data.get('Product Code')

        existing = db.session.execute(
            select(InvoiceRecord).where(
                and_(
                    InvoiceRecord.user_id == current_user.id,
                    InvoiceRecord.store_id == store_id,
                    InvoiceRecord.invoice_number == invoice_number,
                    InvoiceRecord.invoice_date == invoice_date,
                    InvoiceRecord.product_code == product_code
                )
            )
        ).first()

        if existing:
            duplicate_records += 1
            continue

        record = InvoiceRecord(
            user_id=current_user.id,
            upload_id=upload.id,
            store_id=store_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            customer_name=record_data.get('Customer Name'),
            address=record_data.get('Address'),
            city=record_data.get('City'),
            state=record_data.get('State'),
            zip_code=record_data.get('Zip'),
            product_code=product_code,
            product_description=record_data.get('Product Description'),
            brand=record_data.get('Brand') or record_data.get('Brand Name'),
            category=record_data.get('Product Class Description') or record_data.get('Category'),
            pack_size=record_data.get('Pack Size'),
            # Convert string values to floats for numeric fields with error handling
            quantity=safe_float(record_data.get('Qty Shipped') or record_data.get('Quantity')),
            unit_price=safe_float(record_data.get('Unit Price')),
            extended_price=safe_float(record_data.get('Ext. Price') or record_data.get('Extended Price')),
            vendor=record_data.get('Manufacturer Name') or record_data.get('Vendor'),
            vendor_code=record_data.get('Vendor Code')
        )
        db.session.add(record)
        new_records += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'upload_id': upload.id,
        'new_records': new_records,
        'duplicate_records': duplicate_records,
        'message': f'Successfully uploaded {new_records} new records ({duplicate_records} duplicates skipped)'
    })

@app.route('/api/stores', methods=['GET'])
@require_login
def get_stores():
    from models import Store
    from sqlalchemy import select
    stmt = select(Store)
    stores = db.session.execute(stmt).scalars().all()
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'location': s.location
    } for s in stores])

@app.route('/api/records/<store_id>')
@require_login
def get_records(store_id):
    """Get all invoice records for a specific store"""
    from models import InvoiceRecord
    from sqlalchemy import select
    
    print(f"Fetching records for user_id={current_user.id}, store_id={store_id}")

    if store_id == 'all':
        stmt = select(InvoiceRecord).where(InvoiceRecord.user_id == current_user.id)
    else:
        stmt = select(InvoiceRecord).where(
            InvoiceRecord.user_id == current_user.id,
            InvoiceRecord.store_id == store_id
        )
    
    records = db.session.execute(stmt).scalars().all()

    print(f"Found {len(records)} records")

    return jsonify([{
        'Invoice Number': r.invoice_number,
        'Invoice Date': r.invoice_date,
        'Customer Name': r.customer_name,
        'Address': r.address,
        'City': r.city,
        'State': r.state,
        'Zip': r.zip_code,
        'Product Code': r.product_code,
        'Product Description': r.product_description,
        'Brand': r.brand,
        'Category': r.category,
        'Pack Size': r.pack_size,
        'Quantity': r.quantity,
        'Unit Price': r.unit_price,
        'Extended Price': r.extended_price,
        'Vendor': r.vendor,
        'Vendor Code': r.vendor_code,
        'Store ID': r.store_id
    } for r in records])

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Make session permanent
@app.before_request
def make_session_permanent():
    from flask import session
    session.permanent = True

if __name__ == '__main__':
    init_database()
    app.run(host='0.0.0.0', port=5000, debug=False)