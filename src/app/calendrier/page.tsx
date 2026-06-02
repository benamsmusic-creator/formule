'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Form } from '@/lib/types';
import { parseEventDate } from '@/lib/utils';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function CalendrierPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState({ y: 0, m: 0 });

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    fetch('/api/forms').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setForms(d); }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  // Événements (formulaires avec une date) → map jour → events
  const events = forms
    .filter((f) => !f.archived)
    .map((f) => ({ form: f, date: parseEventDate(f.fields.find((x) => x.type === 'event_date')?.presetValue) }))
    .filter((e): e is { form: Form; date: Date } => !!e.date);

  const firstDay = new Date(cursor.y, cursor.m, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const eventsOn = (day: number) => events.filter((e) => e.date.getFullYear() === cursor.y && e.date.getMonth() === cursor.m && e.date.getDate() === day);
  const move = (delta: number) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const today = new Date();

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>Calendrier</h1>
          <Link href="/dashboard" className="text-sm text-brown-500 hover:text-brown-800 transition-colors">← Dashboard</Link>
        </div>

        <div className="rounded-3xl bg-beige-50 border border-beige-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => move(-1)} className="w-9 h-9 rounded-xl border border-beige-200 text-brown-600 hover:bg-beige-100 transition-colors" aria-label="Mois précédent">‹</button>
            <p className="text-lg font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{MONTHS[cursor.m]} {cursor.y}</p>
            <button onClick={() => move(1)} className="w-9 h-9 rounded-xl border border-beige-200 text-brown-600 hover:bg-beige-100 transition-colors" aria-label="Mois suivant">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {DAYS.map((d, i) => <div key={i} className="text-center text-[11px] uppercase tracking-wide text-brown-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const evs = eventsOn(day);
              const isToday = today.getFullYear() === cursor.y && today.getMonth() === cursor.m && today.getDate() === day;
              return (
                <div key={i} className={`min-h-[64px] rounded-xl border p-1.5 ${isToday ? 'border-gold-400 bg-gold-400/5' : 'border-beige-200 bg-beige-50'}`}>
                  <p className={`text-xs mb-1 ${isToday ? 'text-gold-700 font-bold' : 'text-brown-400'}`}>{day}</p>
                  {evs.map((e) => (
                    <Link key={e.form.id} href={`/dashboard/responses/${e.form.id}`}
                      className="block mb-1 px-1.5 py-1 rounded-md bg-gold-400/15 text-gold-700 text-[10px] leading-tight truncate hover:bg-gold-400/25 transition-colors" title={e.form.title}>
                      {e.form.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Prochains événements (liste) */}
        {loaded && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <h2 className="text-lg font-medium text-brown-900 mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Prochains événements</h2>
            <div className="space-y-2">
              {events.filter((e) => e.date.getTime() >= today.setHours(0, 0, 0, 0)).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8).map((e) => (
                <Link key={e.form.id} href={`/dashboard/responses/${e.form.id}`}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-beige-50 border border-beige-200 hover:border-gold-400/40 transition-colors">
                  <span className="text-sm text-brown-900 truncate">{e.form.title}</span>
                  <span className="text-xs text-brown-400 flex-shrink-0">{e.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </Link>
              ))}
              {events.filter((e) => e.date.getTime() >= today.getTime()).length === 0 && (
                <p className="text-sm text-brown-400 text-center py-6">Aucun événement à venir.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
