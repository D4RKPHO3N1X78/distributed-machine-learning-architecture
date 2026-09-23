import React from 'react';
import { Server, Cpu, Database } from 'lucide-react';

export default function TopologyGraph({ state, onTriggerChaos }) {
  const workers = state?.workers ? Object.values(state.workers) : [
    { id: 'worker-1', status: 'Active', latency_ms: 12.5, shard: '0%-25%', batches_processed: 42 },
    { id: 'worker-2', status: 'Active', latency_ms: 15.0, shard: '25%-50%', batches_processed: 42 },
    { id: 'worker-3', status: 'Active', latency_ms: 18.0, shard: '50%-75%', batches_processed: 42 },
    { id: 'worker-4', status: 'Active', latency_ms: 14.0, shard: '75%-100%', batches_processed: 42 }
  ];

  const syncStrategy = state?.sync_strategy || "Parameter Server";
  const compressionMode = state?.compression_mode || "None";
  const globalStep = state?.global_step || 0;

  return (
    <div className="card-panel p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-[#232631] gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">3-Layer Cluster Topology</h2>
          <p className="text-xs text-slate-400 mt-0.5">Worker node synchronization &amp; parameter server architecture</p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-[#1c1f2a] text-slate-300 border border-[#2d3142]">
            Sync: <strong className="text-indigo-400">{syncStrategy}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#1c1f2a] text-slate-300 border border-[#2d3142]">
            Compression: <strong className="text-emerald-400">{compressionMode}</strong>
          </span>
        </div>
      </div>

      {/* Topology Diagram */}
      <div className="relative min-h-[360px] flex flex-col justify-between py-2">
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
          <line x1="50%" y1="55" x2="50%" y2="135" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

          <line x1="50%" y1="185" x2="15%" y2="290" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50%" y1="185" x2="38%" y2="290" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50%" y1="185" x2="62%" y2="290" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50%" y1="185" x2="85%" y2="290" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>

        {/* LAYER 1 */}
        <div className="relative z-10 flex justify-center">
          <div className="bg-[#1c1f2a] border border-[#2d3142] rounded-lg px-5 py-2 flex items-center gap-3">
            <Server className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-xs font-medium text-white">Layer 1: REST &amp; WebSocket Gateway</div>
              <div className="text-[11px] text-slate-400 font-mono">Port 8000 &bull; Real-time Inference API</div>
            </div>
          </div>
        </div>

        {/* LAYER 2 */}
        <div className="relative z-10 flex justify-center my-3">
          <div className="bg-[#1c1f2a] border border-indigo-500/40 rounded-lg px-6 py-2.5 flex items-center gap-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-xs font-semibold text-white">Layer 2: Parameter Server (Master)</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex gap-3">
                <span>Step: <strong className="text-indigo-300">{globalStep}</strong></span>
                <span>Lock: <strong className="text-emerald-400">Sync</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* LAYER 3 */}
        <div className="relative z-10">
          <div className="text-center mb-2.5">
            <span className="text-xs text-slate-400">Layer 3: Containerized Worker Nodes (MNIST Shards)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workers.map((w) => {
              const isOffline = w.status === 'Offline';
              const isStraggler = w.status === 'Straggler';

              return (
                <div 
                  key={w.id}
                  className={`rounded-lg p-3 border transition-all ${
                    isOffline 
                      ? 'bg-rose-950/20 border-rose-900/40 text-slate-400' 
                      : isStraggler
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-[#1c1f2a] border-[#2d3142]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className={`w-3.5 h-3.5 ${isOffline ? 'text-rose-400' : isStraggler ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <span className="font-semibold text-xs text-white">{w.id}</span>
                    </div>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isOffline ? 'bg-rose-500/20 text-rose-300' : isStraggler ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {w.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shard:</span>
                      <span className="text-slate-200">{w.shard}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latency:</span>
                      <span className={isStraggler ? "text-amber-400" : "text-emerald-400"}>
                        {w.latency_ms.toFixed(1)} ms
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#2d3142]">
                    {isOffline ? (
                      <button 
                        onClick={() => onTriggerChaos(w.id, 'recover')}
                        className="w-full py-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 rounded border border-emerald-800/50"
                      >
                        Recover Node
                      </button>
                    ) : (
                      <button 
                        onClick={() => onTriggerChaos(w.id, 'kill')}
                        className="w-full py-1 text-[10px] font-medium text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 rounded border border-rose-900/50"
                      >
                        Simulate Crash
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
