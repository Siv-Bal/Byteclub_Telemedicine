import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Activity, Thermometer, Wind, Battery, Wifi, Bluetooth, AlertCircle, Clock, CheckCircle2, ChevronRight, Share, Zap, Heart, Settings } from 'lucide-react';

const MOCK_PATIENTS = [
  { id: 'PT-8291', name: 'James Wilson', age: 45, status: 'Critical', room: 'ICU-A' },
  { id: 'PT-9042', name: 'Sarah Chen', age: 32, status: 'Warning', room: 'OBS-3' },
  { id: 'PT-7718', name: 'Robert Fox', age: 68, status: 'Stable', room: 'REC-2' }
];

export default function PatientVitals() {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState({
    hr: 0, spo2: 0, temp: 0, humidity: 0, battery: 0, rssi: 0, ble_status: 'Unknown', device_id: '---', firmware: '---'
  });
  const [history, setHistory] = useState(Array(60).fill({ hr: 75, spo2: 98, temp: 37 }));
  const [events, setEvents] = useState([{ time: new Date().toLocaleTimeString(), message: 'System initialized' }]);
  const [alert, setAlert] = useState(null);
  
  const [selectedPatient, setSelectedPatient] = useState(MOCK_PATIENTS[0]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/vitals/ws');

    ws.onopen = () => {
      setIsConnected(true);
      addEvent('ESP32 bridge connected successfully');
    };

    ws.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      setData(incoming);
      
      setHistory(prev => {
        const newHistory = [...prev.slice(1), incoming];
        return newHistory;
      });

      // Emergency Detection Engine
      checkAlerts(incoming);
    };

    ws.onclose = () => {
      setIsConnected(false);
      addEvent('Connection lost to ESP32 bridge');
    };

    return () => ws.close();
  }, [selectedPatient]);

  const checkAlerts = (incoming) => {
    if (incoming.spo2 < 90 || incoming.hr > 130 || incoming.hr < 45 || incoming.temp > 39.0) {
      if (!alert) {
        setAlert('CRITICAL EVENT DETECTED');
        addEvent(`CRITICAL ALERT: Abnormal vitals detected (HR: ${incoming.hr}, SpO2: ${incoming.spo2}%)`);
      }
    } else {
      setAlert(null);
    }
  };

  const addEvent = (msg) => {
    setEvents(prev => [{ time: new Date().toLocaleTimeString(), message: msg }, ...prev].slice(0, 15));
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Top Hero Section */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100">
             <Heart className={`text-brand-500 ${isConnected ? 'animate-pulse' : ''}`} size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Monitoring Hub</h1>
            <div className="text-sm font-medium text-slate-400 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span> ESP32 Gateway {isConnected ? 'Connected' : 'Disconnected'}</span>
              <span>•</span>
              <span>Last Packet: 0.3s Ago</span>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Patients</div>
            <div className="text-2xl font-black text-slate-800">14</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg SpO₂</div>
            <div className="text-2xl font-black text-blue-500">97%</div>
          </div>
          <div className="text-right border-l border-slate-100 pl-8">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Network Health</div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-1.5 bg-green-500 rounded-full"></div>
              <div className="w-6 h-1.5 bg-green-500 rounded-full"></div>
              <div className="w-6 h-1.5 bg-green-500 rounded-full"></div>
              <div className="w-6 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {alert && (
        <div className="bg-red-500 text-white rounded-[24px] p-4 flex items-center justify-between shadow-lg shadow-red-500/20 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} />
            <div>
              <div className="font-black text-lg tracking-tight">CRITICAL EVENT DETECTED</div>
              <div className="text-red-100 text-sm font-medium">Recommend Immediate Escalation - SpO2 or HR boundaries exceeded</div>
            </div>
          </div>
          <button className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors">
            Send To Clinical NLP
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT SIDEBAR: Patient Selector */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Monitored Patients</h2>
          <div className="space-y-3">
            {MOCK_PATIENTS.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`w-full text-left p-4 rounded-[24px] transition-all border ${selectedPatient.id === p.id ? 'bg-white border-brand-500 shadow-md shadow-brand-500/10' : 'bg-white border-slate-100 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    <img src={`https://i.pravatar.cc/150?u=${p.id}`} alt={p.name} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 leading-tight">{p.name}</div>
                    <div className="text-xs text-slate-400 font-medium">{p.id} • {p.age} y/o</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    p.status === 'Critical' ? 'bg-red-50 text-red-600' :
                    p.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {p.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{p.room}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Environmental Card */}
          <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm mt-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
              <Wind className="text-sky-500" size={18} /> Room Environment
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Humidity</div>
                <div className="text-2xl font-black text-slate-700">{data.humidity || '--'}%</div>
              </div>
              <div className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md">Optimal Comfort</div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Live Vitals */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
          
          {/* Heart Rate Chart */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <Activity size={20} className={isConnected ? "animate-pulse" : ""} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">Heart Rate</div>
                  <div className="text-xs font-medium text-slate-400">Continuous ECG Feed</div>
                </div>
              </div>
              <div className="text-right flex items-baseline gap-1">
                <span className="text-5xl font-black text-red-500 tracking-tighter">{data.hr || '--'}</span>
                <span className="text-sm font-bold text-red-400 uppercase">BPM</span>
              </div>
            </div>

            <div className="h-[200px] w-full -ml-2 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              {/* Fake grid lines to look like ECG paper */}
              <div className="absolute inset-0 border-[0.5px] border-red-100/50 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
              <div className="bg-slate-50 rounded-xl p-3">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min BPM</div>
                 <div className="text-lg font-bold text-slate-700">62</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Max BPM</div>
                 <div className="text-lg font-bold text-slate-700">118</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trend</div>
                 <div className="text-lg font-bold text-slate-700">Stable</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1">
            {/* SpO2 Gauge */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
              <div>
                <div className="text-sm font-bold text-slate-800">SpO₂ Level</div>
                <div className="text-xs font-medium text-slate-400">Oxygen Saturation</div>
              </div>
              
              <div className="flex-1 flex items-center justify-center relative my-4">
                 {/* Recharts Pie as a radial gauge */}
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-black text-blue-500 tracking-tighter">{data.spo2 || '--'}%</span>
                 </div>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={[{value: data.spo2 || 0}, {value: 100 - (data.spo2 || 0)}]} cx="50%" cy="50%" innerRadius="75%" outerRadius="90%" startAngle={225} endAngle={-45} stroke="none" dataKey="value" isAnimationActive={false}>
                       <Cell fill="#3b82f6" />
                       <Cell fill="#f1f5f9" />
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
              </div>

              <div className="text-center bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl">
                {data.spo2 >= 95 ? 'Excellent Oxygenation' : data.spo2 >= 90 ? 'Acceptable' : 'Hypoxia Warning'}
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
              <div>
                <div className="text-sm font-bold text-slate-800">Core Body Temp</div>
                <div className="text-xs font-medium text-slate-400">Surface / Internal</div>
              </div>
              
              <div className="flex-1 flex items-end justify-between mt-8 relative z-10 pb-4 border-b border-slate-100 mb-4">
                 <div>
                    <span className="text-5xl font-black text-amber-500 tracking-tighter">{data.temp || '--'}</span>
                    <span className="text-sm font-bold text-amber-400 ml-1">°C</span>
                 </div>
                 <Thermometer className="text-amber-400 mb-2" size={32} />
              </div>

              <div className="h-[60px] w-full -ml-2 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} fill="url(#colorTemp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Analytics & Devices */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Advanced Analytics */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
             <div className="flex items-center gap-2 text-slate-800 font-bold mb-6">
               <Zap className="text-purple-500" size={18} /> AI Analytics
             </div>
             
             <div className="space-y-5">
                <div>
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HRV (Heart Rate Var)</span>
                      <span className="text-sm font-black text-slate-700">42 ms</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className="h-full bg-purple-500 rounded-full w-[60%]"></div></div>
                </div>
                
                <div>
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Oxygen Stability</span>
                      <span className="text-sm font-black text-slate-700">99.2%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className="h-full bg-blue-500 rounded-full w-[95%]"></div></div>
                </div>

                <div>
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Trend</span>
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Declining</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Device Intelligence Panel */}
          <div className="bg-slate-800 text-white rounded-[24px] p-6 shadow-lg relative overflow-hidden">
             {/* Tech grid background */}
             <div className="absolute inset-0 border-[0.5px] border-white/5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255, 0.05) 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
             
             <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Settings className="text-slate-400" size={16} /> ESP32 Edge Node
                </div>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-md">{data.device_id}</span>
             </div>
             
             <div className="relative z-10 grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                   <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1"><Battery size={10}/> Battery</div>
                   <div className="text-lg font-bold text-slate-100">{data.battery || '--'}%</div>
                </div>
                <div>
                   <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1"><Wifi size={10}/> RSSI</div>
                   <div className="text-lg font-bold text-slate-100">{data.rssi || '--'} dBm</div>
                </div>
                <div>
                   <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1"><Bluetooth size={10}/> BLE Status</div>
                   <div className="text-xs font-bold text-green-400 mt-1">{data.ble_status}</div>
                </div>
                <div>
                   <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Firmware</div>
                   <div className="text-xs font-mono text-slate-300 mt-1">{data.firmware}</div>
                </div>
             </div>
          </div>

          {/* Timeline Feed */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
             <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
               <Clock className="text-slate-400" size={18} /> Live Event Feed
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {events.map((ev, i) => (
                  <div key={i} className="flex gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0"></div>
                     <div>
                        <div className="text-[9px] font-bold text-slate-400 mb-0.5">{ev.time}</div>
                        <div className={`text-xs font-medium ${ev.message.includes('CRITICAL') ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{ev.message}</div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
