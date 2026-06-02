'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  message: string;
  at: Date;
  read: boolean;
}

/**
 * Hook #30 — cloche de notifications en temps réel.
 * Écoute les nouvelles inscriptions (INSERT sur responses) via Supabase Realtime.
 * Garde jusqu'à 20 notifications en mémoire de session.
 */
export function useNotifications(org: string | null) {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!org) return;

    const channel = supabase
      .channel(`responses-${org}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        (payload) => {
          const data = (payload.new as Record<string, unknown>);
          const firstName = (data.data as Record<string, string>)?._firstName ?? '';
          const lastName  = (data.data as Record<string, string>)?._lastName  ?? '';
          const name = [firstName, lastName].filter(Boolean).join(' ') || 'Un participant';
          const notif: Notification = {
            id: crypto.randomUUID(),
            message: `${name} vient de s'inscrire.`,
            at: new Date(),
            read: false,
          };
          setNotifs((prev) => [notif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [org]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const unreadCount = notifs.filter((n) => !n.read).length;

  return { notifs, unreadCount, markAllRead };
}
