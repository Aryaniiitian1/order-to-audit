'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  IndianRupee,
  Layers,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../lib/decimal';
import * as XLSX from 'xlsx';

export default function ReportsHubPage() {
  const [activeTab, setActiveTab] = useState<'SALES' | 'GST' | 'RECEIVABLES'>('SALES');
  const [salesData, setSalesData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [receivablesData, setReceivablesData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/sales').then((r) => r.json()),
      fetch('/api/reports/gst').then((r) => r.json()),
      fetch('/api/reports/receivables').then((r) => r.json()),
    ])
      .then(([s, g, r]) => {
        if (s.success) setSalesData(s);
        if (g.success) setGstData(g);
        if (r.success) setReceivablesData(r.receivables);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const exportToExcel = () => {
    let wsData: any[] = [];
    let filename = 'Report.xlsx';

    if (activeTab === 'SALES') {
      filename = 'Sales_Register_Monthly.xlsx';
      wsData = salesData?.invoices?.map((inv: any) => ({
        'Invoice Number': inv.invoiceNumber,
        'Date': new Date(inv.invoiceDate).toLocaleDateString(),
        'Customer': inv.customer?.name,
        'State': inv.customer?.state,
        'GSTIN': inv.customer?.gstin || 'Unregistered',
        'Taxable Value': inv.taxableAmount,
        'CGST': inv.cgstAmount,
        'SGST': inv.sgstAmount,
        'IGST': inv.igstAmount,
        'Grand Total': inv.grandTotal,
        'Status': inv.paymentStatus,
      })) || [];
    } else if (activeTab === 'GST') {
      filename = 'GSTR1_Outward_Summary.xlsx';
      wsData = gstData?.hsnSummary?.map((h: any) => ({
        'HSN Code': h.hsnCode,
        'Description': h.description,
        'UOM': h.uom,
        'Total Quantity': h.totalQty,
        'Total Taxable Value': h.totalValue,
        'CGST': h.cgst,
        'SGST': h.sgst,
        'IGST': h.igst,
      })) || [];
    } else if (activeTab === 'RECEIVABLES') {
      filename = 'Customer_Receivables_Aging.xlsx';
      wsData = receivablesData.map((c) => ({
        'Customer Name': c.customerName,
        'State': c.state,
        'Total Billed': c.totalBilled,
        'Total Collected': c.totalReceived,
        'Total Outstanding': c.totalOutstanding,
        '0-30 Days': c.aging0To30,
        '31-60 Days': c.aging31To60,
        '60+ Days': c.agingOver60,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Auditor & Statutory Accounting Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Section 4.6 monthly accounts and GST reconciliation reports exportable to Excel and PDF.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>

          <button
            onClick={exportToExcel}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 no-print">
        {[
          { id: 'SALES', label: 'Sales Register' },
          { id: 'GST', label: 'GST Outward Summary (GSTR-1 / 3B)' },
          { id: 'RECEIVABLES', label: 'Customer Receivables & Ageing' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Sales Register */}
      {activeTab === 'SALES' && (
        <div className="space-y-6">
          {/* Summary Rollup Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Taxable Turnover</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                {formatCurrency(salesData?.totals?.totalTaxable)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total CGST + SGST</div>
              <div className="text-xl font-extrabold text-blue-700 mt-1 font-mono">
                {formatCurrency((salesData?.totals?.totalCGST || 0) + (salesData?.totals?.totalSGST || 0))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total IGST</div>
              <div className="text-xl font-extrabold text-purple-700 mt-1 font-mono">
                {formatCurrency(salesData?.totals?.totalIGST)}
              </div>
            </div>
            <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-md text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-200">Gross Sales Value</div>
              <div className="text-xl font-black mt-1 font-mono">
                {formatCurrency(salesData?.totals?.grandTotal)}
              </div>
            </div>
          </div>

          {/* Sales Invoices Table */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Tax Invoice Sales Register
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                    <th className="py-2.5 px-3 text-right">IGST</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData?.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.customer?.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(inv.taxableAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.cgstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.sgstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.igstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GST Outward Summary (GSTR-1 / 3B) */}
      {activeTab === 'GST' && (
        <div className="space-y-6">
          {/* GSTR-3B Liability Box */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              GSTR-3B Outward Tax Liability Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-400">Total Outward Supplies</div>
                <div className="text-lg font-bold font-mono mt-0.5">{formatCurrency(gstData?.gstr3bLiability?.totalTaxable)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Central Tax (CGST)</div>
                <div className="text-lg font-bold font-mono text-blue-300 mt-0.5">{formatCurrency(gstData?.gstr3bLiability?.totalCGST)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">State Tax (SGST)</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">{formatCurrency(gstData?.gstr3bLiability?.totalSGST)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Integrated Tax (IGST)</div>
                <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">{formatCurrency(gstData?.gstr3bLiability?.totalIGST)}</div>
              </div>
            </div>
          </div>

          {/* GSTR-1 HSN Summary Table */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              GSTR-1 Table 12: HSN-wise Outward Supplies Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">HSN Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2">UOM</th>
                    <th className="py-2.5 px-3 text-right">Total Qty</th>
                    <th className="py-2.5 px-3 text-right">Total Value</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                    <th className="py-2.5 px-3 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstData?.hsnSummary?.map((h: any) => (
                    <tr key={h.hsnCode} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{h.hsnCode}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{h.description}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">{h.uom}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{h.totalQty}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(h.totalValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(h.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(h.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(h.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Customer Receivables & Aging */}
      {activeTab === 'RECEIVABLES' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Accounts Receivable & Debtor Ageing Schedule
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3 text-right">Total Billed</th>
                  <th className="py-2.5 px-3 text-right">Total Collected</th>
                  <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                  <th className="py-2.5 px-3 text-right">0 - 30 Days</th>
                  <th className="py-2.5 px-3 text-right">31 - 60 Days</th>
                  <th className="py-2.5 px-3 text-right">&gt; 60 Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivablesData.map((c) => (
                  <tr key={c.customerId} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{c.customerName}</td>
                    <td className="py-3 px-3 text-slate-500">{c.customerType}</td>
                    <td className="py-3 px-3 text-slate-500">{c.state}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(c.totalBilled)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(c.totalReceived)}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-red-600">{formatCurrency(c.totalOutstanding)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{formatCurrency(c.aging0To30)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(c.aging31To60)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(c.agingOver60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
