"""
3-Layer Distributed Machine Learning System - Layer 1 REST & WebSocket Gateway Server
Provides REST endpoints for real-time inference (/predict), training control,
chaos engineering injection, and WebSocket live metrics streaming.
"""

import time
import asyncio
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from master import ParameterServerMaster
from worker import DistributedWorkerNode

app = FastAPI(
    title="Distributed Machine Learning Architecture API",
    description="3-Layer System for MNIST Worker Synchronization & Real-Time Inference",
    version="1.0.0"
)

# Enable CORS for frontend web app integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Layer 2 Master Orchestrator
master = ParameterServerMaster(num_workers=4, sync_strategy="Parameter Server", compression_mode="None")

# Initialize Layer 3 Workers (in-memory simulation pool for instant browser / non-docker execution)
worker_nodes = {
    f"worker-{i}": DistributedWorkerNode(worker_id=f"worker-{i}")
    for i in range(1, 5)
}

# Auto-training background task flag
auto_train_running = False


# ==============================================================================
# DATA MODELS
# ==============================================================================

class InferenceRequest(BaseModel):
    pixels: List[float]  # 784 normalized grayscale float array (28x28)

class ConfigRequest(BaseModel):
    sync_strategy: Optional[str] = "Parameter Server"  # Parameter Server, Ring-AllReduce, Async SGD, FedAvg
    compression_mode: Optional[str] = "None"          # None, Top-K, FP16
    learning_rate: Optional[float] = 0.01
    num_workers: Optional[int] = 4

class ChaosRequest(BaseModel):
    worker_id: str
    action: str  # "kill", "recover", "slow", "normal"
    latency_ms: Optional[float] = 15.0


# ==============================================================================
# LAYER 1 INFERENCE & REST ENDPOINTS
# ==============================================================================

@app.get("/")
def read_root():
    return {
        "system": "3-Layer Distributed Machine Learning Architecture",
        "status": "Online",
        "layer_1_gateway": "Active",
        "layer_2_parameter_server": master.sync_strategy,
        "layer_3_active_workers": sum(1 for w in master.workers.values() if w['status'] != 'Offline')
    }

@app.post("/predict")
def predict_digit(req: InferenceRequest):
    """
    Layer 1 Real-Time Inference API.
    Receives 784 pixel array from digit canvas, runs forward pass through global model.
    Returns prediction, probabilities, activation snapshots, and inference latency.
    """
    start_time = time.time()
    
    if len(req.pixels) != 784:
        raise HTTPException(status_code=400, detail="Expected 784 flat pixels (28x28 image).")

    X = np.array(req.pixels, dtype=np.float32).reshape(1, 784)
    
    # Run forward pass through current Layer 2 global model weights
    probs, cache = master.model.forward(X)
    probs_list = probs[0].tolist()
    pred_label = int(np.argmax(probs_list))
    
    latency_ms = (time.time() - start_time) * 1000.0
    
    # Extract layer activation summaries for visual debugger
    a1_activations = cache['a1'][0][:16].tolist()  # First 16 neurons of layer 1
    a2_activations = cache['a2'][0][:16].tolist()  # First 16 neurons of layer 2

    return {
        "prediction": pred_label,
        "confidence": round(float(probs_list[pred_label]) * 100.0, 2),
        "probabilities": [round(float(p), 4) for p in probs_list],
        "activations": {
            "layer1_sample": [round(float(v), 3) for v in a1_activations],
            "layer2_sample": [round(float(v), 3) for v in a2_activations]
        },
        "latency_ms": round(latency_ms, 3),
        "global_step": master.global_step
    }

@app.post("/train/step")
def trigger_training_step():
    """
    Triggers one distributed training iteration across active Layer 3 workers.
    Gradients are calculated locally, compressed, and submitted to Layer 2 Master.
    """
    state = master.get_cluster_state()
    active_workers = [w_id for w_id, info in state['workers'].items() if info['status'] != 'Offline']
    
    results = []
    for w_id in active_workers:
        w_node = worker_nodes.get(w_id)
        if w_node:
            step_res = w_node.compute_step(master.global_weights, compression_mode=master.compression_mode)
            updated, new_weights, current_step = master.receive_gradient_update(
                worker_id=w_id,
                gradient_payload=step_res['payload'],
                worker_step=step_res['local_step'],
                compression_type=master.compression_mode
            )
            results.append({
                'worker_id': w_id,
                'loss': step_res['loss'],
                'savings_pct': step_res['savings_pct']
            })

    return {
        "status": "Success",
        "global_step": master.global_step,
        "worker_results": results,
        "cluster_state": master.get_cluster_state()
    }

@app.post("/train/start")
def start_auto_training():
    global auto_train_running
    auto_train_running = True
    return {"status": "Auto-training started"}

@app.post("/train/stop")
def stop_auto_training():
    global auto_train_running
    auto_train_running = False
    return {"status": "Auto-training stopped"}

@app.post("/config")
def update_cluster_config(config: ConfigRequest):
    """Updates Layer 2 synchronization protocol and compression settings."""
    if config.sync_strategy:
        master.sync_strategy = config.sync_strategy
    if config.compression_mode:
        master.compression_mode = config.compression_mode
    if config.learning_rate:
        master.learning_rate = config.learning_rate
        
    return {
        "status": "Configuration updated",
        "sync_strategy": master.sync_strategy,
        "compression_mode": master.compression_mode,
        "learning_rate": master.learning_rate
    }

@app.post("/chaos/worker")
def apply_chaos(req: ChaosRequest):
    """
    Fault Tolerance & Chaos Testing API.
    Allows killing, slowing down, or recovering containerized worker nodes.
    """
    if req.worker_id not in master.workers:
        raise HTTPException(status_code=404, detail=f"Worker {req.worker_id} not found")
        
    w_info = master.workers[req.worker_id]
    
    if req.action == "kill":
        w_info['status'] = "Offline"
    elif req.action == "recover":
        w_info['status'] = "Active"
        w_info['last_heartbeat'] = time.time()
    elif req.action == "slow":
        w_info['status'] = "Straggler"
        w_info['latency_ms'] = req.latency_ms or 250.0
        if req.worker_id in worker_nodes:
            worker_nodes[req.worker_id].is_straggler = True
    elif req.action == "normal":
        w_info['status'] = "Active"
        w_info['latency_ms'] = 15.0
        if req.worker_id in worker_nodes:
            worker_nodes[req.worker_id].is_straggler = False
            
    master.check_fault_tolerance()
    return {
        "status": "Chaos action applied",
        "worker_id": req.worker_id,
        "worker_state": master.workers[req.worker_id]
    }

@app.get("/cluster/state")
def get_cluster_state():
    return master.get_cluster_state()


# ==============================================================================
# WEBSOCKET STREAM FOR LIVE DASHBOARD
# ==============================================================================

@app.websocket("/ws/cluster")
async def websocket_cluster_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # If auto-training is toggled, perform step
            if auto_train_running:
                trigger_training_step()
                
            state = master.get_cluster_state()
            await websocket.send_json(state)
            await asyncio.sleep(0.3)
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")


if __name__ == "__main__":
    import uvicorn
    print("[Layer 1 Gateway] Starting server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
