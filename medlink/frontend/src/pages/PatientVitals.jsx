import React, { useEffect, useMemo } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Activity, Thermometer, Wind, AlertCircle, Clock, Zap, Heart, Settings, Link, Unlink, Radio } from 'lucide-react';
import { useSerialStore } from '../SerialStore';

// ── History ring buffer per node ──────────────────────────────────────────
const historyRef = {};
function getHistory(nodeId, vitals) {
  if (!historyRef[nodeId]) historyRef[nodeId] = Array(60).fill({ bpm: 0, spo2: 0, temp: 0 });
  if (vitals) {
    historyRef[nodeId] = [...historyRef[nodeId].slice(1), { bpm: vitals.bpm, spo2: vitals.spo2, temp: vitals.temp }];
  }
  return historyRef[nodeId];
}

function conditionBadge(condition, isSOS) {
  if (isSOS) return { label: 'SOS', cls: 'bg-rose-600 text-white animate-pulse' };
  if (!condition || condition === 'NORMAL') return { label: 'NORMAL', cls: 'bg-emerald-50 text-emerald-600' };
  if (condition.includes('TACHY')) return { label: condition, cls: 'bg-rose-50 text-rose-600' };
  if (condition.includes('RESP')) return { label: condition, cls: 'bg-amber-50 text-amber-600' };
  return { label: condition, cls: 'bg-slate-100 text-slate-600' };
}

export default function PatientVitals() {
  const { isConnected, vitals, events, error, connect, disconnect } = useSerialStore();

  // Pick the first (or only) node to display
  const nodeIds = Object.keys(vitals);
  const activeNodeId = nodeIds[0] || null;
  const node = activeNodeId ? vitals[activeNodeId] : null;

  // Keep history updated
  const history = useMemo(() => getHistory(activeNodeId, node), [node]);

  const minBpm = node ? Math.min(...history.map(h => h.bpm).filter(Boolean)) || '--' : '--';
  const maxBpm = node ? Math.max(...history.map(h => h.bpm).filter(Boolean)) || '--' : '--';
  const avgSpo2 = node ? (history.reduce((s, h) => s + (h.spo2 || 0), 0) / history.filter(h => h.spo2 > 0).length || 0).toFixed(1) : '--';

  const isCritical = node && (node.spo2 < 90 || node.bpm > 130 || node.bpm < 45 || node.temp > 39.0 || node.isSOS);
  const badge = node ? conditionBadge(node.condition, node.isSOS) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${isConnected ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-200'}`}>
            <Heart className={`${isConnected ? 'text-brand-500 animate-pulse' : 'text-slate-300'}`} size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Monitoring Hub</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`flex items-center gap-1.5 text-sm font-medium ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                {isConnected ? 'ESP32 Gateway Connected' : 'ESP32 Gateway Disconnected'}
              </span>
              {node && <span className="text-slate-300">•</span>}
              {node && <span className="text-sm text-slate-400">Last packet: {Math.round((Date.now() - node.lastUpdate) / 1000)}s ago</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {node && (
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Nodes</div>
                <div className="text-2xl font-black text-slate-800">{nodeIds.length}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg SpO₂</div>
                <div className="text-2xl font-black text-blue-500">{avgSpo2}%</div>
              </div>
            </div>
          )}
          <button
            onClick={isConnected ? disconnect : connect}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shadow-sm ${isConnected ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/25'}`}
          >
            {isConnected ? <><Unlink size={16} /> Disconnect</> : <><Link size={16} /> Connect Serial</>}
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3 text-sm font-medium text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── SOS / Critical Alert ─────────────────────────────────────── */}
      {isCritical && (
        <div className="bg-red-500 text-white rounded-[24px] p-4 flex items-center justify-between shadow-lg shadow-red-500/20 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} />
            <div>
              <div className="font-black text-lg tracking-tight">{node?.isSOS ? `🚨 SOS — ${node.name}` : 'CRITICAL EVENT DETECTED'}</div>
              <div className="text-red-100 text-sm font-medium">
                {node?.isSOS ? 'Patient has triggered SOS switch — dispatch immediately' : `Abnormal vitals — HR: ${node?.bpm?.toFixed(1)} BPM · SpO₂: ${node?.spo2?.toFixed(1)}% · Temp: ${node?.temp?.toFixed(1)}°C`}
              </div>
            </div>
          </div>
          <div className={`text-sm font-bold px-3 py-1 rounded-xl bg-white/20 border border-white/30`}>{badge?.label}</div>
        </div>
      )}

      {/* ── No connection empty state ─────────────────────────────────── */}
      {!isConnected && nodeIds.length === 0 && (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-5">
            <Radio size={36} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No ESP32 Data Yet</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
            Plug in your ESP32 Gateway via USB, then click <strong>Connect Serial</strong>. 
            The browser will prompt you to pick the COM port. Data from the <strong>Yokes</strong> node 
            will appear here in real time.
          </p>
          <button onClick={connect}
            className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/25">
            <Link size={18} /> Connect Serial Port
          </button>
          <p className="text-[11px] text-slate-400 mt-4">Requires Chrome / Edge · Web Serial API</p>
        </div>
      )}

      {/* ── Live Vitals Dashboard (shown once data arrives) ──────────── */}
      {node && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Node card */}
          <div className="lg:col-span-3 space-y-4">
            {/* Patient Node Card */}
            <div className="bg-white rounded-[24px] p-5 border-2 border-brand-200 shadow-md shadow-brand-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center border-2 border-brand-200 shrink-0">
                  <span className="text-brand-700 font-black text-lg">{node.name[0]}</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-base leading-tight">{node.name}</div>
                  <div className="text-xs text-slate-400 font-medium">Node ID: {node.nodeId} · ESP-NOW</div>
                </div>
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg w-fit ${badge?.cls}`}>{badge?.label}</div>
            </div>

            {/* Room Environment */}
            <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                <Wind className="text-sky-500" size={18} /> Environment
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Humidity</span>
                  <span className={`text-2xl font-black ${node.hum > 70 ? 'text-amber-500' : 'text-slate-700'}`}>{node.hum?.toFixed(1) ?? '--'}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, node.hum || 0)}%` }} />
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded-md w-fit ${node.hum > 80 ? 'bg-rose-50 text-rose-500' : node.hum > 60 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-600'}`}>
                  {node.hum > 80 ? 'High Humidity' : node.hum > 60 ? 'Moderate' : 'Optimal Comfort'}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Charts */}
          <div className="lg:col-span-6 space-y-6 flex flex-col">

            {/* Heart Rate */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                    <Activity size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Heart Rate</div>
                    <div className="text-xs font-medium text-slate-400">Continuous ECG Feed · {node.name}</div>
                  </div>
                </div>
                <div className="text-right flex items-baseline gap-1">
                  <span className={`text-5xl font-black tracking-tighter ${node.bpm > 130 || node.bpm < 45 ? 'text-rose-500' : 'text-red-500'}`}>{node.bpm?.toFixed(0) ?? '--'}</span>
                  <span className="text-sm font-bold text-red-400 uppercase">BPM</span>
                </div>
              </div>
              <div className="h-[180px] w-full -ml-2 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="bpm" stroke="#ef4444" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 border-[0.5px] border-red-100/50 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(239,68,68,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-5 relative z-10">
                <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min BPM</div><div className="text-lg font-bold text-slate-700">{minBpm}</div></div>
                <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Max BPM</div><div className="text-lg font-bold text-slate-700">{maxBpm}</div></div>
                <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Condition</div><div className="text-sm font-bold text-slate-700">{node.condition || 'NORMAL'}</div></div>
              </div>
            </div>

            {/* SpO2 + Temp side by side */}
            <div className="grid grid-cols-2 gap-6 flex-1">
              {/* SpO2 */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div><div className="text-sm font-bold text-slate-800">SpO₂ Level</div><div className="text-xs font-medium text-slate-400">Oxygen Saturation</div></div>
                <div className="flex-1 flex items-center justify-center relative my-3">
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-4xl font-black tracking-tighter ${node.spo2 < 90 ? 'text-rose-500' : node.spo2 < 95 ? 'text-amber-500' : 'text-blue-500'}`}>{node.spo2?.toFixed(1) ?? '--'}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ value: node.spo2 || 0 }, { value: 100 - (node.spo2 || 0) }]} cx="50%" cy="50%" innerRadius="75%" outerRadius="90%" startAngle={225} endAngle={-45} stroke="none" dataKey="value" isAnimationActive={false}>
                        <Cell fill={node.spo2 < 90 ? '#ef4444' : node.spo2 < 95 ? '#f59e0b' : '#3b82f6'} />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={`text-center text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl ${node.spo2 >= 95 ? 'bg-blue-50 text-blue-600' : node.spo2 >= 90 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  {node.spo2 >= 95 ? 'Excellent' : node.spo2 >= 90 ? 'Acceptable' : 'Hypoxia Warning'}
                </div>
              </div>

              {/* Temperature */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div><div className="text-sm font-bold text-slate-800">Core Body Temp</div><div className="text-xs font-medium text-slate-400">DHT11 · Surface</div></div>
                <div className="flex-1 flex items-end justify-between mt-4 pb-3 border-b border-slate-100 mb-3 relative z-10">
                  <div>
                    <span className={`text-4xl font-black tracking-tighter ${node.temp > 38.5 ? 'text-rose-500' : 'text-amber-500'}`}>{node.temp?.toFixed(1) ?? '--'}</span>
                    <span className="text-sm font-bold text-amber-400 ml-1">°C</span>
                  </div>
                  <Thermometer className={node.temp > 38.5 ? 'text-rose-400 mb-1' : 'text-amber-400 mb-1'} size={28} />
                </div>
                <div className="h-[55px] w-full -ml-2 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs><linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                      <YAxis domain={['auto', 'auto']} hide />
                      <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} fill="url(#tempGrad)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Analytics + Device + Events */}
          <div className="lg:col-span-3 flex flex-col gap-5">

            {/* AI Analytics */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-5"><Zap className="text-purple-500" size={18} /> Live Analytics</div>
              <div className="space-y-4">
                {[
                  { label: 'SpO₂ Stability', value: node.spo2 ? `${node.spo2.toFixed(1)}%` : '--', pct: node.spo2 || 0, color: 'bg-blue-500' },
                  { label: 'Heart Rate', value: node.bpm ? `${node.bpm.toFixed(0)} BPM` : '--', pct: Math.min(100, (node.bpm || 0) / 2), color: 'bg-red-400' },
                  { label: 'Temperature', value: node.temp ? `${node.temp.toFixed(1)}°C` : '--', pct: Math.min(100, ((node.temp || 36) - 35) * 50), color: 'bg-amber-400' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                      <span className="text-sm font-black text-slate-700">{m.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${m.pct}%` }} /></div>
                  </div>
                ))}
                <div className="pt-1">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>{isCritical ? 'CRITICAL' : 'Low'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ESP32 Edge Node Info */}
            <div className="bg-slate-800 text-white rounded-[24px] p-5 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><Settings className="text-slate-400" size={16} /> ESP32 Edge Node</div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${isConnected ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
              <div className="relative z-10 space-y-3">
                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase tracking-wider">Node ID</span><span className="text-sm font-black text-slate-100 font-mono">{node?.nodeId || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase tracking-wider">Patient</span><span className="text-sm font-black text-slate-100">{node?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase tracking-wider">Protocol</span><span className="text-sm font-mono text-emerald-400">ESP-NOW</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase tracking-wider">Baud Rate</span><span className="text-sm font-mono text-slate-300">115200</span></div>
              </div>
            </div>

            {/* Live Event Feed */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-[200px]">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-4"><Clock className="text-slate-400" size={18} /> Event Feed</div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {events.map((ev, i) => (
                  <div key={i} className="flex gap-2 text-sm animate-in fade-in">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ev.msg?.includes('SOS') || ev.msg?.includes('CRITICAL') ? 'bg-rose-500' : ev.msg?.includes('⚠️') ? 'bg-amber-400' : 'bg-brand-400'}`} />
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 mb-0.5">{ev.time}</div>
                      <div className={`text-xs font-medium ${ev.msg?.includes('SOS') || ev.msg?.includes('CRITICAL') ? 'text-rose-500 font-bold' : ev.msg?.includes('⚠️') ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>{ev.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
