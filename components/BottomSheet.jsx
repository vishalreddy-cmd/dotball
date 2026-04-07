'use client';

export default function BottomSheet({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="sheet-enter"
        style={{
          width: '100%', maxWidth: 430, margin: '0 auto',
          background: '#111421', borderRadius: '20px 20px 0 0',
          border: '1px solid #1c2035',
          padding: '6px 18px',
          paddingBottom: 'max(32px, calc(18px + env(safe-area-inset-bottom)))',
          maxHeight: '92vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#1c2035', margin: '10px auto 14px' }} />
        {children}
      </div>
    </div>
  );
}
