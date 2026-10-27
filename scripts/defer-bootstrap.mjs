import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Optimise le build de production pour le web mobile :
 * - la page d'accueil "/" est une connexion statique (pas de téléchargement Angular) ;
 * - sur les autres routes, le CSS est chargé puis Angular démarre APRÈS le premier
 *   rendu de l'écran de démarrage ;
 * - le service worker et le manifest restent inchangés.
 */
const browserDir = resolve('dist/EKKLESIA_FRONTEND/browser');
const staticLoginFragment = readFileSync(resolve('scripts/static-login.html'), 'utf8').replace(
  '__API_URL__',
  JSON.stringify('https://ekklesia-backend-jxkc.onrender.com')
);

function findIndexFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return findIndexFiles(full);
    }
    return entry === 'index.html' ? [full] : [];
  });
}

const mainScriptPattern = /<script src="(main-[^"]+\.js)" type="module"><\/script>/;

function loaderFor(main, styleHrefs) {
  return `<script>
(function () {
  var path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    return;
  }

  var started = false;
  var styleHrefs = ${JSON.stringify(styleHrefs)};

  function startApp() {
    if (started) {
      return;
    }
    started = true;

    var main = document.createElement('script');
    main.type = 'module';
    main.src = '${main}';
    document.body.appendChild(main);
  }

  function loadStylesThenBoot() {
    if (styleHrefs.length === 0) {
      startApp();
      return;
    }

    var remaining = styleHrefs.length;
    function done() {
      remaining -= 1;
      if (remaining <= 0) {
        afterPaint();
      }
    }
    function afterPaint() {
      requestAnimationFrame(function () {
        setTimeout(startApp, 0);
      });
    }

    styleHrefs.forEach(function (href) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = done;
      link.onerror = done;
      document.head.appendChild(link);
    });
  }

  function schedule() {
    requestAnimationFrame(function () {
      setTimeout(loadStylesThenBoot, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
</script>`;
}

let processed = 0;

for (const indexPath of findIndexFiles(browserDir)) {
  let html = readFileSync(indexPath, 'utf8');
  const mainMatch = html.match(mainScriptPattern);

  if (!mainMatch) {
    continue;
  }

  const styleHrefs = [];
  html = html.replace(
    /<link rel="stylesheet" href="(styles-[^"]+\.css)"[^>]*>/g,
    (_match, href) => {
      if (!styleHrefs.includes(href)) {
        styleHrefs.push(href);
      }
      return '';
    }
  );

  const boxicons = html.match(/<link rel="stylesheet" href="(\/vendor\/boxicons\/css\/boxicons\.min\.css)"\s*\/?>/);
  if (boxicons) {
    styleHrefs.push(boxicons[1]);
    html = html.replace(boxicons[0], '');
  }

  // Google Fonts ne doit pas bloquer le premier rendu (la connexion statique
  // utilise les polices système ; Angular chargera Public Sans en parallèle).
  html = html.replace(
    /(<link\s+href="https:\/\/fonts\.googleapis\.com[^>]*?)\s+rel="stylesheet"\s*\/?>/g,
    '$1 rel="stylesheet" media="print" onload="this.media=\'all\'">'
  );

  if (relative(browserDir, indexPath) === 'index.html') {
    html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
    html = html.replace('</body>', `${staticLoginFragment}\n</body>`);
  }

  html = html.replace(mainMatch[0], loaderFor(mainMatch[1], styleHrefs));
  writeFileSync(indexPath, html, 'utf8');
  processed += 1;
  console.log(
    `defer-bootstrap: ${relative(browserDir, indexPath)} (${mainMatch[1]}, ` +
      `${styleHrefs.length} feuille(s) de style).`
  );
}

if (processed === 0) {
  throw new Error('defer-bootstrap: aucun index.html avec script main trouvé.');
}
