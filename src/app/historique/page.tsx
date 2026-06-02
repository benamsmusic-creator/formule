'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

type Log = { id: string; action: string; detail: string; created_at: string };

export default function HistoriquePage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/audit').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLogs(d); }).finally(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Historique</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        {!loaded ? <p className="text-brown-400 text-sm">Chargement…</p> : logs.length === 0 ? (
          <p className="text-brown-400 text-sm text-center py-8">Aucune action enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-beige-50 border border-beige-200">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brown-900">{l.action}</p>
                  {l.detail && <p className="text-xs text-brown-400 truncate">{l.detail}</p>}
                </div>
                <span className="text-xs text-brown-300 whitespace-nowrap flex-shrink-0">{formatDate(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
