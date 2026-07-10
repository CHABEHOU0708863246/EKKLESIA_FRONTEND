# ============================================
# ÉTAPE 1 : BUILD
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (nécessaire pour avoir la CLI Angular pour le build)
RUN npm ci

# Copier le code source de l'application
COPY . .

# Build pour production en mode statique (SPA)
RUN npm run build -- --configuration=production

# ============================================
# ÉTAPE 2 : SERVEUR NGINX (PRODUCTION)
# ============================================
FROM nginx:alpine

# Ajuster le nom du projet pour correspondre à ton angular.json (EKKLESIA_FRONTEND)
COPY --from=build /app/dist/EKKLESIA_FRONTEND/browser /usr/share/nginx/html

# Copier ta configuration nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Sécurisation : Permissions pour l'utilisateur non-root d'Nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exposer le port (assure-toi que ton nginx.conf écoute aussi sur 8080 !)
EXPOSE 8080

# Health check (adapté au port 8080)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
