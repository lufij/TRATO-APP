import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import AuthLogsViewer from './AuthLogsViewer';

export default function DiagnosticProbe() {
  const [logs, setLogs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const append = (m: string) => setLogs((s) => [...s, `${new Date().toISOString()} - ${m}`]);

  useEffect(() => {
    (async () => {
      append('Starting diagnostic probe');

      try {
        const sess = await supabase.auth.getSession();
        append(`getSession: ${sess?.data?.session ? 'session present' : 'no session'}`);
      } catch (e) {
        append(`getSession error: ${(e as any)?.message || String(e)}`);
      }

      try {
        const user = await supabase.auth.getUser();
        append(`getUser: ${user?.data?.user ? 'user present' : 'no user'}`);
      } catch (e) {
        append(`getUser error: ${(e as any)?.message || String(e)}`);
      }

      try {
        // Try to read a small piece of data via PostgREST to surface RLS errors
        const { data, error, status } = await supabase
          .from('users')
          .select('id,email')
          .limit(1);

        if (error) {
          append(`select users error: code=${(error as any)?.code} msg=${error.message}`);
        } else {
          append(`select users OK: rows=${Array.isArray(data) ? data.length : 0}`);
        }
      } catch (e) {
        append(`select users exception: ${(e as any)?.message || String(e)}`);
      }

      try {
        const { data: pData, error: pErr } = await supabase
          .from('products')
          .select('id,name,is_public')
          .limit(2);
        if (pErr) append(`select products error: code=${(pErr as any)?.code} msg=${pErr.message}`);
        else append(`select products OK: rows=${(pData as any)?.length ?? 0}`);
      } catch (e) {
        append(`select products exception: ${(e as any)?.message || String(e)}`);
      }

      append('Diagnostic probe completed');
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white p-4">
      <h2 className="text-lg font-semibold mb-2">Diagnostic Probe</h2>
      <div className="bg-gray-50 border rounded p-3 font-mono text-sm">
        {logs.map((l, i) => (
          <div key={i} className="mb-1">{l}</div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={async () => {
            setSending(true);
            setSendResult(null);
            try {
              const res = await fetch('/api/diagnostics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-diag-secret': prompt('Enter diagnostic secret from Vercel (VERCEL_DIAG_SECRET):') || '' },
                body: JSON.stringify({ payload: logs, origin: window.location.href }),
              });
              const j = await res.json();
              setSendResult(JSON.stringify(j));
            } catch (e) {
              setSendResult((e as any)?.message || String(e));
            } finally {
              setSending(false);
            }
          }}
          disabled={sending}
        >
          {sending ? 'Enviando...' : 'Enviar diagnóstico'}
        </button>
        {sendResult && <div className="text-sm text-gray-600">{sendResult}</div>}
      </div>
  <div className="mt-4 text-sm text-gray-600">Open browser console for network details (auth/postgrest requests).</div>
  <AuthLogsViewer />
    </div>
  );
}
