import React, { useState } from 'react';
import { Terminal, FileCode, Layers, Copy, Check } from 'lucide-react';

const CODE_SNIPPETS = {
  'docker-compose.yml': `version: '3.8'

services:
  # Layer 2 Parameter Server & Layer 1 Gateway
  master:
    build:
      context: .
      dockerfile: Dockerfile.master
    container_name: dml-parameter-server
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - SYNC_STRATEGY=Parameter Server
      - COMPRESSION_MODE=Top-K

  # Layer 3 Containerized Data-Parallel Workers
  worker-1:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: dml-worker-1
    environment:
      - WORKER_ID=worker-1
      - MASTER_URL=http://master:8000
    depends_on:
      - master

  worker-2:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: dml-worker-2
    environment:
      - WORKER_ID=worker-2
      - MASTER_URL=http://master:8000
    depends_on:
      - master`,

  'Dockerfile.master': `FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl build-essential
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/
EXPOSE 8000
ENV PYTHONUNBUFFERED=1

CMD ["python", "server.py"]`,

  'master.py (Layer 2)': `class ParameterServerMaster:
    """
    Layer 2 Parameter Server & Cluster Orchestrator.
    Handles gradient aggregation across Parameter Server, Ring-AllReduce,
    Async SGD, and FedAvg protocols.
    """
    def receive_gradient_update(self, worker_id, gradient_payload, worker_step):
        with self.lock:
            self.update_heartbeat(worker_id)
            
            # Decompress gradients (Top-K Sparsification / FP16 Quantization)
            grads = decompress_gradients(gradient_payload)
            
            # Apply barrier lock or async SGD update
            if self.sync_strategy == "Async SGD":
                staleness = max(0, self.global_step - worker_step)
                damped_lr = self.learning_rate / (1.0 + 0.5 * staleness)
                self.apply_sgd_step(grads, damped_lr)
            else:
                self.gradient_buffer[worker_id] = grads
                if len(self.gradient_buffer) >= len(self.active_workers):
                    self.aggregate_and_step()`,

  'model.py (Compression)': `def compress_gradients_top_k(grads_dict, k_ratio=0.10):
    """
    Top-K Sparsification: Transmits top 10% magnitude gradients.
    Reduces gradient exchange network overhead by ~90%.
    """
    compressed = {}
    for k, v in grads_dict.items():
        flat = v.flatten()
        num_k = max(1, int(flat.size * k_ratio))
        top_indices = np.argpartition(np.abs(flat), -num_k)[-num_k:]
        compressed[k] = {
            'indices': top_indices,
            'values': flat[top_indices],
            'shape': v.shape
        }
    return compressed, 0.90`
};

export default function DockerArchitectureInspector({ logs }) {
  const [activeTab, setActiveTab] = useState('docker-compose.yml');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeTab] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Docker Container &amp; Architecture Workbench</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inspect Docker manifests, python parameter server implementation, and real-time cluster event logs.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          {copied ? 'Copied' : 'Copy Snippet'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Code File Inspector */}
        <div className="md:col-span-7 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          {/* File Tab Strip */}
          <div className="flex border-b border-slate-800 bg-slate-900/80 overflow-x-auto">
            {Object.keys(CODE_SNIPPETS).map((file) => (
              <button
                key={file}
                onClick={() => setActiveTab(file)}
                className={`px-4 py-2.5 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === file 
                    ? 'border-purple-400 text-white bg-slate-950 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                {file}
              </button>
            ))}
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-auto max-h-[320px] leading-relaxed selection:bg-purple-900 selection:text-white">
            <code>{CODE_SNIPPETS[activeTab]}</code>
          </pre>
        </div>

        {/* Live Event Stream / Cluster Terminal Logs */}
        <div className="md:col-span-5 bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Cluster Event Stream &amp; Heartbeat Logs
            </h3>

            <div className="space-y-2 font-mono text-[11px] max-h-[280px] overflow-y-auto pr-1">
              {(logs && logs.length > 0 ? logs : [
                { time: '06:26:42', tag: 'ParameterServer', msg: 'Layer 2 Master initialized. Listening on port 8000.' },
                { time: '06:26:43', tag: 'DockerCluster', msg: 'Container worker-1 attached. Shard [0%-25%].' },
                { time: '06:26:43', tag: 'DockerCluster', msg: 'Container worker-2 attached. Shard [25%-50%].' },
                { time: '06:26:44', tag: 'DockerCluster', msg: 'Container worker-3 attached. Shard [50%-75%].' },
                { time: '06:26:44', tag: 'DockerCluster', msg: 'Container worker-4 attached. Shard [75%-100%].' },
                { time: '06:26:45', tag: 'FaultTolerance', msg: 'Heartbeat ping verified across 4 worker nodes.' },
                { time: '06:26:48', tag: 'SyncProtocol', msg: 'Barrier lock released for global step 1.' }
              ]).map((log, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-500 shrink-0">{log.time}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-cyan-300 font-semibold shrink-0">
                    {log.tag}
                  </span>
                  <span className="text-slate-300 leading-tight">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Status: Healthy</span>
            <span>Container Driver: docker-compose</span>
          </div>
        </div>

      </div>
    </div>
  );
}
