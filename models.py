from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from extensions import Base, db
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from flask_login import UserMixin

# Replit Auth Models (IMPORTANT: Don't drop these tables)
class User(UserMixin, Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String, unique=True)
    first_name: Mapped[Optional[str]] = mapped_column(String)
    last_name: Mapped[Optional[str]] = mapped_column(String)
    profile_image_url: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

class OAuth(OAuthConsumerMixin, Base):
    __tablename__ = 'oauth'

    user_id: Mapped[str] = mapped_column(String, ForeignKey('users.id'))
    browser_session_key: Mapped[str] = mapped_column(String, nullable=False)
    user: Mapped["User"] = relationship()

    __table_args__ = (
        UniqueConstraint('user_id', 'browser_session_key', 'provider', 
                        name='uq_user_browser_session_key_provider'),
    )

# Application Models
class Store(Base):
    __tablename__ = 'stores'

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(200))
    address_patterns: Mapped[str] = mapped_column(Text)

    uploads: Mapped[list["Upload"]] = relationship(back_populates="store")
    records: Mapped[list["InvoiceRecord"]] = relationship(back_populates="store")

class Upload(Base):
    __tablename__ = 'uploads'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey('users.id'))
    store_id: Mapped[str] = mapped_column(String(50), ForeignKey('stores.id'))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    file_size: Mapped[int] = mapped_column(Integer)

    user: Mapped["User"] = relationship()
    store: Mapped["Store"] = relationship(back_populates="uploads")
    records: Mapped[list["InvoiceRecord"]] = relationship(back_populates="upload")

class InvoiceRecord(Base):
    __tablename__ = 'invoice_records'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey('users.id'))
    upload_id: Mapped[int] = mapped_column(Integer, ForeignKey('uploads.id'))
    store_id: Mapped[str] = mapped_column(String(50), ForeignKey('stores.id'))

    invoice_number: Mapped[Optional[str]] = mapped_column(String(50))
    invoice_date: Mapped[Optional[str]] = mapped_column(String(50))
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))
    address: Mapped[Optional[str]] = mapped_column(String(500))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(10))
    zip_code: Mapped[Optional[str]] = mapped_column(String(20))

    product_code: Mapped[Optional[str]] = mapped_column(String(100))
    product_description: Mapped[Optional[str]] = mapped_column(Text)
    brand: Mapped[Optional[str]] = mapped_column(String(100))
    category: Mapped[Optional[str]] = mapped_column(String(100))
    pack_size: Mapped[Optional[str]] = mapped_column(String(50))

    quantity: Mapped[Optional[float]] = mapped_column(Float)
    unit_price: Mapped[Optional[float]] = mapped_column(Float)
    extended_price: Mapped[Optional[float]] = mapped_column(Float)

    vendor: Mapped[Optional[str]] = mapped_column(String(255))
    vendor_code: Mapped[Optional[str]] = mapped_column(String(50))

    user: Mapped["User"] = relationship()
    upload: Mapped["Upload"] = relationship(back_populates="records")
    store: Mapped["Store"] = relationship(back_populates="records")