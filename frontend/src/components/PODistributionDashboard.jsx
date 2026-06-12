// src/components/PODistributionDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, Edit3 } from 'lucide-react';
import { Card } from './ui/SharedUI';
import aarviLogo from '../assets/logo.png';
import Letterhead from '../assets/letter_head.jpg';

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function PODistributionDashboard({ currentUser }) {
  const [poList, setPoList] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [poItems, setPoItems] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [pdfEngineReady, setPdfEngineReady] = useState(() => typeof window !== 'undefined' && !!window.html2pdf);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.html2pdf) return;
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => setPdfEngineReady(true);
    document.body.appendChild(script);
  }, []);

  const fetchReleasedPOs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/purchase-orders/pending-signature`);
      setPoList(res.data);
    } catch (err) { 
      console.error("Error fetching POs", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    let isMounted = true;
    setTimeout(() => { if (isMounted) fetchReleasedPOs(); }, 0);
    return () => { isMounted = false; };
  }, []);

  const openPoTemplate = async (po) => {
    setSelectedPo(po);
    setLoading(true);
    try {
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${po.ticket_number}/quotations`);
      const winningLines = quotesRes.data.filter(q => q.is_selected === true);
      setPoItems(winningLines);
    } catch (err) { 
      console.error("Error loading PO items", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // 🎯 STRICT MARGINS & PAGE-BREAK ENGINE
  const handleDownloadPDF = () => {
    if (!pdfEngineReady && !window.html2pdf) {
      alert("PDF engine is still loading. Please wait a moment.");
      return;
    }

    const element = document.getElementById('printable-po');
    const filenameString = `Aarvi_${selectedPo.category}_${selectedPo.po_number}.pdf`;

    const opt = {
      // Top, Right, Bottom, Left margins perfectly balanced (15mm standard)
      margin:       [15, 15, 15, 15], 
      filename:     filenameString,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        windowHeight: element.scrollHeight,
        letterRendering: true
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // Smart algorithm explicitly prevents elements with specific tags/classes from being sliced in half
      pagebreak:    { mode: 'css', avoid: ['tr', 'td', 'p', 'h1', 'h2', 'h3', 'table', '.avoid-break'] }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return 'Zero ';
    const ones = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const tens = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
    const convertLessThanOneThousand = (n) => {
      let str = '';
      if (n >= 100) { str += ones[Math.floor(n / 100)] + 'Hundred '; n %= 100; }
      if (n >= 20) { str += tens[Math.floor(n / 10)]; n %= 10; }
      if (n > 0) { str += ones[n]; }
      return str;
    };

    let str = '';
    const crore = Math.floor(num / 10000000); num %= 10000000;
    const lakh = Math.floor(num / 100000); num %= 100000;
    const thousand = Math.floor(num / 1000); num %= 1000;
    
    if (crore > 0) str += convertLessThanOneThousand(crore) + 'Crore ';
    if (lakh > 0) str += convertLessThanOneThousand(lakh) + 'Lakh ';
    if (thousand > 0) str += convertLessThanOneThousand(thousand) + 'Thousand ';
    if (num > 0) str += convertLessThanOneThousand(num);
    
    return str.trim() + ' Only';
  };

  const renderBrandedHeader = (docTitle, docRefPrefix) => {
    const formattedRefId = selectedPo.po_number.split('-')[2] || '16';
    return (
      <div className="w-full text-xs text-slate-700 font-sans relative avoid-break">
        <div className="w-full bg-white relative z-10 mb-1">
          <img src={Letterhead} alt="Aarvi Encon Limited Official Letterhead" className="w-full h-auto object-contain select-none" />
        </div>
        <div className="mt-2 flex justify-between items-baseline border-t border-slate-400 pt-1 font-mono text-[11px] relative z-10" contentEditable="true">
          <span className="font-black text-slate-900">Ref: {docRefPrefix}/2026-27/{formattedRefId}</span>
          <span className="font-bold text-slate-800">Date: {new Date().toLocaleDateString('en-IN')}</span>
        </div>
        <h1 className="text-base font-black text-slate-950 tracking-wider uppercase text-center mt-2 bg-slate-100 py-1 border-y border-slate-400 relative z-10" contentEditable="true">
          {docTitle}
        </h1>
      </div>
    );
  };

  const primaryLine = poItems[0] || {};
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  return (
    <div className="space-y-6">
      
      {/* 🛡️ DEEP CSS ISOLATION: Prevents splitting lines during print */}
      <style>{`
        /* Forces standard print behavior and stops elements from slicing in half */
        .avoid-break, p, tr, td, h1, h2, h3, table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        @media print {
          html, body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
          .print\\:hidden, nav, aside, header, button, .bg-slate-900 { display: none !important; }
          #root, main, .grid, .xl\\:col-span-9, #isolated-print-wrapper, .bg-white { display: block !important; width: 100% !important; max-width: 100% !important; background: #ffffff !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; position: static !important; overflow: visible !important; }
        }
      `}</style>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Contract Distribution Center</h1>
          <p className="text-sm text-slate-500 font-medium">Verify dynamically generated parameters and download full multi-page PDFs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
        
        {/* LEFT BAR */}
        <div className="xl:col-span-3 space-y-3 print:hidden">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Clearance Queue</h2>
          {poList.length === 0 ? (
            <Card className="p-6 text-center text-slate-400 border-dashed border-2 bg-white text-sm">Queue cleared.</Card>
          ) : (
            poList.map(po => (
              <div key={po.po_number} onClick={() => openPoTemplate(po)} className={`p-4 rounded-xl border cursor-pointer transition-all block ${selectedPo?.po_number === po.po_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-[#2c2a57] font-black text-xs bg-slate-100 border px-2 py-0.5 rounded">{po.po_number}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                    po.category === 'GOODS' ? 'bg-blue-100 text-blue-700' : 
                    po.category === 'VEHICLE' ? 'bg-amber-100 text-amber-700' : 
                    po.category === 'FOOD' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{po.category}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 truncate">{po.vendor_name}</p>
                <div className="text-[10px] text-slate-400 font-semibold mt-2 border-t border-slate-100 pt-2 flex justify-between items-center">
                  <span>{po.project_code}</span>
                  <span className="font-bold text-[#0b9c54] font-mono text-xs">₹{po.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT PREVIEW CANVAS */}
        <div id="isolated-print-wrapper" className="xl:col-span-9 print:col-span-12">
          {selectedPo && poItems.length > 0 ? (
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative">
              
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
                <div className="flex items-center space-x-2.5">
                  <Edit3 size={17} className="text-amber-400 animate-pulse" />
                  <span className="text-xs uppercase font-bold tracking-tight text-amber-50">Live Editable Canvas • All data extracted from quotation</span>
                </div>
                <button 
                  onClick={handleDownloadPDF} 
                  className="bg-[#0b9c54] hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center space-x-2 px-5 py-2 text-xs font-bold shadow-xs"
                >
                  <Download size={14} /> <span>Download Full PDF</span>
                </button>
              </div>

              {/* 🎯 TIGHTENED PADDING: We remove heavy screen padding so the margin engine takes over perfectly */}
              <div id="printable-po" className="p-8 space-y-6 font-sans bg-white select-text relative w-full h-auto overflow-visible text-justify">
                
                <div className="hidden print:block print:fixed print:top-0 print:left-0 print:z-0 w-12 pt-3 pl-3">
                  <img src={aarviLogo} alt="Aarvi running logo" className="w-full h-auto object-contain opacity-90" />
                </div>

                {/* ========================================================= */}
                {/* 📦 1. GOODS / MATERIALS PO */}
                {/* ========================================================= */}
                {selectedPo.category === 'GOODS' && (
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed relative z-10">
                    {renderBrandedHeader("Purchase Order", `AEL/${primaryLine.vendor_name?.substring(0,6).toUpperCase()}-PO`)}
                    
                    <div className="text-sm transition-all avoid-break" contentEditable="true">
                      <p className="font-bold text-slate-900 uppercase">M/s. {primaryLine.vendor_name}</p>
                      <p className="text-slate-600 leading-tight w-1/2">{primaryLine.vendor_address || "Address Not Provided"}</p>
                      <p className="text-slate-600 font-mono mt-1">Cell No.: {primaryLine.vendor_contact || "N/A"}</p>
                      <p className="text-slate-600 font-mono">EMAIL:- {primaryLine.vendor_email || "N/A"}</p>
                    </div>

                    <div contentEditable="true" className="space-y-1 avoid-break">
                      <p className="font-bold text-sm text-slate-900 mt-4">Subject: Purchase Order for {primaryLine.product_description?.split(' ')[0] || 'Materials'}.</p>
                      <p className="text-xs text-slate-700 mt-2">Dear Sir,</p>
                      <p className="text-xs text-slate-700">With reference to Quotation Dated {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString() : 'recent submission'}, and subsequent discussion, we are pleased to inform you that company has decided to place order for the supply of {primaryLine.product_description || 'goods'} with your company.</p>
                    </div>

                    <div className="avoid-break mt-4">
                      <table className="w-full text-left border-collapse border border-slate-400">
                        <thead>
                          <tr className="text-[10px] uppercase font-black bg-slate-50 border-b border-slate-400 text-slate-700">
                            <th className="py-2 px-2 border-r border-slate-400 text-center w-12">Sr.No.</th>
                            <th className="py-2 px-2 border-r border-slate-400">Description</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-center w-16">QUANTITY</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-right w-24">RATE UNIT</th>
                            <th className="py-2 px-2 text-right w-28">Total Price in Rs.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((item, index) => (
                            <tr key={index} className="border-b border-slate-300">
                              <td className="py-2 px-2 border-r border-slate-400 text-center font-mono">0{index + 1}</td>
                              <td className="py-2 px-2 border-r border-slate-400 font-bold text-slate-900" contentEditable="true">{item.product_description} {item.make_brand && `(${item.make_brand})`}</td>
                              <td className="py-2 px-2 border-r border-slate-400 text-center font-mono font-bold" contentEditable="true">{item.quantity} Nos</td>
                              <td className="py-2 px-2 border-r border-slate-400 text-right font-mono" contentEditable="true">{((item.base_total_value) / (item.quantity || 1)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-slate-900" contentEditable="true">{(item.base_total_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-400 font-bold">
                            <td colSpan="4" className="py-1.5 px-2 border-r border-slate-400 text-right">Basic Total Value</td>
                            <td className="py-1.5 px-2 text-right font-mono text-sm" contentEditable="true">{poItems.reduce((acc, curr) => acc + curr.base_total_value, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold">
                            <td colSpan="4" className="py-1.5 px-2 border-r border-slate-400 text-right">GST Adjustment</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700" contentEditable="true">{(poItems.reduce((acc, curr) => acc + curr.net_amount_payable, 0) - poItems.reduce((acc, curr) => acc + curr.base_total_value, 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-black bg-slate-100 border-t border-slate-400 text-black">
                            <td colSpan="4" className="py-2 px-2 border-r border-slate-400 text-right uppercase text-[10px]">Net Amount Payable</td>
                            <td className="py-2 px-2 text-right font-mono text-base" contentEditable="true">{selectedPo.grand_total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr>
                            <td colSpan="5" className="py-2 px-3 italic font-semibold text-slate-700 border-t border-slate-400 text-center" contentEditable="true">
                              (Rupees {convertNumberToWords(Math.round(selectedPo.grand_total))})
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-[11px] leading-tight text-slate-800 mt-6 avoid-break" contentEditable="true">
                      <div className="col-span-1 font-bold">a)</div>
                      <div className="col-span-3 font-bold uppercase">TERMS OF PAYMENTS</div>
                      <div className="col-span-8">{primaryLine.payment_terms || "100% Payment shall be paid after receipt of material at site."}</div>
                      
                      <div className="col-span-1 font-bold">b)</div>
                      <div className="col-span-3 font-bold uppercase">DELIVERY</div>
                      <div className="col-span-8">Time is an essence of this Purchase Order. The material has to be delivered within {primaryLine.time_of_delivery || "2-3 days"} from the date of issue of PO.</div>
                      
                      <div className="col-span-1 font-bold">c)</div>
                      <div className="col-span-3 font-bold uppercase">PROJECT</div>
                      <div className="col-span-8 font-bold">{selectedPo.project_name}</div>
                    </div>

                    <p className="font-bold text-[11px] mt-4 avoid-break">Our GST Registration no.: 27AAACA3640H1Z0 (Please Confirm the GST No. Before the Preparation of Invoices.)</p>

                    <div contentEditable="true" className="pt-4 text-[11px] leading-relaxed text-slate-800 space-y-3">
                      <p className="font-bold avoid-break">The placement of order is subject to the following Terms & Conditions:-</p>
                      <p className="avoid-break"><strong>1. PRICE:</strong><br/>The cost of Purchase with GST as shown above is Rs. {selectedPo.grand_total.toLocaleString('en-IN')}/- (Rupees {convertNumberToWords(Math.round(selectedPo.grand_total))}). This is a fixed-price order and no escalation is applicable.</p>
                      <p className="avoid-break"><strong>2. QUALITY:</strong><br/>If the material supplied is not to the satisfaction of our engineer, then the same has to be replaced without any financial implications.</p>
                      <p className="avoid-break"><strong>3. LIQUIDITY DAMAGE: (NOT APPLICABLE)</strong><br/>If the supplier fails to deliver all the above-mentioned items within 1 week from the date of PO & Liquidity damages @ 0.5% of the order value per week, subject to a maximum of 5% of the order value will be applicable.</p>
                      <p className="avoid-break"><strong>4. TAXES & DUTIES:</strong><br/>Prevailing Taxes & Duties (i.e. GST) shall be as shown above.</p>
                      <p className="avoid-break"><strong>5. CORRESPONDENCE:</strong><br/>All the correspondence pertaining to this order is to be made to:<br/>M/s. Aarvi Encon Ltd.<br/>B-1/603, 6th Floor, Marathon Innova,<br/>Marathon Nextgen Complex,<br/>G.K. Marg Lower Parel (W),<br/>Mumbai -400013.<br/>Tel: 022-40499999</p>
                      <p className="avoid-break"><strong>6. REFERENCE:</strong><br/>Quotation Dated {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString() : 'Recently Submitted'}.</p>
                      <p className="avoid-break"><strong>7. BILLING:</strong><br/>Bill to be submitted in 2 sets. Original Bill to be submitted to Head Office Mumbai with copy of Bill to Site for Certification / Verification along with following documents:<br/>a) Tax invoice b) Delivery Challan c) P.O. Acceptance Copy.</p>
                      <p className="avoid-break"><strong>8. DELIVERY ADDRESS:</strong><br/>Contract Person: {primaryLine.site_contact_person || "Site Coordinator"}, Contact No.: {primaryLine.site_contact_phone || "N/A"}.<br/><span className="font-bold uppercase">{selectedPo.project_name}</span><br/>{primaryLine.delivery_address || "Address Pending"}</p>
                      <p className="avoid-break"><strong>9. LEGAL COMPLIANCE:</strong><br/>Any disputes or differences arising between the Client and Vendor with respect to this Purchase Order and terms & conditions or any other matter connected with or incidental thereto, it should be exclusive under the arbitration and jurisdiction of the courts of Mumbai. The venue of arbitration shall be in Mumbai.</p>
                      <p className="avoid-break">Please acknowledge of the duplicate of this Purchase Order as an acceptance of this Purchase Order.<br/><br/>Thanking you,<br/>Yours faithfully</p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* 🚜 2. VEHICLE RENTAL PO */}
                {/* ========================================================= */}
                {selectedPo.category === 'VEHICLE' && (
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed relative z-10">
                    {renderBrandedHeader("VEHICLE RENTAL CONTRACT", `AEL/${primaryLine.vendor_name?.substring(0,6).toUpperCase()}-PO`)}
                    
                    <div className="text-sm transition-all avoid-break" contentEditable="true">
                      <p className="font-bold text-slate-900">M/s. {primaryLine.vendor_name}</p>
                      <p className="text-slate-600 leading-normal w-1/2">{primaryLine.vendor_address || "Address Reference Pending"}</p>
                      <p className="text-slate-800 font-bold mt-4">Subject: Rental Contract for Hiring Vehicle for M/s. Aarvi Encon Ltd's - [{selectedPo.project_name}]</p>
                      <p className="mt-4 text-xs text-slate-800">Dear Sir,</p>
                      <p className="text-xs mt-2">With reference to your quotation the quoted price, we are pleased to inform you that M/s. Aarvi Encon Ltd has decided to place order for Hiring Vehicle with you as per the terms & conditions mentioned in this contract.</p>
                      <p className="text-xs mt-2">Mr. {primaryLine.vendor_name} hereinafter referred to as the "Contractor" of Vehicle, and M/s. Aarvi Encon Ltd hereinafter referred to as the "Client".</p>
                    </div>

                    <p className="font-bold text-slate-900 tracking-wider text-[12px] mt-6 avoid-break">Article 1</p>
                    <p className="text-xs -mt-2 avoid-break">The subject of the present Contract is the vehicle owned by the Contractor having the following characteristics & providing services for the following sites as & when required:-</p>
                    
                    <div className="avoid-break mt-2">
                      <table className="w-full text-left border-collapse border border-slate-400">
                        <thead>
                          <tr className="text-[10px] font-bold bg-slate-50 border-b border-slate-400 text-slate-900">
                            <th className="py-2 px-2 border-r border-slate-400">Project Site Name</th>
                            <th className="py-2 px-2 border-r border-slate-400">Vehicle Type</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-center">Qty (Nos)</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-right">Rate/Per Month</th>
                            <th className="py-2 px-2 text-slate-900 w-1/3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-400">
                              <td className="py-3 px-2 border-r border-slate-400 font-bold" contentEditable="true">{selectedPo.project_name}</td>
                              <td className="py-3 px-2 border-r border-slate-400 font-mono text-slate-900" contentEditable="true">{item.product_description}</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-center font-mono" contentEditable="true">{item.quantity || 1}</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-right font-mono" contentEditable="true">{(item.base_total_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 px-2 text-slate-800 leading-tight" contentEditable="true">{item.special_terms || "24 hours, 9 seaters, working in all shifts, Diesel cost will be paid at actuals, 1 Ltr for 10 km, Driver and maintenance under Contractor scope."}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] font-bold text-slate-900 mt-2">GST Extra as applicable</p>
                    </div>

                    <div contentEditable="true" className="text-[11px] space-y-3 pt-4 leading-relaxed text-slate-800 outline-none rounded">
                      <p className="font-bold text-[12px] avoid-break">NOTE: -</p>
                      <p className="avoid-break">1. Duty hrs shall be as per site schedule.</p>
                      <p className="avoid-break">2. Log Book will be maintained in attached prescribed form and will be signed by user for each trip.</p>
                      <p className="avoid-break">3. No charges, rent for unexpired period of contractual period of the said contract will be payable by the "client", if your services are terminated before the said specified period of your contract.</p>
                      <p className="avoid-break">4. The contract will automatically come to an end on expiry of the specified period and compensation, fees will not be payable to you by the "Client" on or after said contract period.</p>
                      <p className="avoid-break">5. In case of any emergency include medical emergency, you are request to go serve as per the situation and as per the direction of local coordinator / authorized representative.</p>
                      <p className="avoid-break">6. In case our main client call our personnel for any urgent work, you should be ready all the time with the driver & fuel with full condition.</p>
                      <p className="avoid-break">7. Any change in petrol / diesel cost & insurance / taxes & levies if any, contractor has to bear the same; "client" will not pay, until the specified contract period.</p>
                      <p className="avoid-break">8. In case of Non-availability of Vehicle / driver, The Contractor will arrange substitute driver / Vehicle in good condition on their Cost & risk.</p>
                      <p className="avoid-break">9. The Contractor will take all sorts of insurances / fitness certificate / valid driver's license / RC book related to their service to the Client and Taxes & Insurance and government's related levies if any will be paid from time to time and location to location.</p>
                      <p className="avoid-break">10. One set of all documents [including driver license] must be available in vehicle at all time & one set of all documents [including driver license] must be sent to our office, for our office records.</p>
                      <p className="avoid-break">11. Tax will be deducted as per Government rules and regulations. Also note that, necessary documents required by any tax authorities, as a contractor, you have co-operate & support and provide the documents and share the details & documents to us for our office records.</p>
                      <p className="avoid-break">12. If we found the contractor not paid the vehicle insurance / taxes & levies or any charges, as a client, we are forced to withdraw your service with immediate effect without assigning any reason, though the contract is valid.</p>
                      <p className="avoid-break">13. During the contract period, local / central government or any governmental authorities, enforce taxes & levies or change of rules & regulations, as a contractor, you have to implement the same & share the details and document to us, as a proof & for our records.</p>
                      <p className="avoid-break">14. Later, if we require more number of vehicles, within short notice, as a contractor, you have to provide the necessary support & service to the client without any interruption, on the above said terms & conditions.</p>
                      <p className="avoid-break">15. In case of vendor changes driver, due to some problem, any damages / accidents / claims to the vehicle or third party or any property / assets, either directly or indirectly. If such claim comes during the contract period / later, all the cost should be paid by the vendor only. vendor must take sole responsibility of all things in nature, during the contract period.</p>
                      <p className="avoid-break">16. Safety & security of our personnel's / authorized representative / our clients is very important & vendor takes utmost care during the said contract period. If any damages / accidents / claims to the vehicle or third party or any property / assets, either directly or indirectly. If such claim comes during the contract period / later, all the cost should be paid by the vendor only. vendor must take sole responsibility of all things in nature, during the contract period.</p>
                      
                      <div className="pt-4 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 2</p>
                        <p className="mt-1">Duration of contract: The contract is valid from {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString('en-GB').replace(/\//g, '.') : `01.04.${currentYear}`} to {primaryLine.contract_end_date ? new Date(primaryLine.contract_end_date).toLocaleDateString('en-GB').replace(/\//g, '.') : `31.03.${nextYear}`}. (Extendable or reducible).<br/>This contract is valid as per the client / site requirement of the Vehicles. At the end of requirement period both parties should agree on the discontinuation of the service & the rental contract stands automatically get cancelled & void. Client can give One day Notice to cancel the services.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 3</p>
                        <p className="mt-1">The monthly rental rate shall be as above.</p>
                      </div>

                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 4</p>
                        <p className="mt-1">The Contractor shall be responsible for any and all tax liabilities, either related to ownership of the vehicle or deriving from the rental contract, in accordance with the legislation of Government of India from time to time and location to location.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 5</p>
                        <p className="mt-1">The Client shall not be responsible for any damages caused by third parties, viz., violent public demonstration, or natural disaster and any breakdown of the vehicle.<br/>The Contractor shall repair immediately, if any and all damages caused during the said contract period and the cost / replacement / stand by vehicle cost will be paid you & the services should not affect the Client business, anyway.</p>
                      </div>

                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 6</p>
                        <p className="mt-1">The vehicle is to be delivered in good condition; driver and all documents related to the vehicle shall be in order.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 7</p>
                        <p className="mt-1">The present contract shall be terminated by both parties after mutual understanding [OR]<br/>At the end of the period stated in article 2 of the present contract by decision of either party, provided written notice is given Seven days in advance.<br/>The contract shall be lawfully terminated and without any form of mutual compensation in case of conflict, looting and all episodes of unrest or all cases producing a situation in which the security of Client's mission in India will be no longer guaranteed.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 8</p>
                        <p className="mt-1">Payment will be released after 5 days from submission of bills, after receipt of Correct Original invoice along with necessary log sheets and the same will be sent to our Mumbai office for further processing.<br/><br/><strong>BILLING:</strong><br/>Bill to be submitted in 2 sets by 7th of every month. Original Bill to be submitted to Head Office in Mumbai with copy of Bill to Site for Certification / Verification along with following documents:<br/>(a) LOG Book Certified by Site In-charge, Bills certified by site incharge<br/>(b) P.O. Acceptance Copy<br/>TDS will be deducted as per government rules and deposited.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 9</p>
                        <p className="mt-1">Vendor's driver all the time must maintain the speed limits as per the local conditions & local government rules & regulations and he should not violate the traffic rules, if he violate such rules & regulations; client is not responsible for any damages / accidents/claims to the vehicle or third party or any property / assets, either directly or indirectly. If such claim comes during the contract period / later, all the cost should be paid by the vendor only.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 10</p>
                        <p className="mt-1">Vendor's authorized driver [with valid driving license only permitted to drive vehicle all the time during the said contract period. If we found other than vendor's authorized driver, driving the vehicle, client is not responsible for any damages / accidents / claims to the vehicle or third party or any property/assets, either directly or indirectly. If such claim comes during the contract period / later, all the cost should be paid by the vendor only.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 11</p>
                        <p className="mt-1">For whatsoever reason, the Company's Total Liability arising out of the said services to be rendered under this Contract/your any other actions at work place and beyond, covering death, partial or minor disability, Medical shall borne by the vendor & client is not responsible for the same.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 12</p>
                        <p className="mt-1">Any disputes or differences arising between the Client and Contractor with respect to this contract and contract terms & conditions or any other matter connected with or incidental thereto, it should be exclusive under the arbitration and jurisdiction of the courts of Mumbai. The venue of arbitration shall be in Mumbai.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 13</p>
                        <p className="mt-1">Service Tax / GST: Kindly submit / register with Service Tax department. Aarvi to reimburse the same at actual on producing surplus challan. In case, you are not registered, Client to return 18% which will be reimbursed on receipt of Service Tax Proof.</p>
                      </div>
                      
                      <p className="pt-6 avoid-break">Please acknowledge the duplicate copy of this letter as an acceptance of this contract.</p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* 🏢 3. GUEST HOUSE ACCOMMODATION */}
                {/* ========================================================= */}
                {selectedPo.category === 'ACCOMMODATION' && (
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed relative z-10">
                    {renderBrandedHeader("GUEST HOUSE RENTAL CONTRACT", `AEL/${primaryLine.vendor_name?.split(' ')[0]?.toUpperCase() || 'GH'}-PO`)}
                    
                    <div className="text-sm transition-all avoid-break" contentEditable="true">
                      <p className="font-bold text-slate-900">M/s. {primaryLine.vendor_name}</p>
                      <p className="text-slate-600 leading-normal w-1/2">{primaryLine.vendor_address || "Address Pending"}</p>
                      <p className="text-slate-800 font-bold mt-4">Subject: Rental Contract for Guest House for M/s. Aarvi Encon Ltd's - [{selectedPo.project_name}]</p>
                      <p className="mt-4 text-xs text-slate-800">Dear Sir,</p>
                      <p className="text-xs mt-2">With reference to your quotation of the quoted price, we are pleased to inform you that M/s. Aarvi Encon Ltd has decided to place an order to rent a Guest House with you as per the terms & conditions mentioned in this contract.</p>
                      <p className="text-xs mt-2">Mr. {primaryLine.vendor_name}, hereinafter referred to as the "Contractor" of the Guest House and M/s. Aarvi Encon Ltd, hereinafter referred to as the "Client".</p>
                    </div>

                    <p className="font-bold text-slate-900 tracking-wider text-[12px] mt-6 avoid-break">Article 1</p>
                    <p className="text-xs -mt-2 avoid-break">The subject of the present Contract is the Guest House owned by the Contractor, having the following characteristics & providing service for the following sites as & when required:-</p>
                    
                    <div className="avoid-break mt-2">
                      <table className="w-full text-left border-collapse border border-slate-400">
                        <thead>
                          <tr className="text-[10px] font-bold bg-slate-50 border-b border-slate-400 text-slate-900">
                            <th className="py-2 px-2 border-r border-slate-400">Project Site Name</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-center w-12">Qty</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-center w-12">UOM</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-right w-24">Rate/Month/<br/>Per Room (Rs)</th>
                            <th className="py-2 px-2 border-r border-slate-400 text-right w-24">Total</th>
                            <th className="py-2 px-2 text-slate-900 w-1/3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-400">
                              <td className="py-3 px-2 border-r border-slate-400 font-bold" contentEditable="true">{selectedPo.project_name}</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-center font-mono" contentEditable="true">{item.quantity ? `0${item.quantity}` : "01"}</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-center font-mono" contentEditable="true">Nos</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-right font-mono" contentEditable="true">{(item.base_total_value / (item.quantity || 1)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 px-2 border-r border-slate-400 text-right font-mono font-bold" contentEditable="true">{(item.base_total_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td className="py-3 px-2 text-slate-800 leading-tight" contentEditable="true">
                                {item.special_terms || `1) Monthly Rent Per Month: INR ${(item.base_total_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}\n2) 7BHK\n3) Electricity bill for Aarvi Scope`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-slate-900 mt-2 font-bold">NOTE: -<br/>1. All rooms and washrooms should be properly available and in a hygienic condition at the time of shifting candidates.</p>
                    </div>

                    <div contentEditable="true" className="text-[11px] space-y-3 pt-4 leading-relaxed text-slate-800 outline-none rounded">
                      <div className="avoid-break">
                        <p className="font-bold text-[12px] underline">Article 2</p>
                        <p className="mt-1">Duration of contract: The contract is valid from {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString('en-GB').replace(/\//g, '-') : `06-05-${currentYear}`} to {primaryLine.contract_end_date ? new Date(primaryLine.contract_end_date).toLocaleDateString('en-GB').replace(/\//g, '-') : `06-5-${nextYear}`} (12 Months). (Extendable or reducible).<br/>This contract is valid as per the client/site requirement of the Guest House. At the end of the requirement period both parties should agree on the discontinuation of the service & the rental contract automatically gets canceled & void. Client & Contractor can give a day's Notice to cancel the services.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 3</p>
                        <p className="mt-1">The monthly rental rate shall be as above, GST extra as applicable.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 4</p>
                        <p className="mt-1">The Contractor shall be responsible for any and all tax liabilities, either related to ownership of the Guest House or deriving from the rental contract, in accordance with the legislation of the Government of India from time to time and location to location.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 5</p>
                        <p className="mt-1">The Client shall not be responsible for any damages caused by third parties, viz., violent public demonstration, natural disaster, and any breakdown of the Guest House.<br/>The Contractor shall repair immediately any and all damages caused during the said contract period and the cost/replacement / stand-by Guest House will be paid to you & the services should not affect the Client's business, anyway.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 6</p>
                        <p className="mt-1">The present contract shall be terminated by both parties after mutual understanding [OR]<br/>At the end of the period stated in article 2 of the present contract by decision of either party, provided written notice is given a days in advance.<br/>The contract shall be lawfully terminated and without any form of mutual compensation in case of conflict, looting, and all episodes of unrest or all cases producing a situation in which the security of the Client's mission in India will be no longer guaranteed.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 7</p>
                        <p className="mt-1">Payment will be released by 10th of each month on submission of Original Invoice is to be submitted, along with the log sheet duly signed and stamped.<br/><br/><strong>BILLING:</strong><br/>Bill is to be submitted in 2 sets by the 7th of every month. Original Bill to be submitted to Head Office in Mumbai with a copy of Bill to Site for Certification / Verification along with following documents:<br/>(a) Register Book<br/>(b) P.O. Acceptance Copy<br/>TDS will be deducted as per government rules and deposited.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 8</p>
                        <p className="mt-1">For whatsoever reason, the Company's Total Liability arising out of the said services to be rendered under this Contract/you're any other actions at the workplace and beyond, covering death, partial or minor disability, Medical shall be borne by the vendor & client is not responsible for the same.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 9</p>
                        <p className="mt-1">Any disputes or differences arising between the Client and Contractor with respect to this contract and contract terms & conditions or any other matter connected with or incidental there to, it should be exclusive under the arbitration and jurisdiction of the courts of Mumbai. The venue of arbitration shall be in Mumbai.</p>
                      </div>
                      
                      <div className="pt-2 avoid-break">
                        <p className="font-bold text-[12px] underline">Article 10</p>
                        <p className="mt-1">Service Tax / GST: Kindly submit/register with the Service Tax department. Aarvi is to reimburse the same at the actual on producing surplus challan. In case, you are not registered, the Client is to return 18% which will be reimbursed on receipt of Service Tax Proof.</p>
                      </div>
                      
                      <p className="pt-6 avoid-break">Please acknowledge the duplicate copy of this letter as an acceptance of this contract.</p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* 🍱 4. FOOD SUPPLY PO */}
                {/* ========================================================= */}
                {selectedPo.category === 'FOOD' && (
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed relative z-10">
                    {renderBrandedHeader("Purchase Order", `AEL/${primaryLine.vendor_name?.split(' ')[0]?.toUpperCase() || 'FOOD'}-PO`)}
                    
                    <div className="text-sm transition-all mt-6 avoid-break" contentEditable="true">
                      <p className="font-bold text-slate-900">Mr. {primaryLine.vendor_name}</p>
                      <p className="text-slate-600 leading-normal">{primaryLine.vendor_address || "Address Pending"}</p>
                      <p className="text-slate-800 mt-6">Dear Sir,</p>
                      <p className="text-slate-900 font-bold mt-2">Subject: Purchase Order for Food.</p>
                      <p className="text-[12px] mt-4 leading-relaxed">With reference to your Quotation, dated {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString('en-GB').replace(/\//g, '.') : `26.05.${currentYear}`}, and the subsequent discussion with our Mr Kishor Nikam (BUSINESS DEVELOPMENT), we are pleased to inform you that M/s. Aarvi Encon Ltd has decided to place an order for the supply of Food as mentioned below:-</p>
                    </div>

                    <div className="pl-6 py-6 font-bold text-[13px] text-slate-900 space-y-4 border-l-4 border-slate-300 ml-4 my-6 avoid-break" contentEditable="true">
                      {poItems.map((item, idx) => (
                        <p key={idx}>{item.product_description} Rate Rs. {item.unit_price || item.base_total_value}/- {item.special_terms || 'per meal'}.</p>
                      ))}
                      {poItems.length === 1 && (
                         <p>Sunday Rate Rs. {poItems[0].unit_price ? poItems[0].unit_price + 40 : 300}/- per meal Special Dinner.</p>
                      )}
                    </div>

                    <div className="text-[12px] space-y-2 mt-4 avoid-break" contentEditable="true">
                      <p><strong>Terms of payment:-</strong> {primaryLine.payment_terms || "100% payment to be made against submission of Invoices"}</p>
                      <p><strong>Project Name:</strong> {selectedPo.project_name}</p>
                      <p><strong>Our GST Registration no.:</strong> 27AAACA3640H1Z0 (Please Confirm the GST No. Before the Preparation of Invoices.</p>
                    </div>

                    <div contentEditable="true" className="pt-6 text-[12px] leading-relaxed text-slate-800 space-y-4">
                      <p className="font-bold underline mb-4 avoid-break">The placement of work Order is subject to the following Terms & Conditions:-</p>
                      
                      <div className="avoid-break">
                        <p><strong>1. TAXES & DUTIES:-</strong><br/>Prevailing Taxes & Duties (i.e. GST) shall be as shown above.</p>
                      </div>
                      
                      <div className="avoid-break">
                        <p><strong>2. CORRESPONDENCE:-</strong><br/>All the correspondence pertaining to this order is to be made to: -<br/>M/s.AarviEnconLtd.<br/>B-1/603, 6th Floor, Marathon Innova,<br/>Marathon Nextgen Complex,<br/>G.K. Marg., Lower Parel (W),<br/>Mumbai 400013.<br/>Tel: 022-40499999</p>
                      </div>
                      
                      <div className="avoid-break">
                        <p><strong>3. BILLING:-</strong><br/>Bill to be submitted in 2 sets. Original Bill to be submitted to Head Office Mumbai with copy of Bill to Site for Certification / Verification along with following documents:<br/>A) P.O. Acceptance Copy.<br/>B) Tax Invoice</p>
                      </div>
                      
                      <div className="avoid-break">
                        <p><strong>4. REFERENCE:-</strong><br/>Email Quotation, dated {primaryLine.contract_start_date ? new Date(primaryLine.contract_start_date).toLocaleDateString('en-GB').replace(/\//g, '.') : `26.05.${currentYear}`}.</p>
                      </div>
                      
                      <div className="avoid-break">
                        <p><strong>5. LEGAL COMPLIANCE:-</strong><br/>Any disputes or differences arising between the Client and Vendor with respect to this Purchase Order and terms & conditions or any other matter connected with or incidental thereto, it should be exclusive under the arbitration and the jurisdiction of the courts of Mumbai. The venue of arbitration shall be in Mumbai.</p>
                      </div>
                      
                      <p className="pt-4 avoid-break">Please acknowledge of the duplicate of this Purchase Order as an acceptance of this Purchase Order.</p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* 🎯 UNIVERSAL 2-COLUMN SIGNATURE STRIP */}
                {/* ========================================================= */}
                <div className="pt-16 mt-16 flex justify-between items-end text-xs font-sans relative z-10 avoid-break" contentEditable="false">
                  <div className="w-64 text-left space-y-1">
                    <p className="text-[11px] text-slate-800 mb-10">Yours faithfully<br/><strong>For {selectedPo.category === 'GOODS' || selectedPo.category === 'FOOD' ? 'M/s. AARVI ENCON LTD.' : 'AARVI ENCON LIMITED'}</strong></p>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block border-t border-slate-400 pt-2">Authorized Signatory</span>
                  </div>
                  
                  {selectedPo.category === 'FOOD' && (
                    <div className="text-[10px] font-mono font-black text-slate-400 select-none tracking-widest self-end pb-1">
                      AEL-04-IMSF-PURCH-004
                    </div>
                  )}

                  <div className="w-64 text-right space-y-1">
                    <p className="text-[11px] text-slate-800 mb-10 text-center">{selectedPo.category === 'GOODS' ? 'Signature & Seal of the Supplier' : 'Signature & seal of the contractor'}<br/>{selectedPo.category === 'GOODS' ? 'Accepted & Agreed of the above Said Terms and Conditions' : 'accepted & agreed of the above said terms & conditions'}</p>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block border-t border-slate-400 pt-2 text-center">Accepted by {selectedPo.category === 'GOODS' ? 'Supplier' : 'Contractor'}</span>
                  </div>
                </div>

              </div>
            </Card>
          ) : (
            <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
              <FileText size={30} className="mb-2 text-slate-300" />
              <p>Select an approved procurement allocation row folder from the queue to view contract details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}