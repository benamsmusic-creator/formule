'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import '@hebcal/locales';
import { HebrewCalendar, Location, HDate } from '@hebcal/core';

const LYON = new Location(45.764043, 4.835659, false, 'Europe/Paris', 'Lyon', 'FR');

type ShabbatInfo = {
  hebrewDate: string;
  parasha: string;
  candleDate: string;
  candleTime: string;
  havdalahDate: string;
  havdalahTime: string;
};
type Holiday = { date: string; name: string };

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

function computeData(): { shabbat: ShabbatInfo; holidays: Holiday[] } {
  const now = new Date();
  const hd = new HDate(now);

  // Prochain Chabbat (bougies + havdalah + parachah) sur les 9 prochains jours
  const weekEvents = HebrewCalendar.calendar({
    start: now,
    end: new Date(now.getTime() + 9 * 24 * 3600 * 1000),
    location: LYON,
    candlelighting: true,
    sedrot: true,
    locale: 'fr',
  });

  let candleTime = '', candleDate = '', havdalahTime = '', havdalahDate = '', parasha = '';
  for (const ev of weekEvents) {
    const cats = ev.getCategories();
    const g = ev.getDate().greg();
    const evTime = (ev as unknown as { eventTime?: Date }).eventTime;
    if (!candleTime && cats.includes('candles') && evTime) {
      candleTime = fmtTime(evTime); candleDate = fmtDate(g);
    } else if (!havdalahTime && cats.includes('havdalah') && evTime) {
      havdalahTime = fmtTime(evTime); havdalahDate = fmtDate(g);
    } else if (!parasha && cats.includes('parashat')) {
      parasha = ev.render('fr').replace(/^Parachah\s*/i, '');
    }
  }

  // Prochaines fêtes (120 jours)
  const holidayEvents = HebrewCalendar.calendar({
    start: now,
    end: new Date(now.getTime() + 120 * 24 * 3600 * 1000),
    location: LYON,
    locale: 'fr',
  });
  const holidays: Holiday[] = [];
  for (const ev of holidayEvents) {
    if (ev.getCategories().includes('holiday') && holidays.length < 6) {
      holidays.push({ date: fmtDate(ev.getDate().greg()), name: ev.render('fr') });
    }
  }

  return {
    shabbat: {
      hebrewDate: hd.render('fr'),
      parasha: parasha || '—',
      candleDate, candleTime, havdalahDate, havdalahTime,
    },
    holidays,
  };
}

export default function HorairesPage() {
  const [data, setData] = useState<ReturnType<typeof computeData> | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(computeData());
    } catch { /* hebcal indisponible — on garde l'écran de chargement */ }
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Horaires de <em className="gradient-text not-italic">Chabbat</em>
          </h1>
          <p className="text-brown-500 text-sm">Lyon · calculés automatiquement</p>
          {data && (
            <p className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-700 text-xs font-medium">
              📅 {data.shabbat.hebrewDate}
            </p>
          )}
        </motion.div>

        {!data ? (
          <div className="flex justify-center py-24">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Prochain Chabbat */}
            <motion.div
              className="rounded-3xl bg-beige-50 border border-beige-200 overflow-hidden mb-8"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
            >
              <div className="h-1 bg-gradient-to-r from-gold-400/60 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <p className="text-xs uppercase tracking-widest text-brown-400 mb-1">Parachah de la semaine</p>
                  <p className="text-2xl font-medium text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    {data.shabbat.parasha}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-beige-100 text-center">
                    <div className="text-2xl mb-2" aria-hidden="true">🕯️</div>
                    <p className="text-xs uppercase tracking-wide text-brown-400 mb-1">Allumage des bougies</p>
                    <p className="text-3xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      {data.shabbat.candleTime || '—'}
                    </p>
                    <p className="text-xs text-brown-500 capitalize">{data.shabbat.candleDate}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-beige-100 text-center">
                    <div className="text-2xl mb-2" aria-hidden="true">✨</div>
                    <p className="text-xs uppercase tracking-wide text-brown-400 mb-1">Havdalah (sortie)</p>
                    <p className="text-3xl font-light text-brown-900 mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      {data.shabbat.havdalahTime || '—'}
                    </p>
                    <p className="text-xs text-brown-500 capitalize">{data.shabbat.havdalahDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Prochaines fêtes */}
            {data.holidays.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2 className="text-2xl font-light text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Prochaines fêtes
                </h2>
                <div className="space-y-2">
                  {data.holidays.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-beige-50 border border-beige-200">
                      <span className="text-brown-800 font-medium">{h.name}</span>
                      <span className="text-sm text-brown-500 capitalize whitespace-nowrap">{h.date}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-brown-400 hover:text-brown-700 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
