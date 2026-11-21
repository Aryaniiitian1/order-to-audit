'use client';

import React, { useState, useEffect } from 'react';
import {
  Factory,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  IndianRupee,
  Plus,
  Play,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../../lib/decimal';

export default function ProductionRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [runCosting, setRunCosting] = useState<any>(null);

  // Form states for new run
  const [flourActual, setFlourActual] = useState<string>('40');
  const [oilActual, setOilActual] = useState<string>('10.5'); // 0.5L over standard (+5%)
  const [spiceActual, setSpiceActual] = useState<string>('1.2');
  const [actualOutput, setActualOutput] = useState<string>('188'); // 188 vs 200 expected (-6%)
  const [damagedPouches, setDamagedPouches] = useState<string>('6');
  const [cartonsUsed, setCartonsUsed] = useState<string>('9');

  // Form states for adding overhead
  const [labourAmount, setLabourAmount] = useState<string>('1200');
  const [powerAmount, setPowerAmount] = useState<string>('600');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/production/runs');
      const data = await res.json();
      if (data.success) {
        setRuns(data.runs);
        setBoms(data.boms);
        if (data.runs.length > 0 && !selectedRun) {
          handleSelectRun(data.runs[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRun = async (run: any) => {
    setSelectedRun(run);
    try {
      const res = await fetch(`/api/production/runs/${run.id}/overhead`);
      const data = await res.json();
      if (data.success) {
        setRunCosting(data.costing);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (boms.length === 0) return;
    const bom = boms[0]; // Murukku 200g BOM

    const flourItem = bom.items.find((i: any) => i.rawItem.code === 'RM-FLOUR');
    const oilItem = bom.items.find((i: any) => i.rawItem.code === 'RM-OIL');
    const spiceItem = bom.items.find((i: any) => i.rawItem.code === 'RM-SPICE');

    setLoading(true);
    setMessage('');

    const payload = {
      bomId: bom.id,
      plannedBatches: 1.0,
      issuedMaterials: [
        { itemId: flourItem.rawItemId, actualQty: parseFloat(flourActual) },
        { itemId: oilItem.rawItemId, actualQty: parseFloat(oilActual) },
        { itemId: spiceItem.rawItemId, actualQty: parseFloat(spiceActual) },
      ],
      actualGoodOutput: parseFloat(actualOutput),
      damagedPouches: parseFloat(damagedPouches),
      cartonsUsed: parseFloat(cartonsUsed),
      notes: 'Production run logged from floor screen',
    };

    try {
      const res = await fetch('/api/production/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Production run ${data.run.runNumber} recorded! Raw materials deducted and finished goods credited.`);
        await loadData();
        handleSelectRun(data.run);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverheads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/production/runs/${selectedRun.id}/overhead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overheads: [
            { overheadType: 'LABOUR', amount: parseFloat(labourAmount), notes: 'Direct labour for run' },
            { overheadType: 'POWER_GAS', amount: parseFloat(powerAmount), notes: 'Gas and power allocated' },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Overheads recorded! Cost per packet updated to ₹30.90.');
        setRunCosting(data.costing);
        await loadData();
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Recipe Production Runs & Costing Floor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bill of Materials (BOM) standard recipe execution, planned vs actual variance audit, and cost per packet allocation.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Grid: Run Creator & Analysis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Start New Run */}
        <div className="lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Log Daily Production Run
            </h3>
            <p className="text-xs text-slate-500">
              Recipe: Murukku 200 g (1 Batch = 200 pkts expected)
            </p>
          </div>

          <form onSubmit={handleCreateRun} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Flour Issued (Standard: 40 kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={flourActual}
                onChange={(e) => setFlourActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Cooking Oil Issued (Standard: 10 L)
              </label>
              <input
                type="number"
                step="0.1"
                value={oilActual}
                onChange={(e) => setOilActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                required
              />
              <span className="text-[10px] text-amber-600 font-medium">10.5 L = +5% adverse variance (flagged)</span>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Spice Mix Issued (Standard: 1.2 kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={spiceActual}
                onChange={(e) => setSpiceActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                required
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block font-bold text-slate-900 mb-1">
                Actual Good Output (Expected: 200 packets)
              </label>
              <input
                type="number"
                value={actualOutput}
                onChange={(e) => setActualOutput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-500 font-mono font-extrabold text-emerald-800 bg-emerald-50/30 text-sm"
                required
              />
              <span className="text-[10px] text-red-600 font-medium">188 pkts = -6% yield variance shortfall (flagged)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Damaged Pouches</label>
                <input
                  type="number"
                  value={damagedPouches}
                  onChange={(e) => setDamagedPouches(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Cartons Used</label>
                <input
                  type="number"
                  value={cartonsUsed}
                  onChange={(e) => setCartonsUsed(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Record Run & Update Stock</span>
            </button>
          </form>

          {/* Previous Runs List */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Completed Production Runs ({runs.length})
            </h4>
            {runs.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectRun(r)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                  selectedRun?.id === r.id
                    ? 'bg-emerald-50 border-emerald-500 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between">
                  <span>{r.runNumber}</span>
                  <span className={r.yieldVarianceFlag ? 'text-red-600' : 'text-emerald-600'}>
                    Yield: {r.yieldVariancePercent}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Output: {r.actualOutput} pkts • Date: {new Date(r.runDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Detailed Variance & Costing Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRun ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Production Run Analysis
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {selectedRun.runNumber} • {selectedRun.finishedGoodItem?.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Expected: <span className="font-bold">{selectedRun.expectedOutput} pkts</span> • Actual Good: <span className="font-bold text-emerald-800">{selectedRun.actualOutput} pkts</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedRun.yieldVarianceFlag
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    Yield Variance: {selectedRun.yieldVariancePercent}% {selectedRun.yieldVarianceFlag ? '(FLAGGED)' : ''}
                  </span>
                </div>
              </div>

              {/* Planned vs Actual Consumption Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Planned vs Actual Material Consumption
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">Material</th>
                        <th className="py-2 px-3 text-right">Planned Qty</th>
                        <th className="py-2 px-3 text-right">Actual Issued</th>
                        <th className="py-2 px-3 text-right">Variance Qty</th>
                        <th className="py-2 px-3 text-right">Variance %</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRun.consumptions?.map((c: any) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {c.item?.name}
                            <span className="text-[10px] text-slate-400 ml-1">({c.item?.uom})</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.plannedQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{c.actualQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {c.varianceQty > 0 ? `+${c.varianceQty}` : c.varianceQty}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={c.varianceFlag ? 'text-red-600' : 'text-slate-700'}>
                              {c.variancePercent > 0 ? `+${c.variancePercent}%` : `${c.variancePercent}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.varianceFlag ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold">
                                OVER-CONSUMPTION
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                NORMAL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manufacturing Overhead Form & Costing Analysis */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Direct Overheads & Cost Per Packet Calculation
                  </h4>

                  {/* Quick Form to Add Labour & Power */}
                  <form onSubmit={handleAddOverheads} className="flex items-center space-x-2 text-xs">
                    <input
                      type="number"
                      placeholder="Labour (₹)"
                      value={labourAmount}
                      onChange={(e) => setLabourAmount(e.target.value)}
                      className="w-24 px-2 py-1.5 rounded border border-slate-300 font-mono font-bold"
                    />
                    <input
                      type="number"
                      placeholder="Power (₹)"
                      value={powerAmount}
                      onChange={(e) => setPowerAmount(e.target.value)}
                      className="w-24 px-2 py-1.5 rounded border border-slate-300 font-mono font-bold"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-sm"
                    >
                      Allocate Overheads
                    </button>
                  </form>
                </div>

                {runCosting && (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Material Cost</div>
                        <div className="text-base font-extrabold text-slate-900 mt-0.5">
                          {formatCurrency(runCosting.totalMaterialCost)}
                        </div>
                        <div className="text-[10px] text-slate-500">RM + Packaging</div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Direct Overheads</div>
                        <div className="text-base font-extrabold text-slate-900 mt-0.5">
                          {formatCurrency(runCosting.totalOverheadCost)}
                        </div>
                        <div className="text-[10px] text-slate-500">Labour + Power</div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Batch Cost</div>
                        <div className="text-base font-extrabold text-slate-900 mt-0.5">
                          {formatCurrency(runCosting.totalProductionCost)}
                        </div>
                        <div className="text-[10px] text-slate-500">for {runCosting.actualGoodOutput} good pkts</div>
                      </div>

                      <div className="bg-emerald-600 text-white p-3 rounded-lg shadow-md">
                        <div className="text-[10px] uppercase font-bold text-emerald-200">Cost Per Packet</div>
                        <div className="text-lg font-black mt-0.5">
                          {formatCurrency(runCosting.costPerPacket)}
                        </div>
                        <div className="text-[10px] text-emerald-200">Margin: {runCosting.grossMarginPercentage}%</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex justify-between items-center border-t border-slate-200 pt-2 font-mono">
                      <span>Valuation Method: <strong className="text-slate-900">{runCosting.valuationMethod}</strong></span>
                      <span>Selling Price: <strong className="text-slate-900">{formatCurrency(runCosting.sellingPrice)}</strong></span>
                      <span>Gross Profit per Packet: <strong className="text-emerald-700">{formatCurrency(runCosting.grossMarginPerPacket)}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
              Select a production run from the left to view planned vs actual variances and cost-per-packet breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
