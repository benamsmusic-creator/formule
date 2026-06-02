'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Form, FormResponse } from '@/lib/types';

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [tables, setTables] = useState<Record<string, number | ''>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/forms/${id}`).then((r) => r.json()).then((d: Form) => {
      if (d?.id) {
        setForm(d);
        setTables(Object.fromEntries((d.responses ?? []).map((r) => [r.id, r.tableNumber ?? ''])));
      }
    }).finally(() => setLoaded(true));
  }, [id]);

  const setTable = async (rid: string, val: string) => {
    const num = val === '' ? '' : parseInt(val, 10);
    setTables((t) => ({ ...t, [rid]: Number.isNaN(num as number) ? '' : num }));
    await fetch('/api/assign-table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responseId: rid, tableNumber: val === '' ? null : num }) }).catch(() => {});
  };

  const name = (r: FormResponse) => (r.data._fullName as string) || `${r.data._firstName ?? ''} ${r.data._lastName ?? ''}`.trim() || 'Invité';
  const responses = form?.responses ?? [];

  // Regroupement par table pour la vue d'ensemble
  const byTable: Record<string, FormResponse[]> = {};
  responses.forEach((r) => {
    const n = tables[r.id];
    if (n === '' || n == null) return;
    (byTable[String(n)] ??= []).push(r);
  });
  const tableNums = Object.keys(byTable).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Plan de salle</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        {!loaded ? <p className="text-brown-400 text-sm">Chargement…</p> : !form ? (
          <p className="text-brown-400 text-sm">Formulaire introuvable.</p>
        ) : (
          <>
            <p className="text-brown-500 text-sm mb-6">{form.title} — attribuez un numéro de table à chaque inscrit.</p>

            {/* Vue d'ensemble par table */}
            {tableNums.length > 0 && (
              <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tableNums.map((n) => (
                  <div key={n} className="p-4 rounded-2xl bg-beige-50 border border-beige-200">
                    <p className="text-sm font-semibold text-brown-900 mb-1">Table {n} <span className="text-xs text-brown-400">({byTable[n].length})</span></p>
                    {byTable[n].map((r) => <p key={r.id} className="text-xs text-brown-500 truncate">{name(r)}</p>)}
                  </div>
                ))}
              </div>
            )}

            {/* Attribution */}
            <div className="space-y-2">
              {responses.length === 0 ? <p className="text-brown-400 text-sm">Aucun inscrit.</p> : responses.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-beige-50 border border-beige-200">
                  <p className="text-sm text-brown-900 truncate">{name(r)}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-brown-400">Table</span>
                    <input type="number" min="1" value={tables[r.id] ?? ''} onChange={(e) => setTable(r.id, e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg bg-beige-100 border border-beige-200 text-brown-900 text-sm text-center focus:outline-none focus:border-gold-400" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
