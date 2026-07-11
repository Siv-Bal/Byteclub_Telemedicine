/**
 * TriageStore.jsx
 * 
 * Shared in-memory state for the MedLink prototype.
 * ClinicalNLP writes patients here after Execute.
 * PatientTriage reads from here and renders the live board.
 * 
 * Using React Context + useReducer for predictable state mutations.
 */
import React, { createContext, useContext, useReducer, useCallback } from 'react';

const TriageContext = createContext(null);

// ── Simulate Intake presets (for demo button) ────────────────────────────────
export const SIMULATE_PATIENTS = [
  {
    patientId: 'PT-8291',
    age: '45', consciousness: 'UNCONS', bleed: 'None', mobil: 'Immobile',
    normalizedText: 'Patient unconscious with severe chest pain and breathing difficulty.',
    entities: ['unconscious', 'severe chest pain', 'breathing difficulty'],
    tokens: ['V04', 'V05', 'C05', 'S12', 'R08'],
    priorityScore: 18,
    triage: 'RED',
    encodedRecord: 'PT-8291|V04|V05|C05|S12|R08|T_RED',
    vitals: { hr: 140, spo2: 82 },
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toLocaleTimeString(),
  },
  {
    patientId: 'PT-9042',
    age: '32', consciousness: 'CONS', bleed: 'None', mobil: 'Walking',
    normalizedText: 'High fever with seizure episode 10 minutes ago.',
    entities: ['high fever', 'seizure'],
    tokens: ['S40', 'C10'],
    priorityScore: 6,
    triage: 'YELLOW',
    encodedRecord: 'PT-9042|S40|C10|T_YEL',
    vitals: { hr: 110, spo2: 94 },
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString(),
  },
  {
    patientId: 'PT-7718',
    age: '68', consciousness: 'CONS', bleed: 'Minor', mobil: 'Walking',
    normalizedText: 'Minor laceration on forearm, patient is stable.',
    entities: [],
    tokens: [],
    priorityScore: 2,
    triage: 'GREEN',
    encodedRecord: 'PT-7718|T_GRN',
    vitals: { hr: 75, spo2: 98 },
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toLocaleTimeString(),
  },
];

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PATIENT': {
      // Replace if same patientId already exists (re-triage update)
      const existing = state.patients.findIndex(p => p.patientId === action.payload.patientId);
      if (existing !== -1) {
        const updated = [...state.patients];
        updated[existing] = action.payload;
        return { ...state, patients: updated };
      }
      return { ...state, patients: [...state.patients, action.payload] };
    }
    case 'REMOVE_PATIENT':
      return { ...state, patients: state.patients.filter(p => p.patientId !== action.id) };
    case 'SIMULATE_INTAKE':
      return { ...state, patients: SIMULATE_PATIENTS };
    case 'CLEAR':
      return { ...state, patients: [] };
    default:
      return state;
  }
}

export function TriageProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { patients: [] });

  const addPatient = useCallback((patient) => {
    dispatch({ type: 'ADD_PATIENT', payload: { ...patient, timestamp: new Date().toLocaleTimeString() } });
  }, []);

  const removePatient = useCallback((id) => dispatch({ type: 'REMOVE_PATIENT', id }), []);
  const simulateIntake = useCallback(() => dispatch({ type: 'SIMULATE_INTAKE' }), []);
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return (
    <TriageContext.Provider value={{ patients: state.patients, addPatient, removePatient, simulateIntake, clearAll }}>
      {children}
    </TriageContext.Provider>
  );
}

export function useTriageStore() {
  const ctx = useContext(TriageContext);
  if (!ctx) throw new Error('useTriageStore must be used inside <TriageProvider>');
  return ctx;
}
