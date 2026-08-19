// api/event-preview.js
export default async function handler(req, res) {
  const { eventId } = req.query;

  if (!eventId) {
    res.setHeader('Location', 'https://ekklesia-frontend.vercel.app');
    return res.status(302).end();
  }

  const targetUrl = `https://ekklesia-frontend.vercel.app/inscription/${eventId}`;

  // Si un vrai utilisateur arrive ici malgré le middleware,
  // on le redirige directement sans générer du HTML
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const BOT_SIGS = ['whatsapp','facebookexternalhit','facebot','twitterbot',
    'telegrambot','linkedinbot','slackbot','discordbot','googlebot','bingbot','applebot'];
  const isBot = BOT_SIGS.some(s => userAgent.includes(s));

  if (!isBot) {
    res.setHeader('Location', targetUrl);
    return res.status(302).end();
  }


  let event = null;

  try {
    const apiUrl = 'https://ekklesia-backend-jxkc.onrender.com';
    const apiResponse = await fetch(
      `${apiUrl}/api/v1/public/PublicRegistration/events/${eventId}`,
      {
        // ⚠️ Timeout de 5 secondes : Render peut être endormi
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' }
      }
    );

    if (apiResponse.ok) {
      const body = await apiResponse.json();

      // ✅ Déballe l'enveloppe { success, data } ou prend l'objet directement
      event = body?.data ?? body;

      // Vérifie que c'est bien un événement, pas un message d'erreur
      if (!event?.title) event = null;
    }
  } catch (err) {
    // Timeout Render, réseau indisponible : on tombe sur le fallback
    console.error('Open Graph — événement non chargé:', err.name, err.message);
  }

  // ── Métadonnées ──────────────────────────────────────────────
  const title = event?.title
    ?? 'Camp National 2026 – Inscription en ligne';

  const description = event
    ? buildDescription(event)
    : 'Inscription en ligne — Camp National 2026';

  // Priorité : bannerUrl du champ événement, sinon logo MIAV
  const imageUrl = (event?.bannerUrl ?? event?.imageUrl ?? '').trim()
    || 'https://ekklesia-frontend.vercel.app/logos/A%20New%20Design%20-%20Fait%20avec%20PosterMyWall.png';

  const targetUrl = `https://ekklesia-frontend.vercel.app/inscription/${eventId}`;

  // ── HTML Open Graph ──────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph — WhatsApp, Facebook, Telegram -->
  <meta property="og:type"         content="website">
  <meta property="og:url"          content="${escapeHtml(targetUrl)}">
  <meta property="og:title"        content="${escapeHtml(title)}">
  <meta property="og:description"  content="${escapeHtml(description)}">
  <meta property="og:image"        content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale"       content="fr_CI">
  <meta property="og:site_name"    content="Camp National 2026 – Inscription en ligne">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image"       content="${escapeHtml(imageUrl)}">

  <!-- Redirection immédiate vers la vraie page Angular -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}">

  <!-- Style minimaliste pour les 0,5 secondes avant redirection -->
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,.2);
      border-top-color: #C9A227;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #C9A227; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Chargement de la page d'inscription…</p>
    <p><a href="${escapeHtml(targetUrl)}">Cliquer ici si la redirection ne fonctionne pas.</a></p>
  </div>
  <script>window.location.replace("${targetUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}");</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
}

// ── Helpers ─────────────────────────────────────────────────────

function buildDescription(event) {
  const parts = [];

  if (event.startDate) {
    const dateStr = formatDate(event.startDate);
    const endStr = event.endDate ? ` au ${formatDate(event.endDate)}` : '';
    parts.push(`📅 ${dateStr}${endStr}`);
  }

  if (event.location) {
    parts.push(`📍 ${event.location}`);
  }

  if (event.availableSpots > 0) {
    parts.push(`🎟️ ${event.availableSpots} places disponibles`);
  } else if (event.isFull) {
    parts.push('🎟️ Complet');
  }

  parts.push('Inscription en ligne');

  return parts.join(' — ');
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch {
    return String(isoDate);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
