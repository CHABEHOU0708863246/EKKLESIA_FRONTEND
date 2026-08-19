// middleware.js — racine du projet Angular (à côté de package.json)

import { next, rewrite } from '@vercel/edge';

const BOT_SIGNATURES = [
  'whatsapp', 'facebookexternalhit', 'facebot',
  'twitterbot', 'telegrambot', 'linkedinbot',
  'slackbot', 'discordbot', 'googlebot', 'bingbot',
  'applebot', 'ia_archiver',
];

export const config = {
  // N'intercepte QUE les routes d'inscription
  matcher: '/inscription/:eventId*',
};

export default function middleware(request) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_SIGNATURES.some(sig => userAgent.includes(sig));

  if (!isBot) {
    // Vrai utilisateur : laisse Angular gérer normalement
    return next();
  }

  // Bot : redirige vers la fonction de preview Open Graph
  const url = new URL(request.url);
  // Extrait l'eventId depuis /inscription/<eventId>
  const parts = url.pathname.split('/');
  const eventId = parts[parts.length - 1];

  if (!eventId) return next();

  const previewUrl = new URL(url.origin + '/api/event-preview');
  previewUrl.searchParams.set('eventId', eventId);

  return rewrite(previewUrl);
}
