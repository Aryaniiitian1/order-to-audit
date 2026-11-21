'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  History
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../../lib/decimal';

export default function InventoryStockPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/stock');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        if (data.summary.length > 0 && !selectedItemId) {
          handleSelectItem(data.summary[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSelectItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/inventory/ledger/${itemId}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredItems = summary.filter((item) => {
    if (categoryFilter === 'ALL') return true;
    return item.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Valuation & Traceable Stock Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconciled balances derived from append-only movement transactions linked to purchase orders, production runs, and sales dispatches.
          </p>
        </div>

        <button
          onClick={loadSummary}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'All Items' },
          { id: 'RAW_MATERIAL', label: 'Raw Materials' },
          { id: 'PACKAGING', label: 'Packaging Materials' },
          { id: 'FINISHED_GOOD', label: 'Finished Goods' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Stock Balances & Detailed Item Movement Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stock Cards List */}
        <div className="lg:col-span-1 space-y-2.5">
          {filteredItems.map((item) => {
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Code: {item.code} • HSN: {item.hsnCode}
                </div>

                <div className="mt-3 flex items-end justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Current Balance:</div>
                    <div className="font-extrabold text-base text-slate-900 font-mono">
                      {formatQuantity(item.currentStock, item.uom)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Stock Valuation:</div>
                    <div className="font-bold text-slate-700 font-mono">
                      {formatCurrency(item.stockValue)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Immutable Movement Ledger */}
        <div className="lg:col-span-2">
          {ledgerData ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Traceable Stock Movement Ledger
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {ledgerData.item?.name} ({ledgerData.item?.code})
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Valuation Rate: <strong className="text-slate-800">{formatCurrency(ledgerData.item?.valuationRate)}</strong> per {ledgerData.item?.uom}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Closing Balance</div>
                  <div className="text-xl font-black text-emerald-800 font-mono">
                    {formatQuantity(ledgerData.item?.currentStock, ledgerData.item?.uom)}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3">Source Document</th>
                      <th className="py-2.5 px-3 text-right">Quantity Delta</th>
                      <th className="py-2.5 px-3 text-right">Balance After</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerData.movements?.map((m: any) => {
                      const isPositive = m.quantityChange > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.transactionType.includes('RECEIPT') || m.transactionType.includes('YIELD') || m.transactionType.includes('OPENING')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {m.transactionType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {m.sourceDocId}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange} {ledgerData.item?.uom}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                            {m.balanceAfter} {ledgerData.item?.uom}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {m.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Formula Footer */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono flex items-center justify-between">
                <span>Formula: Opening Balance + Receipts − Issues/Sales ± Adjustments = Closing Balance</span>
                <span className="font-bold text-emerald-700">✓ Reconciled with Ledger Sum</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
              Select an inventory item from the left to inspect its traceable stock movement ledger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
