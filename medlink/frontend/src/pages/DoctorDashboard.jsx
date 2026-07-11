import React, { useState } from 'react';
import { Users, Truck, CheckCircle2, Image as ImageIcon, History, Archive, RefreshCw } from 'lucide-react';

const INITIAL_QUEUE = [
  {
    id: 'P104',
    score: 14,
    triage: 'RED',
    vitals: { hr: 145, spo2: 82 },
    tokens: ['Unconscious', 'Severe chest pain'],
    status: 'pending',
    history: []
  },
  {
    id: 'P105',
    score: 8,
    triage: 'YELLOW',
    vitals: { hr: 110, spo2: 92 },
    tokens: ['Fracture'],
    status: 'pending',
    history: []
  },
  {
    id: 'P106',
    score: 2,
    triage: 'GREEN',
    vitals: { hr: 75, spo2: 98 },
    tokens: ['High fever'],
    status: 'acknowledged',
    history: [{ action: 'Acknowledged', time: new Date().toLocaleTimeString() }]
  }
];

export default function DoctorDashboard() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);

  const updateStatus = (id, newStatus, actionDesc) => {
    setQueue(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: newStatus,
          history: [...p.history, { action: actionDesc, time: new Date().toLocaleTimeString() }]
        };
      }
      return p;
    }));
  };

  const removePatient = (id) => {
    setQueue(prev => prev.filter(p => p.id !== id));
  };

  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex-1";
    const variants = {
      default: "bg-slate-100 text-slate-700 hover:bg-slate-200",
      primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
      success: "bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20"
    };

    return (
      <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]}`}>
        <Icon size={16} />
        {label}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
          <p className="text-slate-500">Live triage queue and patient management</p>
        </div>
      </div>

      <div className="space-y-6">
        {queue.sort((a, b) => b.score - a.score).map((patient) => (
          <div key={patient.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-start">
            
            {/* Badge & Score */}
            <div className="flex flex-col items-center justify-center min-w-[120px] bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-sm font-bold text-slate-400 mb-2">{patient.id}</div>
              <div className={`w-4 h-4 rounded-full mb-3 ${patient.triage === 'RED' ? 'bg-red-500' : patient.triage === 'YELLOW' ? 'bg-amber-500' : 'bg-green-500'} shadow-sm`}></div>
              <div className="text-3xl font-bold text-slate-900">{patient.score}</div>
              <div className="text-xs text-slate-400 font-medium uppercase mt-1">Score</div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {patient.tokens.map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold text-sm rounded-lg border border-blue-100">
                      {t}
                    </span>
                  ))}
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  patient.status === 'ambulance_dispatched' ? 'bg-red-100 text-red-700 border border-red-200' :
                  patient.status === 'acknowledged' ? 'bg-brand-100 text-brand-700 border border-brand-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {patient.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-slate-400 font-medium">HR:</span> <span className="font-bold text-slate-900">{patient.vitals.hr}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400 font-medium">SpO2:</span> <span className="font-bold text-slate-900">{patient.vitals.spo2}%</span>
                </div>
              </div>

              {patient.history.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2">
                  <History size={14} className="text-slate-400 mt-0.5" />
                  <div className="text-xs text-slate-500 font-medium">
                    {patient.history.map((h, i) => (
                      <div key={i}>{h.time} - {h.action}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
              <ActionButton 
                icon={Truck} label="Dispatch Amb." variant="danger" 
                disabled={patient.status === 'ambulance_dispatched'}
                onClick={() => updateStatus(patient.id, 'ambulance_dispatched', 'Ambulance Dispatched')} 
              />
              <div className="flex gap-2">
                <ActionButton 
                  icon={CheckCircle2} label="Ack" variant="primary"
                  disabled={patient.status !== 'pending'}
                  onClick={() => updateStatus(patient.id, 'acknowledged', 'Acknowledged by Dr. Chen')} 
                />
                <ActionButton 
                  icon={ImageIcon} label="Full Image" 
                  onClick={() => updateStatus(patient.id, patient.status, 'Requested full image priority')} 
                />
              </div>
              <div className="flex gap-2">
                <ActionButton 
                  icon={RefreshCw} label="Re-Triage" 
                  onClick={() => updateStatus(patient.id, patient.status, 'Manually triggered re-triage')} 
                />
                <ActionButton 
                  icon={Archive} label="Resolve" variant="success"
                  onClick={() => removePatient(patient.id)} 
                />
              </div>
            </div>

          </div>
        ))}

        {queue.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">All Clear</h3>
            <p className="text-slate-500 mt-2">No patients currently in the triage queue.</p>
          </div>
        )}
      </div>
    </div>
  );
}
