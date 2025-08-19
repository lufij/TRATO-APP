import React from 'react';

export function ConnectionErrorModal({ open, onClose, onRetry, onEnableOffline }: {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  onEnableOffline: () => void;
}) {
  if (!open) return null;
  // Non-visual placeholder: keep structure but render minimally to avoid UI shifts
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, width: 360, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Problema de conexión</div>
        <div style={{ color: '#4b5563', fontSize: 14, marginBottom: 12 }}>No se pudo conectar al servidor.</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onEnableOffline} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Modo offline</button>
          <button onClick={onRetry} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Reintentar</button>
          <button onClick={onClose} style={{ padding: '6px 10px', borderRadius: 8, background: '#f97316', color: '#fff' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
