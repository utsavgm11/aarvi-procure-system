import random
import logging
import os
import shutil
import io
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_  
from database import get_db
from docxtpl import DocxTemplate
import models

# 1. System Logging Configurations
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AarviProcure")
app = FastAPI(title="Aarvi Encon - Workflow ERP Engine", version="3.0.0")

# 🎯 NEW: Create and Mount Storage Directory for Uploaded Documents
UPLOAD_DIR = "storage/quotation_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# 2. Complete CORS Cross-Origin Resource Sharing Rules
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# -------------------------------------------------------------------
# PYDANTIC INCOMING DATA VALIDATORS (Data Contracts)
# -------------------------------------------------------------------
class RequisitionRowItem(BaseModel):
    product_description: str
    make_brand: Optional[str] = None
    quantity: int
    purpose: str

class CreateRequisitionPayload(BaseModel):
    project_code: str
    project_name: str
    coordinator_id: int
    category: str 
    assigned_site_manager_id: Optional[int] = None
    assigned_project_manager_id: int
    items: List[RequisitionRowItem]

class UpdateRequisitionItem(BaseModel):
    item_index: int
    product_description: str
    make_brand: Optional[str] = None
    quantity: int
    purpose: str
    is_reimbursable: Optional[bool] = False 

class ProposeEditsPayload(BaseModel):
    user_name: str
    user_role: str
    remarks: str
    items: List[UpdateRequisitionItem]

class DualApprovalPayload(BaseModel):
    user_name: str
    user_role: str
    items: Optional[List[UpdateRequisitionItem]] = None 

class QuotationRowItem(BaseModel):
    item_index: int
    vendor_name: str
    total_amount: float
    product_description: Optional[str] = None
    make_brand: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    gst_percentage: Optional[float] = None
    freight_charges: Optional[float] = None
    time_of_delivery: Optional[str] = None
    payment_terms: Optional[str] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    file_url: Optional[str] = None
    special_terms: Optional[str] = None
    quality_remarks: Optional[str] = None
    
    vendor_address: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_email: Optional[str] = None
    delivery_address: Optional[str] = None
    site_contact_person: Optional[str] = None
    site_contact_phone: Optional[str] = None
    base_total_value: Optional[float] = 0.0
    net_amount_payable: Optional[float] = 0.0

class SubmitQuotationsPayload(BaseModel):
    quotations: List[QuotationRowItem]

class FinanceApprovalPayload(BaseModel):
    user_name: str
    action: str 
    remarks: Optional[str] = None
    selected_bids: Optional[dict] = None  
    items: Optional[List[UpdateRequisitionItem]] = None 

# -------------------------------------------------------------------
# STAGE 0: LIVE PERSONNEL ROUTING
# -------------------------------------------------------------------
@app.get("/api/users/by-role", response_model=List[dict])
def get_active_users_by_role(role: str, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(
        models.User.role == role,
        models.User.is_active == True
    ).order_by(models.User.name.asc()).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in users]

# -------------------------------------------------------------------
# STAGE 1: SITE COORDINATOR ENTRY GATEWAY
# -------------------------------------------------------------------
@app.post("/api/requisitions", status_code=201)
def raise_material_requisition(payload: CreateRequisitionPayload, db: Session = Depends(get_db)):
    ticket_number = f"REQ-2026-{random.randint(100000, 999999)}"
    initial_status = "Vetting Active" if payload.assigned_site_manager_id else "Pending PM Vetting"
    
    master_ticket = models.MaterialTicket(
        ticket_number=ticket_number,
        project_code=payload.project_code,
        project_name=payload.project_name,
        coordinator_id=payload.coordinator_id,
        category=payload.category,
        assigned_site_manager_id=payload.assigned_site_manager_id,
        assigned_project_manager_id=payload.assigned_project_manager_id,
        status=initial_status
    )
    db.add(master_ticket)
    
    for idx, row in enumerate(payload.items, start=1):
        db_item = models.TicketItem(
            ticket_number=ticket_number,
            item_index=idx,
            product_description=row.product_description,
            make_brand=row.make_brand,
            quantity=row.quantity,
            purpose=row.purpose
        )
        db.add(db_item)
        
    history = models.TicketHistory(
        ticket_number=ticket_number,
        user_name=f"User ID: {payload.coordinator_id}",
        action_taken="Ticket Raised",
        remarks=f"Material Sheet uploaded. Routed to {'Site Manager' if payload.assigned_site_manager_id else 'Project Manager'}."
    )
    db.add(history)
    db.commit()
    
    logger.info(f"💾 [GRID SAVED] -> Requisition {ticket_number} pushed to {initial_status}.")
    return {"ticket_number": ticket_number, "status": initial_status}

# -------------------------------------------------------------------
# STAGE 2: DUAL-SIGNATURE NEGOTIATION LOOP 
# -------------------------------------------------------------------
@app.put("/api/requisitions/{ticket_number}/propose-edits")
def propose_ticket_edits(ticket_number: str, payload: ProposeEditsPayload, db: Session = Depends(get_db)):
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == ticket_number).first()
    if not ticket: raise HTTPException(status_code=404, detail="Requisition not found.")
        
    db.query(models.TicketItem).filter(models.TicketItem.ticket_number == ticket_number).delete()
    for row in payload.items:
        db.add(models.TicketItem(
            ticket_number=ticket_number,
            item_index=row.item_index,
            product_description=row.product_description,
            make_brand=row.make_brand,
            quantity=row.quantity,
            purpose=row.purpose,
            is_reimbursable=row.is_reimbursable
        ))
        
    if payload.user_role in ["Site Manager", "Project Manager"]:
        ticket.status = "Awaiting Coordinator Sign-Off"
    else:
        ticket.status = "Vetting Active" if ticket.assigned_site_manager_id else "Pending PM Vetting"
    
    db.add(models.TicketHistory(
        ticket_number=ticket_number,
        user_name=payload.user_name,
        action_taken="Proposed Counter-Edits",
        remarks=payload.remarks
    ))
    db.commit()
    return {"ticket_number": ticket_number, "status": ticket.status}

@app.put("/api/requisitions/{ticket_number}/approve")
def dual_sign_approve(ticket_number: str, payload: DualApprovalPayload, db: Session = Depends(get_db)):
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == ticket_number).first()
    if not ticket: raise HTTPException(status_code=404, detail="Requisition not found.")
    
    if payload.items:
        db.query(models.TicketItem).filter(models.TicketItem.ticket_number == ticket_number).delete()
        for row in payload.items:
            db.add(models.TicketItem(
                ticket_number=ticket_number,
                item_index=row.item_index,
                product_description=row.product_description,
                make_brand=row.make_brand,
                quantity=row.quantity,
                purpose=row.purpose,
                is_reimbursable=row.is_reimbursable
            ))
            
    remarks_text = f"List Approved & Locked by {payload.user_role}."
    if payload.user_role in ["Site Manager", "Project Manager"]:
        if ticket.status == "Approved by Coordinator" or ticket.status == "Pending PM Vetting":
            ticket.status = "Pending Sourcing"
            remarks_text += " Technical Vetting complete. Dispatched to Purchasing Desk."
        else:
            ticket.status = "Approved by Manager"
            
    elif payload.user_role == "Site Coordinator":
        if ticket.status == "Approved by Manager":
            ticket.status = "Pending Sourcing"
            remarks_text += " Technical Vetting complete. Dispatched to Purchasing Desk."
        else:
            ticket.status = "Approved by Coordinator"
            
    db.add(models.TicketHistory(
        ticket_number=ticket_number,
        user_name=payload.user_name,
        action_taken="Explicit Sign-Off Applied",
        remarks=remarks_text
    ))
    db.commit()
    return {"ticket_number": ticket_number, "status": ticket.status}

# -------------------------------------------------------------------
# STAGE 3: PURCHASING DESK QUOTATION ATTACHMENT
# -------------------------------------------------------------------
@app.post("/api/upload/quotation")
async def upload_quotation_document(
    ticket_number: str,
    item_index: int,
    option_index: int,
    file: UploadFile = File(...)
):
    # Extension validation isolation check
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Only PDF, DOC, and DOCX are allowed.")
    
    # 🎯 SYSTEMATIC NAMING ASSIGNMENT: Tracking strings structure
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    systematic_name = f"QUOTE_{ticket_number}_ROW{item_index}_OPT{option_index}_{timestamp}{ext}"
    target_destination = os.path.join(UPLOAD_DIR, systematic_name)
    
    try:
        with open(target_destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disk write failure: {str(e)}")
        
    return {"file_url": f"/storage/quotation_files/{systematic_name}"}

@app.post("/api/requisitions/{ticket_number}/quotations")
def attach_vendor_quotations(ticket_number: str, payload: SubmitQuotationsPayload, db: Session = Depends(get_db)):
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == ticket_number).first()
    if not ticket: raise HTTPException(status_code=404, detail="Active requisition sheet not found.")
        
    highest_landed_total = 0.0
    for quote in payload.quotations:
        # 1. Save the actual quotation to the ticket
        db_quote = models.Quotation(
            ticket_number=ticket_number,
            item_index=quote.item_index,
            vendor_name=quote.vendor_name,
            total_amount=quote.total_amount,
            product_description=quote.product_description,
            make_brand=quote.make_brand,
            quantity=quote.quantity,
            unit_price=quote.unit_price,
            gst_percentage=quote.gst_percentage,
            freight_charges=quote.freight_charges,
            time_of_delivery=quote.time_of_delivery,
            payment_terms=quote.payment_terms,
            contract_start_date=quote.contract_start_date,
            contract_end_date=quote.contract_end_date,
            file_url=getattr(quote, "file_url", "No attachment provided"),
            special_terms=quote.special_terms,
            quality_remarks=quote.quality_remarks,
            vendor_address=quote.vendor_address,
            vendor_contact=quote.vendor_contact,
            vendor_email=quote.vendor_email,
            delivery_address=quote.delivery_address,
            site_contact_person=quote.site_contact_person,
            site_contact_phone=quote.site_contact_phone,
            base_total_value=quote.base_total_value,
            net_amount_payable=quote.net_amount_payable
        )
        db.add(db_quote)
        
        # 🎯 NEW: SILENT AUTO-LEARN VENDOR DIRECTORY ENGINE
        if quote.vendor_name:
            clean_name = quote.vendor_name.strip()
            existing_vendor = db.query(models.Vendor).filter(models.Vendor.name == clean_name).first()
            if not existing_vendor:
                # Never seen this vendor before? Save it to the master list automatically!
                new_vendor = models.Vendor(
                    name=clean_name,
                    address=quote.vendor_address or "",
                    contact_number=quote.vendor_contact or "",
                    email=quote.vendor_email or "",
                    is_active=True
                )
                db.add(new_vendor)
        
        # 3. Calculate routing logic
        if quote.total_amount > highest_landed_total:
            highest_landed_total = quote.total_amount
            
    if highest_landed_total <= 1000000:
        ticket.status = "Pending Project Manager"
        routing_msg = f"Order matrix value (Highest Total: ₹{highest_landed_total:,.2f}) routed directly to Project Manager for mandatory clearance."
    else: 
        ticket.status = "Pending Director"
        routing_msg = f"High-value corporate order exceeding ₹10L (Highest Total: ₹{highest_landed_total:,.2f}). Routed to Executive Director Board."
        
    db.add(models.TicketHistory(
        ticket_number=ticket_number,
        user_name="Procurement Desk Officer",
        action_taken="Quotations Processed",
        remarks=routing_msg
    ))
    db.commit()
    return {"ticket_number": ticket_number, "status": ticket.status}
# -------------------------------------------------------------------
# STAGE 4 & 5: MANAGEMENT SIGN-OFF & AUTOMATED DOCUMENT COMPILATION
# -------------------------------------------------------------------
@app.post("/api/requisitions/{ticket_number}/action")
def process_financial_signoff(ticket_number: str, payload: FinanceApprovalPayload, db: Session = Depends(get_db)):
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == ticket_number).first()
    if not ticket: raise HTTPException(status_code=404, detail="Requisition not found.")
    
    if payload.action == "Approve":
        if not payload.selected_bids:
            raise HTTPException(status_code=400, detail="You must select a winning bid for the items to approve.")
            
        if payload.items:
            for row in payload.items:
                db.query(models.TicketItem).filter(
                    models.TicketItem.ticket_number == ticket_number,
                    models.TicketItem.item_index == row.item_index
                ).update({"is_reimbursable": row.is_reimbursable})
                
        for item_idx_str, winning_vendor in payload.selected_bids.items():
            item_idx = int(item_idx_str)
            db.query(models.Quotation).filter(
                models.Quotation.ticket_number == ticket_number,
                models.Quotation.item_index == item_idx,
                models.Quotation.vendor_name == winning_vendor
            ).update({"is_selected": True})
            
        ticket.status = "Awaiting Digital Signature"
        po_number = f"PO-2026-{random.randint(100000, 999999)}"
        
        new_po = models.PurchaseOrder(
            po_number=po_number,
            ticket_number=ticket_number,
            pdf_url=f"/storage/aarvi_pos/{po_number}.pdf"
        )
        db.add(new_po)
        remarks_text = f"Budget cleared by {payload.user_name}. Winning vendor bids locked. Draft PO template {po_number} generated and sent to Purchasing Department."
        
    elif payload.action == "Raise Query":
        ticket.status = "Query Raised"
        remarks_text = f"Query flagged by {payload.user_name}: {payload.remarks}"
    else:
        raise HTTPException(status_code=400, detail="Invalid operational action type.")
        
    db.add(models.TicketHistory(
        ticket_number=ticket_number,
        user_name=payload.user_name,
        action_taken=payload.action,
        remarks=remarks_text
    ))
    db.commit()
    return {"ticket_number": ticket_number, "status": ticket.status}

# -------------------------------------------------------------------
# STAGE 6: PURCHASE ORDER DIGITAL SIGNATURE COMPLETION
# -------------------------------------------------------------------
@app.post("/api/purchase-orders/{po_number}/sign")
def sign_and_finalize_purchase_order(po_number: str, payload: DualApprovalPayload, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order records not found.")
        
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == po.ticket_number).first()
    if ticket:
        ticket.status = "Approved"
        
    db.add(models.TicketHistory(
        ticket_number=po.ticket_number,
        user_name=payload.user_name,
        action_taken="Explicit Sign-Off Applied", 
        remarks=f"PO Sealed & Dispatched: Purchase Order {po_number} digitally verified, sealed, and released for logistics tracking by {payload.user_name}."
    ))
    db.commit()
    return {"po_number": po_number, "status": "Approved"}

# -------------------------------------------------------------------
# SYNCHRONIZATION ENDPOINTS (Live Dashboard Tracking)
# -------------------------------------------------------------------
@app.get("/api/requisitions/pending-vetting/{manager_id}", response_model=List[dict])
def get_pending_vetting_tickets(manager_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        or_(
            (models.MaterialTicket.assigned_site_manager_id == manager_id) & 
            (models.MaterialTicket.status.in_(["Vetting Active", "Approved by Coordinator"])),
            
            (models.MaterialTicket.assigned_project_manager_id == manager_id) & 
            (models.MaterialTicket.status == "Pending PM Vetting"),
            
            (models.MaterialTicket.assigned_site_manager_id == None) & 
            (models.MaterialTicket.status.in_(["Vetting Active", "Approved by Coordinator"]))
        )
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    return [
        {
            "ticket_number": t.ticket_number, 
            "project_code": t.project_code, 
            "project_name": t.project_name, 
            "status": t.status,
            "category": t.category
        } for t in tickets
    ]

@app.get("/api/requisitions/pending-handshake/{coordinator_id}", response_model=List[dict])
def get_coordinator_handshake_queue(coordinator_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.coordinator_id == coordinator_id,
        models.MaterialTicket.status.in_(["Awaiting Coordinator Sign-Off", "Approved by Manager"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    return [{"ticket_number": t.ticket_number, "project_name": t.project_name, "status": t.status, "category": t.category} for t in tickets]

@app.get("/api/requisitions/{ticket_number}/items", response_model=List[dict])
def get_ticket_line_items(ticket_number: str, db: Session = Depends(get_db)):
    items = db.query(models.TicketItem).filter(models.TicketItem.ticket_number == ticket_number).order_by(models.TicketItem.item_index.asc()).all()
    return [{"item_index": i.item_index, "product_description": i.product_description, "make_brand": i.make_brand, "quantity": i.quantity, "purpose": i.purpose, "is_reimbursable": i.is_reimbursable} for i in items]

@app.get("/api/requisitions/{ticket_number}/history", response_model=List[dict])
def get_ticket_history_logs(ticket_number: str, db: Session = Depends(get_db)):
    logs = db.query(models.TicketHistory).filter(models.TicketHistory.ticket_number == ticket_number).order_by(models.TicketHistory.timestamp.desc()).all()
    return [{"user_name": l.user_name, "action_taken": l.action_taken, "remarks": l.remarks, "timestamp": str(l.timestamp)} for l in logs]

@app.get("/api/requisitions/pending-purchase-approval", response_model=List[dict])
def get_pending_purchase_approval_tickets(db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.status == "Pending Purchase Approval"
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    return [{"ticket_number": t.ticket_number, "project_code": t.project_code, "project_name": t.project_name, "status": t.status, "category": t.category} for t in tickets]

@app.get("/api/requisitions/coordinator-history/{coordinator_id}", response_model=List[dict])
def get_coordinator_completed_history(coordinator_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.coordinator_id == coordinator_id,
        models.MaterialTicket.status.notin_(["Vetting Active", "Awaiting Coordinator Sign-Off"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == t.ticket_number,
            models.TicketHistory.action_taken.in_(["Ticket Raised", "Explicit Sign-Off Applied"])
        ).order_by(models.TicketHistory.id.desc()).first()
        
        response.append({
            "ticket_number": t.ticket_number,
            "project_code": t.project_code,
            "project_name": t.project_name,
            "status": t.status,
            "action_date": str(log.timestamp.strftime('%d-%m-%Y %H:%M')) if log else "Date Unavailable"
        })
    return response

@app.get("/api/requisitions/manager-history/{manager_id}", response_model=List[dict])
def get_manager_vetted_history_ledger(manager_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        or_(
            models.MaterialTicket.assigned_site_manager_id == manager_id,
            models.MaterialTicket.assigned_site_manager_id == None
        ),
        models.MaterialTicket.status.notin_(["Vetting Active", "Awaiting Coordinator Sign-Off", "Approved by Manager"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == t.ticket_number,
            models.TicketHistory.action_taken == "Explicit Sign-Off Applied"
        ).order_by(models.TicketHistory.id.desc()).first()
        
        response.append({
            "ticket_number": t.ticket_number,
            "project_code": t.project_code,
            "project_name": t.project_name,
            "status": t.status,
            "category": t.category,
            "created_at": str(t.created_at.strftime('%d-%m-%Y %H:%M')) if t.created_at else "N/A",
            "action_date": str(log.timestamp.strftime('%d-%m-%Y %H:%M')) if log else "Date Unavailable"
        })
    return response

@app.get("/api/requisitions/pending-sourcing", response_model=List[dict])
def get_pending_sourcing_tickets(db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.status == "Pending Sourcing"
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    return [{"ticket_number": t.ticket_number, "project_code": t.project_code, "project_name": t.project_name, "status": t.status, "category": t.category} for t in tickets]

@app.get("/api/requisitions/purchase-history", response_model=List[dict])
def get_purchase_history(db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.status.in_(["Pending Project Manager", "Pending Director", "Awaiting Digital Signature", "Approved", "Dispatched"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == t.ticket_number,
            models.TicketHistory.action_taken.in_(["Quotations Processed", "PO Digitally Signed", "Explicit Sign-Off Applied"])
        ).order_by(models.TicketHistory.id.desc()).first()
        
        response.append({
            "ticket_number": t.ticket_number,
            "project_code": t.project_code,
            "project_name": t.project_name,
            "status": t.status,
            "action_date": str(log.timestamp.strftime('%d-%m-%Y %H:%M')) if log else "Date Unavailable",
            "category": t.category
        })
    return response

@app.get("/api/requisitions/pending-management-approval/{manager_id}", response_model=List[dict])
def get_pending_management_approval_tickets(manager_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == manager_id).first()
    is_director = getattr(user, "role", "") == "Director"
    if is_director:
        tickets = db.query(models.MaterialTicket).filter(
            models.MaterialTicket.status.in_(["Pending Director", "Query Raised"])
        ).order_by(models.MaterialTicket.created_at.desc()).all()
    else:
        tickets = db.query(models.MaterialTicket).filter(
            or_(
                models.MaterialTicket.assigned_project_manager_id == manager_id,
                models.MaterialTicket.assigned_project_manager_id == None
            ),
            models.MaterialTicket.status.in_(["Pending Project Manager", "Query Raised"])
        ).order_by(models.MaterialTicket.created_at.desc()).all()
        
    return [{"ticket_number": t.ticket_number, "project_code": t.project_code, "project_name": t.project_name, "status": t.status} for t in tickets]

@app.get("/api/requisitions/pm-history/{manager_id}", response_model=List[dict])
def get_pm_history(manager_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        or_(
            models.MaterialTicket.assigned_project_manager_id == manager_id,
            models.MaterialTicket.assigned_project_manager_id == None
        ),
        models.MaterialTicket.status.in_(["Pending Director", "Awaiting Digital Signature", "Approved", "Dispatched"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == t.ticket_number,
            models.TicketHistory.action_taken == "Approve"
        ).order_by(models.TicketHistory.id.desc()).first()
        
        response.append({
            "ticket_number": t.ticket_number,
            "project_code": t.project_code,
            "project_name": t.project_name,
            "status": t.status,
            "approval_date": str(log.timestamp.strftime('%d-%m-%Y %H:%M')) if log else "Date Unavailable"
        })
    return response

@app.get("/api/requisitions/director-history", response_model=List[dict])
def get_director_history(db: Session = Depends(get_db)):
    tickets = db.query(models.MaterialTicket).filter(
        models.MaterialTicket.status.in_(["Awaiting Digital Signature", "Approved", "Dispatched"])
    ).order_by(models.MaterialTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == t.ticket_number,
            models.TicketHistory.action_taken == "Approve"
        ).order_by(models.TicketHistory.id.desc()).first()
        
        response.append({
            "ticket_number": t.ticket_number,
            "project_code": t.project_code,
            "project_name": t.project_name,
            "status": t.status,
            "approval_date": str(log.timestamp.strftime('%d-%m-%Y %H:%M')) if log else "Date Unavailable"
        })
    return response

@app.get("/api/requisitions/{ticket_number}/quotations", response_model=List[dict])
def get_ticket_vendor_quotations(ticket_number: str, db: Session = Depends(get_db)):
    quotes = db.query(models.Quotation).filter(models.Quotation.ticket_number == ticket_number).all()
    items_map = {
        i.item_index: i for i in db.query(models.TicketItem).filter(models.TicketItem.ticket_number == ticket_number).all()
    }
    return [
        {
            "item_index": q.item_index,
            "vendor_name": q.vendor_name,
            "total_amount": float(q.total_amount),
            "product_description": q.product_description,
            "make_brand": q.make_brand,
            "quantity": q.quantity,
            "time_of_delivery": q.time_of_delivery,
            "special_terms": q.special_terms,
            "is_selected": q.is_selected,
            "quality_remarks": q.quality_remarks,
            "vendor_address": q.vendor_address,
            "vendor_contact": q.vendor_contact,
            "vendor_email": q.vendor_email,
            "delivery_address": q.delivery_address,
            "site_contact_person": q.site_contact_person,
            "site_contact_phone": q.site_contact_phone,
            "base_total_value": float(q.base_total_value or 0),
            "net_amount_payable": float(q.net_amount_payable or 0)
        } for q in quotes
    ]

@app.get("/api/purchase-orders/pending-signature", response_model=List[dict])
def get_purchase_orders_awaiting_signature(db: Session = Depends(get_db)):
    orders = db.query(
        models.PurchaseOrder, 
        models.MaterialTicket
    ).join(
        models.MaterialTicket, models.PurchaseOrder.ticket_number == models.MaterialTicket.ticket_number
    ).filter(models.MaterialTicket.status == "Awaiting Digital Signature").all()
    
    response = []
    for po_obj, ticket_obj in orders:
        winning_quotes = db.query(models.Quotation).filter(
            models.Quotation.ticket_number == po_obj.ticket_number,
            models.Quotation.is_selected == True
        ).all()
        
        grand_total = sum(q.total_amount for q in winning_quotes)
        vendor_names = list(set(q.vendor_name for q in winning_quotes))
        primary_vendor = vendor_names[0] if vendor_names else "Pending Vendor Linking"
        if len(vendor_names) > 1:
            primary_vendor += f" (+{len(vendor_names)-1} more)"
        response.append({
            "po_number": po_obj.po_number,
            "ticket_number": po_obj.ticket_number,
            "vendor_name": primary_vendor,
            "grand_total": float(grand_total),
            "project_name": ticket_obj.project_name,
            "project_code": ticket_obj.project_code,
            "status": "Awaiting Digital Signature",
            "approved_by": "Pending Executive Seal",
            "category": ticket_obj.category 
        })
        
    return response

# -------------------------------------------------------------------
# WORD DOCUMENT GENERATION ENGINE
# -------------------------------------------------------------------
@app.get("/api/purchase-orders/{po_number}/download-docx")
def download_word_purchase_order(po_number: str, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found in database.")
        
    ticket = db.query(models.MaterialTicket).filter(models.MaterialTicket.ticket_number == po.ticket_number).first()
    winning_quotes = db.query(models.Quotation).filter(
        models.Quotation.ticket_number == po.ticket_number,
        models.Quotation.is_selected == True
    ).all()
    if not winning_quotes:
        raise HTTPException(status_code=400, detail="No selected winning bids found.")
    primary_quote = winning_quotes[0]
    base_grand_total = sum(float(q.base_total_value or 0) for q in winning_quotes)
    net_grand_total = sum(float(q.net_amount_payable or 0) for q in winning_quotes)
    
    def number_to_words(num):
        if num == 0: return 'Zero'
        ones = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
        tens = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety ']
        def convert_less_thousand(n):
            s = ''
            if n >= 100: s += ones[int(n // 100)] + 'Hundred '; n %= 100
            if n >= 20: s += tens[int(n // 10)]; n %= 10
            if n > 0: s += ones[int(n)]
            return s
        str_val = ''
        crore = int(num // 10000000); num %= 10000000
        lakh = int(num // 100000); num %= 100000
        thousand = int(num // 1000); num %= 1000
        if crore > 0: str_val += convert_less_thousand(crore) + 'Crore '
        if lakh > 0: str_val += convert_less_thousand(lakh) + 'Lakh '
        if thousand > 0: str_val += convert_less_thousand(thousand) + 'Thousand '
        if num > 0: str_val += convert_less_thousand(num)
        return str_val.strip() + ' Only'
        
    items_data = []
    for idx, item in enumerate(winning_quotes, start=1):
        qty = item.quantity or 1
        base_val = float(item.base_total_value or 0)
        rate = base_val / qty
        items_data.append({
            "sr": f"0{idx}",
            "desc": f"{item.product_description} [Brand: {item.make_brand}]" if item.make_brand else item.product_description,
            "qty": str(qty),
            "rate": f"{rate:,.2f}",
            "total": f"{base_val:,.2f}"
        })
    try:
        doc = DocxTemplate("official_PO.docx")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template 'official_PO.docx' not found. Error: {str(e)}")
    category_code = ticket.category[:4].upper() if ticket and ticket.category else "GEN"
    context = {
        "po_number": po_number.split('-')[-1],
        "category_code": category_code,
        "date": date.today().strftime('%d-%m-%Y'),
        "vendor_name": primary_quote.vendor_name,
        "vendor_address": primary_quote.vendor_address or "Address Not Provided",
        "vendor_contact": primary_quote.vendor_contact or "N/A",
        "vendor_email": primary_quote.vendor_email or "N/A",
        "project_name": ticket.project_name if ticket else "N/A",
        "project_code": ticket.project_code if ticket else "N/A",
        "delivery_address": primary_quote.delivery_address or "As per site guidelines",
        "site_contact": primary_quote.site_contact_person or "Site In-Charge",
        "site_phone": primary_quote.site_contact_phone or "N/A",
        "base_total": f"{base_grand_total:,.2f}",
        "gst_adjustment": f"{(net_grand_total - base_grand_total):,.2f}",
        "net_amount": f"{net_grand_total:,.2f}",
        "amount_in_words": f"Rupees {number_to_words(int(round(net_grand_total)))}",
        "items": items_data
    }
    doc.render(context)
    
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=Aarvi_{category_code}_{po_number}.docx"}
    )

@app.get("/api/purchase-orders/finalized", response_model=List[dict])
def get_finalized_purchase_orders(db: Session = Depends(get_db)):
    orders = db.query(
        models.PurchaseOrder, 
        models.MaterialTicket
    ).join(
        models.MaterialTicket, models.PurchaseOrder.ticket_number == models.MaterialTicket.ticket_number
    ).filter(models.MaterialTicket.status == "Approved").order_by(models.PurchaseOrder.generated_at.desc()).all()
    
    response = []
    for po_obj, ticket_obj in orders:
        winning_quotes = db.query(models.Quotation).filter(
            models.Quotation.ticket_number == po_obj.ticket_number,
            models.Quotation.is_selected == True
        ).all()
        
        grand_total = sum(q.total_amount for q in winning_quotes)
        primary_quote = winning_quotes[0] if winning_quotes else None
        primary_vendor = primary_quote.vendor_name if primary_quote else "N/A"
        
        items = db.query(models.TicketItem).filter(models.TicketItem.ticket_number == po_obj.ticket_number).all()
        item_list = [
            {
                "desc": i.product_description, 
                "qty": i.quantity, 
                "is_reimbursable": getattr(i, 'is_reimbursable', False)
            } for i in items
        ]
        purposes = list(set([i.purpose for i in items if getattr(i, 'purpose', None)]))
        aggregated_purpose = ", ".join(purposes) if purposes else "General Maintenance"
        sm_log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == po_obj.ticket_number,
            models.TicketHistory.action_taken == "Explicit Sign-Off Applied",
            models.TicketHistory.remarks.contains("Site Manager")
        ).order_by(models.TicketHistory.timestamp.desc()).first()
        site_manager = sm_log.user_name if sm_log else "Pending / N/A"
        pm_log = db.query(models.TicketHistory).filter(
            models.TicketHistory.ticket_number == po_obj.ticket_number,
            models.TicketHistory.action_taken == "Approve"
        ).order_by(models.TicketHistory.timestamp.desc()).first()
        project_manager = pm_log.user_name if pm_log else "Pending / N/A"
        
        response.append({
            "po_number": po_obj.po_number,
            "ticket_number": po_obj.ticket_number,
            "generated_at": po_obj.generated_at.strftime('%d-%b-%Y %I:%M %p') if po_obj.generated_at else "N/A",
            "requisition_date": ticket_obj.created_at.strftime('%d-%b-%Y') if getattr(ticket_obj, 'created_at', None) else "N/A",
            "vendor_name": primary_vendor,
            "vendor_address": getattr(primary_quote, 'vendor_address', 'N/A') if primary_quote else 'N/A',
            "vendor_email": getattr(primary_quote, 'vendor_email', 'N/A') if primary_quote else 'N/A',
            "vendor_contact": getattr(primary_quote, 'vendor_contact', 'N/A') if primary_quote else 'N/A',
            "purpose": aggregated_purpose,
            "grand_total": float(grand_total),
            "project_name": ticket_obj.project_name,
            "project_code": ticket_obj.project_code,
            "site_manager": site_manager,
            "project_manager": project_manager,
            "items": item_list,
            "category": ticket_obj.category,
            "invoice_no": getattr(po_obj, 'invoice_no', '') or '',
            "invoice_date": getattr(po_obj, 'invoice_date', '') or '',
            "invoice_remark": getattr(po_obj, 'invoice_remark', '') or '',
            "invoice_duration": getattr(po_obj, 'invoice_duration', '') or ''
        })
    return response

class InvoiceUpdatePayload(BaseModel):
    invoice_no: str
    invoice_date: str
    invoice_remark: str
    invoice_duration: Optional[str] = ""

@app.put("/api/purchase-orders/{po_number}/invoice")
def update_po_invoice_details(po_number: str, payload: InvoiceUpdatePayload, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order entity not found.")
    
    po.invoice_no = payload.invoice_no
    po.invoice_date = payload.invoice_date
    po.invoice_remark = payload.invoice_remark
    po.invoice_duration = payload.invoice_duration
    
    db.commit()
    return {"message": "Invoice logging verified and saved successfully."}

# -------------------------------------------------------------------
# 🏢 VENDOR MASTER DIRECTORY LAYER
# -------------------------------------------------------------------
class VendorCreatePayload(BaseModel):
    name: str
    address: Optional[str] = ""
    contact_number: Optional[str] = ""
    email: Optional[str] = ""

@app.post("/api/vendors", status_code=201)
def add_new_vendor(payload: VendorCreatePayload, db: Session = Depends(get_db)):
    # Prevent duplicate vendors by checking the exact name
    existing_vendor = db.query(models.Vendor).filter(models.Vendor.name == payload.name).first()
    if existing_vendor:
        raise HTTPException(status_code=400, detail="A vendor with this exact company name already exists in the master directory.")
        
    new_vendor = models.Vendor(
        name=payload.name,
        address=payload.address,
        contact_number=payload.contact_number,
        email=payload.email,
        is_active=True
    )
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return {"message": f"Vendor {payload.name} successfully added to Master Directory."}

@app.get("/api/vendors", response_model=List[dict])
def get_all_vendors(db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).filter(models.Vendor.is_active == True).order_by(models.Vendor.name.asc()).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "address": v.address,
            "contact_number": v.contact_number,
            "email": v.email
        } for v in vendors
    ]    

# -------------------------------------------------------------------
# 🔐 AUTHENTICATION & LOGIN LAYER
# -------------------------------------------------------------------
class LoginPayload(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
def login_user(payload: LoginPayload, db: Session = Depends(get_db)):
    # 1. Look up the user by email
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    
    # 2. Verify existence and password 
    # 🎯 FIXED: Changed to 'user.password_hash' to match your Neon DB structure
    if not user or user.password_hash != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # 3. Ensure the account isn't deactivated
    if getattr(user, 'is_active', True) == False:
        raise HTTPException(status_code=403, detail="This account has been disabled by IT.")
        
    # 4. Return the secure session profile
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

# -------------------------------------------------------------------
# 🛡️ IT ADMIN & USER MANAGEMENT LAYER
# -------------------------------------------------------------------
class AdminCreateUserPayload(BaseModel):
    name: str
    email: str
    password: str
    role: str

class AdminPasswordUpdatePayload(BaseModel):
    email: str
    new_password: str

@app.get("/api/admin/users")
def admin_get_all_users(db: Session = Depends(get_db)):
    # Fetch all users, sorted by role then name
    users = db.query(models.User).order_by(models.User.role.asc(), models.User.name.asc()).all()
    return [
        {
            "id": u.id, 
            "name": u.name, 
            "email": u.email, 
            "role": u.role, 
            "is_active": getattr(u, 'is_active', True)
        } for u in users
    ]

@app.post("/api/admin/users", status_code=201)
def admin_create_user(payload: AdminCreateUserPayload, db: Session = Depends(get_db)):
    # 1. Check if email already exists
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    # 2. Create the new user (🎯 Using password_hash to match your DB)
    new_user = models.User(
        name=payload.name, 
        email=payload.email, 
        password_hash=payload.password, 
        role=payload.role, 
        is_active=True
    )
    db.add(new_user)
    db.commit()
    return {"message": f"User {payload.name} created successfully."}

@app.put("/api/admin/users/password")
def admin_update_user_password(payload: AdminPasswordUpdatePayload, db: Session = Depends(get_db)):
    # 1. Find the user
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # 2. Update their password (🎯 Using password_hash)
    user.password_hash = payload.new_password
    db.commit()
    return {"message": f"Password for {user.name} successfully updated."}

@app.delete("/api/admin/users/{email}")
def admin_delete_user(email: str, db: Session = Depends(get_db)):
    # 1. Locate the target user profile by email
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    # 2. Prevent the system from deleting the main system admin account accidentally
    if user.email == "admin@aarviencon.com":
        raise HTTPException(status_code=400, detail="Root System Admin account cannot be deleted.")

    # 3. Purge the account from the directory
    db.delete(user)
    db.commit()
    
    return {"message": f"Privileges revoked. Account {email} successfully deleted."}


# --- SYSTEM HEALTH ROUTER ---
@app.get("/")
def connection_ping():
    return {"status": "online", "message": "Aarvi Encon SCM Routing Router fully initialized."}