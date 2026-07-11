import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTriageStore } from '../TriageStore';
import { Mic, MicOff, Activity, Cpu, Sparkles, Database, FileText, Wifi, WifiOff, Zap } from 'lucide-react';

const SAMPLE_CASE = "Patient unconscious with severe chest pain and bleeding. Patient immobile and trapped. Age 45.";
const MOCK_VITALS = { spo2: 82, hr: 140 };

// ─────────────────────────────────────────────────────────────
//  CTP TOKEN MAP  (symptom chip id → token)
// ─────────────────────────────────────────────────────────────
const CHIP_TOKENS = {
  heavy_breathing: { token: 'R08', label: 'Respiratory Distress', weight: 4 },
  immobile:        { token: 'M01', label: 'Immobility',           weight: 2 },
  bleeding:        { token: 'S20', label: 'Severe Bleeding',       weight: 5 },
  unconscious:     { token: 'C05', label: 'Unconscious',           weight: 5 },
  crush:           { token: 'T15', label: 'Crush Injury',          weight: 3 },
  trapped:         { token: 'T20', label: 'Trapped / Debris',      weight: 4 },
  burn:            { token: 'T25', label: 'Burn Injury',           weight: 3 },
  cardiac:         { token: 'S12', label: 'Cardiac Event',         weight: 4 },
};

const PANEL_TOKENS = {
  consciousness_uncons: { token: 'C05', label: 'Unconscious',    weight: 5 },
  bleed_severe:         { token: 'S20', label: 'Severe Bleeding', weight: 5 },
  mobil_immobile:       { token: 'M01', label: 'Immobility',      weight: 2 },
};

const TOKEN_DESCRIPTIONS = {
  R08: 'Respiratory Distress',
  M01: 'Immobility / Not Walking',
  S20: 'Severe Uncontrolled Bleeding',
  C05: 'Unconscious / Unresponsive',
  T15: 'Crush Injury',
  T20: 'Trapped Under Debris',
  T25: 'Burn Injury',
  S12: 'Cardiac Event',
  V04: 'Critical SpO₂',
  V05: 'Critical Heart Rate',
};

// ─────────────────────────────────────────────────────────────
//  MEDICAL VOCABULARY — boosts browser STT accuracy
// ─────────────────────────────────────────────────────────────
const MEDICAL_VOCAB = [
  'unconscious', 'unresponsive', 'bleeding', 'blood', 'hemorrhage',
  'chest pain', 'cardiac', 'heart attack', 'myocardial', 'infarction',
  'breathing', 'respiratory', 'distress', 'oxygen', 'saturation',
  'fracture', 'immobile', 'trapped', 'crush', 'seizure', 'fever',
  'temperature', 'laceration', 'trauma', 'emergency', 'critical',
  'severe', 'acute', 'patient', 'ambulance', 'evacuation',
  'pulse', 'heart rate', 'blood pressure', 'SpO2',
  'shortness of breath', 'difficulty breathing', 'passed out',
  'not responding', 'heavy bleeding', 'severe bleeding',
];

// ─────────────────────────────────────────────────────────────
//  PHONETIC CORRECTION DICTIONARY
// ─────────────────────────────────────────────────────────────
const PHONETIC_CORRECTIONS = [
  [/\bheavily raining\b/gi, 'heavily bleeding'],
  [/\bpebble bleeding\b/gi, 'severe bleeding'],
  [/\bpebble\b/gi, 'severe'],
  [/\braining\b/gi, 'bleeding'],
  [/\brain\b/gi, 'bleed'],
  [/\bin mobile\b/gi, 'immobile'],
  [/\bin conscious\b/gi, 'unconscious'],
  [/\bun conscious\b/gi, 'unconscious'],
  [/\bnot conscience\b/gi, 'unconscious'],
  [/\bbreathing difficult\b/gi, 'breathing difficulty'],
  [/\bchest paying\b/gi, 'chest pain'],
  [/\bcrest pain\b/gi, 'chest pain'],
  [/\bcrushing pain\b/gi, 'severe chest pain'],
  [/\bfever\b/gi, 'high fever'],
  [/\bbroken bone\b/gi, 'fracture'],
];

function applyPhoneticCorrections(text) {
  let out = text;
  for (const [pattern, replacement] of PHONETIC_CORRECTIONS) out = out.replace(pattern, replacement);
  return out;
}

function scoreMedical(text) {
  const lower = text.toLowerCase();
  return MEDICAL_VOCAB.reduce((s, w) => s + (lower.includes(w.toLowerCase()) ? w.split(' ').length : 0), 0);
}

// ─────────────────────────────────────────────────────────────
//  NORMALIZATION
// ─────────────────────────────────────────────────────────────
const NORMALIZATION_RULES = [
  [/\b(not responding|passed out|loss of consciousness|unresponsive|not conscious|unconscious|unawake|collapsed|blacked out|fainted|not awake|no response)\b/gi, 'unconscious'],
  [/\b(cannot breathe|can't breathe|shortness of breath|short of breath|having trouble breathing|struggling to breathe|difficulty breathing|labored breathing|heavy breathing|wheezing|breathless|trouble breathing)\b/gi, 'breathing difficulty'],
  [/\b(intense chest pain|crushing chest pain|heart attack symptoms|extreme chest pain|terrible chest pain|bad chest pain)\b/gi, 'severe chest pain'],
  [/\b(chest pain|chest ache|chest discomfort)\b/gi, 'chest pain'],
  [/\b(heavy bleeding|massive blood loss|lots of blood|bleeding a lot|excessive bleeding|uncontrolled bleeding|severe blood loss)\b/gi, 'severe bleeding'],
  [/\b(high temperature|running fever|running a fever|very hot|high temp|fever)\b/gi, 'high fever'],
  [/\b(broken bone|bone break|broken arm|broken leg|broken limb|fractured|fracture)\b/gi, 'fracture'],
  [/\b(having a fit|having a seizure|convulsions|convulsing|shaking uncontrollably)\b/gi, 'seizure'],
  [/\b(respiratory problem|lung problem|can't get air|gasping for air|gasping)\b/gi, 'respiratory distress'],
];

function normalizeText(text) {
  let out = text;
  for (const [p, r] of NORMALIZATION_RULES) out = out.replace(p, r);
  return out;
}

// ─────────────────────────────────────────────────────────────
//  SYMPTOM CHIPS
// ─────────────────────────────────────────────────────────────
const SYMPTOMS = [
  { id: 'heavy_breathing', label: 'Heavy Breathing / Labored',   detect: t => /\b(breath|breathing|respiratory|wheez|breathless|labored|trouble breath|gasping|shortness of breath|can't breathe)\b/i.test(t) },
  { id: 'immobile',        label: 'Not Walking / Immobile',       detect: t => /\b(immobile|not walking|cannot walk|can't walk|lying|fallen|on ground|unconscious|collapsed|not moving|motionless)\b/i.test(t) },
  { id: 'bleeding',        label: 'Severe Uncontrolled Bleeding', detect: t => /bleed|blood|hemorrhag|haemorrhag/i.test(t) },
  { id: 'unconscious',     label: 'Unconscious / Unresponsive',   detect: t => /\b(unconscious|unresponsive|not responding|passed out|fainted|blacked out|no response|collapsed|not awake|loss of consciousness)\b/i.test(t) },
  { id: 'crush',           label: 'Crush Injury',                 detect: t => /\b(crush|crushed|crush injury|pinned)\b/i.test(t) },
  { id: 'trapped',         label: 'Trapped Under Debris',         detect: t => /\b(trapped|under debris|under rubble|pinned|stuck under|caught under)\b/i.test(t) },
  { id: 'burn',            label: 'Burn Injury',                  detect: t => /\b(burn|burned|burnt|fire|scald|scalded|flame)\b/i.test(t) },
  { id: 'cardiac',         label: 'Cardiac Event',                detect: t => /\b(chest pain|heart|cardiac|heart attack|myocardial|angina|chest tightness)\b/i.test(t) },
];

// Age extractor
function extractAgeFromText(text) {
  const patterns = [/(\d{1,3})[- ]?year[s]?[- ]?old/i, /aged?\s*(\d{1,3})/i, /(\d{1,3})\s*(?:yr|yrs)\s*(?:old)?/i, /age\s*[:=]?\s*(\d{1,3})/i];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { const v = parseInt(m[1] || m[2]); if (v > 0 && v < 120) return String(v); }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
//  LIVE CTP COMPUTATION
//  Input: active chip IDs + panel values
//  Output: tokens[], score, triage, encoded
// ─────────────────────────────────────────────────────────────
function computeLiveCTP(activeChipIds, consciousness, bleed, mobil, patientId = 'P104') {
  const tokenMap = new Map(); // token → {label, weight}

  // From chips
  for (const id of activeChipIds) {
    const def = CHIP_TOKENS[id];
    if (def) tokenMap.set(def.token, { label: def.label, weight: def.weight });
  }

  // From panel
  if (consciousness === 'UNCONS') tokenMap.set('C05', { label: 'Unconscious', weight: 5 });
  if (bleed === 'Severe')        tokenMap.set('S20', { label: 'Severe Bleeding', weight: 5 });
  if (mobil === 'Immobile')      tokenMap.set('M01', { label: 'Immobility', weight: 2 });

  // Vitals
  if (MOCK_VITALS.spo2 < 85)    tokenMap.set('V04', { label: 'Critical SpO₂', weight: 5 });
  if (MOCK_VITALS.hr > 130)     tokenMap.set('V05', { label: 'Critical Heart Rate', weight: 4 });

  const tokens = [...tokenMap.keys()];
  const score  = [...tokenMap.values()].reduce((s, v) => s + v.weight, 0);
  const triage = score >= 12 ? 'RED' : score >= 6 ? 'YELLOW' : 'GREEN';
  const encoded = [patientId, ...tokens].join('|');

  return { tokens, tokenMap, score, triage, encoded };
}

// ─────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ClinicalNLP() {
  const [observation, setObservation] = useState('');
  const [interimText, setInterimText] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [sttMode, setSttMode] = useState('checking');
  const [micError, setMicError] = useState('');

  // Form fields
  const [age, setAge] = useState('');
  const [consciousness, setConsciousness] = useState('CONS');
  const [bleed, setBleed] = useState('None');
  const [mobil, setMobil] = useState('Unknown');
  const [autoFilled, setAutoFilled] = useState({});

  // Manually toggled chips (separate from auto-detect)
  const [manualChips, setManualChips] = useState(new Set());

  const { addPatient } = useTriageStore();
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const liveText = observation + interimText;

  // Auto-detect chips from live text
  const autoDetected = useMemo(() => {
    const norm = normalizeText(liveText);
    return new Set(SYMPTOMS.filter(s => s.detect(liveText) || s.detect(norm)).map(s => s.id));
  }, [liveText]);

  // Combined active chips
  const activeChipIds = useMemo(() => new Set([...autoDetected, ...manualChips]), [autoDetected, manualChips]);

  // Live CTP computation — updates on EVERY state change
  const ctp = useMemo(() => computeLiveCTP([...activeChipIds], consciousness, bleed, mobil), [activeChipIds, consciousness, bleed, mobil]);

  const toggleChip = (id) => {
    setManualChips(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then(r => { if (r.ok) setSttMode('whisper'); else setSttMode('webspeech'); })
      .catch(() => setSttMode('webspeech'));
  }, []);

  const startWebSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setMicError('Your browser does not support speech recognition. Please use Chrome or Edge.'); setIsRecording(false); return; }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.maxAlternatives = 5;

    try {
      const SGL = window.SpeechGrammarList || window.webkitSpeechGrammarList;
      if (SGL) {
        const gl = new SGL();
        gl.addFromString('#JSGF V1.0; grammar medical; public <medical> = ' + MEDICAL_VOCAB.join(' | ') + ';', 1);
        rec.grammars = gl;
      }
    } catch (_) {}

    rec.onresult = (event) => {
      let interim = '', finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          let best = res[0].transcript, bestScore = scoreMedical(best);
          for (let a = 1; a < res.length; a++) {
            const sc = scoreMedical(res[a].transcript);
            if (sc > bestScore) { bestScore = sc; best = res[a].transcript; }
          }
          finalChunk += applyPhoneticCorrections(best) + ' ';
        } else {
          interim += res[0].transcript;
        }
      }
      setInterimText(interim);
      if (finalChunk) {
        setRawTranscript(prev => prev + finalChunk);
        setObservation(prev => prev + normalizeText(finalChunk));
        setInterimText('');
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setMicError('Microphone permission denied. Please allow mic access and reload.');
      else if (e.error === 'no-speech') {
        try { rec.stop(); } catch (_) {}
        if (recognitionRef.current === rec) setTimeout(() => { try { rec.start(); } catch (_) {} }, 300);
        return;
      } else setMicError(`Speech recognition error: ${e.error}`);
      setIsRecording(false); setInterimText('');
    };

    rec.onend = () => { setInterimText(''); if (recognitionRef.current === rec) setIsRecording(false); };
    recognitionRef.current = rec;
    setMicError('');
    rec.start();
    setIsRecording(true);
  };

  const stopWebSpeech = () => { recognitionRef.current?.stop(); recognitionRef.current = null; setIsRecording(false); setInterimText(''); };

  const startWhisper = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'recording.webm');
        setObservation('⏳ Transcribing via Whisper...');
        try {
          const res = await fetch('http://localhost:8000/api/transcribe', { method: 'POST', body: fd });
          const data = await res.json();
          setRawTranscript(data.raw_transcript);
          setObservation(data.normalized_transcript);
        } catch { setSttMode('webspeech'); setObservation(''); startWebSpeech(); return; }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true); setMicError('');
    } catch { setMicError('Microphone access denied. Please allow microphone in browser settings.'); setIsRecording(false); }
  };

  const stopWhisper = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };
  const toggleRecording = () => isRecording ? (sttMode === 'whisper' ? stopWhisper() : stopWebSpeech()) : (sttMode === 'whisper' ? startWhisper() : startWebSpeech());

  const handleAnalyze = () => {
    if (!observation.trim() || observation.startsWith('⏳')) return;
    setIsAnalyzing(true);
    setResult(null);

    const normalized = normalizeText(observation);
    const patientId = `PT-${Math.floor(1000 + Math.random() * 8999)}`;
    const fullText = observation + ' ' + normalized;
    const filled = {};

    const extractedAge = extractAgeFromText(fullText);
    if (extractedAge) { setAge(extractedAge); filled.age = true; }

    const newConsciousness = activeChipIds.has('unconscious') || /\b(unconscious|unresponsive|not responding|passed out|collapsed)\b/i.test(fullText) ? 'UNCONS' : 'CONS';
    setConsciousness(newConsciousness);
    if (newConsciousness !== 'CONS') filled.consciousness = true;

    const bleedSevere = activeChipIds.has('bleeding') || /bleed|blood|hemorrhag|haemorrhag/i.test(fullText);
    const bleedMinor = !bleedSevere && /\b(minor bleed|small cut|lacerat|scrape|abrasion)\b/i.test(fullText);
    const newBleed = bleedSevere ? 'Severe' : bleedMinor ? 'Minor' : 'None';
    setBleed(newBleed);
    if (newBleed !== 'None') filled.bleed = true;

    const newMobil = activeChipIds.has('immobile') || activeChipIds.has('trapped') || /\b(immobile|not walking|bedridden|trapped)\b/i.test(fullText) ? 'Immobile' : /\b(walking|ambulatory)\b/i.test(fullText) ? 'Walking' : 'Unknown';
    setMobil(newMobil);
    if (newMobil !== 'Unknown') filled.mobil = true;

    setAutoFilled(filled);
    setTimeout(() => setAutoFilled({}), 2000);

    // Use live CTP for the final output
    const liveCtp = computeLiveCTP([...activeChipIds], newConsciousness, newBleed, newMobil, patientId);

    const structuredOutput = {
      patientId,
      age: extractedAge || age,
      consciousness: newConsciousness,
      bleed: newBleed,
      mobil: newMobil,
      rawTranscript: rawTranscript || observation,
      normalizedText: normalized,
      entities: [...activeChipIds],
      tokens: liveCtp.tokens,
      priorityScore: liveCtp.score,
      triage: liveCtp.triage,
      encodedRecord: liveCtp.encoded,
      vitals: MOCK_VITALS,
    };
    localStorage.setItem('medlink_clinical_output', JSON.stringify(structuredOutput));
    addPatient(structuredOutput);

    setTimeout(() => { setResult({ ...liveCtp, patientId }); setIsAnalyzing(false); }, 350);
  };

  const triageColor = { RED: 'bg-rose-500', YELLOW: 'bg-amber-400', GREEN: 'bg-emerald-500' };
  const triageBorder = { RED: 'border-rose-200', YELLOW: 'border-amber-200', GREEN: 'border-emerald-200' };
  const triageBg = { RED: 'from-rose-50', YELLOW: 'from-amber-50', GREEN: 'from-emerald-50' };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Cpu className="text-brand-500" size={24} />
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Clinical Intelligence Workstation</h1>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg border border-emerald-100 text-xs font-bold uppercase tracking-widest">
          <Mic size={14} /> Auto-Filled via NLP Walkie
        </div>
      </div>

      {sttMode !== 'checking' && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit border ${sttMode === 'whisper' ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {sttMode === 'whisper' ? <Wifi size={12}/> : <WifiOff size={12}/>}
          {sttMode === 'whisper' ? 'Whisper STT Active' : 'Browser Mic Active (offline mode)'}
        </div>
      )}

      {/* SYMPTOM FEATURE EXTRACTION — clickable + auto-detect */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Activity size={14} /> Symptom Feature Extraction
          <span className="text-[9px] font-medium text-slate-300 ml-1">(click to toggle)</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SYMPTOMS.map(symp => {
            const active = activeChipIds.has(symp.id);
            const token = CHIP_TOKENS[symp.id]?.token;
            return (
              <button
                key={symp.id}
                onClick={() => toggleChip(symp.id)}
                className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all duration-200 flex items-center justify-center text-center gap-2 cursor-pointer ${
                  active ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm shadow-blue-500/20 scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {active && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />}
                <span>{symp.label}</span>
                {token && <span className={`text-[9px] font-mono ml-auto shrink-0 ${active ? 'text-blue-500' : 'text-slate-300'}`}>{token}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SPLIT */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT: Clinical Field Notes */}
        <div className="lg:w-2/3 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} /> Clinical Field Notes
            </h2>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{observation.length} / 500</span>
          </div>
          <div className="relative flex-1 flex flex-col">
            <textarea
              value={observation + interimText}
              onChange={e => { setObservation(e.target.value); setInterimText(''); }}
              placeholder="Describe patient condition in your own words... or press Dictate to speak."
              className="w-full flex-1 min-h-[220px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none font-medium text-base leading-relaxed"
            />
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Listening...</span>
              </div>
            )}
            <div className="absolute bottom-4 right-4 flex gap-3">
              <button onClick={() => { setObservation(SAMPLE_CASE); setRawTranscript(SAMPLE_CASE); setInterimText(''); }} className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Load Sample</button>
              <button onClick={toggleRecording} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${isRecording ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                {isRecording ? <><MicOff size={16}/> Stop Recording</> : <><Mic size={16}/> Dictate</>}
              </button>
            </div>
          </div>
          {micError && <div className="mt-3 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">⚠️ {micError}</div>}
        </div>

        {/* RIGHT: Assessment Panel */}
        <div className="lg:w-1/3 space-y-4 flex flex-col">
          {/* AGE — Blue */}
          <div className={`bg-white rounded-[24px] p-5 shadow-sm border-2 transition-all duration-500 ${autoFilled.age ? 'border-emerald-400 shadow-emerald-100 shadow-md' : 'border-blue-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"/><div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Age</div></div>
              {autoFilled.age && <span className="text-[9px] font-bold text-emerald-500 animate-pulse">Auto-filled ✓</span>}
            </div>
            <input type="text" placeholder="e.g. 35, 30-40" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 placeholder:text-blue-200"/>
          </div>

          {/* CONSCIOUSNESS — Violet */}
          <div className={`bg-white rounded-[24px] p-5 shadow-sm border-2 transition-all duration-500 ${autoFilled.consciousness ? 'border-emerald-400 shadow-emerald-100 shadow-md' : 'border-violet-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-400"/><div className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Consciousness</div></div>
              {autoFilled.consciousness && <span className="text-[9px] font-bold text-emerald-500 animate-pulse">Auto-filled ✓</span>}
            </div>
            <div className="flex bg-violet-50 rounded-lg p-1 border border-violet-100">
              <button onClick={() => setConsciousness('CONS')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${consciousness === 'CONS' ? 'bg-white text-violet-700 shadow-sm border border-violet-200' : 'text-violet-300 hover:text-violet-500'}`}>Cons</button>
              <button onClick={() => setConsciousness('UNCONS')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${consciousness === 'UNCONS' ? 'bg-violet-600 text-white shadow-sm' : 'text-violet-300 hover:text-violet-500'}`}>Uncons</button>
            </div>
          </div>

          {/* BLEED + MOBIL */}
          <div className="flex gap-3">
            <div className={`flex-1 bg-white rounded-[24px] p-4 shadow-sm border-2 transition-all duration-500 ${autoFilled.bleed ? 'border-emerald-400 shadow-emerald-100 shadow-md' : 'border-rose-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"/><div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Bleed</div></div>
                {autoFilled.bleed && <span className="text-[9px] font-bold text-emerald-500 animate-pulse">✓</span>}
              </div>
              <select value={bleed} onChange={e => setBleed(e.target.value)} className={`w-full border rounded-lg px-2 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-300 transition-colors ${bleed === 'Severe' ? 'bg-rose-600 text-white border-rose-500' : bleed === 'Minor' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-50 text-rose-300 border-rose-100'}`}>
                <option value="None">None</option><option value="Minor">Minor</option><option value="Severe">Severe</option>
              </select>
            </div>
            <div className={`flex-1 bg-white rounded-[24px] p-4 shadow-sm border-2 transition-all duration-500 ${autoFilled.mobil ? 'border-emerald-400 shadow-emerald-100 shadow-md' : 'border-amber-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"/><div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Mobil</div></div>
                {autoFilled.mobil && <span className="text-[9px] font-bold text-emerald-500 animate-pulse">✓</span>}
              </div>
              <select value={mobil} onChange={e => setMobil(e.target.value)} className={`w-full border rounded-lg px-2 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-300 transition-colors ${mobil === 'Immobile' ? 'bg-amber-500 text-white border-amber-400' : mobil === 'Walking' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-300 border-amber-100'}`}>
                <option value="Unknown">Unknown</option><option value="Walking">Walking</option><option value="Immobile">Immobile</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  CTP DECODER CARD — live, no Execute required            */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Zap size={14} className="text-brand-500"/> CTP Decoder
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1"/>
          </h2>
          <span className="text-[10px] font-mono font-bold text-slate-400">{ctp.tokens.length} token{ctp.tokens.length !== 1 ? 's' : ''} active</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Generated Tokens */}
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Generated Tokens</div>
            {ctp.tokens.length === 0 ? (
              <div className="text-[11px] text-slate-300 font-medium italic">No tokens yet — select symptoms or fill assessment fields</div>
            ) : (
              <div className="space-y-2">
                {ctp.tokens.map(tok => (
                  <div key={tok} className="flex items-center gap-2">
                    <span className="bg-brand-500 text-white text-[10px] font-black px-2 py-0.5 rounded font-mono shadow-sm">{tok}</span>
                    <span className="text-xs font-medium text-slate-600">{TOKEN_DESCRIPTIONS[tok] || tok}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Encoded Record */}
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Encoded Record</div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-sm font-bold text-slate-700 break-all leading-relaxed">
              {ctp.encoded}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 mb-2">Decoded Meaning</div>
            <div className="space-y-1">
              {ctp.tokens.length === 0
                ? <div className="text-[11px] text-slate-300 italic">No active findings</div>
                : ctp.tokens.map(tok => (
                    <div key={tok} className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="text-brand-400">•</span> {TOKEN_DESCRIPTIONS[tok] || tok}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Priority Score + Classification */}
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Priority Score</div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-slate-800 leading-none">{ctp.score}</span>
              <span className="text-lg font-bold text-slate-300 mb-0.5">/ 30</span>
            </div>

            {/* Score bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${ctp.triage === 'RED' ? 'bg-rose-500' : ctp.triage === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (ctp.score / 20) * 100)}%` }}
              />
            </div>

            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Classification</div>
            <div className="flex gap-2 flex-wrap">
              {['RED', 'YELLOW', 'GREEN'].map(level => (
                <span key={level} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${ctp.triage === level ? (level === 'RED' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-110' : level === 'YELLOW' ? 'bg-amber-400 text-white shadow-md shadow-amber-400/25 scale-110' : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-110') : 'bg-slate-100 text-slate-300'}`}>
                  {level}
                </span>
              ))}
            </div>

            {/* Breakdown */}
            {ctp.tokens.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                {[...ctp.tokenMap.entries()].map(([tok, def]) => (
                  <div key={tok} className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>{tok} — {def.label}</span><span className="text-brand-500">+{def.weight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXECUTE BUTTON */}
      <button
        onClick={handleAnalyze}
        disabled={!observation.trim() || observation.startsWith('⏳') || isAnalyzing}
        className={`w-full flex items-center justify-center gap-3 py-5 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all shadow-lg ${isAnalyzing ? 'bg-brand-400 text-brand-100 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand-500/30 hover:shadow-xl hover:-translate-y-0.5'}`}
      >
        {isAnalyzing ? <><Sparkles className="animate-spin"/> Processing...</> : <><Database/> Execute Clinical Analysis &amp; Triage</>}
      </button>

      {/* POST-EXECUTE RESULT */}
      {result && (
        <div className={`bg-gradient-to-br ${triageBg[result.triage]} to-white rounded-[24px] p-6 shadow-sm border ${triageBorder[result.triage]} animate-in fade-in slide-in-from-bottom-4`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-lg text-sm font-black uppercase tracking-widest text-white ${triageColor[result.triage]}`}>{result.triage}</span>
            <span className="text-sm font-bold text-slate-600">Score: {result.score} — {result.patientId}</span>
            <span className="text-xs font-mono text-slate-400 ml-auto">Patient added to triage queue ✓</span>
          </div>
          <div className="font-mono text-xs text-slate-500 bg-white/60 px-3 py-2 rounded-lg border border-white">{result.encoded}</div>
        </div>
      )}
    </div>
  );
}
