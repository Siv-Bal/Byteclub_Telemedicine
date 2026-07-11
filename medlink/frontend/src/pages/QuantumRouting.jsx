import React, { useState } from 'react';
import { Network, Zap, Server, Activity } from 'lucide-react';

export default function QuantumRouting() {
  const [budget, setBudget] = useState(100);
  const [triageResult, setTriageResult] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const patients = {
    "P1": { urgency: 1.0, cost: 50, color: "RED" },
    "P2": { urgency: 0.5, cost: 40, color: "YELLOW" },
    "P3": { urgency: 0.2, cost: 60, color: "GREEN" },
    "P4": { urgency: 0.8, cost: 30, color: "RED" }
  };

  const edges = {
    "nodeA_nodeB": 0.2,
    "nodeA_nodeC": 0.5,
    "nodeB_nodeD": 0.1,
    "nodeC_nodeD": 0.3
  };

  const handleTriage = async () => {
    setLoadingA(true);
    try {
      const res = await fetch('http://localhost:8000/api/triage-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients, channel_budget_bytes: budget })
      });
      const data = await res.json();
      setTriageResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingA(false);
    }
  };

  const handleRoute = async () => {
    setLoadingB(true);
    try {
      const res = await fetch('http://localhost:8000/api/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edges, source: 'nodeA', sink: 'nodeD' })
      });
      const data = await res.json();
      setRouteResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingB(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quantum Routing & Triage</h1>
          <p className="text-slate-500">Qiskit QAOA optimization over constraint graphs</p>
        </div>
        <div className="bg-brand-50 text-brand-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-brand-100 shadow-sm">
          <Server size={16} /> Backend: qiskit-aer (Simulator)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Module A */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Zap className="text-amber-500" size={20} /> Module A: Bandwidth Triage
          </h2>
          <p className="text-sm text-slate-500 mb-6 h-10">Optimizes which patients transmit data given a strict byte budget.</p>
          
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                <span>Byte Budget</span>
                <span>{budget} B</span>
              </div>
              <input 
                type="range" min="30" max="150" step="10"
                value={budget} onChange={e => setBudget(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Urgency (0-1)</th>
                    <th className="px-4 py-3 text-right">Cost (Bytes)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(patients).map(([id, p]) => (
                    <tr key={id} className={triageResult?.selection[id] ? 'bg-green-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.color === 'RED' ? 'bg-red-500' : p.color === 'YELLOW' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                        {id}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{p.urgency.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-right text-slate-600">{p.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button 
              onClick={handleTriage} disabled={loadingA}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 font-bold shadow-md shadow-slate-900/20"
            >
              {loadingA ? <Activity size={20} className="animate-spin" /> : <Zap size={20} />}
              Run QAOA Optimization
            </button>
          </div>
        </div>

        {/* Module B */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Network className="text-brand-500" size={20} /> Module B: Mesh Routing
          </h2>
          <p className="text-sm text-slate-500 mb-6 h-10">Finds minimum-loss path across dynamic relay graph.</p>
          
          <div className="flex-1 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative min-h-[220px] flex items-center justify-center">
              {/* Very simple hardcoded graph visualization for the prototype */}
              <div className="absolute top-8 left-12 p-3 bg-white border-2 border-slate-200 rounded-full font-bold shadow-sm z-10 text-slate-700">A</div>
              <div className="absolute top-8 right-12 p-3 bg-white border-2 border-slate-200 rounded-full font-bold shadow-sm z-10 text-slate-700">C</div>
              <div className="absolute bottom-8 left-12 p-3 bg-white border-2 border-slate-200 rounded-full font-bold shadow-sm z-10 text-slate-700">B</div>
              <div className="absolute bottom-8 right-12 p-3 bg-white border-2 border-slate-200 rounded-full font-bold shadow-sm z-10 text-brand-600 border-brand-200">D</div>
              
              {/* Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="25%" y1="25%" x2="25%" y2="75%" stroke={routeResult?.selection['nodeA_nodeB'] ? '#3b82f6' : '#cbd5e1'} strokeWidth={routeResult?.selection['nodeA_nodeB'] ? 4 : 2} strokeDasharray={routeResult?.selection['nodeA_nodeB'] ? 'none' : '4'} />
                <line x1="25%" y1="25%" x2="75%" y2="25%" stroke={routeResult?.selection['nodeA_nodeC'] ? '#3b82f6' : '#cbd5e1'} strokeWidth={routeResult?.selection['nodeA_nodeC'] ? 4 : 2} strokeDasharray={routeResult?.selection['nodeA_nodeC'] ? 'none' : '4'} />
                <line x1="25%" y1="75%" x2="75%" y2="75%" stroke={routeResult?.selection['nodeB_nodeD'] ? '#3b82f6' : '#cbd5e1'} strokeWidth={routeResult?.selection['nodeB_nodeD'] ? 4 : 2} strokeDasharray={routeResult?.selection['nodeB_nodeD'] ? 'none' : '4'} />
                <line x1="75%" y1="25%" x2="75%" y2="75%" stroke={routeResult?.selection['nodeC_nodeD'] ? '#3b82f6' : '#cbd5e1'} strokeWidth={routeResult?.selection['nodeC_nodeD'] ? 4 : 2} strokeDasharray={routeResult?.selection['nodeC_nodeD'] ? 'none' : '4'} />
              </svg>
            </div>
            
            <button 
              onClick={handleRoute} disabled={loadingB}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 font-bold shadow-md shadow-slate-900/20"
            >
              {loadingB ? <Activity size={20} className="animate-spin" /> : <Network size={20} />}
              Run QAOA Optimization
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
