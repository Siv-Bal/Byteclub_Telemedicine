import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Activity, Trash2, Play, Users } from 'lucide-react';
import { useTriageStore } from '../TriageStore';

const TRIAGE_CONFIG = {
  RED:    { label: 'Immediate / Critical', icon: ShieldAlert,   bg: 'from-rose-50 to-white',    border: 'border-rose-100',    badge: 'bg-rose-200 text-rose-700',    card: 'border-rose-200 hover:border-rose-400',    score: 'bg-rose-50 text-rose-600',    dot: 'bg-rose-500', ring: 'ring-rose-400' },
  YELLOW: { label: 'Urgent / Delayed',     icon: AlertTriangle,  bg: 'from-amber-50 to-white',   border: 'border-amber-100',   badge: 'bg-amber-200 text-amber-700',   card: 'border-amber-200 hover:border-amber-400',  score: 'bg-amber-50 text-amber-600',  dot: 'bg-amber-500', ring: 'ring-amber-400' },
  GREEN:  { label: 'Stable / Minor',       icon: CheckCircle2,   bg: 'from-emerald-50 to-white', border: 'border-emerald-100', badge: 'bg-emerald-200 text-emerald-700', card: 'border-emerald-200 hover:border-emerald-400', score: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
};

function PatientCard({ patient, type, onRemove }) {
  const navigate = useNavigate();
  const cfg = TRIAGE_CONFIG[type];

  return (
    <div className={`p-4 rounded-[18px] border-2 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-top-2 duration-300 bg-white ${cfg.card}`}>

      {/* Top row: ID chip + score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
          <span className="font-black text-slate-800 tracking-tight text-sm">{patient.patientId}</span>
          {patient.age && (
            <span className="text-[10px] text-slate-400 font-medium">• {patient.age} y/o</span>
          )}
        </div>
        <div className={`px-2 py-0.5 rounded-lg text-xs font-black ${cfg.score}`}>
          {patient.priorityScore} pts
        </div>
      </div>

      {/* CTP Token strip */}
      {patient.tokens && patient.tokens.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {patient.tokens.slice(0, 5).map((t, i) => (
            <span key={i} className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">{t}</span>
          ))}
        </div>
      )}

      {/* Clinical finding summary */}
      {patient.entities && patient.entities.length > 0 && (
        <div className="text-[10px] text-slate-500 font-medium truncate mb-3">
          {patient.entities.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(' · ')}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Clock size={10} /> {patient.timestamp || 'Just now'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/nlp')}
            className="text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors"
          >
            Details
          </button>
          <button
            onClick={() => onRemove(patient.patientId)}
            className="text-slate-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TriageColumn({ type, patients, onRemove }) {
  const cfg = TRIAGE_CONFIG[type];
  const Icon = cfg.icon;
  const filtered = patients.filter(p => p.triage === type);

  return (
    <div className="bg-slate-50/50 rounded-[24px] border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
      {/* Column header */}
      <div className={`p-4 border-b ${cfg.border} bg-gradient-to-r ${cfg.bg} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <Icon className={type === 'RED' ? 'text-rose-500' : type === 'YELLOW' ? 'text-amber-500' : 'text-emerald-500'} size={20} />
          <h2 className={`text-sm font-black uppercase tracking-widest ${type === 'RED' ? 'text-rose-700' : type === 'YELLOW' ? 'text-amber-700' : 'text-emerald-700'}`}>
            {cfg.label}
          </h2>
        </div>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cfg.badge}`}>
          {filtered.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className={`w-8 h-8 rounded-full ${type === 'RED' ? 'bg-rose-50' : type === 'YELLOW' ? 'bg-amber-50' : 'bg-emerald-50'} flex items-center justify-center mb-2`}>
              <Icon size={16} className={type === 'RED' ? 'text-rose-300' : type === 'YELLOW' ? 'text-amber-300' : 'text-emerald-300'} />
            </div>
            <p className="text-[11px] font-medium text-slate-400">No {type.toLowerCase()} patients</p>
          </div>
        ) : (
          filtered.map(p => (
            <PatientCard key={p.patientId} patient={p} type={type} onRemove={onRemove} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PatientTriage() {
  const { patients, removePatient, simulateIntake, clearAll } = useTriageStore();

  return (
    <div className="max-w-[1400px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100">
            <Activity className="text-brand-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Triage Engine</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Live queue fed by Clinical Intelligence · {patients.length} patient{patients.length !== 1 ? 's' : ''} active
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {patients.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
          <button
            onClick={simulateIntake}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20"
          >
            <Play size={14} /> Simulate Intake
          </button>
        </div>
      </div>

      {/* Empty state — prompt to go to NLP */}
      {patients.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16 px-8 bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-md w-full">
            <div className="w-16 h-16 bg-brand-50 text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Queue is Empty</h3>
            <p className="text-slate-500 text-sm mb-6">
              Run the <strong>Clinical Intelligence</strong> workstation to analyse a patient and they will appear here instantly, or use the <strong>Simulate Intake</strong> button to load demo data.
            </p>
            <button
              onClick={simulateIntake}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 mx-auto"
            >
              <Play size={16} /> Simulate Intake
            </button>
          </div>
        </div>
      )}

      {/* Triage Board */}
      {patients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {(['RED', 'YELLOW', 'GREEN']).map(type => (
            <TriageColumn key={type} type={type} patients={patients} onRemove={removePatient} />
          ))}
        </div>
      )}
    </div>
  );
}
