'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Boxes,
  FileText,
  User,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../../lib/decimal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        if (data.orders.length > 0 && !selectedOrder) {
          handleSelectOrder(data.orders[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/verify`);
      const data = await res.json();
      if (data.success) {
        setVerification(data.verification);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedOrder) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminUserId: 'admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order ${selectedOrder.orderNumber} ${action === 'APPROVE' ? 'Approved' : 'Rejected'}!`);
        await loadOrders();
        handleSelectOrder({ ...selectedOrder, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' });
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Order Verification & Stock Availability Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review incoming field orders, verify stock sufficiency, check GST place of supply, and approve for tax billing.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* 2-Column Layout: Order Queue & Verification Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Queue */}
        <div className="lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Incoming Orders Queue ({orders.length})
          </h3>

          <div className="space-y-2">
            {orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{order.orderNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        order.status === 'APPROVED' || order.status === 'INVOICED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-slate-600 mt-1 font-semibold">
                    {order.customer?.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                    <span>{order.customer?.state}</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Order Verification Details */}
        <div className="lg:col-span-2 space-y-4">
          {verification ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Verifying Order
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {verification.orderNumber} • {verification.customerName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Place of Supply: <span className="font-bold text-slate-700">{verification.customerState} (Code {verification.customerStateCode})</span>
                  </div>
                </div>

                {/* Place of Supply GST Badge */}
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    verification.isInterState
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {verification.isInterState ? 'Inter-State (IGST 5%)' : 'Intra-State (CGST 2.5% + SGST 2.5%)'}
                  </span>
                </div>
              </div>

              {/* Stock Sufficiency Alert Box */}
              {verification.hasInsufficientStock ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sm text-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span>Insufficient Finished Goods Stock Alert!</span>
                  </div>
                  <p className="text-xs text-red-700">
                    Current warehouse inventory cannot cover this order. A new production batch must be scheduled before full dispatch.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Finished Stock Available to Cover Order</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    All requested quantities are present in warehouse stock. Ready for tax invoice generation and dispatch.
                  </p>
                </div>
              )}

              {/* Item-by-Item Availability Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Line Items & Stock Verification Table
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-right">Requested Qty</th>
                        <th className="py-2.5 px-3 text-right">Available in Stock</th>
                        <th className="py-2.5 px-3 text-right">Shortage</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verification.items.map((item: any) => (
                        <tr key={item.itemId}>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {item.itemName}
                            <div className="text-[10px] text-slate-400 font-mono">{item.itemCode}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            {item.orderedQty} pkts
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {item.availableStock} pkts
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                            {item.shortage > 0 ? `-${item.shortage} pkts` : '0'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.isSufficient ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Available
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                Shortage
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  onClick={() => handleDecision('REJECT')}
                  disabled={loading || selectedOrder?.status !== 'SUBMITTED'}
                  className="px-4 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition disabled:opacity-40"
                >
                  Reject Order
                </button>

                <button
                  onClick={() => handleDecision('APPROVE')}
                  disabled={loading || selectedOrder?.status !== 'SUBMITTED'}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-40 flex items-center space-x-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Approve & Forward to Billing</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
              Select an order from the left queue to verify stock and place of supply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
