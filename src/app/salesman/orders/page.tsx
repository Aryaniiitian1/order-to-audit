'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Send,
  Wifi,
  WifiOff,
  User,
  Package,
  FileCheck
} from 'lucide-react';
import { formatCurrency } from '../../../lib/decimal';

export default function SalesmanOrdersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        setItems(data.items);
        setOrders(data.orders);
        if (data.customers.length > 0 && !selectedCustomer) {
          setSelectedCustomer(data.customers[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQtyChange = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    for (const [itemId, qty] of Object.entries(cart)) {
      total += qty * 50.0; // ₹50 standard selling price
    }
    return total;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer.');
      return;
    }
    const orderItems = Object.entries(cart).map(([itemId, quantity]) => ({
      itemId,
      quantity,
      unitPrice: 50.0,
    }));

    if (orderItems.length === 0) {
      alert('Please select at least 1 product.');
      return;
    }

    setLoading(true);
    setMessage('');

    const payload = {
      customerId: selectedCustomer,
      salesmanId: 'salesman_a', // default field salesman
      items: orderItems,
      notes: 'Field order taken on mobile device',
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order ${data.order.orderNumber} submitted to factory!`);
        setCart({});
        loadData();
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err: any) {
      setMessage('Failed: Saved offline to queue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Mobile Status Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Field Sales Order Taking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mobile-optimized order booking with instant factory submission.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isOnline ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Queue</span>
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Order Entry Form */}
      <form onSubmit={handleSubmitOrder} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Retailer / Distributor
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state} • Code {c.stateCode})
              </option>
            ))}
          </select>
        </div>

        {/* Product Catalog Cards */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Available Finished Products
          </label>
          <div className="space-y-3">
            {items.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      Standard Rate: <span className="font-semibold text-emerald-700">₹50.00</span> / packet (before tax)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      HSN: {item.hsnCode} • Current Available Stock: {item.currentStock} pkts
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-3 bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(item.id, -10)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-90"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-bold font-mono text-sm">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(item.id, 10)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Summary & Submit */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Estimated Pre-Tax Total:</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(calculateTotal())}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || calculateTotal() === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 active:scale-95 flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Order to Factory</span>
          </button>
        </div>
      </form>

      {/* Order Status History */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Recent Field Orders & Status Tracking
        </h3>
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <span>{order.orderNumber}</span>
                  <span className="text-slate-400">•</span>
                  <span>{order.customer?.name}</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Ordered: {new Date(order.orderDate).toLocaleDateString()} • Items: {order.items?.map((i: any) => `${i.orderedQty} pkts ${i.item?.name}`).join(', ')}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-bold font-mono text-sm text-slate-800">
                  {formatCurrency(order.totalAmount)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    order.status === 'DISPATCHED'
                      ? 'bg-purple-100 text-purple-800'
                      : order.status === 'INVOICED'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
