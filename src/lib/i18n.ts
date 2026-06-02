'use client';
import { useState, useEffect } from 'react';

export type Lang = 'fr' | 'en';

export const DICT = {
  fr: {
    nav_events: 'Événements',
    nav_account: 'Mon compte',
    nav_login: 'Se connecter',
    nav_logout: 'Déconnexion',
    nav_admin: 'Admin',
    hero_badge: '✦ La communauté HabadLyon en ligne',
    hero_welcome: 'Bienvenue chez',
    hero_sub: 'Inscrivez-vous aux événements, réservez votre table de gala, faites un don — le tout en quelques secondes.',
    cta_events: 'Voir les événements →',
    cta_donate: '🤲 Faire un don',
    card_events_t: 'Événements', card_events_d: 'Inscrivez-vous aux soirées, dîners et célébrations.',
    card_gala_t: 'Galas & tables', card_gala_d: 'Réservez une table complète ou des places.',
    card_don_t: 'Faire un don', card_don_d: 'Soutenez la communauté, reçu fiscal immédiat.',
    card_horaires_t: 'Horaires Chabbat', card_horaires_d: 'Bougies, havdalah et zmanim pour Lyon.',
    member_title: 'Votre espace membre',
    member_sub: 'Créez un compte pour retrouver toutes vos inscriptions, vos billets et vos reçus au même endroit.',
    member_create: 'Créer mon compte', member_have: "J'ai déjà un compte",
    member_note: 'Pas obligatoire : vous pouvez aussi vous inscrire à un événement sans compte.',
    saas_kicker: 'Vous gérez une communauté ?',
    saas_title: 'Créez l’espace en ligne de votre communauté',
    saas_sub: 'Événements, réservations de gala, dons avec reçus fiscaux, billets QR, horaires de Chabbat — votre propre site, prêt en quelques minutes.',
    saas_cta: 'Créer mon espace gratuit →',
    footer_legal: 'Mentions légales · Contact',
    trust_1: 'Inscription en 2 minutes',
    trust_2: 'Paiement 100% sécurisé',
    trust_3: 'Reçu fiscal automatique',
    trust_4: 'Billet QR par e-mail',
  },
  en: {
    nav_events: 'Events',
    nav_account: 'My account',
    nav_login: 'Sign in',
    nav_logout: 'Sign out',
    nav_admin: 'Admin',
    hero_badge: '✦ The HabadLyon community online',
    hero_welcome: 'Welcome to',
    hero_sub: 'Register for events, book your gala table, make a donation — all in a few seconds.',
    cta_events: 'See events →',
    cta_donate: '🤲 Donate',
    card_events_t: 'Events', card_events_d: 'Register for evenings, dinners and celebrations.',
    card_gala_t: 'Galas & tables', card_gala_d: 'Book a full table or individual seats.',
    card_don_t: 'Donate', card_don_d: 'Support the community, instant tax receipt.',
    card_horaires_t: 'Shabbat times', card_horaires_d: 'Candles, havdalah and zmanim for Lyon.',
    member_title: 'Your member space',
    member_sub: 'Create an account to find all your registrations, tickets and receipts in one place.',
    member_create: 'Create my account', member_have: 'I already have an account',
    member_note: 'Optional: you can also register for an event without an account.',
    saas_kicker: 'Managing a community?',
    saas_title: 'Create your community’s online space',
    saas_sub: 'Events, gala bookings, donations with tax receipts, QR tickets, Shabbat times — your own site, ready in minutes.',
    saas_cta: 'Create my free space →',
    footer_legal: 'Legal notice · Contact',
    trust_1: 'Register in 2 minutes',
    trust_2: '100% secure payment',
    trust_3: 'Automatic tax receipt',
    trust_4: 'QR ticket by e-mail',
  },
} as const;

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>('fr');
  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) as Lang | null;
    if (stored === 'fr' || stored === 'en') setLang(stored);
  }, []);
  const update = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  };
  return [lang, update];
}
