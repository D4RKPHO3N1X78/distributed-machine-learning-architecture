"""
3-Layer Distributed Machine Learning System - Layer 3 Containerized Worker Node
Executes local mini-batch training iterations on MNIST dataset shards,
computes gradients, applies Top-K/FP16 compression, sends payloads to Layer 2 Master,
and sends periodic fault-tolerance heartbeats.
"""

import time
import os
import sys
import numpy as np
from model import SimpleMNISTNet, compress_gradients_top_k, compress_gradients_fp16

class DistributedWorkerNode:
    """
    Layer 3 Data-Parallel Worker Node.
    Designed for container execution inside Docker node instances.
    """
    def __init__(self, worker_id=None, master_url="http://master:8000"):
        self.worker_id = worker_id or os.getenv("WORKER_ID", "worker-1")
        self.master_url = master_url
        self.local_model = SimpleMNISTNet()
        self.local_step = 0
        self.batch_size = 32
        self.is_running = False
        
        # Fault injection simulation parameters
        self.simulated_latency_ms = float(os.getenv("NETWORK_LATENCY_MS", 15.0))
        self.is_straggler = os.getenv("IS_STRAGGLER", "false").lower() == "true"
        
        print(f"[WorkerNode {self.worker_id}] Initialized. Target Master: {self.master_url}")

    def generate_mnist_shard_batch(self, seed_offset=0):
        """Generates synthetic batch representing this worker's assigned MNIST data shard."""
        np.random.seed(int(time.time() * 1000) % 100000 + seed_offset)
        X_batch = np.random.randn(self.batch_size, 784)
        labels = np.random.randint(0, 10, self.batch_size)
        y_batch = np.zeros((self.batch_size, 10))
        y_batch[np.arange(self.batch_size), labels] = 1.0
        return X_batch, y_batch

    def compute_step(self, global_weights, compression_mode="None"):
        """
        1. Updates local weights to match active global weights.
        2. Performs forward & backward pass over local dataset batch.
        3. Applies gradient compression (Top-K Sparsification / FP16 Quantization).
        4. Returns compressed payload ready for network exchange.
        """
        self.local_model.set_weights(global_weights)
        
        # Simulate straggler computation delay if enabled
        if self.is_straggler:
            time.sleep(0.20)
            
        X_batch, y_batch = self.generate_mnist_shard_batch(seed_offset=self.local_step)
        
        # Forward pass
        probs, cache = self.local_model.forward(X_batch)
        loss = self.local_model.compute_loss(probs, y_batch)
        
        # Backward pass -> gradients
        raw_grads = self.local_model.backward(cache, y_batch)
        
        # Compression
        savings_pct = 0.0
        if compression_mode == "Top-K":
            compressed_grads, savings_pct = compress_gradients_top_k(raw_grads, k_ratio=0.10)
        elif compression_mode == "FP16":
            compressed_grads, savings_pct = compress_gradients_fp16(raw_grads)
        else:
            compressed_grads = raw_grads

        self.local_step += 1
        
        return {
            'worker_id': self.worker_id,
            'local_step': self.local_step,
            'loss': float(loss),
            'payload': compressed_grads,
            'compression_mode': compression_mode,
            'savings_pct': savings_pct * 100.0,
            'latency_ms': self.simulated_latency_ms
        }

if __name__ == "__main__":
    worker_id = sys.argv[1] if len(sys.argv) > 1 else "worker-1"
    worker = DistributedWorkerNode(worker_id=worker_id)
    print(f"Worker {worker_id} container ready.")
