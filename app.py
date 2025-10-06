import os
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

app = Flask(__name__, static_folder='.')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # Needed for Replit Auth url_for to generate with https
CORS(app)

app.secret_key = os.environ.get("SESSION_SECRET")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)

import models

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
    from replit_auth import require_login
    from flask_login import current_user
    
    @require_login
    def protected_index():
        return send_from_directory('.', 'Index.html')
    
    return protected_index()

@app.route('/api/upload', methods=['POST'])
def upload_invoice():
    from models import Store, Upload, InvoiceRecord
    from sqlalchemy import select, and_
    from flask_login import current_user
    from replit_auth import require_login
    import json
    
    @require_login
    def protected_upload():
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
            invoice_number = record_data.get('Invoice Number')
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
                brand=record_data.get('Brand'),
                category=record_data.get('Category'),
                pack_size=record_data.get('Pack Size'),
                quantity=record_data.get('Quantity'),
                unit_price=record_data.get('Unit Price'),
                extended_price=record_data.get('Extended Price'),
                vendor=record_data.get('Vendor'),
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
    
    return protected_upload()

@app.route('/api/stores', methods=['GET'])
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

@app.route('/api/records/<store_id>', methods=['GET'])
def get_records(store_id):
    from models import InvoiceRecord
    from sqlalchemy import select, and_
    from flask_login import current_user
    from replit_auth import require_login
    
    @require_login
    def protected_get_records():
        if store_id == 'all':
            stmt = select(InvoiceRecord).where(InvoiceRecord.user_id == current_user.id)
        else:
            stmt = select(InvoiceRecord).where(
                and_(
                    InvoiceRecord.user_id == current_user.id,
                    InvoiceRecord.store_id == store_id
                )
            )
        
        records = db.session.execute(stmt).scalars().all()
        
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
            'Vendor Code': r.vendor_code
        } for r in records])
    
    return protected_get_records()

@app.route('/api/init-stores', methods=['POST'])
def init_stores():
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
    return jsonify({'success': True, 'message': 'Stores initialized'})

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Register Replit Auth blueprint after all routes are defined
from replit_auth import make_replit_blueprint
from flask_login import current_user

app.register_blueprint(make_replit_blueprint(), url_prefix="/auth")

# Make session permanent
@app.before_request
def make_session_permanent():
    from flask import session
    session.permanent = True

if __name__ == '__main__':
    init_database()
    app.run(host='0.0.0.0', port=5000, debug=False)
