# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text, Date
from database import Base

class User(Base):
    __tablename__ = "users"
    
    # 🔢 System Serial Number (Keeps row count, tracks relationships behind the scenes)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 🆔 Real Functional Employee Code (AEL-SM-01, etc.)
    empcode = Column(String(50), unique=True, nullable=False, index=True)
    
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    # 🎯 Used for Soft Deletion (Blocking access without crashing data)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MaterialTicket(Base):
    __tablename__ = "material_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, nullable=False)
    project_code = Column(String, nullable=False)
    project_name = Column(String, nullable=False)
    coordinator_id = Column(Integer, ForeignKey("users.id"))
    
    # 🎯 NEW: Dynamic Routing Assignments
    assigned_site_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_project_manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    category = Column(String, default="GOODS")
    status = Column(String, default="Pending Site Manager")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Note: is_reimbursable removed from here and moved to TicketItem

class TicketItem(Base):
    __tablename__ = "ticket_items"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, ForeignKey("material_tickets.ticket_number", ondelete="CASCADE"))
    item_index = Column(Integer, nullable=False)
    product_description = Column(Text, nullable=False)
    make_brand = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    purpose = Column(String, nullable=False)
    
    # 🎯 NEW: Financial tracking flags shifted to the LINE-ITEM level
    is_reimbursable = Column(Boolean, default=False)
    reimbursement_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, ForeignKey("material_tickets.ticket_number", ondelete="CASCADE"))
    item_index = Column(Integer, nullable=False)
    vendor_name = Column(String, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    product_description = Column(Text, nullable=True)
    make_brand = Column(String, nullable=True)
    quantity = Column(Integer, nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=True)
    gst_percentage = Column(Numeric(5, 2), nullable=True)
    freight_charges = Column(Numeric(12, 2), nullable=True)
    time_of_delivery = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    file_url = Column(String, nullable=True)
    special_terms = Column(Text, nullable=True)
    is_selected = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    quality_remarks = Column(Text, nullable=True)
    
    vendor_address = Column(Text, nullable=True)
    vendor_contact = Column(String, nullable=True)
    vendor_email = Column(String, nullable=True)
    delivery_address = Column(Text, nullable=True)
    site_contact_person = Column(String, nullable=True)
    site_contact_phone = Column(String, nullable=True)
    base_total_value = Column(Numeric(12, 2), default=0.00)
    net_amount_payable = Column(Numeric(12, 2), default=0.00)

class TicketHistory(Base):
    __tablename__ = "ticket_history"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, ForeignKey("material_tickets.ticket_number", ondelete="CASCADE"))
    user_name = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, nullable=False)
    ticket_number = Column(String, ForeignKey("material_tickets.ticket_number", ondelete="CASCADE"))
    generated_at = Column(DateTime, default=datetime.utcnow)
    pdf_url = Column(String, nullable=False)
    invoice_no = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    invoice_remark = Column(String, nullable=True)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    address = Column(String)
    contact_number = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)    