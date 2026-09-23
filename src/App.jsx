import React, { useState, useEffect } from 'react';
import { Network, Sparkles, Activity, Layers, RefreshCw, Play, Pause } from 'lucide-react';
import TopologyGraph from './components/TopologyGraph';
import DigitCanvas from './components/DigitCanvas';
import FaultChaosPanel from './components/FaultChaosPanel';
import SyncMetrics from './components/SyncMetrics';
import DockerArchitectureInspector from './components/DockerArchitectureInspector';

export default function App() {
  const [activeTab, setActiveTab] = useState('topology');
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Cluster state manager
  const [clusterState, setClusterState] = useState({
    global_step: 42,
    epoch: 2,
    sync_strategy: "Parameter Server",
    compression_mode: "None",
    learning_rate: 0.01,
    workers: {
      'worker-1': { id: 'worker-1', status: 'Active', latency_ms: 12.5, shard: '0%-25%', batches_processed: 42 },
      'worker-2': { id: 'worker-2', status: 'Active', latency_ms: 15.0, shard: '25%-50%', batches_processed: 42 },
      'worker-3': { id: 'worker-3', status: 'Active', latency_ms: 18.0, shard: '50%-75%', batches_processed: 42 },
      'worker-4': { id: 'worker-4', status: 'Active', latency_ms: 14.0, shard: '75%-100%', batches_processed: 42 }
    },
    metrics: {
      steps: [5, 10, 15, 20, 25, 30, 35, 40, 42],
      loss: [2.15, 1.65, 1.22, 0.88, 0.54, 0.38, 0.29, 0.22, 0.18],
      accuracy: [25.0, 42.0, 61.5, 76.0, 84.5, 89.2, 93.0, 95.8, 96.5],
      latency_ms: [24.5, 25.1, 23.8, 24.2, 25.0, 24.6, 24.0, 24.8, 24.5],
      active_workers: [4, 4, 4, 4, 4, 4, 4, 4, 4]
    }
  });

  useEffect(() => {
    let socket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/cluster`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        addLog('System', 'Connected to Layer 1 WebSocket stream.');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setClusterState(data);
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (socket) socket.close();
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isAutoTraining) {
      interval = setInterval(() => {
        triggerSingleStep();
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isAutoTraining, clusterState]);

  const addLog = (tag, msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, tag, msg }, ...prev.slice(0, 49)]);
  };

  const handleConfigChange = async (newConfig) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (e) {}

    setClusterState(prev => {
      const updatedStrategy = newConfig.sync_strategy || prev.sync_strategy;
      const updatedCompression = newConfig.compression_mode || prev.compression_mode;
      
      let baseLatency = 24.5;
      if (updatedCompression === 'Top-K') baseLatency = 3.8;
      if (updatedCompression === 'FP16') baseLatency = 9.5;

      addLog('Config', `Strategy: ${updatedStrategy} | Compression: ${updatedCompression}`);

      return {
        ...prev,
        sync_strategy: updatedStrategy,
        compression_mode: updatedCompression,
        metrics: {
          ...prev.metrics,
          latency_ms: prev.metrics.latency_ms.map(() => baseLatency + Math.random() * 2)
        }
      };
    });
  };

  const handleTriggerChaos = async (workerId, action, latencyMs) => {
    try {
      await fetch('/api/chaos/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId, action, latency_ms: latencyMs })
      });
    } catch (e) {}

    setClusterState(prev => {
      const workers = { ...prev.workers };
      if (workers[workerId]) {
        if (action === 'kill') {
          workers[workerId].status = 'Offline';
          addLog('FaultTolerance', `Worker ${workerId} offline.`);
        } else if (action === 'recover') {
          workers[workerId].status = 'Active';
          workers[workerId].latency_ms = 15.0;
          addLog('FaultTolerance', `Worker ${workerId} active.`);
        } else if (action === 'slow') {
          workers[workerId].status = 'Straggler';
          workers[workerId].latency_ms = latencyMs || 300.0;
          addLog('Chaos', `Delay added to ${workerId}.`);
        } else {
          workers[workerId].status = 'Active';
          workers[workerId].latency_ms = 15.0;
        }

        const activeWorkers = Object.values(workers).filter(w => w.status !== 'Offline');
        activeWorkers.forEach((w, i) => {
          const startPct = Math.round(i * (100 / activeWorkers.length));
          const endPct = Math.round((i + 1) * (100 / activeWorkers.length));
          workers[w.id].shard = `${startPct}%-${endPct}%`;
        });
      }
      return { ...prev, workers };
    });
  };

  const triggerSingleStep = () => {
    setClusterState(prev => {
      const nextStep = prev.global_step + 1;
      const lastLoss = prev.metrics.loss[prev.metrics.loss.length - 1] || 0.5;
      const nextLoss = Math.max(0.06, lastLoss * 0.965);
      const lastAcc = prev.metrics.accuracy[prev.metrics.accuracy.length - 1] || 85.0;
      const nextAcc = Math.min(98.8, lastAcc + 0.35);

      let stepLatency = 24.5;
      if (prev.compression_mode === 'Top-K') stepLatency = 3.5;
      if (prev.compression_mode === 'FP16') stepLatency = 9.2;

      const updatedWorkers = { ...prev.workers };
      Object.keys(updatedWorkers).forEach(id => {
        if (updatedWorkers[id].status !== 'Offline') {
          updatedWorkers[id].batches_processed += 1;
        }
      });

      return {
        ...prev,
        global_step: nextStep,
        epoch: Math.floor(nextStep / 20),
        workers: updatedWorkers,
        metrics: {
          steps: [...prev.metrics.steps.slice(-49), nextStep],
          loss: [...prev.metrics.loss.slice(-49), parseFloat(nextLoss.toFixed(4))],
          accuracy: [...prev.metrics.accuracy.slice(-49), parseFloat(nextAcc.toFixed(2))],
          latency_ms: [...prev.metrics.latency_ms.slice(-49), parseFloat(stepLatency.toFixed(2))],
          active_workers: [...(prev.metrics.active_workers || []).slice(-49), Object.values(updatedWorkers).filter(w => w.status !== 'Offline').length]
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 font-sans pb-12">
      
      {/* MINIMAL HIGH-CONTRAST HEADER */}
      <header className="border-b border-[#232631] bg-[#15171e] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-[#232631] text-slate-200">
              <Network className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Distributed Machine Learning Architecture</h1>
              <p className="text-xs text-slate-400">3-Layer Cluster Simulator &amp; Real-Time Inference</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 bg-[#1c1f2a] px-3 py-1.5 rounded border border-[#2d3142]">
              <span className="text-slate-400">Step</span>
              <strong className="text-indigo-400">{clusterState.global_step}</strong>
            </div>

            <div className="flex items-center gap-2 bg-[#1c1f2a] px-3 py-1.5 rounded border border-[#2d3142]">
              <span className="text-slate-400">Active Workers</span>
              <strong className="text-emerald-400">
                {Object.values(clusterState.workers).filter(w => w.status !== 'Offline').length}/4
              </strong>
            </div>

            <button
              onClick={() => setIsAutoTraining(!isAutoTraining)}
              className={`px-3.5 py-1.5 rounded font-sans font-medium text-xs flex items-center gap-2 transition-all ${
                isAutoTraining 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
              }`}
            >
              {isAutoTraining ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isAutoTraining ? 'Pause' : 'Train Cluster'}
            </button>
          </div>

        </div>

        {/* Clean minimal navigation tabs */}
        <div className="max-w-7xl mx-auto px-6 flex space-x-6 border-t border-[#232631] pt-1 text-xs">
          {[
            { id: 'topology', label: 'Cluster Topology', icon: Network },
            { id: 'canvas', label: 'Inference Studio', icon: Sparkles },
            { id: 'metrics', label: 'Performance Metrics', icon: Activity },
            { id: 'code', label: 'Architecture & Logs', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 transition-all flex items-center gap-2 border-b-2 font-medium ${
                  isActive 
                    ? 'border-indigo-400 text-indigo-400 font-semibold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        
        {activeTab === 'topology' && (
          <>
            <TopologyGraph state={clusterState} onTriggerChaos={handleTriggerChaos} />
            <FaultChaosPanel 
              state={clusterState}
              onConfigChange={handleConfigChange}
              onTriggerChaos={handleTriggerChaos}
              isAutoTraining={isAutoTraining}
              onToggleAutoTrain={() => setIsAutoTraining(!isAutoTraining)}
              onSingleStep={triggerSingleStep}
            />
          </>
        )}

        {activeTab === 'canvas' && (
          <>
            <DigitCanvas globalStep={clusterState.global_step} />
            <SyncMetrics state={clusterState} />
          </>
        )}

        {activeTab === 'metrics' && (
          <>
            <SyncMetrics state={clusterState} />
            <TopologyGraph state={clusterState} onTriggerChaos={handleTriggerChaos} />
          </>
        )}

        {activeTab === 'code' && (
          <DockerArchitectureInspector logs={logs} />
        )}

      </main>
    </div>
  );
}
