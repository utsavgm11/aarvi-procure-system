# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text, Date
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empcode = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MaterialTicket(Base):
    __tablename__ = "material_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, nullable=False)
    project_code = Column(String, nullable=False)
    project_name = Column(String, nullable=False)
    coordinator_id = Column(Integer, ForeignKey("users.id"))
    
    assigned_site_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_project_manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    category = Column(String, default="GOODS")
    status = Column(String, default="Pending Site Manager")
    created_at = Column(DateTime, default=datetime.utcnow)

class TicketItem(Base):
    __tablename__ = "ticket_items"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, ForeignKey("material_tickets.ticket_number", ondelete="CASCADE"))
    item_index = Column(Integer, nullable=False)
    product_description = Column(Text, nullable=False)
    make_brand = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    purpose = Column(String, nullable=False)
    
    is_reimbursable = Column(Boolean, default=False)
    reimbursement_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    item_type = Column(String, default="Consumable")

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

    # 🎯 NEW: Unified Recurring / Subscription Fields
    is_recurring = Column(Boolean, default=False)
    recurring_type = Column(String, default="FIXED_LEASE")
    billing_cycle = Column(String, default="MONTHLY")
    contract_tenure_months = Column(Integer, default=1)
    monthly_rate = Column(Numeric(12, 2), default=0.00)
    approved_spending_cap = Column(Numeric(12, 2), default=0.00)

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
    
    signed_po_url = Column(String, nullable=True)
    
    invoice_no = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    invoice_remark = Column(String, nullable=True)
    invoice_duration = Column(String, nullable=True)
    proforma_invoice_url = Column(String, nullable=True)
    
    tax_invoice_no = Column(String, nullable=True)
    tax_invoice_date = Column(String, nullable=True)
    tax_invoice_url = Column(String, nullable=True)
    
    utr_no = Column(String, nullable=True)
    payment_date = Column(String, nullable=True)
    payment_remark = Column(String, nullable=True)
    payment_advice_url = Column(String, nullable=True)
    
    disbursed_amount = Column(Numeric(12, 2), default=0.00)
    
    # 🎯 NEW: Accounts Tax Tracking
    tds_deducted = Column(Numeric(12, 2), default=0.00)
    
    # 🎯 NEW: GST Portal Verification Flow
    gst_status = Column(String, default="Pending")
    gst_clearance_date = Column(String, nullable=True)
    gst_verified_by = Column(String, nullable=True)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    address = Column(String)
    contact_number = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)
    
    # 🎯 NEW: Financial & Tax Identifiers
    gst_number = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    bank_details = Column(Text, nullable=True)
    
    # 🎯 NEW: 7-Slot Document Vault URLs
    aadhar_url = Column(String, nullable=True)
    pan_url = Column(String, nullable=True)
    reg_cert_url = Column(String, nullable=True)
    gst_cert_url = Column(String, nullable=True)
    electricity_bill_url = Column(String, nullable=True)
    cancelled_cheque_url = Column(String, nullable=True)
    iso_cert_url = Column(String, nullable=True)