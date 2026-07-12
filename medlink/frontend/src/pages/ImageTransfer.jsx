import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Link, Unlink, Radio, RefreshCw, Download } from 'lucide-react';
import { useSerialStore } from '../SerialStore';
import { NODE_NAMES } from '../SerialStore';

export default function ImageTransfer() {
  const { isConnected, images, imageBuffers, events, connect, disconnect } = useSerialStore();

  // Derive progress per node
  const progress = {};
  Object.entries(imageBuffers).forEach(([nid, buf]) => {
    progress[nid] = buf.totalChunks > 0 ? Math.round((buf.received.size / buf.totalChunks) * 100) : 0;
  });

  // Download helper
  const download = (url, nodeId) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `medlink_${NODE_NAMES[nodeId] || nodeId}_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Image Transfer</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Live JPEG reconstruction from ESP-NOW chunk stream via serial bridge</p>
        </div>
        <button
          onClick={isConnected ? disconnect : connect}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shadow-sm w-fit ${isConnected ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/25'}`}
        >
          {isConnected ? <><Unlink size={16} /> Disconnect</> : <><Link size={16} /> Connect Serial</>}
        </button>
      </div>

      {/* Protocol Explainer */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><ImageIcon size={16} className="text-brand-500" /> How Image Chunks Arrive</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Phone Capture', desc: 'Patient phone uploads JPEG to Yokes node AP (/upload endpoint)', color: 'bg-brand-50 border-brand-100 text-brand-700' },
            { step: '2', title: 'ESP-NOW Burst', desc: `Image split into 230-byte chunks, sent to gateway MAC over ESP-NOW channel 1`, color: 'bg-violet-50 border-violet-100 text-violet-700' },
            { step: '3', title: 'Serial Line', desc: `Gateway prints IMAGE_CHUNK,Y,<idx>,<total>,<len>,<hex> at 115200 baud`, color: 'bg-amber-50 border-amber-100 text-amber-700' },
            { step: '4', title: 'Reconstruction', desc: 'Browser assembles hex chunks into Uint8Array → Blob → Object URL', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          ].map(s => (
            <div key={s.step} className={`rounded-2xl border p-4 ${s.color}`}>
              <div className="text-2xl font-black mb-2 opacity-20">{s.step}</div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1">{s.title}</div>
              <div className="text-xs font-medium opacity-70 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty / Not connected */}
      {!isConnected && Object.keys(images).length === 0 && (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-5">
            <Radio size={36} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Waiting for Image Stream</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
            Connect the ESP32 Gateway serial port, then take a photo from any patient node's web page
            (<strong>http://192.168.4.1/</strong> on the node's WiFi). 
            Chunks will appear below automatically.
          </p>
          <button onClick={connect}
            className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/25">
            <Link size={18} /> Connect Serial Port
          </button>
        </div>
      )}

      {/* In-progress chunks */}
      {Object.entries(imageBuffers).some(([, b]) => b.received.size > 0 && b.received.size < b.totalChunks) && (
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Receiving Chunks…</h2>
          </div>
          {Object.entries(imageBuffers).map(([nid, buf]) => {
            const pct = buf.totalChunks > 0 ? Math.round((buf.received.size / buf.totalChunks) * 100) : 0;
            if (buf.received.size === 0) return null;
            return (
              <div key={nid} className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>{NODE_NAMES[nid] || nid}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">{buf.received.size} / {buf.totalChunks} chunks · {pct}%</span>
                    <button 
                      onClick={() => useSerialStore.getState().forceAssembleImage(nid)}
                      className="px-3 py-1 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors uppercase tracking-wider text-[9px]"
                    >
                      Force Show Partial
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-300 animate-pulse" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assembled images */}
      {Object.entries(images).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(images).map(([nid, url]) => (
            <div key={nid} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-bold text-slate-800">{NODE_NAMES[nid] || nid}</div>
                  <div className="text-[10px] font-medium text-slate-400">Latest image · ESP-NOW chunk stream</div>
                </div>
                <button onClick={() => download(url, nid)}
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-brand-50 text-brand-600 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors uppercase tracking-wider">
                  <Download size={12} /> Save
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                <img src={url} alt={`${NODE_NAMES[nid] || nid} capture`} className="max-w-full max-h-[400px] object-contain" />
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-medium text-center">
                Reconstructed from {imageBuffers[nid]?.totalChunks ?? '?'} × 230-byte ESP-NOW chunks
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent image events */}
      {events.filter(e => e.msg?.includes('📷')).length > 0 && (
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Image Transfer Log</h2>
          <div className="space-y-2">
            {events.filter(e => e.msg?.includes('📷')).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-slate-300 font-mono shrink-0">{ev.time}</span>
                <span className="text-slate-600 font-medium">{ev.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
