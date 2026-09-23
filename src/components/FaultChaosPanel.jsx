import React from 'react';
import { Sliders, ShieldAlert, Cpu, Zap, Radio, RefreshCw, Play, Pause, AlertOctagon } from 'lucide-react';

export default function FaultChaosPanel({ state, onConfigChange, onTriggerChaos, isAutoTraining, onToggleAutoTrain, onSingleStep }) {
  const syncStrategy = state?.sync_strategy || "Parameter Server";
  const compressionMode = state?.compression_mode || "None";
  const workers = state?.workers ? Object.values(state.workers) : [];

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Cluster Operations &amp; Fault Injection</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure synchronization protocols, gradient compression, and test automated worker failure recovery.
          </p>
        </div>

        {/* Global Action Trigger Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSingleStep}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Step 1 Batch
          </button>

          <button
            onClick={onToggleAutoTrain}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isAutoTraining 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
            }`}
          >
            {isAutoTraining ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                Pause Training
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Start Cluster Training
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. SYNCHRONIZATION PROTOCOLS & LATENCY COMPRESSION */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Synchronization Strategy (Layer 2)
            </h3>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { name: "Parameter Server", desc: "Sync Barrier & Master Aggregation" },
                { name: "Ring-AllReduce", desc: "Ring Mesh Neighbor Exchange" },
                { name: "Async SGD", desc: "Staleness Damped Continuous Step" },
                { name: "FedAvg", desc: "Federated Local Epoch Averaging" }
              ].map((strat) => {
                const isActive = syncStrategy === strat.name;
                return (
                  <button
                    key={strat.name}
                    onClick={() => onConfigChange({ sync_strategy: strat.name })}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isActive 
                        ? 'bg-cyan-950/80 border-cyan-500/60 text-white shadow-md shadow-cyan-950/30' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{strat.name}</span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">{strat.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Gradient Exchange Compression */}
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Gradient Latency Reduction (Bandwidth Savings)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: "None", label: "FP32 Uncompressed", savings: "0% Reduction" },
                { mode: "FP16", label: "FP16 Quantization", savings: "50% Savings" },
                { mode: "Top-K", label: "Top-K Sparsification", savings: "90% Savings" }
              ].map((comp) => {
                const isActive = compressionMode === comp.mode;
                return (
                  <button
                    key={comp.mode}
                    onClick={() => onConfigChange({ compression_mode: comp.mode })}
                    className={`p-2.5 rounded-xl text-center border transition-all ${
                      isActive 
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-white shadow-md shadow-emerald-950/30' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{comp.label}</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{comp.savings}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. CHAOS ENGINE & WORKER FAULT INJECTION */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Chaos Engineering &amp; Fault Tolerance
              </h3>
              <span className="text-[11px] text-rose-400 font-mono">Heartbeat Timeout: 5.0s</span>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              Simulate container crash, network delay, or worker stragglers to verify automated dynamic dataset re-sharding and master recovery protocols.
            </p>

            {/* Individual Worker Chaos Controls */}
            <div className="space-y-2.5">
              {workers.map((w) => {
                const isOffline = w.status === 'Offline';
                const isStraggler = w.status === 'Straggler';

                return (
                  <div key={w.id} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Cpu className={`w-4 h-4 ${isOffline ? 'text-rose-500' : isStraggler ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-white">{w.id}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">Shard: {w.shard}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Slowdown button */}
                      <button
                        onClick={() => onTriggerChaos(w.id, isStraggler ? 'normal' : 'slow', 300)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                          isStraggler 
                            ? 'bg-amber-600 text-white border-amber-500' 
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                        }`}
                      >
                        {isStraggler ? 'Normal Speed' : '+300ms Delay'}
                      </button>

                      {/* Kill / Recover button */}
                      <button
                        onClick={() => onTriggerChaos(w.id, isOffline ? 'recover' : 'kill')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                          isOffline 
                            ? 'bg-emerald-600 text-white border-emerald-500' 
                            : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800'
                        }`}
                      >
                        {isOffline ? 'Recover Node' : 'Kill Container'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              If a worker node crashes, Layer 2 Master detects missing heartbeats and automatically re-assigns the node's MNIST data partition to active container nodes.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
