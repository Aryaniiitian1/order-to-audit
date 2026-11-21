'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Truck,
  IndianRupee,
  CheckCircle2,
  Clock,
  Building,
  User,
  PlusCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../../lib/decimal';
import { FACTORY_GSTIN, FACTORY_STATE_NAME } from '../../../lib/gst';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('4000');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
        setApprovedOrders(data.approvedOrders);
        if (data.invoices.length > 0 && !selectedInvoice) {
          setSelectedInvoice(data.invoices[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvoice = async (orderId: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesOrderId: orderId, adminUserId: 'admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Tax Invoice ${data.invoice.invoiceNumber} generated!`);
        await loadData();
        setSelectedInvoice(data.invoice);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (e: any) {
      setMessage('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (invoiceId: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/dispatch`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Invoice ${data.invoice.invoiceNumber} goods dispatched! Finished stock updated.`);
        await loadData();
        setSelectedInvoice(data.invoice);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (e: any) {
      setMessage('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedInvoice.customerId,
          amount: parseFloat(paymentAmount),
          paymentMode: 'BANK_TRANSFER',
          notes: 'Bank collection transfer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Payment of ${formatCurrency(paymentAmount)} recorded! Remaining due: ${formatCurrency(data.result.remainingOutstanding)}`);
        await loadData();
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (e: any) {
      setMessage('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPaid = (inv: any) => {
    if (!inv?.payments) return 0;
    return inv.payments.reduce((sum: number, p: any) => sum + p.amountReceived, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GST Tax Billing & Dispatch Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Statutory tax invoices (CGST+SGST / IGST), warehouse dispatches, and payment collections.
          </p>
        </div>

        {selectedInvoice && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Tax Invoice (PDF)</span>
          </button>
        )}
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Orders Ready for Invoicing */}
      {approvedOrders.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 no-print space-y-2">
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Approved Orders Waiting for Tax Invoice Generation ({approvedOrders.length})</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {approvedOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white px-3 py-2 rounded-lg border border-amber-200 text-xs flex items-center space-x-3 shadow-sm"
              >
                <div>
                  <span className="font-bold text-slate-900">{o.orderNumber}</span> • {o.customer?.name} ({formatCurrency(o.totalAmount)})
                </div>
                <button
                  onClick={() => handleGenerateInvoice(o.id)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                >
                  Raise GST Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Invoices List & Detailed Invoice View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoices List */}
        <div className="lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3 no-print">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Generated Tax Invoices ({invoices.length})
          </h3>

          <div className="space-y-2">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              const totalPaid = calculateTotalPaid(inv);
              const due = inv.grandTotal - totalPaid;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="font-mono">{inv.invoiceNumber}</span>
                    <span className="font-mono">{formatCurrency(inv.grandTotal)}</span>
                  </div>
                  <div className="text-slate-600 mt-1 font-semibold">{inv.customer?.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>
                      {inv.dispatchStatus === 'DISPATCHED' ? (
                        <span className="text-purple-600 font-bold">Dispatched</span>
                      ) : (
                        <span className="text-amber-600 font-bold">Pending Dispatch</span>
                      )}
                    </span>
                    <span>
                      {due <= 0 ? (
                        <span className="text-emerald-600 font-bold">Paid in Full</span>
                      ) : (
                        <span className="text-red-500 font-bold">Due: {formatCurrency(due)}</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Printable Statutory GST Tax Invoice */}
        <div className="lg:col-span-2 space-y-4">
          {selectedInvoice ? (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Dispatch:</span>
                  {selectedInvoice.dispatchStatus === 'DISPATCHED' ? (
                    <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dispatched to Transporter</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDispatch(selectedInvoice.id)}
                      disabled={loading}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow transition flex items-center space-x-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Record Dispatch (Depletes Stock)</span>
                    </button>
                  )}
                </div>

                {/* Payment Form */}
                <form onSubmit={handleRecordPayment} className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                  />
                  <button
                    type="submit"
                    disabled={loading || selectedInvoice.grandTotal <= calculateTotalPaid(selectedInvoice)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
                  >
                    Record Payment
                  </button>
                </form>
              </div>

              {/* Printable Invoice Container */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg text-slate-900 font-sans printable-invoice">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                      TAX INVOICE
                    </h2>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      (Issued under Section 31 of CGST Act, 2017)
                    </div>
                    <div className="text-sm font-extrabold text-emerald-800 mt-2">
                      CDI PACKAGED FOODS PVT LTD
                    </div>
                    <div className="text-xs text-slate-600">
                      Factory: SIDCO Industrial Estate, Thuvakudi, Tiruchirappalli - 620015
                    </div>
                    <div className="text-xs text-slate-600">
                      State: <span className="font-bold">{FACTORY_STATE_NAME}</span> • State Code: <span className="font-bold">33</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      GSTIN: {FACTORY_GSTIN}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-black text-slate-900">
                      {selectedInvoice.invoiceNumber}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')}
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="font-bold">Place of Supply:</span> {selectedInvoice.customer?.state} ({selectedInvoice.placeOfSupplyStateCode})
                    </div>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-bold">
                        {selectedInvoice.isInterState ? 'INTER-STATE SUPPLY (IGST)' : 'INTRA-STATE SUPPLY (CGST + SGST)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billed To */}
                <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Billed To (Recipient / Customer Details)
                  </div>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer?.name}</div>
                  <div className="text-slate-600">{selectedInvoice.customer?.address}</div>
                  <div className="text-slate-600">
                    State: {selectedInvoice.customer?.state} (Code: {selectedInvoice.customer?.stateCode})
                  </div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    GSTIN: {selectedInvoice.customer?.gstin || 'Unregistered Consumer'}
                  </div>
                </div>

                {/* Items Table */}
                <div className="my-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-3">Description of Goods</th>
                        <th className="py-2 px-2">HSN</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Taxable Value</th>
                        {!selectedInvoice.isInterState ? (
                          <>
                            <th className="py-2 px-2 text-right">CGST (2.5%)</th>
                            <th className="py-2 px-2 text-right">SGST (2.5%)</th>
                          </>
                        ) : (
                          <th className="py-2 px-2 text-right">IGST (5.0%)</th>
                        )}
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.items?.map((item: any, idx: number) => (
                        <tr key={item.id}>
                          <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.item?.name}</td>
                          <td className="py-2 px-2 font-mono text-slate-600">{item.hsnCode}</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{item.quantity} pkts</td>
                          <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.taxable)}</td>
                          {!selectedInvoice.isInterState ? (
                            <>
                              <td className="py-2 px-2 text-right font-mono text-slate-600">{formatCurrency(item.cgstAmount)}</td>
                              <td className="py-2 px-2 text-right font-mono text-slate-600">{formatCurrency(item.sgstAmount)}</td>
                            </>
                          ) : (
                            <td className="py-2 px-2 text-right font-mono text-slate-600">{formatCurrency(item.igstAmount)}</td>
                          )}
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & GST Summary Box */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-t border-slate-200 pt-3 gap-4">
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-700">Payment Status: <span className="uppercase text-emerald-700">{selectedInvoice.paymentStatus}</span></div>
                    <div className="text-slate-500">Total Collected: {formatCurrency(calculateTotalPaid(selectedInvoice))}</div>
                    <div className="font-bold text-slate-800">
                      Balance Due: {formatCurrency(selectedInvoice.grandTotal - calculateTotalPaid(selectedInvoice))}
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <span className="font-mono font-bold">{formatCurrency(selectedInvoice.taxableAmount)}</span>
                    </div>
                    {!selectedInvoice.isInterState ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST (2.5%):</span>
                          <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST (2.5%):</span>
                          <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.sgstAmount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST (5.0%):</span>
                        <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.igstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-900 pt-1.5">
                      <span>Invoice Grand Total:</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                  <div>
                    Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800">For CDI Packaged Foods Pvt Ltd</div>
                    <div className="mt-8 font-semibold text-slate-600">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
              Select an invoice from the left list to view statutory details or download PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
