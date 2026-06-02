'use client';
import { useState, useEffect } from 'react';

type Item = { id: string; title: string; current_bid: number; current_bidder: string; closed: boolean };

export default function AuctionSection({ org }: { org: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [bidName, setBidName] = useState('');
  const [bidAmount, setBidAmount] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  const load = () => { fetch(`/api/auction?org=${encodeURIComponent(org)}`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setItems(d); }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [org]);

  const bid = async (id: string) => {
    setErr((e) => ({ ...e, [id]: '' }));
    const res = await fetch('/api/auction', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, name: bidName, amount: bidAmount[id] }),
    });
    const d = await res.json();
    if (!res.ok) { setErr((e) => ({ ...e, [id]: d.error ?? 'Erreur' })); return; }
    setBidAmount((a) => ({ ...a, [id]: '' }));
    load();
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-16 max-w-2xl mx-auto">
      <h2 className="text-2xl font-light text-brown-900 mb-1 text-center" style={{ fontFamily: 'var(--font-cormorant)' }}>Enchères de mitzvot 🔨</h2>
      <p className="text-xs text-brown-400 mb-5 text-center">Renchérissez pour soutenir la communauté.</p>
      <input
        value={bidName} onChange={(e) => setBidName(e.target.value)} placeholder="Votre nom (pour enchérir)"
        className="w-full mb-4 px-4 py-2.5 rounded-xl bg-beige-50 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400"
      />
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="p-4 rounded-2xl bg-beige-50 border border-beige-200">
            <p className="font-medium text-brown-900">{it.title}</p>
            <p className="text-xs text-brown-500 mb-3">
              {it.current_bid > 0 ? <>Meilleure offre : <span className="font-semibold text-gold-700">{it.current_bid} €</span> ({it.current_bidder})</> : 'Aucune offre — soyez le premier !'}
            </p>
            {!it.closed && (
              <div className="flex gap-2">
                <input type="number" min="1" placeholder="Votre offre €" value={bidAmount[it.id] ?? ''}
                  onChange={(e) => setBidAmount((a) => ({ ...a, [it.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400" />
                <button onClick={() => bid(it.id)} disabled={!bidName || !bidAmount[it.id]}
                  className="px-4 py-2 rounded-lg bg-brown-900 text-beige-50 text-sm font-medium disabled:opacity-40">Enchérir</button>
              </div>
            )}
            {err[it.id] && <p className="text-xs text-red-500 mt-1">{err[it.id]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
