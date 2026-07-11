import React, { useState } from 'react';
import { Truck, CheckCircle2, Image as ImageIcon, History, Archive, RefreshCw, UserPlus, Heart, Wind, ShieldAlert, AlertTriangle, Activity } from 'lucide-react';

const INITIAL_QUEUE = [
  {
    id: 'PT-8291',
    score: 18,
    triage: 'RED',
    vitals: { hr: 140, spo2: 82 },
    tokens: ['Unconscious', 'Severe Chest Pain'],
    ctp: 'V04 | V05 | C05 | S12',
    status: 'pending',
    doctor: null,
    imageResolved: false,
    history: [{ action: 'Initial CTP received from field gateway', time: new Date(Date.now() - 1000 * 60 * 2).toLocaleTimeString() }]
  },
  {
    id: 'PT-9042',
    score: 9,
    triage: 'YELLOW',
    vitals: { hr: 110, spo2: 94 },
    tokens: ['High Fever', 'Confusion'],
    ctp: 'S40 | C11',
    status: 'pending',
    doctor: null,
    imageResolved: true, // Already resolved for demo
    history: [{ action: 'Initial CTP received from field gateway', time: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString() }]
  }
];

export default function DoctorDashboard() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [historyOpenFor, setHistoryOpenFor] = useState(null);

  const updateStatus = (id, newStatus, actionDesc, updates = {}) => {
    setQueue(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: newStatus,
          ...updates,
          history: [{ action: actionDesc, time: new Date().toLocaleTimeString() }, ...p.history]
        };
      }
      return p;
    }));
  };

  const removePatient = (id) => {
    setQueue(prev => prev.filter(p => p.id !== id));
  };

  const requestImage = (id) => {
    updateStatus(id, 'resolving_image', 'Requested High-Res Image (Fountain Priority Elevated)');
    // Simulate image resolving over 3 seconds
    setTimeout(() => {
      setQueue(prev => prev.map(p => {
        if (p.id === id) {
           return {
             ...p,
             imageResolved: true,
             history: [{ action: 'High-Res Image Decoded via Fountain Link', time: new Date().toLocaleTimeString() }, ...p.history]
           }
        }
        return p;
      }));
    }, 3000);
  };

  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false, loading = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1";
    const variants = {
      default: "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200",
      primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20",
      danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20",
      success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20",
      amber: "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
    };

    return (
      <button onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]}`}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Icon size={14} />}
        {label}
      </button>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-md shadow-slate-900/20">
              <Activity className="text-white" size={24} />
           </div>
           <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Command Center</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Live triage queue with integrated clinical intelligence and vitals telemetry.</p>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-lg border border-rose-100 text-xs font-bold uppercase tracking-widest">
            {queue.filter(q => q.triage === 'RED').length} Critical Cases
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        {queue.sort((a, b) => b.score - a.score).map((patient) => (
          <div key={patient.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-8">
            
            {/* 1. TRIAGE BADGE & SCORE */}
            <div className={`flex flex-col items-center justify-center min-w-[140px] p-6 rounded-2xl border ${
                patient.triage === 'RED' ? 'bg-rose-50 border-rose-100 text-rose-700' : 
                patient.triage === 'YELLOW' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
              {patient.triage === 'RED' ? <ShieldAlert size={32} className="mb-2" /> : <AlertTriangle size={32} className="mb-2" />}
              <div className="text-sm font-black uppercase tracking-widest text-center">{patient.triage}</div>
              <div className="text-5xl font-black mt-2 leading-none">{patient.score}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Priority</div>
            </div>

            {/* 2. CLINICAL & VITALS DATA */}
            <div className="flex-1 flex flex-col justify-between">
              
              <div className="flex items-start justify-between mb-4">
                 <div>
                   <div className="text-xl font-bold text-slate-900">{patient.id}</div>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                        patient.status === 'ambulance_dispatched' ? 'bg-rose-100 text-rose-700' :
                        patient.status === 'assigned' ? 'bg-brand-100 text-brand-700' :
                        patient.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        Status: {patient.status.replace('_', ' ')}
                      </span>
                      {patient.doctor && (
                         <span className="text-xs font-bold text-brand-600 flex items-center gap-1">
                           <UserPlus size={12}/> Dr. {patient.doctor}
                         </span>
                      )}
                   </div>
                 </div>
                 
                 <div className="flex gap-3">
                   <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[90px]">
                     <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mb-1"><Heart size={12} className="text-rose-400"/> HR</div>
                     <div className={`text-xl font-black ${patient.vitals.hr > 120 || patient.vitals.hr < 50 ? 'text-rose-600' : 'text-slate-700'}`}>{patient.vitals.hr}</div>
                   </div>
                   <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[90px]">
                     <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mb-1"><Wind size={12} className="text-blue-400"/> SpO2</div>
                     <div className={`text-xl font-black ${patient.vitals.spo2 < 90 ? 'text-rose-600' : 'text-slate-700'}`}>{patient.vitals.spo2}%</div>
                   </div>
                 </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">NLP Extracted Intelligence</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {patient.tokens.map((t, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-slate-400">CTP: {patient.ctp}</div>
              </div>

            </div>

            {/* 3. PROGRESSIVE IMAGE VIEW */}
            <div className="w-[180px] shrink-0 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative flex flex-col group">
               <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-widest">
                  X-Ray Feed
               </div>
               
               <div className="flex-1 relative bg-slate-800 flex items-center justify-center overflow-hidden">
                  {!patient.imageResolved ? (
                    <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center p-4 text-center">
                       <ImageIcon className="text-slate-600 mb-2" size={24}/>
                       <div className="text-[10px] font-bold text-slate-500 uppercase">Coarse Thumbnail</div>
                       <div className="w-full h-1 bg-slate-700 mt-2 rounded-full overflow-hidden">
                         {patient.status === 'resolving_image' && <div className="h-full bg-brand-500 w-1/2 animate-pulse"></div>}
                       </div>
                    </div>
                  ) : (
                    <img 
                      src="https://images.unsplash.com/photo-1559706164-c4b92b676f4e?q=80&w=300&auto=format&fit=crop" 
                      className="w-full h-full object-cover animate-in fade-in zoom-in duration-700 mix-blend-luminosity"
                      alt="Medical Scan"
                    />
                  )}
               </div>
               
               <button 
                 onClick={() => requestImage(patient.id)}
                 disabled={patient.imageResolved || patient.status === 'resolving_image'}
                 className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
               >
                 {patient.imageResolved ? 'Fully Resolved' : patient.status === 'resolving_image' ? 'Downloading...' : 'Request Full Res'}
               </button>
            </div>

            {/* 4. ACTIONS */}
            <div className="flex flex-col gap-2 min-w-[220px]">
              <ActionButton 
                icon={Truck} label="Dispatch Ambulance" variant="danger" 
                disabled={patient.status === 'ambulance_dispatched'}
                onClick={() => updateStatus(patient.id, 'ambulance_dispatched', 'Ambulance Dispatched to location')} 
              />
              <div className="flex gap-2">
                <ActionButton 
                  icon={UserPlus} label="Assign" variant="primary"
                  disabled={patient.status === 'assigned'}
                  onClick={() => updateStatus(patient.id, 'assigned', 'Assigned to Dr. Grayson', { doctor: 'Grayson' })} 
                />
                <ActionButton 
                  icon={CheckCircle2} label="Ack" variant="success"
                  disabled={patient.status === 'acknowledged'}
                  onClick={() => updateStatus(patient.id, 'acknowledged', 'Acknowledged by command center')} 
                />
              </div>
              <div className="flex gap-2">
                <ActionButton 
                  icon={RefreshCw} label="Re-Triage" 
                  onClick={() => updateStatus(patient.id, patient.status, 'Manually triggered backend re-triage')} 
                />
                <ActionButton 
                  icon={History} label="History" 
                  onClick={() => setHistoryOpenFor(historyOpenFor === patient.id ? null : patient.id)}
                  variant={historyOpenFor === patient.id ? "primary" : "default"}
                />
              </div>
              <ActionButton 
                icon={Archive} label="Mark Resolved" 
                onClick={() => removePatient(patient.id)} 
              />
            </div>
            
          </div>
        ))}

        {/* ESCALATION HISTORY PANEL (Expands globally or inline, inline for now) */}
        {historyOpenFor && (
           <div className="bg-slate-900 rounded-[24px] p-6 shadow-xl border border-slate-800 text-white animate-in slide-in-from-top-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <History size={14}/> Escalation History: {historyOpenFor}
              </h3>
              <div className="space-y-4">
                 {queue.find(q => q.id === historyOpenFor)?.history.map((h, i) => (
                    <div key={i} className="flex gap-4 items-start">
                       <div className="text-[10px] font-mono text-slate-500 mt-0.5">{h.time}</div>
                       <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                       <div className="text-sm font-medium">{h.action}</div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {queue.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All Clear</h3>
            <p className="text-slate-500 mt-2">No patients currently in the triage queue.</p>
          </div>
        )}
      </div>
    </div>
  );
}
