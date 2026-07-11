import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Stethoscope, Image as ImageIcon, Network, Users, Search, Bell, Moon, LogOut, Star } from 'lucide-react';

import { TriageProvider } from './TriageStore';
import Dashboard from './pages/Dashboard';
import PatientVitals from './pages/PatientVitals';
import ClinicalNLP from './pages/ClinicalNLP';
import PatientTriage from './pages/PatientTriage';
import ImageTransfer from './pages/ImageTransfer';
import QuantumRouting from './pages/QuantumRouting';
import DoctorDashboard from './pages/DoctorDashboard';

function SidebarItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 font-semibold ${
          isActive
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon size={18} />
      <span className="text-[13px]">{label}</span>
    </NavLink>
  );
}

function TopBar() {
  return (
    <div className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-100">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search patients, protocols, or nodes..."
          className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none w-80 text-slate-600 placeholder:text-slate-400"
        />
      </div>
      <div className="flex items-center gap-6">
        
        {/* Status Pill */}
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 font-bold text-xs">
          <Star size={14} className="fill-green-600" />
          99.8% Uplink Stable
        </div>

        {/* Bandwidth Stat */}
        <div className="flex flex-col items-end justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bandwidth</span>
          <span className="text-sm font-bold text-brand-600 leading-none mt-1">12.4 Mbps</span>
        </div>

        {/* Notifications */}
        <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} className="stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">3</span>
        </button>
        
        {/* Profile */}
        <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 leading-tight">Dr. Sarah Grayson</div>
            <div className="text-[10px] font-bold text-slate-400">Chief Intelligence Officer</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
             <img src="https://i.pravatar.cc/150?u=sarah" alt="Dr. Sarah Grayson" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TriageProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
          {/* Sidebar */}
          <div className="w-[240px] bg-white border-r border-slate-100 flex flex-col">
            <div className="p-6 pb-8">
              <div className="flex items-center gap-3">
                <div className="bg-brand-500 text-white p-1.5 rounded-lg">
                  <Activity size={24} className="stroke-[2.5]" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-brand-600">MedLink</span>
              </div>
            </div>
            
            <div className="flex-1 px-4 space-y-1 overflow-y-auto">
              <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <SidebarItem to="/vitals" icon={Activity} label="Patient Vitals" />
              <SidebarItem to="/nlp" icon={Stethoscope} label="Clinical Intelligence" />
              <SidebarItem to="/triage" icon={Users} label="Patient Triage" />
              <SidebarItem to="/image" icon={ImageIcon} label="Image Transfer" />
              <SidebarItem to="/quantum" icon={Network} label="Quantum Routing" />
              <SidebarItem to="/doctor" icon={Users} label="Doctor Dashboard" />
            </div>

            <div className="p-4 space-y-2 mt-auto">
              <button className="flex items-center gap-3 px-4 py-2.5 w-full rounded-2xl border border-slate-200 text-slate-600 font-semibold text-[13px] hover:bg-slate-50 transition-colors">
                <Moon size={16} /> Dark Mode
              </button>
              <button className="flex items-center gap-3 px-4 py-2.5 w-full rounded-2xl border border-rose-100 text-rose-500 font-semibold text-[13px] hover:bg-rose-50 transition-colors">
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-8 bg-[#F8F9FA]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vitals" element={<PatientVitals />} />
                <Route path="/nlp" element={<ClinicalNLP />} />
                <Route path="/triage" element={<PatientTriage />} />
                <Route path="/image" element={<ImageTransfer />} />
                <Route path="/quantum" element={<QuantumRouting />} />
                <Route path="/doctor" element={<DoctorDashboard />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </TriageProvider>
  );
}
