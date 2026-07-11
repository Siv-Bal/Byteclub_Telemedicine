import React, { useState } from 'react';
import { Image as ImageIcon, Send, ShieldCheck, Activity } from 'lucide-react';

export default function ImageTransfer() {
  const [loss, setLoss] = useState(30);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/fountain-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loss_percentage: loss })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const drawImage = (pixels, canvasId) => {
    if (!pixels) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(64, 64);
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const val = pixels[i][j];
        const idx = (i * 64 + j) * 4;
        imgData.data[idx] = val;
        imgData.data[idx+1] = val;
        imgData.data[idx+2] = val;
        imgData.data[idx+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  React.useEffect(() => {
    if (result) {
      drawImage(result.original, 'canvas-orig');
      drawImage(result.reconstructed, 'canvas-recon');
    }
  }, [result]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Image Transfer (Fountain Coding)</h1>
          <p className="text-slate-500">Progressive wavelet transmission over high-loss links</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 w-full space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity size={16} /> Simulated Packet Loss
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" max="80" 
                value={loss} 
                onChange={e => setLoss(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <span className="font-mono font-bold text-lg text-slate-700 w-12 text-right">{loss}%</span>
            </div>
          </div>
          
          <button 
            onClick={handleTest}
            disabled={loading}
            className="w-full py-4 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-md shadow-brand-500/20"
          >
            {loading ? <Activity size={20} className="animate-spin" /> : <Send size={20} />}
            Run Fountain Encoding Demo
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Original Image</h2>
            <div className="flex justify-center mb-6">
              <div className="p-2 border-2 border-slate-100 rounded-2xl shadow-inner bg-slate-50">
                <canvas id="canvas-orig" width="64" height="64" className="w-48 h-48 pixelated rounded-xl"></canvas>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center relative overflow-hidden">
            <h2 className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> Reconstructed
            </h2>
            <div className="flex justify-center mb-6">
              <div className="p-2 border-2 border-brand-100 rounded-2xl shadow-inner bg-brand-50">
                <canvas id="canvas-recon" width="64" height="64" className="w-48 h-48 pixelated rounded-xl"></canvas>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4 text-left">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sent</div>
                <div className="text-lg font-bold text-slate-800 font-mono">{result.stats.packets_sent}</div>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Lost</div>
                <div className="text-lg font-bold text-rose-700 font-mono">{result.stats.packets_lost}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <div className="text-[10px] uppercase font-bold text-green-500 mb-1">Recovered</div>
                <div className="text-lg font-bold text-green-700 font-mono">{result.stats.chunks_recovered}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
