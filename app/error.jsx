'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#eef0ff', marginBottom: 8 }}>Something went wrong</div>
      <div style={{ fontSize: 12, color: '#ef4444', background: '#450a0a', border: '1px solid #ef444444', borderRadius: 10, padding: '10px 14px', marginBottom: 16, maxWidth: 340, wordBreak: 'break-word', textAlign: 'left' }}>
        <strong>Error:</strong> {error?.message || String(error)}
      </div>
      {error?.stack && (
        <pre style={{ fontSize: 9, color: '#7a85a0', background: '#111421', border: '1px solid #1c2035', borderRadius: 8, padding: 10, maxWidth: 340, overflow: 'auto', textAlign: 'left', marginBottom: 14 }}>
          {error.stack}
        </pre>
      )}
      <button onClick={reset} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  );
}
