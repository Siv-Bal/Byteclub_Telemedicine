import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Network, Activity, AlertTriangle, Play, Settings } from 'lucide-react';

const vitalsData = [
  { time: '00:00', hr: 72, spo2: 98 },
  { time: '00:05', hr: 74, spo2: 98 },
  { time: '00:10', hr: 70, spo2: 97 },
  { time: '00:15', hr: 77, spo2: 98 },
  { time: '00:20', hr: 85, spo2: 96 },
  { time: '00:25', hr: 81, spo2: 96 },
  { time: '00:30', hr: 79, spo2: 95 },
  { time: '00:35', hr: 85, spo2: 95 },
  { time: '00:40', hr: 91, spo2: 92 },
  { time: '00:45', hr: 84, spo2: 94 },
  { time: '00:50', hr: 81, spo2: 96 },
  { time: '00:55', hr: 80, spo2: 97 },
];

const meshData = [
  { name: 'Clinical Data', value: 64, color: '#3B82F6' },
  { name: 'Image Reconstruction', value: 22, color: '#FBBF24' },
  { name: 'Sys/Auth', value: 14, color: '#94A3B8' },
];

export default function Dashboard() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ---- ROW 1 ---- */}
        <div className="lg:col-span-2 bg-brand-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-md flex flex-col justify-between h-[280px]">
          
          <div className="relative z-10 max-w-[60%]">
            <h1 className="text-3xl font-bold mb-3 tracking-tight">MedLink Gateway</h1>
            <p className="text-brand-100 text-sm leading-relaxed pr-8">
              Real-time low-bandwidth clinical intelligence for remote field operations and emergency routing.
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex gap-16 relative z-10 mt-auto">
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-100 tracking-wider mb-2">Active<br/>Patients</div>
              <div className="text-4xl font-bold">142</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-100 tracking-wider mb-2 mt-[14px]">Field Nodes</div>
              <div className="text-4xl font-bold">28</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-100 tracking-wider mb-2 mt-[14px]">Avg Loss Rate</div>
              <div className="text-4xl font-bold">0.02%</div>
            </div>
          </div>

          {/* Graphic & CTP Sync */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-[32px] flex flex-col justify-between p-6 z-10" style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)' }}>
             <div className="flex-1 flex items-center justify-center relative">
                <Activity size={64} className="text-[#38bdf8] stroke-[2]" />
             </div>
             <div className="relative top-4">
                <div className="text-[10px] uppercase font-bold text-white tracking-wider mb-1">C.T.P. SYNC</div>
                <div className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Realtime</div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-[280px] flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-4">Triage Status</h2>
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                <div>
                  <div className="font-bold text-sm text-red-700">Critical</div>
                  <div className="text-[10px] text-red-500 font-medium">8 Active Emergency</div>
                </div>
              </div>
              <div className="text-2xl font-black text-red-700">08</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                <div>
                  <div className="font-bold text-sm text-amber-700">Warning</div>
                  <div className="text-[10px] text-amber-600 font-medium">24 Observation Status</div>
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600">24</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-2xl border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-bold text-sm text-green-700">Stable</div>
                  <div className="text-[10px] text-green-600 font-medium">110 Normal Monitoring</div>
                </div>
              </div>
              <div className="text-2xl font-black text-green-600">110</div>
            </div>
          </div>
        </div>

        {/* ---- ROW 2 ---- */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-[380px] flex flex-col">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Networked Vital Streaming</h2>
              <p className="text-xs text-slate-400 font-medium">Interactive telemetry for Node: FIELD-ALPHA-07</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">HR</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">SpO2</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">TEMP</span>
            </div>
          </div>
          
          <div className="flex-1 w-full relative -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vitalsData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
                <Area type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpo2)" />
                <Line type="monotone" dataKey="hr" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="absolute bottom-[-10px] left-10 flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-rose-500 rounded-full relative"><div className="w-2 h-2 bg-white border-2 border-rose-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div></div>
                Heart Rate (BPM)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-blue-500 rounded-full"></div>
                SpO2 (%)
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-[380px] flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="text-brand-500" size={18} /> NLP Triage Pipeline
          </h2>
          
          <div className="flex-1 relative ml-6 border-l-2 border-slate-100 pl-8 pb-4 flex flex-col justify-between">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-[51px] top-0 w-[34px] h-[34px] bg-white border-[3px] border-blue-400 text-blue-500 rounded-full flex items-center justify-center text-[9px] font-bold z-10">OBS</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Patient Observation</div>
              <div className="bg-slate-50 p-4 rounded-xl text-[12px] italic text-slate-600 border border-slate-100 shadow-inner">
                "Patient unconscious with severe chest pain and labored breathing."
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-[51px] top-0 w-[34px] h-[34px] bg-white border-[3px] border-blue-400 text-blue-500 rounded-full flex items-center justify-center text-[9px] font-bold z-10">TOKEN</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">C.T.P. Conversion</div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-mono font-bold rounded">P104</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-mono font-bold rounded">C05</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-mono font-bold rounded">S12</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-[51px] top-0 w-[34px] h-[34px] bg-white border-[3px] border-red-500 text-red-500 rounded-full flex items-center justify-center text-[11px] font-black z-10 shadow-sm shadow-red-500/20">18</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Severity Score</div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-red-500 w-[90%]"></div>
              </div>
              <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Critical Risk Threshold Exceeded</div>
            </div>
            
            {/* Connecting line overrides */}
            <div className="absolute left-[-2px] top-[34px] h-[calc(50%-34px)] w-[2px] bg-blue-400"></div>
            <div className="absolute left-[-2px] top-[calc(50%+17px)] h-[calc(50%-17px)] w-[2px] bg-gradient-to-b from-blue-400 to-red-500"></div>
          </div>
        </div>

        {/* ---- ROW 3 ---- */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-base font-bold text-slate-800 leading-tight w-[60%]">Quantum Bandwidth Mesh</h2>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Capacity</div>
              <div className="text-xs font-black text-slate-900 mt-0.5">2.5 GB / SEC</div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-between mb-2">
            <div className="relative w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={meshData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    {meshData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[40%] left-[16%] text-[10px] font-bold text-slate-500">22%</div>
              <div className="absolute bottom-[22%] left-[25%] text-[10px] font-bold text-slate-500">14%</div>
              <div className="absolute bottom-[24%] right-[10%] text-[10px] font-bold text-white z-10">64%</div>
            </div>

            <div className="flex flex-col justify-center space-y-6 text-[11px] font-medium text-slate-600 flex-1 pl-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>Clinical Data</div>
                <div className="font-bold text-slate-900">64%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2"><div className="w-3 h-3 rounded-full bg-[#FBBF24] mt-0.5"></div><span className="leading-tight">Image<br/>Reconstruction</span></div>
                <div className="font-bold text-slate-900">22%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#94A3B8]"></div>Sys/Auth</div>
                <div className="font-bold text-slate-900">14%</div>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-2 py-3 bg-[#EFF6FF] text-[#2563EB] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors">
            Recalibrate Routing
          </button>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-[280px] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 italic">Progressive Reconstruction<br/>(PTX-04)</h2>
            </div>
            <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <AlertTriangle size={14} className="text-amber-500" />
              12% Packet Loss Active
            </div>
          </div>

          <div className="flex gap-6 h-[130px]">
            {/* Buffer image (mocking the blurry/glitchy side) */}
            <div className="flex-1 rounded-2xl overflow-hidden relative border border-slate-200">
               <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <div className="text-white/20 font-mono text-4xl blur-[2px] scale-150">###</div>
               </div>
               <div className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur text-white text-[9px] font-bold uppercase px-2 py-1 rounded">Buffer</div>
            </div>
            
            {/* Reconstructed image (mocking the clean side) */}
            <div className="flex-1 rounded-2xl overflow-hidden relative border border-brand-200 bg-slate-100">
               <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                  {/* Fake UI for scan line */}
                  <div className="w-full h-0.5 bg-green-400 absolute top-1/2 shadow-[0_0_8px_2px_rgba(74,222,128,0.5)] z-20"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-500/10 z-10"></div>
               </div>
               <div className="absolute bottom-2 right-2 bg-brand-500 text-white text-[9px] font-bold uppercase px-2 py-1 rounded shadow-md">Reconstructed</div>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recovery Progress</div>
              <div className="text-2xl font-black text-brand-500">84.2%</div>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Packets Received</div>
                <div className="text-sm font-bold text-slate-900">14,204</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chunks Fixed</div>
                <div className="text-sm font-bold text-green-600">2,190</div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- ROW 4 ---- */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800">Doctor Action Queue</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button className="px-4 py-1.5 text-xs font-bold text-slate-500 rounded-lg">All Nodes</button>
              <button className="px-4 py-1.5 text-xs font-bold text-white bg-brand-500 rounded-lg shadow-sm">Urgent Only</button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 pl-2">Patient ID</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">CTP Tokens</th>
                  <th className="pb-3">Live State</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pl-2 text-slate-900 font-bold">#PT-8291</td>
                  <td className="py-4"><span className="bg-red-50 text-red-500 px-2 py-1 rounded font-bold">22</span></td>
                  <td className="py-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div><span className="text-red-500 text-[10px] font-bold uppercase tracking-wider">Critical</span></td>
                  <td className="py-4 text-[10px] font-mono text-slate-500">P104 | C05 | S12 | V04</td>
                  <td className="py-4">Tachycardia / Hypoxia</td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end gap-2">
                      <button className="bg-red-500 text-white text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-600 transition-colors">Dispatch</button>
                      <button className="bg-brand-500 text-white text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm hover:bg-brand-600 transition-colors">View Stream</button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pl-2 text-slate-900 font-bold">#PT-9042</td>
                  <td className="py-4"><span className="bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold">14</span></td>
                  <td className="py-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div><span className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">Warning</span></td>
                  <td className="py-4 text-[10px] font-mono text-slate-500">P022 | C14 | S01 | V02</td>
                  <td className="py-4">Abdominal Pain (Post-Op)</td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end gap-2">
                      <button className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">Assign Dr.</button>
                      <button className="bg-brand-500 text-white text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg shadow-sm hover:bg-brand-600 transition-colors">Request Image</button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pl-2 text-slate-900 font-bold">#PT-7718</td>
                  <td className="py-4"><span className="bg-green-50 text-green-600 px-2 py-1 rounded font-bold">04</span></td>
                  <td className="py-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Stable</span></td>
                  <td className="py-4 text-[10px] font-mono text-slate-500">P001 | C02 | S00 | V01</td>
                  <td className="py-4">Routine Recovery Monitor</td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end gap-2">
                      <button className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">Acknowledge</button>
                      <button className="bg-white border border-green-200 text-green-600 text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">Resolve</button>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
