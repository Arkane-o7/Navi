'use client';

import React from 'react';
import type { UserMemory } from '@/lib/types';

interface MemoryPanelProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  memories: UserMemory[];
  onClose: () => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export default function MemoryPanel({
  isOpen,
  isLoading,
  error,
  memories,
  onClose,
  onRefresh,
  onDelete,
}: MemoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="memory-overlay" role="dialog" aria-modal="true" aria-label="Memory manager">
      <div className="memory-panel">
        <div className="memory-panel-header">
          <div>
            <h3>Long-term memory</h3>
            <p>Review and remove what Navi remembers about you.</p>
          </div>
          <div className="memory-panel-actions">
            <button className="memory-btn" onClick={onRefresh} disabled={isLoading}>
              Refresh
            </button>
            <button className="memory-btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {error && <div className="memory-error">{error}</div>}

        <div className="memory-list">
          {isLoading && memories.length === 0 ? (
            <div className="memory-empty">Loading memories…</div>
          ) : memories.length === 0 ? (
            <div className="memory-empty">No saved memory yet.</div>
          ) : (
            memories.map((memory) => (
              <div className="memory-item" key={memory.id}>
                <div className="memory-item-content">
                  <div className="memory-item-meta">
                    <span className="memory-chip">{memory.memoryType}</span>
                    <span className="memory-date">{new Date(memory.updatedAt).toLocaleString()}</span>
                  </div>
                  <p>{memory.content}</p>
                </div>
                <button className="memory-delete" onClick={() => onDelete(memory.id)}>
                  Forget
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
