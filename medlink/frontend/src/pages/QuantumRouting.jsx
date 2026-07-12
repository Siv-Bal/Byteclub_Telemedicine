import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Network, Zap, Server, Activity, CheckCircle2, RefreshCw, Play, Square, ChevronDown, ChevronUp, Clock, BarChart2 } from 'lucide-react';

// ─── QAOA / QUBO Simulation Helpers ────────────────────────────────────────
const PENALTY = 6.0;

function buildRoutingQubo(edgeLosses, names) {
  const n = names.length;
  const Q = {};
  const add = (i, j, val) => {
    const key = `${Math.min(i,j)}_${Math.max(i,j)}`;
    Q[key] = (Q[key] || 0) + val;
  };
  // Objective: minimize sum(loss_e * x_e)
  names.forEach((e, idx) => add(idx, idx, edgeLosses[e]));
  // Penalty: (sum(x_e) - 1)^2 * PENALTY
  for (let i = 0; i < n; i++) {
    add(i, i, PENALTY * (1 - 2));
    for (let j = i + 1; j < n; j++) add(i, j, PENALTY * 2);
  }
  return Q;
}

function bruteForce(edgeLosses, names) {
  let bestLoss = Infinity, bestBits = null;
  const nCombo = 1 << names.length;
  for (let mask = 0; mask < nCombo; mask++) {
    const bits = names.map((_, i) => (mask >> i) & 1);
    if (bits.reduce((s, b) => s + b, 0) !== 1) continue;
    const loss = bits.reduce((s, b, i) => s + b * edgeLosses[names[i]], 0);
    if (loss < bestLoss) { bestLoss = loss; bestBits = bits; }
  }
  return { bestBits, bestLoss };
}

function simulateQAOA(edgeLosses, names, shots = 512) {
  // Simulated QAOA: probabilistically select near-optimal result
  const { bestBits, bestLoss } = bruteForce(edgeLosses, names);
  const bestIdx = bestBits.indexOf(1);
  // Probability distribution: best edge gets ~70%, others share rest
  const probs = names.map((_, i) => i === bestIdx ? 0.70 : 0.30 / (names.length - 1));
  const rand = Math.random();
  let cumul = 0, chosen = bestIdx;
  for (let i = 0; i < probs.length; i++) { cumul += probs[i]; if (rand < cumul) { chosen = i; break; } }
  const x = names.map((_, i) => i === chosen ? 1 : 0);
  const qaoaLoss = edgeLosses[names[chosen]];
  return { x, chosenEdge: names[chosen], qaoaLoss, bestLoss, matchesBF: chosen === bestIdx, shots };
}

// ─── Log Emitter (mirrors Python print statements) ─────────────────────────
function buildSolverLog(edgeLosses, names, Q, qaoaResult) {
  const lines = [];
  const push = (t, c) => lines.push({ type: t, text: c });

  push('div', '='.repeat(62));
  push('title', 'MEDLINK QUANTUM -- Mesh Relay Path Selection');
  push('div', '='.repeat(62));
  push('blank', '');
  push('section', 'Mesh links currently available from source node n1:');
  names.forEach(e => push('data', `  ${e.padEnd(10)}  observed loss rate = ${edgeLosses[e].toFixed(2)}`));
  push('blank', '');
  push('question', 'Question: which single outgoing hop minimizes expected loss?');
  push('blank', '');
  push('section', '--- Classical brute-force reference ---');
  const { bestBits, bestLoss } = bruteForce(edgeLosses, names);
  const bfEdge = names[bestBits.indexOf(1)];
  push('good', `  Best edge: ${bfEdge}  (expected loss ${bestLoss.toFixed(2)})`);
  push('blank', '');
  push('section', '--- Step 1: building the QUBO ---');
  push('data', `  Total qubits needed: ${names.length}  (one per candidate edge, no slack`);
  push('data', `  qubits needed -- equality constraint, not a budget)`);
  push('blank', '');
  push('section', '--- QUBO diagonal (Q_ii terms) ---');
  names.forEach((e, i) => {
    const diag = (Q[`${i}_${i}`] || 0).toFixed(3);
    push('data', `  Q[${i},${i}]  (edge ${e})  = ${diag}`);
  });
  push('blank', '');
  push('section', '--- QUBO off-diagonal penalty terms (Q_ij for i<j) ---');
  for (let i = 0; i < names.length; i++)
    for (let j = i+1; j < names.length; j++)
      push('data', `  Q[${i},${j}]  = ${((Q[`${i}_${j}`]) || 0).toFixed(3)}  (penalty coupling)`);
  push('blank', '');
  push('section', `--- Step 2: running QAOA (p=2 layers, shots=${qaoaResult.shots}, maxiter=60) ---`);
  push('data', '  Ising conversion:  H = sum Q_ij * Z_i Z_j  (mapped from QUBO)');
  push('data', '  Parameterized circuit: RZ(2β) + CNOT entanglers per layer');
  push('data', '  Classical optimizer: COBYLA  (minimizing expectation value)');
  push('blank', '');
  push('section', '--- QAOA result ---');
  names.forEach((e, i) => push(qaoaResult.x[i] ? 'good' : 'data', `  ${e.padEnd(10)} -> ${qaoaResult.x[i] ? 'USE THIS HOP ✓' : 'not used'}`));
  push('blank', '');
  push('section', '--- Verification ---');
  push(qaoaResult.x.reduce((s,b)=>s+b,0)===1 ? 'good':'bad', `  QAOA selected exactly one hop: ${qaoaResult.x.reduce((s,b)=>s+b,0)===1}`);
  push(qaoaResult.matchesBF ? 'good' : 'warn', `  QAOA matches classical optimum (${bfEdge}): ${qaoaResult.matchesBF}`);
  push('blank', '');
  push('section', '--- Why this matters ---');
  push('info', '  As mesh conditions shift every few seconds,');
  push('info', '  this QUBO is rebuilt with fresh loss rates and re-solved.');
  push('info', '  Periodic decision-layer optimization, never per-packet.');
  push('div', '='.repeat(62));
  return lines;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function QuantumRouting() {
  // Module A
  const [budget, setBudget] = useState(70);
  const [triageResult, setTriageResult] = useState(null);
  const [loadingA, setLoadingA] = useState(false);

  // Module B – edge loss state (live + manual)
  const [edgeLosses, setEdgeLosses] = useState({ n1_n2: 0.05, n1_n3: 0.12, n1_n5: 0.28, n1_n6: 0.09 });
  const names = Object.keys(edgeLosses);

  const [liveMode, setLiveMode] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [solverLog, setSolverLog] = useState([]);
  const [showQUBO, setShowQUBO] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [pathHistory, setPathHistory] = useState([]);
  const [solveCount, setSolveCount] = useState(0);
  const liveRef = useRef(null);
  const logEndRef = useRef(null);

  // Module A patients
  const patients = {
    "p1_cardiac_alert": { urgency: 0.95, cost: 40, color: "RED" },
    "p2_stable_checkin": { urgency: 0.30, cost: 20, color: "GREEN" },
    "p3_resp_distress": { urgency: 0.85, cost: 55, color: "RED" },
    "p4_routine_vitals": { urgency: 0.20, cost: 15, color: "GREEN" }
  };

  const handleTriage = async () => {
    setLoadingA(true);
    await new Promise(r => setTimeout(r, 1400));
    let selection = {};
    if (budget >= 115) selection = { p1_cardiac_alert: true, p2_stable_checkin: true, p3_resp_distress: true, p4_routine_vitals: true };
    else if (budget >= 95) selection = { p1_cardiac_alert: true, p3_resp_distress: true };
    else if (budget >= 60) selection = { p1_cardiac_alert: true, p2_stable_checkin: true };
    else if (budget >= 55) selection = { p3_resp_distress: true };
    else if (budget >= 40) selection = { p1_cardiac_alert: true };
    const score = Object.keys(selection).reduce((s, p) => s + patients[p].urgency, 0);
    const cost = Object.keys(selection).reduce((s, p) => s + patients[p].cost, 0);
    setTriageResult({ selection, score, total_cost: cost });
    setLoadingA(false);
  };

  // ── Module B core solver ──
  const runSolver = useCallback(async (losses) => {
    setLoadingB(true);
    // Simulate circuit runtime
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
    const Q = buildRoutingQubo(losses, names);
    const result = simulateQAOA(losses, names);
    const log = buildSolverLog(losses, names, Q, result);
    setRouteResult({ ...result, Q, losses: { ...losses } });
    setSolverLog(log);
    setSolveCount(c => c + 1);
    setPathHistory(prev => [
      { edge: result.chosenEdge, loss: result.qaoaLoss, matched: result.matchesBF, ts: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9)
    ]);
    setLoadingB(false);
    setShowLog(true);
  }, [names]);

  // Live-mode: randomise loss rates every 5 s and auto-solve
  useEffect(() => {
    if (!liveMode) { if (liveRef.current) clearInterval(liveRef.current); return; }
    const tick = () => {
      const newLosses = { n1_n2: +(Math.random() * 0.3).toFixed(2), n1_n3: +(Math.random() * 0.4 + 0.05).toFixed(2), n1_n5: +(Math.random() * 0.5 + 0.1).toFixed(2), n1_n6: +(Math.random() * 0.35).toFixed(2) };
      setEdgeLosses(newLosses);
      runSolver(newLosses);
    };
    tick();
    liveRef.current = setInterval(tick, 5000);
    return () => clearInterval(liveRef.current);
  }, [liveMode]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [solverLog]);

  const lossColor = (loss) => loss < 0.1 ? 'text-emerald-600' : loss < 0.2 ? 'text-amber-500' : 'text-rose-500';
  const lossBarColor = (loss) => loss < 0.1 ? 'bg-emerald-400' : loss < 0.2 ? 'bg-amber-400' : 'bg-rose-400';
  const logColor = (type) => ({ title: 'text-brand-400 font-black', section: 'text-amber-400 font-bold', good: 'text-emerald-400', bad: 'text-rose-400', warn: 'text-amber-300', data: 'text-slate-300', info: 'text-slate-400 italic', question: 'text-sky-300 font-bold', div: 'text-slate-600', blank: '' }[type] || 'text-slate-300');

  // QUBO matrix for display
  const Q = routeResult ? routeResult.Q : buildRoutingQubo(edgeLosses, names);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">MedLink Quantum Demo</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">QUBO Formulations & QAOA Optimization · Simulated Qiskit-Aer Pipeline</p>
        </div>
        <div className="bg-brand-50 text-brand-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-brand-100 shadow-sm w-fit">
          <Server size={14} /> QAOA Solver · p=2 · 512 shots
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* ══════════════════════════════════════════════ Module A */}
        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={120} /></div>
          <h2 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2 tracking-tight">
            <Zap className="text-amber-500" size={20} /> Bandwidth-Constrained Patient Triage
          </h2>
          <div className="text-sm text-slate-500 mb-6 leading-relaxed relative z-10 space-y-1">
            <p><strong>The Situation:</strong> Clinical data queued at the field gateway. Channel carries limited bytes per cycle.</p>
            <p>Maximize total urgency served without exceeding the byte budget <span className="font-bold text-slate-700">(0/1 Knapsack → QUBO)</span>.</p>
          </div>
          <div className="flex-1 flex flex-col space-y-6 relative z-10">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transmission Budget</span>
                <span className="text-lg font-black text-brand-600">{budget} <span className="text-sm font-bold text-brand-400">Bytes</span></span>
              </div>
              <input type="range" min="30" max="150" step="5" value={budget} onChange={e => setBudget(+e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                  <tr><th className="px-5 py-4">Patient</th><th className="px-5 py-4 text-center">Urgency</th><th className="px-5 py-4 text-right">Bytes</th><th className="px-5 py-4 text-center w-20">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.entries(patients).map(([id, p]) => {
                    const sel = triageResult?.selection[id];
                    return (
                      <tr key={id} className={`transition-colors ${sel ? 'bg-emerald-50/40' : 'bg-white'}`}>
                        <td className="px-5 py-3 font-bold text-slate-700 text-xs flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color === 'RED' ? 'bg-rose-500' : 'bg-emerald-500'}`} /> {id}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-500 text-center text-xs">{p.urgency.toFixed(2)}</td>
                        <td className="px-5 py-3 font-mono text-slate-500 text-right text-xs">{p.cost} B</td>
                        <td className="px-5 py-3 text-center">
                          {triageResult ? (sel
                            ? <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Send</span>
                            : <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Hold</span>)
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {triageResult && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={20} /></div>
                  <div><div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">QAOA Urgency Score</div>
                    <div className="text-lg font-black text-emerald-700">{triageResult.score.toFixed(2)}</div></div>
                </div>
                <div className="text-right"><div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Bytes Used</div>
                  <div className="text-sm font-black text-emerald-700 font-mono">{triageResult.total_cost} / {budget}</div></div>
              </div>
            )}
            <button onClick={handleTriage} disabled={loadingA}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 font-bold shadow-lg shadow-brand-500/25 uppercase tracking-widest text-xs">
              {loadingA ? <Activity size={18} className="animate-spin" /> : <Zap size={18} />}
              {loadingA ? 'Running QAOA Circuit...' : 'Solve QUBO via QAOA'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════ Module B (FULL) */}
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Network size={120} /></div>

            {/* Header */}
            <div className="flex items-start justify-between mb-2 relative z-10">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight">
                <Network className="text-brand-500" size={20} /> Mesh Relay Path Selection
              </h2>
              <div className="flex items-center gap-2">
                {liveMode && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg animate-pulse"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>LIVE</span>}
                {solveCount > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">{solveCount} runs</span>}
              </div>
            </div>

            <div className="text-sm text-slate-500 mb-6 leading-relaxed relative z-10 space-y-1">
              <p><strong>The Situation:</strong> Field-worker phones relay via Nearby Connections when no direct gateway signal. Each link has an observed packet-loss rate that shifts as conditions change.</p>
              <p>Pick the single outgoing edge from source <strong>n1</strong> minimizing expected first-hop loss <span className="font-bold text-slate-700">(Equality-constrained QUBO)</span>.</p>
            </div>

            {/* ── Live Loss Rate Controls ── */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 mb-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edge Loss Rates (Observed)</span>
                <button onClick={() => setLiveMode(l => !l)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest border transition-all ${liveMode ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-brand-50 text-brand-600 border-brand-100 hover:bg-brand-100'}`}>
                  {liveMode ? <><Square size={10}/>Stop Live</> : <><RefreshCw size={10}/>Start Live</>}
                </button>
              </div>
              <div className="space-y-4">
                {names.map(edge => {
                  const loss = edgeLosses[edge];
                  const isSelected = routeResult?.chosenEdge === edge;
                  return (
                    <div key={edge} className={`rounded-xl p-3 border transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isSelected && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>}
                          <span className={`text-xs font-black font-mono ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>{edge.replace('_', ' → ')}</span>
                          {isSelected && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Selected</span>}
                        </div>
                        <span className={`text-sm font-black font-mono ${lossColor(loss)}`}>{loss.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${lossBarColor(loss)}`} style={{ width: `${loss * 200}%` }} />
                        </div>
                        <input type="range" min="0.01" max="0.50" step="0.01"
                          value={loss} disabled={liveMode}
                          onChange={e => setEdgeLosses(prev => ({ ...prev, [edge]: +parseFloat(e.target.value).toFixed(2) }))}
                          className={`w-28 h-1.5 rounded-lg appearance-none accent-brand-500 ${liveMode ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Network Topology Visual ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 mb-5 relative z-10 overflow-hidden min-h-[220px]">
              <div className="absolute inset-0 opacity-5">
                {[...Array(20)].map((_, i) => <div key={i} className="absolute w-px h-full bg-white" style={{ left: `${i * 5.26}%` }} />)}
                {[...Array(20)].map((_, i) => <div key={i} className="absolute w-full h-px bg-white" style={{ top: `${i * 5}%` }} />)}
              </div>
              <div className="relative z-10 flex items-center justify-between h-full gap-8 px-4">
                {/* Source */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-full bg-brand-600 border-4 border-brand-400 flex flex-col items-center justify-center shadow-lg shadow-brand-500/40">
                    <span className="text-white font-black text-base">n1</span>
                    <span className="text-[8px] text-brand-200 uppercase tracking-widest">Source</span>
                  </div>
                </div>

                {/* Edges + Nodes */}
                <div className="flex-1 flex flex-col gap-3">
                  {names.map(edge => {
                    const nodeId = edge.split('_')[1];
                    const loss = edgeLosses[edge];
                    const isSelected = routeResult?.chosenEdge === edge;
                    const edgeColor = isSelected ? '#34d399' : loss < 0.15 ? '#94a3b8' : loss < 0.3 ? '#f59e0b' : '#f87171';
                    return (
                      <div key={edge} className="flex items-center gap-3">
                        {/* Line */}
                        <div className="flex-1 relative h-4 flex items-center">
                          <div className="absolute inset-x-0 h-0.5 rounded-full transition-colors duration-500" style={{ backgroundColor: edgeColor, boxShadow: isSelected ? `0 0 10px ${edgeColor}` : 'none' }} />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: '1s' }} />
                            </div>
                          )}
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isSelected ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{loss.toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Node */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-500 shrink-0 ${isSelected ? 'bg-emerald-400 border-emerald-300 text-slate-900 shadow-lg shadow-emerald-500/40' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                          {nodeId}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── QAOA Result Summary ── */}
            {routeResult && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 animate-in slide-in-from-bottom-2 relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={20} /></div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">QAOA Selected Hop</div>
                      <div className="text-sm font-black text-emerald-700 font-mono">{routeResult.chosenEdge.replace('_', ' → ')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Expected Loss</div>
                    <div className="text-2xl font-black text-emerald-700 font-mono">{routeResult.qaoaLoss.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matches Brute Force</div>
                    <div className={`text-sm font-black ${routeResult.matchesBF ? 'text-emerald-600' : 'text-amber-500'}`}>{routeResult.matchesBF ? '✓ Yes' : '~ Close'}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Classical Optimum</div>
                    <div className="text-sm font-black text-slate-700 font-mono">{routeResult.bestLoss.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qubits Used</div>
                    <div className="text-sm font-black text-slate-700">{names.length} <span className="text-xs font-medium text-slate-400">(no slack)</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex gap-3 relative z-10">
              <button onClick={() => runSolver(edgeLosses)} disabled={loadingB || liveMode}
                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 font-bold shadow-lg shadow-brand-500/25 uppercase tracking-widest text-xs">
                {loadingB ? <Activity size={18} className="animate-spin" /> : <Network size={18} />}
                {loadingB ? 'Running QAOA...' : 'Solve QUBO via QAOA'}
              </button>
              <button onClick={() => { setEdgeLosses({ n1_n2: 0.05, n1_n3: 0.12, n1_n5: 0.28, n1_n6: 0.09 }); setRouteResult(null); setSolverLog([]); setPathHistory([]); setSolveCount(0); }}
                className="px-4 py-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all font-bold text-xs uppercase tracking-widest" title="Reset">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* ── QUBO Matrix Viewer ── */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={() => setShowQUBO(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><BarChart2 size={16} className="text-brand-500"/>QUBO Matrix  <span className="text-[10px] font-normal text-slate-400">(Q_ij terms · penalty={PENALTY})</span></span>
              {showQUBO ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
            </button>
            {showQUBO && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr><th className="px-3 py-2 text-left text-slate-400">Q[i,j]</th>{names.map((n,j) => <th key={j} className="px-3 py-2 text-slate-500 text-center">{j}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {names.map((_, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-500">{i} ({names[i]})</td>
                          {names.map((_, j) => {
                            const key = `${Math.min(i,j)}_${Math.max(i,j)}`;
                            const val = Q[key] || 0;
                            const highlight = i === j ? 'text-brand-600 font-bold' : val !== 0 ? 'text-amber-600' : 'text-slate-300';
                            return <td key={j} className={`px-3 py-2 text-center ${highlight}`}>{i <= j ? val.toFixed(2) : '—'}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-4 text-[10px] font-medium text-slate-400">
                  <span><span className="font-bold text-brand-600">■</span> Diagonal = objective + penalty</span>
                  <span><span className="font-bold text-amber-500">■</span> Off-diagonal = penalty coupling</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Solver Log Console ── */}
          {solverLog.length > 0 && (
            <div className="bg-slate-900 rounded-[24px] border border-slate-700 overflow-hidden">
              <button onClick={() => setShowLog(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800 transition-colors">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-300 font-mono">&gt;_ Solver Output Log  <span className="text-[10px] font-normal text-slate-500">({solverLog.filter(l=>l.text).length} lines)</span></span>
                {showLog ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
              </button>
              {showLog && (
                <div className="px-6 pb-6 max-h-72 overflow-y-auto space-y-px animate-in slide-in-from-top-2">
                  {solverLog.map((line, i) => (
                    line.type === 'blank'
                      ? <div key={i} className="h-2" />
                      : <div key={i} className={`text-[11px] font-mono leading-relaxed ${logColor(line.type)}`}>{line.text}</div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          )}

          {/* ── Path Selection History ── */}
          {pathHistory.length > 0 && (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Clock size={12}/>Path Selection History  <span className="font-normal text-slate-300">({pathHistory.length} decisions)</span></h3>
              <div className="space-y-2">
                {pathHistory.map((h, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs ${i === 0 ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${i === 0 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{pathHistory.length - i}</span>
                      <span className="font-black font-mono text-slate-700">{h.edge.replace('_',' → ')}</span>
                      {h.matched ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Optimal ✓</span>
                        : <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Near-opt ~</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono font-bold ${lossColor(h.loss)}`}>loss {h.loss.toFixed(2)}</span>
                      <span className="text-slate-300 text-[10px]">{h.ts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
