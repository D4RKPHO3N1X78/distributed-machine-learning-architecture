# 3-Layer Distributed Machine Learning Architecture

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-brightgreen.svg)](https://www.python.org/)
[![Docker Compose](https://img.shields.io/badge/docker--compose-v2.0+-blue.svg)](https://docs.docker.com/compose/)
[![React 18](https://img.shields.io/badge/react-18.2-61dafb.svg)](https://reactjs.org/)

An enterprise-grade, high-performance **3-Layer Distributed Machine Learning System** trained on the MNIST dataset. Built to simulate large-scale worker node synchronization, gradient exchange latency reduction, fault tolerance, and real-time inference.

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                        LAYER 1: INFERENCE & CONTROL PLANE                         |
|  - Interactive Digit Canvas & Inference Studio                                    |
|  - Web UI Cluster Operations Dashboard                                            |
|  - REST / WebSocket Gateway (`/predict`, `/ws/metrics`)                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                   LAYER 2: PARAMETER SERVER & ORCHESTRATOR                        |
|  - Global Weight Manager & Aggregation Protocols                                  |
|  - Sync Modes: Parameter Server, Ring-AllReduce, Async SGD, FedAvg                |
|  - Latency Reduction: Top-K Sparsification (90% cut), FP16 Quantization            |
|  - Fault Tolerance: Heartbeat monitor, Straggler mitigation, Dynamic Auto-Heal    |
+-----------------------------------------------------------------------------------+
                   |                                     |
         +---------+---------+                 +---------+---------+
         |                   |                 |                   |
         v                   v                 v                   v
+------------------+ +------------------+ +------------------+ +------------------+
| LAYER 3: WORKER 1| | LAYER 3: WORKER 2| | LAYER 3: WORKER 3| | LAYER 3: WORKER 4|
| (Docker Node 1)  | | (Docker Node 2)  | | (Docker Node 3)  | | (Docker Node 4)  |
| MNIST Shard 0-25%| | MNIST Shard 25-50| | MNIST Shard 50-75| | MNIST Shard 75-100|
+------------------+ +------------------+ +------------------+ +------------------+
```

---

## ✨ Features

- ⚡ **3-Layer Architecture**: Clean separation between Inference Gateway (L1), Parameter Server / Orchestrator (L2), and Data-Parallel Worker Containers (L3).
- 🔄 **4 Synchronization Protocols**: Switch between Parameter Server, Ring-AllReduce, Asynchronous SGD (with staleness compensation), and Federated Averaging (FedAvg).
- 📉 **Gradient Latency Optimization**: Integrated Top-K sparsification (transmits top 10% gradients) and FP16 half-precision quantization to reduce network overhead by up to 90%.
- 🛡️ **Automated Fault Tolerance & Chaos Testing**: Real-time heartbeat tracking, automated worker dropout recovery, dynamic shard re-balancing, and simulated network latency injection.
- 🎨 **Real-Time Interactive Studio**: Draw digits on live canvas to trigger inference on active distributed model weights with activation maps and latency breakdown.
