'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  message: string;
  at: string; // ISO (sérialisable pour localStorage)
  read: boolean;
}

const KEY = (org: string) => `hl_notifs_${org}`;

function load(org: string): Notification[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY(org)) || '[]'); } catch { return []; }
}

/**
 * Hook #30/#27 — cloche de notifications en temps réel + persistance.
 * Écoute les nouvelles inscriptions (Realtime) et conserve l'historique
 * (jusqu'à 30) dans localStorage → survit aux rechargements.
 */
export function useNotifications(org: string | null) {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  // Chargement initial depuis localStorage
  useEffect(() => {
    if (!org) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifs(load(org));
  }, [org]);

  // Abonnement temps réel
  useEffect(() => {
    if (!org) return;
    const channel = supabase
      .channel(`responses-${org}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        (payload) => {
          const data = (payload.new as Record<string, unknown>);
          const d = (data.data as Record<string, string>) || {};
          const name = [d._firstName, d._lastName].filter(Boolean).join(' ') || 'Un participant';
          const notif: Notification = { id: crypto.randomUUID(), message: `${name} vient de s'inscrire.`, at: new Date().toISOString(), read: false };
          setNotifs((prev) => {
            const next = [notif, ...prev].slice(0, 30);
            try { localStorage.setItem(KEY(org), JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [org]);

  const markAllRead = () => setNotifs((prev) => {
    const next = prev.map((n) => ({ ...n, read: true }));
    if (org) { try { localStorage.setItem(KEY(org), JSON.stringify(next)); } catch { /* ignore */ } }
    return next;
  });
  const clearAll = () => { setNotifs([]); if (org) { try { localStorage.removeItem(KEY(org)); } catch { /* ignore */ } } };
  const unreadCount = notifs.filter((n) => !n.read).length;

  return { notifs, unreadCount, markAllRead, clearAll };
}
