'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#08090f', color: '#eef0ff', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: '#ef4444', background: '#450a0a', border: '1px solid #ef444444', borderRadius: 10, padding: '12px 16px', marginBottom: 16, maxWidth: 380, wordBreak: 'break-word', textAlign: 'left' }}>
          <strong>Error:</strong> {error?.message || String(error)}
        </div>
        {error?.stack && (
          <pre style={{ fontSize: 10, color: '#7a85a0', background: '#111421', border: '1px solid #1c2035', borderRadius: 10, padding: 12, maxWidth: 380, overflow: 'auto', textAlign: 'left', marginBottom: 16 }}>
            {error.stack}
          </pre>
        )}
        <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
