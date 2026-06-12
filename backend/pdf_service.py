import os
from datetime import date
from docxtpl import DocxTemplate

def generate_word_po(po_number: str, ticket_category: str, project_name: str, project_code: str, primary_quote, winning_quotes_list) -> str:
    """
    Generates a professional Word Purchase Order document using
    the official corporate letterhead template.
    """
    # 1. Ensure the output directory folder exists
    output_dir = os.path.join("storage", "pos")
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{po_number}.docx")
    
    # 2. Map the category to the correct Word template file
    template_map = {
        "GOODS": "template_goods.docx",
        "VEHICLE": "template_vehicle.docx",
        "ACCOMMODATION": "template_accommodation.docx"
    }
    template_filename = template_map.get(ticket_category, "template_goods.docx")
    
    # 3. Load the official Aarvi Encon letterhead template
    try:
        doc = DocxTemplate(template_filename)
    except Exception as e:
        raise FileNotFoundError(f"Ensure '{template_filename}' is placed in the root directory. Error: {str(e)}")

    # 4. Calculate financial totals
    base_grand_total = 0.0
    net_grand_total = 0.0
    items_data = []

    for idx, item in enumerate(winning_quotes_list, start=1):
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
        base_grand_total += base_val
        net_grand_total += float(item.total_amount or 0)

    # 5. Build the exact data dictionary mapping to your Word {{ TAGS }}
    context = {
        "po_number": po_number.split('-')[-1],
        "category_code": ticket_category[:4].upper(),
        "date": date.today().strftime('%d-%m-%Y'),
        "vendor_name": primary_quote.vendor_name,
        "vendor_address": primary_quote.vendor_address or "Address Not Provided",
        "vendor_contact": primary_quote.vendor_contact or "N/A",
        "vendor_email": primary_quote.vendor_email or "N/A",
        "project_name": project_name,
        "project_code": project_code,
        "delivery_address": primary_quote.delivery_address or "As per site guidelines",
        "site_contact": primary_quote.site_contact_person or "Site In-Charge",
        "site_phone": primary_quote.site_contact_phone or "N/A",
        "base_total": f"{base_grand_total:,.2f}",
        "gst_adjustment": f"{(net_grand_total - base_grand_total):,.2f}",
        "net_amount": f"{net_grand_total:,.2f}",
        "items": items_data
    }

    # 6. Inject the data, render the tables, and save the final file to disk
    doc.render(context)
    doc.save(file_path)
    
    return file_path