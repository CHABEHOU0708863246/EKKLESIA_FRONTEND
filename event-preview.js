// api/event-preview.js

const BOT_SIGNATURES = [
  'whatsapp',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'telegrambot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'googlebot',
  'bingbot',
  'applebot',
  'ia_archiver',
  'msnbot',
  'yahoo! slurp',
  'duckduckbot',
  'semrushbot',
  'ahrefsbot',
];

const API_BASE = 'https://ekklesia-backend-jxkc.onrender.com';
const SITE_BASE = 'https://ekklesia-frontend.vercel.app';
const FALLBACK_IMAGE = `${SITE_BASE}/logos/A%20New%20Design%20-%20Fait%20avec%20PosterMyWall.png`;
const FALLBACK_TITLE = 'Inscription en ligne — MIAV';
const FALLBACK_DESC  = 'Mission Internationale Arbre de Vie — Inscription aux événements';

export default async function handler(req, res) {
  const { eventId } = req.query;

  // Sans eventId, on laisse Angular gérer
  if (!eventId) {
    return redirect(res, SITE_BASE);
  }

  const targetUrl = `${SITE_BASE}/inscription/${eventId}`;
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = BOT_SIGNATURES.some(sig => userAgent.includes(sig));

  // ── Vrais utilisateurs : redirection directe, zéro latence ──
  if (!isBot) {
    res.setHeader('Location', targetUrl);
    return res.status(302).end();
  }

  // ── Bots : on charge l'événement et on génère les meta OG ──
  let event = null;
  try {
    const apiResponse = await fetch(
      `${API_BASE}/api/v1/public/PublicRegistration/events/${eventId}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      }
    );

    if (apiResponse.ok) {
      const body = await apiResponse.json();
      const candidate = body?.data ?? body;
      if (candidate?.title) event = candidate;
    }
  } catch (err) {
    // Render endormi ou timeout : fallback gracieux
    console.error('OG preview — fetch échoué:', err.name, err.message);
  }

  const title = event?.title ?? FALLBACK_TITLE;
  const description = event ? buildDescription(event) : FALLBACK_DESC;

  // Priorité : bannerUrl → imageUrl → logo MIAV
  const imageUrl = clean(event?.bannerUrl ?? event?.imageUrl) || FALLBACK_IMAGE;

  const html = buildHtml({ title, description, imageUrl, targetUrl, event });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache 5 min (assez pour WhatsApp, pas trop long si les places se remplissent)
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

// ── Helpers ─────────────────────────────────────────────────────

function buildDescription(ev) {
  const parts = [];

  if (ev.startDate) {
    const debut = fmt(ev.startDate);
    const fin   = ev.endDate ? ` au ${fmt(ev.endDate)}` : '';
    parts.push(`📅 ${debut}${fin}`);
  }

  if (ev.location) parts.push(`📍 ${ev.location}`);

  if (ev.isFull) {
    parts.push('🎟️ Complet');
  } else if (ev.availableSpots > 0) {
    parts.push(`🎟️ ${ev.availableSpots} places disponibles`);
  }

  parts.push('👉 Cliquez pour vous inscrire');
  return parts.join(' — ');
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return String(iso);
  }
}

function clean(str) {
  return (str ?? '').trim();
}

function h(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function redirect(res, url) {
  res.setHeader('Location', url);
  return res.status(302).end();
}

function buildHtml({ title, description, imageUrl, targetUrl, event }) {
  const safeTarget = h(targetUrl);
  const jsTarget   = targetUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${h(title)}</title>

  <!-- ═══ Open Graph (WhatsApp, Facebook, Telegram) ════════ -->
  <meta property="og:type"         content="website">
  <meta property="og:url"          content="${safeTarget}">
  <meta property="og:title"        content="${h(title)}">
  <meta property="og:description"  content="${h(description)}">
  <meta property="og:image"        content="${h(imageUrl)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale"       content="fr_CI">
  <meta property="og:site_name"    content="MIAV — Inscription en ligne">

  <!-- ═══ Twitter Card ════════════════════════════════════ -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${h(title)}">
  <meta name="twitter:description" content="${h(description)}">
  <meta name="twitter:image"       content="${h(imageUrl)}">

  <!-- ═══ Description standard ════════════════════════════ -->
  <meta name="description" content="${h(description)}">

  <!-- Redirection immédiate pour les rares cas où un vrai user
       atterrit ici malgré la détection de bot -->
  <meta http-equiv="refresh" content="0;url=${safeTarget}">

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;
      background:#0f172a;color:#e2e8f0;
      font-family:Arial,Helvetica,sans-serif;
    }
    .card{text-align:center;padding:2rem;max-width:480px}
    .logo{width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:1rem}
    h1{font-size:1.4rem;margin-bottom:.5rem;color:#f8fafc}
    p{font-size:.9rem;color:#94a3b8;line-height:1.5;margin-bottom:.75rem}
    .spinner{
      width:36px;height:36px;
      border:3px solid rgba(255,255,255,.15);
      border-top-color:#C9A227;
      border-radius:50%;
      animation:spin .8s linear infinite;
      margin:1.5rem auto .5rem;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    a{color:#C9A227;text-underline-offset:3px}
  </style>
</head>
<body>
  <div class="card">
    <img src="https://ekklesia-frontend.vercel.app/logos/A%20New%20Design%20-%20Fait%20avec%20PosterMyWall.png"
         alt="Logo MIAV" class="logo">
    <h1>${h(title)}</h1>
    ${event?.location ? `<p>📍 ${h(event.location)}</p>` : ''}
    <div class="spinner"></div>
    <p>Chargement de la page d'inscription…</p>
    <p><a href="${safeTarget}">Cliquer ici si la redirection ne fonctionne pas.</a></p>
  </div>
  <script>window.location.replace("${jsTarget}");</script>
</body>
</html>`;
}
