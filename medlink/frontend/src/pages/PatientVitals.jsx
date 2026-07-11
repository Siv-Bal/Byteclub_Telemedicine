import React, { useState, useEffect } from 'react';
import { Activity, Heart, Thermometer, Wind, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientVitals() {
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [currentVitals, setCurrentVitals] = useState({ hr: 0, spo2: 0, temp: 0 });

  useEffect(() => {
    // Connect to FastAPI WebSocket for simulated vitals
    const ws = new WebSocket('ws://localhost:8000/api/vitals/ws');
    
    ws.onopen = () => {
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const newReading = JSON.parse(event.data);
      setCurrentVitals({
        hr: newReading.hr,
        spo2: newReading.spo2,
        temp: newReading.temp
      });
      
      setData(prevData => {
        const newData = [...prevData, {
          time: new Date(newReading.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
          hr: newReading.hr,
          spo2: newReading.spo2,
          temp: newReading.temp
        }];
        // Keep last 20 readings
        return newData.slice(-20);
      });
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => ws.close();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Patient Vitals 
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </h1>
          <p className="text-slate-500">Real-time stream from ESP32 bridge</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-500">
            <Heart size={32} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Heart Rate</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{currentVitals.hr || '--'}</span>
              <span className="text-sm font-medium text-slate-400">bpm</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-blue-50 text-blue-500">
            <Wind size={32} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">SpO2</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{currentVitals.spo2 || '--'}</span>
              <span className="text-sm font-medium text-slate-400">%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-orange-50 text-orange-500">
            <Thermometer size={32} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Temperature</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{currentVitals.temp || '--'}</span>
              <span className="text-sm font-medium text-slate-400">°F</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-brand-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900">Live Telemetry Feed</h2>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="hr" 
                stroke="#f43f5e" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="spo2" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
