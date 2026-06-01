'use client';
import { useState } from 'react';

export default function CheckinButton({ responseId, initial }: { responseId: string; initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, value: !checked }),
      });
      const d = await res.json();
      if (res.ok) setChecked(d.checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`print:hidden w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
        checked
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-brown-900 text-beige-50 hover:opacity-90'
      }`}
    >
      {loading ? '…' : checked ? '✓ Arrivé — annuler le pointage' : 'Pointer comme arrivé'}
    </button>
  );
}
