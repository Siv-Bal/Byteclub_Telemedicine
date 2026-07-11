import React, { useState } from 'react';
import { Stethoscope, Mic, Send, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export default function ClinicalNLP() {
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!note.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/encode-ctp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'P104',
          vitals: { spo2: 82, hr: 145 }, // Example vitals that trigger rules
          note: note
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const badgeColor = {
    'RED': 'bg-red-500 text-white shadow-red-500/30',
    'YELLOW': 'bg-amber-500 text-white shadow-amber-500/30',
    'GREEN': 'bg-green-500 text-white shadow-green-500/30'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinical NLP & Tokenization</h1>
          <p className="text-slate-500">Offline extraction mapping free text to CTP tokens</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Mic size={16} /> Field Observation
        </h2>
        <div className="relative">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g., Patient unconscious with severe chest pain and breathing difficulty..."
            className="w-full bg-slate-50 border-none rounded-2xl p-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none resize-none min-h-[120px]"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading || !note.trim()}
            className="absolute bottom-4 right-4 bg-brand-500 text-white p-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-brand-500/20"
          >
            {loading ? <Activity size={20} className="animate-spin" /> : <Send size={20} />}
            <span className="font-medium pr-1">Analyze</span>
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className={`px-6 py-2 rounded-full font-bold text-lg tracking-widest shadow-lg mb-6 ${badgeColor[result.result.triage]}`}>
              TRIAGE: {result.result.triage}
            </div>
            
            <div className="text-4xl font-bold text-slate-900 mb-2">
              {result.result.score} <span className="text-lg text-slate-400 font-normal">pts</span>
            </div>
            
            <div className="w-full mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-center items-center gap-2">
                <AlertTriangle size={14} /> Explainable Reasoning
              </h3>
              <ul className="text-sm text-slate-700 space-y-2">
                {result.result.reasons.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck size={16} /> CTP Output
              </h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 font-mono text-sm rounded-lg border border-slate-200">
                  P104
                </span>
                {result.result.vital_tokens.map((t, i) => (
                  <span key={`v-${i}`} className="px-3 py-1 bg-indigo-50 text-indigo-700 font-mono text-sm rounded-lg border border-indigo-100">
                    {t}
                  </span>
                ))}
                {result.result.clinical_tokens.map((t, i) => (
                  <span key={`c-${i}`} className="px-3 py-1 bg-blue-50 text-blue-700 font-mono text-sm rounded-lg border border-blue-100">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-green-400 font-mono p-4 rounded-2xl text-sm overflow-x-auto shadow-inner">
              <div className="text-slate-500 mb-2 text-xs">// Raw Packet Payload ({result.bytes} bytes)</div>
              {result.encoded}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
