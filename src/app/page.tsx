'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Boxes,
  AlertTriangle,
  IndianRupee,
  Factory,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/decimal';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400 text-sm animate-pulse flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
          <span>Loading Executive Operations Dashboard...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Today's Orders",
      value: data?.todayOrdersCount || 0,
      sub: formatCurrency(data?.todayOrdersTotal || 0),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Total Receivables Due',
      value: formatCurrency(data?.totalReceivables || 0),
      sub: 'Customer outstanding balances',
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Variance Alerts',
      value: data?.varianceAlertsCount || 0,
      sub: 'Exceeding 3% tolerance threshold',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      title: 'Low Stock Alerts',
      value: data?.lowStockAlerts?.length || 0,
      sub: 'Items near or below reorder level',
      icon: Boxes,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Factory Executive Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time synchronization across Field Sales, GST Invoicing, Production Floor, and Audit Ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/benchmark"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Benchmark Simulator</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`bg-white rounded-xl p-5 border ${kpi.border} shadow-sm hover:shadow transition`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">{kpi.value}</div>
              <div className="mt-1 text-xs text-slate-500">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Live Stock & Production Variance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Inventory Balances */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Current Inventory Balances</span>
            </h3>
            <Link
              href="/inventory/stock"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-0.5"
            >
              <span>View Full Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {data?.stockSummary?.slice(0, 6).map((item: any) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.code} • {item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 font-mono">
                    {formatQuantity(item.currentStock, item.uom)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Valuation: {formatCurrency(item.stockValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Production Variance Alerts */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Recipe Variance & Wastage Alerts</span>
            </h3>
            <Link
              href="/production/runs"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-0.5"
            >
              <span>View Production Runs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-3 space-y-2.5">
            {data?.varianceAlerts?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active production variance alerts. All runs within standard tolerance.
              </div>
            ) : (
              data?.varianceAlerts?.map((run: any) => (
                <div
                  key={run.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span>{run.runNumber} — {run.finishedGoodItem?.name}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                      Yield Variance: {run.yieldVariancePercent}%
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Expected: {run.expectedOutput} pkts | Actual Output: {run.actualOutput} pkts
                  </div>
                  {run.consumptions
                    ?.filter((c: any) => c.varianceFlag)
                    .map((c: any) => (
                      <div key={c.id} className="text-[11px] text-amber-700 font-mono">
                        • {c.item?.name}: {c.actualQty} vs planned {c.plannedQty} (+{c.variancePercent}%)
                      </div>
                    ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
