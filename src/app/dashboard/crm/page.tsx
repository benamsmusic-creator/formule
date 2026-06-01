'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Form, FormResponse } from '@/lib/types';
import { exportContactsToCSV } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────── */
interface EventSummary {
  formId: string;
  title: string;
  eventDate: string | null;
  isPast: boolean;
  venue: string | null;
  totalParticipants: number;
  waitlistCount: number;
  totalRevenue: number;
  responses: FormResponse[];
}

interface ContactCard {
  key: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  events: { formId: string; title: string; date: string | null; amount: number }[];
  totalEvents: number;
  totalRevenue: number;
}

/* ─── Helpers ───────────────────────────────────────────────── */
function parseEventDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  // Formats courants: "Samedi 14 juin 2025", "14/06/2025", "2025-06-14"
  const iso = Date.parse(raw);
  if (!isNaN(iso)) return new Date(iso);
  // ex: "Samedi 14 juin 2025"
  const months: Record<string, number> = {
    janvier:0,février:1,mars:2,avril:3,mai:4,juin:5,
    juillet:6,août:7,septembre:8,octobre:9,novembre:10,décembre:11,
  };
  const m = raw.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) {
    const month = months[m[2]];
    if (month !== undefined) return new Date(Number(m[3]), month, Number(m[1]));
  }
  return null;
}

function formatShortDate(raw: string | null): string {
  if (!raw) return '—';
  const d = parseEventDate(raw);
  if (!d) return raw;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStr(data: Record<string, string | boolean>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

/* ─── Event Card ────────────────────────────────────────────── */
function EventCard({ ev, index }: { ev: EventSummary; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border overflow-hidden ${
        ev.isPast
          ? 'bg-beige-50 border-beige-200 opacity-70'
          : 'bg-white border-gold-400/30 shadow-sm shadow-gold-400/10'
      }`}
    >
      {/* Barre supérieure */}
      <div className={`h-1 w-full ${ev.isPast ? 'bg-beige-300' : 'bg-gradient-to-r from-gold-400 to-gold-300'}`} />

      <div className="p-4">
        {/* Badge + titre */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${
              ev.isPast
                ? 'bg-beige-200 text-brown-400'
                : 'bg-gold-400/15 text-gold-700'
            }`}>
              {ev.isPast ? 'Passé' : 'À venir'}
            </span>
            <h3
              className="text-lg font-medium text-brown-900 leading-tight"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              {ev.title}
            </h3>
            {ev.eventDate && (
              <p className="text-xs text-brown-400 mt-0.5">📅 {formatShortDate(ev.eventDate)}</p>
            )}
            {ev.venue && (
              <p className="text-xs text-brown-400 mt-0.5">📍 {ev.venue}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-beige-100 p-3 text-center">
            <p className="text-xl font-semibold text-brown-900">{ev.totalParticipants}</p>
            <p className="text-[10px] text-brown-400 uppercase tracking-wide">
              Participants{ev.waitlistCount > 0 ? ` · ${ev.waitlistCount} en attente` : ''}
            </p>
          </div>
          <div className="rounded-xl bg-beige-100 p-3 text-center">
            <p className="text-xl font-semibold text-brown-900">
              {ev.totalRevenue > 0 ? `${ev.totalRevenue} €` : '—'}
            </p>
            <p className="text-[10px] text-brown-400 uppercase tracking-wide">Revenus</p>
          </div>
        </div>

        {/* Toggle liste */}
        {ev.responses.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full py-2 rounded-xl text-xs text-brown-500 hover:text-brown-800 bg-beige-100 hover:bg-beige-200 transition-colors font-medium"
          >
            {open ? '▲ Masquer' : `▼ Voir les ${ev.responses.length} inscrits`}
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {ev.responses.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-beige-50 border border-beige-200">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brown-900 truncate">
                        {getStr(r.data, '_fullName') || '—'}
                      </p>
                      <p className="text-xs text-brown-400 truncate">
                        {getStr(r.data, '_phone')}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right ml-2">
                      {r.paymentAmount ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          {r.paymentAmount} €
                        </span>
                      ) : (
                        <span className="text-xs text-brown-300">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Link href={`/dashboard/responses/${ev.formId}`}>
          <motion.button
            className="mt-3 w-full py-2.5 rounded-xl bg-brown-900 text-beige-50 text-xs font-semibold"
            whileTap={{ scale: 0.97 }}
          >
            Détail complet →
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Contact Card ──────────────────────────────────────────── */
function ContactCardItem({ contact, index }: { contact: ContactCard; index: number }) {
  const [open, setOpen] = useState(false);
  const initials = contact.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-beige-200 overflow-hidden shadow-sm"
    >
      <div className="h-1 bg-gradient-to-r from-gold-400/60 to-transparent" />
      <div className="p-4">
        {/* Avatar + Nom */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brown-800 to-brown-600 flex items-center justify-center flex-shrink-0">
            <span className="text-beige-50 text-sm font-semibold">{initials || '?'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brown-900 text-base leading-tight truncate">
              {contact.fullName || '—'}
            </p>
            {contact.email && (
              <p className="text-xs text-brown-400 truncate">{contact.email}</p>
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="space-y-2 mb-4">
          {contact.phone && (
            <div className="flex items-center gap-2">
              <span className="text-xs w-4 text-center flex-shrink-0">📞</span>
              <a href={`tel:${contact.phone}`} className="text-sm text-brown-700 hover:text-brown-900 truncate">
                {contact.phone}
              </a>
            </div>
          )}
          {contact.address && (
            <div className="flex items-start gap-2">
              <span className="text-xs w-4 text-center flex-shrink-0 mt-0.5">📍</span>
              <p className="text-sm text-brown-600 leading-snug">{contact.address}</p>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl bg-beige-100 p-3 text-center">
            <p className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {contact.totalEvents}
            </p>
            <p className="text-[10px] text-brown-400 uppercase tracking-wide">
              Événement{contact.totalEvents > 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-xl bg-beige-100 p-3 text-center">
            <p className="text-2xl font-light text-brown-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {contact.totalRevenue > 0 ? `${contact.totalRevenue} €` : '—'}
            </p>
            <p className="text-[10px] text-brown-400 uppercase tracking-wide">CA Total</p>
          </div>
        </div>

        {/* Événements */}
        {contact.events.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full py-2 rounded-xl text-xs text-brown-500 hover:text-brown-800 bg-beige-100 hover:bg-beige-200 transition-colors font-medium"
          >
            {open ? '▲ Masquer' : `▼ Historique des événements`}
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5">
                {contact.events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-beige-50 border border-beige-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-brown-800 truncate">{ev.title}</p>
                      {ev.date && (
                        <p className="text-[10px] text-brown-400">{formatShortDate(ev.date)}</p>
                      )}
                    </div>
                    {ev.amount > 0 && (
                      <span className="ml-2 flex-shrink-0 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {ev.amount} €
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function CRMPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'contacts'>('events');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setForms(data);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Calcul événements ──────────────────────────────────── */
  const events = useMemo<EventSummary[]>(() => {
    const now = new Date();
    return forms
      .map((form) => {
        const dateField = form.fields.find((f) => f.type === 'event_date');
        const rawDate = dateField?.presetValue ?? null;
        const parsed = rawDate ? parseEventDate(rawDate) : null;
        const isPast = parsed ? parsed < now : false;

        const confirmedResponses = form.responses.filter((r) => getStr(r.data, '_waitlist') !== 'true');
        const waitlistCount = form.responses.length - confirmedResponses.length;

        const totalParticipants = confirmedResponses.reduce((sum, r) => {
          const gc = parseInt(getStr(r.data, '_guestCount') || '1', 10);
          return sum + (isNaN(gc) ? 1 : gc);
        }, 0);

        const totalRevenue = form.responses
          .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
          .reduce((sum, r) => sum + (r.paymentAmount ?? 0), 0);

        return {
          formId: form.id,
          title: form.title,
          eventDate: rawDate,
          isPast,
          venue: dateField?.venue ?? null,
          totalParticipants,
          waitlistCount,
          totalRevenue,
          responses: form.responses,
        };
      })
      .sort((a, b) => {
        // À venir en premier, puis triés par date
        if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
        const da = a.eventDate ? parseEventDate(a.eventDate) : null;
        const db = b.eventDate ? parseEventDate(b.eventDate) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return a.isPast ? db.getTime() - da.getTime() : da.getTime() - db.getTime();
      });
  }, [forms]);

  /* ── Calcul contacts ────────────────────────────────────── */
  const contacts = useMemo<ContactCard[]>(() => {
    const map = new Map<string, ContactCard>();

    forms.forEach((form) => {
      const dateField = form.fields.find((f) => f.type === 'event_date');
      const rawDate = dateField?.presetValue ?? null;

      form.responses.forEach((r) => {
        const phone = getStr(r.data, '_phone').trim();
        const email = getStr(r.data, '_email').trim();
        const key = phone || email;
        if (!key) return;

        const fullName = getStr(r.data, '_fullName') ||
          `${getStr(r.data, '_firstName')} ${getStr(r.data, '_lastName')}`.trim();
        const address = getStr(r.data, '_address');
        const amount = (r.paymentStatus === 'paid' || r.paymentStatus === 'cash') ? (r.paymentAmount ?? 0) : 0;

        if (!map.has(key)) {
          map.set(key, {
            key,
            fullName,
            phone,
            email,
            address,
            events: [],
            totalEvents: 0,
            totalRevenue: 0,
          });
        }

        const c = map.get(key)!;
        // Mettre à jour les infos si plus complètes
        if (!c.fullName && fullName) c.fullName = fullName;
        if (!c.address && address) c.address = address;
        if (!c.email && email) c.email = email;

        c.events.push({ formId: form.id, title: form.title, date: rawDate, amount });
        c.totalEvents += 1;
        c.totalRevenue += amount;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalEvents - a.totalEvents);
  }, [forms]);

  /* ── Filtres ────────────────────────────────────────────── */
  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.eventDate ?? '').toLowerCase().includes(q) ||
        (e.venue ?? '').toLowerCase().includes(q)
    );
  }, [events, search]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const upcomingCount = events.filter((e) => !e.isPast).length;
  const totalCA = contacts.reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <div className="min-h-screen bg-beige-50 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-brown-400 hover:text-brown-700 mb-4 transition-colors">
            ← Dashboard
          </Link>
          <h1
            className="text-4xl font-light text-brown-900 mb-1"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            CRM <em className="gradient-text">HabadLyon</em>
          </h1>
          <p className="text-sm text-brown-400">Registre des événements & fiches contacts</p>
        </motion.div>

        {/* KPI bar */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {[
              { label: 'À venir', value: upcomingCount, icon: '📅' },
              { label: 'Contacts', value: contacts.length, icon: '👤' },
              { label: 'CA Total', value: totalCA > 0 ? `${totalCA} €` : '—', icon: '◆' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-beige-200 p-3 text-center shadow-sm">
                <p className="text-base mb-0.5">{s.icon}</p>
                <p className="text-xl font-semibold text-brown-900">{s.value}</p>
                <p className="text-[10px] text-brown-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-beige-200 rounded-2xl mb-5">
          {([
            { key: 'events', label: `Événements (${events.length})` },
            { key: 'contacts', label: `Contacts (${contacts.length})` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-white text-brown-900 shadow-sm'
                  : 'text-brown-500 hover:text-brown-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-300 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'events' ? 'Rechercher un événement…' : 'Rechercher un contact…'}
            className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white border border-beige-200 text-sm text-brown-900 placeholder:text-brown-300 focus:outline-none focus:border-gold-400 transition-colors"
          />
        </div>

        {/* Export contacts */}
        {tab === 'contacts' && filteredContacts.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => exportContactsToCSV(filteredContacts)}
              className="text-xs font-medium text-brown-600 border border-beige-200 px-4 py-2 rounded-xl hover:bg-beige-100 hover:border-gold-400/40 transition-colors"
            >
              📥 Exporter les contacts (CSV)
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full"
            />
          </div>
        )}

        {/* Events tab */}
        {!loading && tab === 'events' && (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-brown-400 text-sm">Aucun événement trouvé.</div>
            ) : (
              <>
                {/* À venir */}
                {filteredEvents.some((e) => !e.isPast) && (
                  <div>
                    <p className="text-xs font-semibold text-gold-600 uppercase tracking-widest mb-3">
                      À venir — {filteredEvents.filter((e) => !e.isPast).length}
                    </p>
                    <div className="space-y-3">
                      {filteredEvents.filter((e) => !e.isPast).map((ev, i) => (
                        <EventCard key={ev.formId} ev={ev} index={i} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Passés */}
                {filteredEvents.some((e) => e.isPast) && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-brown-400 uppercase tracking-widest mb-3">
                      Passés — {filteredEvents.filter((e) => e.isPast).length}
                    </p>
                    <div className="space-y-3">
                      {filteredEvents.filter((e) => e.isPast).map((ev, i) => (
                        <EventCard key={ev.formId} ev={ev} index={upcomingCount + i} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Contacts tab */}
        {!loading && tab === 'contacts' && (
          <div className="space-y-4">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 text-brown-400 text-sm">Aucun contact trouvé.</div>
            ) : (
              filteredContacts.map((c, i) => (
                <ContactCardItem key={c.key} contact={c} index={i} />
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
