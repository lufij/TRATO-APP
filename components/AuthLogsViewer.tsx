import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthLogsViewer() {
  const { authLogs } = useAuth();

  return (
    <div className="mt-4 bg-white border rounded p-3">
      <h3 className="font-semibold mb-2">Auth Logs</h3>
      <div className="font-mono text-sm max-h-48 overflow-auto">
        {authLogs && authLogs.length > 0 ? (
          authLogs.map((l, i) => <div key={i} className="mb-1">{l}</div>)
        ) : (
          <div className="text-gray-500">No auth logs yet.</div>
        )}
      </div>
    </div>
  );
}
