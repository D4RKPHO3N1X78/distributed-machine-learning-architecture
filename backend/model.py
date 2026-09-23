"""
3-Layer Distributed Machine Learning System - Model & Gradient Optimization Module
Handles neural network architecture for MNIST classification, gradient extraction,
Top-K sparsification, FP16 quantization/dequantization, and state serialization.
"""

import math
import numpy as np

class SimpleMNISTNet:
    """
    Multilayer Neural Network for MNIST (784 -> 128 -> 64 -> 10).
    Pure NumPy implementation for high performance without heavy C++ external dependencies,
    enabling lightweight worker execution across diverse containers and environments.
    """
    def __init__(self, seed=42):
        np.random.seed(seed)
        # Xavier/He initialization
        self.W1 = np.random.randn(784, 128) * np.sqrt(2.0 / 784)
        self.b1 = np.zeros((1, 128))
        self.W2 = np.random.randn(128, 64) * np.sqrt(2.0 / 128)
        self.b2 = np.zeros((1, 64))
        self.W3 = np.random.randn(64, 10) * np.sqrt(2.0 / 64)
        self.b3 = np.zeros((1, 10))

    def get_weights(self):
        """Returns weights as a dictionary of NumPy arrays."""
        return {
            'W1': self.W1.copy(),
            'b1': self.b1.copy(),
            'W2': self.W2.copy(),
            'b2': self.b2.copy(),
            'W3': self.W3.copy(),
            'b3': self.b3.copy()
        }

    def set_weights(self, weights_dict):
        """Updates internal weights from dictionary."""
        self.W1 = weights_dict['W1'].copy()
        self.b1 = weights_dict['b1'].copy()
        self.W2 = weights_dict['W2'].copy()
        self.b2 = weights_dict['b2'].copy()
        self.W3 = weights_dict['W3'].copy()
        self.b3 = weights_dict['b3'].copy()

    @staticmethod
    def relu(x):
        return np.maximum(0, x)

    @staticmethod
    def softmax(x):
        exps = np.exp(x - np.max(x, axis=1, keepdims=True))
        return exps / np.sum(exps, axis=1, keepdims=True)

    def forward(self, X):
        """
        Forward pass returning output probabilities and intermediate activations.
        X shape: (N, 784)
        """
        z1 = np.dot(X, self.W1) + self.b1
        a1 = self.relu(z1)
        z2 = np.dot(a1, self.W2) + self.b2
        a2 = self.relu(z2)
        z3 = np.dot(a2, self.W3) + self.b3
        probs = self.softmax(z3)
        
        cache = {'X': X, 'z1': z1, 'a1': a1, 'z2': z2, 'a2': a2, 'z3': z3, 'probs': probs}
        return probs, cache

    def compute_loss(self, probs, y_onehot):
        """Categorical Cross-Entropy Loss."""
        N = probs.shape[0]
        epsilon = 1e-12
        probs_clipped = np.clip(probs, epsilon, 1.0 - epsilon)
        loss = -np.sum(y_onehot * np.log(probs_clipped)) / N
        return loss

    def backward(self, cache, y_onehot):
        """
        Backpropagation returning gradient dictionary.
        """
        N = cache['X'].shape[0]
        dz3 = (cache['probs'] - y_onehot) / N  # (N, 10)
        
        dW3 = np.dot(cache['a2'].T, dz3)
        db3 = np.sum(dz3, axis=0, keepdims=True)
        
        da2 = np.dot(dz3, self.W3.T)
        dz2 = da2 * (cache['z2'] > 0)
        
        dW2 = np.dot(cache['a1'].T, dz2)
        db2 = np.sum(dz2, axis=0, keepdims=True)
        
        da1 = np.dot(dz2, self.W2.T)
        dz1 = da1 * (cache['z1'] > 0)
        
        dW1 = np.dot(cache['X'].T, dz1)
        db1 = np.sum(dz1, axis=0, keepdims=True)
        
        return {
            'W1': dW1, 'b1': db1,
            'W2': dW2, 'b2': db2,
            'W3': dW3, 'b3': db3
        }


# ==============================================================================
# GRADIENT EXCHANGE LATENCY REDUCTION & COMPRESSION UTILITIES
# ==============================================================================

def compress_gradients_top_k(grads_dict, k_ratio=0.10):
    """
    Top-K Sparsification: Keeps only top k% magnitudes of gradients per layer.
    Significantly reduces network payload size and exchange latency.
    """
    compressed = {}
    total_elements = 0
    transmitted_elements = 0

    for k, v in grads_dict.items():
        flat = v.flatten()
        total_elements += flat.size
        num_k = max(1, int(flat.size * k_ratio))
        transmitted_elements += num_k

        # Top K absolute values
        top_indices = np.argpartition(np.abs(flat), -num_k)[-num_k:]
        top_values = flat[top_indices]

        compressed[k] = {
            'indices': top_indices,
            'values': top_values,
            'shape': v.shape
        }

    compression_ratio = 1.0 - (transmitted_elements / max(1, total_elements))
    return compressed, compression_ratio


def decompress_gradients_top_k(compressed_dict):
    """Reconstructs full gradient dictionary from Top-K sparse payload."""
    decompressed = {}
    for k, payload in compressed_dict.items():
        arr = np.zeros(payload['shape'], dtype=np.float32)
        flat = arr.ravel()
        flat[payload['indices']] = payload['values']
        decompressed[k] = arr.reshape(payload['shape'])
    return decompressed


def compress_gradients_fp16(grads_dict):
    """Quantizes float32 gradients to float16 to halve payload size."""
    compressed = {}
    for k, v in grads_dict.items():
        compressed[k] = v.astype(np.float16)
    return compressed, 0.50  # 50% bandwidth reduction


def decompress_gradients_fp16(compressed_dict):
    """Dequantizes float16 gradients back to float32."""
    decompressed = {}
    for k, v in compressed_dict.items():
        decompressed[k] = v.astype(np.float32)
    return decompressed
