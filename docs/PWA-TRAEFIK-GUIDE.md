# Jak zrobić "appkę na iPhone" z webappki pod Traefik + Cloudflare Tunnel

## TL;DR

Najlepsza opcja: **PWA (Progressive Web App)**. Zero kodu natywnego, zero App Store, zero kosztów. Użytkownik otwiera stronę w Safari → "Udostępnij" → "Dodaj do ekranu początkowego" → ma ikonkę jak normalna apka, otwiera się bez paska przeglądarki.

Aktualizacje? Automatyczne — po prostu deploynij nową wersję webappki, service worker ją podłapie.

---

## Co dokładnie daje PWA na iPhone

**Działa:**
- Własna ikona na ekranie głównym (taka jak natywna apka)
- Otwiera się w trybie standalone (bez paska Safari)
- Splash screen przy starcie
- Offline (cache statycznych plików — UI ładuje się nawet bez neta)
- Push notifications (od iOS 16.4, ale trzeba dodać do ekranu)
- Pełny dostęp do kamery, GPS, orientacji urządzenia

**Nie działa / ograniczenia na iOS:**
- Brak auto-promptu "zainstaluj" (trzeba ręcznie: Share → Add to Home Screen)
- Background sync słaby (iOS zabija procesy w tle)
- Brak Bluetooth, NFC, Face ID z poziomu PWA
- Storage może zostać wyczyszczony po ~7 dniach nieużywania (chyba że dodane do ekranu)
- Brak App Store (ale dla prywatnej apki to zaleta!)

**Dla CatCal to idealne** — prosta apka, dane na serwerze (PostgreSQL), nie potrzebujesz nic natywnego.

---

## Architektura: od Cloudflare do PWA

```
iPhone (Safari / PWA)
     │
     ▼
Cloudflare Tunnel (cat.sh.info.pl)
     │
     ▼
Raspberry Pi 5
     │
     ▼
Traefik (dynamic routing)
     ├── /        → catcal-web  (frontend + manifest + service worker)
     └── /api/*   → catcal-api  (backend Fastify)
```

Kluczowe: **jeden host, jeden origin** → zero CORS, service worker działa poprawnie.

---

## Część 1: Konfiguracja Traefik (dynamic routing)

### Struktura plików na RPi5

```
/opt/traefik/
├── traefik.yml              ← konfiguracja statyczna
├── dynamic/
│   ├── catcal.yml           ← dynamic config dla CatCal
│   ├── other-app.yml        ← inne apki (opcjonalnie)
│   └── ...
└── docker-compose.yml       ← Traefik jako kontener
```

### traefik.yml (konfiguracja statyczna)

```yaml
log:
  level: INFO

api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"

providers:
  # Opcja 1: Docker provider (jeśli Traefik jest w tym samym docker-compose co apki)
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-net

  # Opcja 2: File provider (jeśli apki są na innym hoście / osobnym compose)
  file:
    directory: "/etc/traefik/dynamic"
    watch: true    # ← Traefik automatycznie przeładowuje po zmianie pliku
```

> **Ważne:** Cloudflare Tunnel terminuje TLS. Ruch do Traefik przychodzi po HTTP (port 80). Dlatego entrypoint to `:80`, nie `:443`.

### Opcja A: Docker labels (apki w tym samym compose co Traefik lub w tej samej sieci)

To najprościej jeśli Traefik i CatCal są na tym samym RPi5 i widzą wspólną sieć Docker.

**docker-compose.yml (CatCal na Macu)**

```yaml
services:
  catcal-web:
    build: ./packages/web
    container_name: catcal-web
    restart: unless-stopped
    networks:
      - traefik-net
    labels:
      - "traefik.enable=true"
      # Router: wszystko co nie jest /api
      - "traefik.http.routers.catcal-web.rule=Host(`cat.sh.info.pl`)"
      - "traefik.http.routers.catcal-web.priority=1"
      - "traefik.http.routers.catcal-web.entrypoints=web"
      - "traefik.http.services.catcal-web.loadbalancer.server.port=3000"

  catcal-api:
    build: ./packages/api
    container_name: catcal-api
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://catcal:secret@catcal-db:5432/catcal
    depends_on:
      - catcal-db
    networks:
      - traefik-net
    labels:
      - "traefik.enable=true"
      # Router: /api/* → backend (wyższy priorytet!)
      - "traefik.http.routers.catcal-api.rule=Host(`cat.sh.info.pl`) && PathPrefix(`/api`)"
      - "traefik.http.routers.catcal-api.priority=10"
      - "traefik.http.routers.catcal-api.entrypoints=web"
      - "traefik.http.services.catcal-api.loadbalancer.server.port=4000"

  catcal-db:
    image: postgres:16-alpine
    container_name: catcal-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: catcal
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: catcal
    volumes:
      - catcal-pgdata:/var/lib/postgresql/data
    networks:
      - traefik-net
    # ❌ NIE wystawiaj portów na świat
    # ports:
    #   - "5432:5432"

networks:
  traefik-net:
    external: true   # sieć współdzielona z Traefik

volumes:
  catcal-pgdata:
```

### Opcja B: File provider (apki na innym hoście — Traefik na RPi5 routuje do Maca)

Jeśli CatCal dockeruje się na Macu, a Traefik jest na RPi5, to RPi5 musi wiedzieć gdzie wysłać ruch. Użyj dynamic file providera.

**dynamic/catcal.yml** (na RPi5, w katalogu który Traefik watchuje)

```yaml
http:
  routers:
    catcal-web:
      rule: "Host(`domena`)"
      service: catcal-web-svc
      entryPoints:
        - web
      priority: 1

    catcal-api:
      rule: "Host(`domena`) && PathPrefix(`/api`)"
      service: catcal-api-svc
      entryPoints:
        - web
      priority: 10

  services:
    catcal-web-svc:
      loadBalancer:
        servers:
          - url: "http://192.168.1.100:3000"    # ← IP Twojego servera w sieci LAN

    catcal-api-svc:
      loadBalancer:
        servers:
          - url: "http://192.168.1.100:4000"    # ← IP Twojego servera w sieci LAN
```

> **Zaleta file providera:** `watch: true` oznacza że po edycji pliku Traefik automatycznie przeładowuje routing — zero restartu, zero downtime. Dodajesz nową apkę = nowy plik YAML w `dynamic/`.

### Opcja C: Mieszana (Docker + File)

Możesz mieć **oba providery** jednocześnie:
- Docker provider dla kontenerów na RPi5
- File provider dla usług na Macu lub czymkolwiek innym

```yaml
# traefik.yml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
  file:
    directory: "/etc/traefik/dynamic"
    watch: true
```

---

## Część 2: PWA — co dodać do frontendu

### 1. Zainstaluj vite-plugin-pwa

```bash
cd packages/web
npm install -D vite-plugin-pwa
```

### 2. Skonfiguruj vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // ← auto-aktualizacja bez pytania
      workbox: {
        // Cache'uj pliki statyczne
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // NIE cache'uj API calls — dane zawsze z serwera
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'CatCal — Kalorie Kota',
        short_name: 'CatCal',
        description: 'Dziennik kaloryczny kota',
        start_url: '/',
        display: 'standalone',          // ← bez paska Safari!
        background_color: '#ffffff',
        theme_color: '#f97316',          // pomarańczowy, "koci" akcent
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',         // ← dla Androida, ale nie zaszkodzi
          },
        ],
      },
    }),
  ],
})
```

### 3. Dodaj meta tagi w index.html

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

  <!-- PWA: iOS specific -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="CatCal" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />

  <!-- PWA: ogólne -->
  <meta name="theme-color" content="#f97316" />
  <link rel="icon" href="/favicon.ico" />

  <title>CatCal</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### 4. Zarejestruj service worker w main.tsx

```typescript
import { registerSW } from 'virtual:pwa-register'

// Auto-update: gdy jest nowa wersja, aktywuj od razu
const updateSW = registerSW({
  onNeedRefresh() {
    // Opcjonalnie: pokaż toast "Nowa wersja dostępna"
    // Na razie: auto-aktualizacja
    updateSW(true)
  },
  onOfflineReady() {
    console.log('CatCal gotowy do pracy offline')
  },
})
```

### 5. Przygotuj ikony

Potrzebujesz minimum tych plików w `packages/web/public/icons/`:

```
icons/
├── icon-192x192.png          ← manifest (Android/Chrome)
├── icon-512x512.png          ← manifest (Android/Chrome)
├── apple-touch-icon-180x180.png  ← iOS home screen
└── favicon.ico               ← przeglądarka
```

**Tip:** Weź jedną ikonę 1024x1024 (np. emoji kota 🐱 na kolorowym tle) i przeskaluj. Narzędzia:
- https://realfavicongenerator.net
- https://maskable.app/editor (do sprawdzenia maskable)
- Albo `npx pwa-asset-generator` (CLI)

---

## Część 3: Jak to wygląda dla użytkownika (instalacja)

### Na iPhone (Safari):

1. Otwórz `https://cat.sh.info.pl` w Safari
2. Tapnij ikonę **"Udostępnij"** (kwadrat ze strzałką w górę)
3. Przewiń i tapnij **"Dodaj do ekranu początkowego"**
4. Potwierdź nazwę ("CatCal") → **"Dodaj"**
5. Na ekranie głównym pojawia się ikona CatCal
6. Po tapnięciu — apka otwiera się w trybie standalone (bez paska Safari)

### Jak pomóc użytkownikowi?

Dodaj w UI lekki baner/tooltip przy pierwszej wizycie:

```
┌─────────────────────────────────────────┐
│  📱 Dodaj CatCal do ekranu głównego!    │
│  Safari → Udostępnij → Dodaj do ekranu  │
│                                [Zamknij] │
└─────────────────────────────────────────┘
```

Pokaż go tylko gdy:
- `display-mode` nie jest `standalone` (czyli jeszcze w przeglądarce)
- Urządzenie to iOS (user agent check)

```typescript
// Sprawdź czy już uruchomione jako PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone === true

const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())

if (isIOS && !isStandalone) {
  // Pokaż baner instalacyjny
}
```

---

## Część 4: Jak działają aktualizacje

**Nie musisz nic robić ręcznie.** Schemat:

1. Deployujesz nową wersję (`docker compose up --build`)
2. Vite buduje nowy JS/CSS z nowymi hashami w nazwach plików
3. `vite-plugin-pwa` generuje nowy service worker z nowym precache manifest
4. Użytkownik otwiera apkę → service worker porównuje hashe → widzi zmianę
5. Nowy service worker pobiera zaktualizowane pliki w tle
6. `registerType: 'autoUpdate'` → nowa wersja aktywuje się automatycznie
7. Przy następnym otwarciu apki użytkownik ma nową wersję

**Czas propagacji:** Natychmiast po deployu. Service worker sprawdza przy każdym otwarciu.

> **W praktyce:** Robisz `git push`, rebuild, i za minutę żona otwiera CatCal na iPhone — ma nową wersję. Bez App Store, bez reviewów, bez czekania.

---

## Część 5: Nginx config dla frontendu (Dockerfile produkcyjny)

```dockerfile
# packages/web/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Kopiuj zbudowaną apkę
COPY --from=build /app/dist /usr/share/nginx/html
# Custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

**packages/web/nginx.conf:**

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: wszystkie ścieżki → index.html (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker: NIGDY nie cache'uj (musi być fresh)
    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest: krótki cache
    location /manifest.webmanifest {
        add_header Cache-Control "no-cache";
        types {
            application/manifest+json webmanifest;
        }
    }

    # Statyczne assety: długi cache (Vite dodaje hash w nazwie)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Ikony PWA
    location /icons/ {
        add_header Cache-Control "public, max-age=86400";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

---

## Checklist: "czy moja PWA zadziała na iPhone"

- [ ] `manifest.webmanifest` serwowany z poprawnym Content-Type
- [ ] `display: "standalone"` w manifeście
- [ ] Ikony: 192x192 i 512x512 w manifeście
- [ ] `apple-touch-icon` (180x180) w `<head>`
- [ ] `meta apple-mobile-web-app-capable = yes`
- [ ] Service worker zarejestrowany i działa
- [ ] HTTPS (Cloudflare Tunnel to zapewnia)
- [ ] `start_url: "/"` w manifeście
- [ ] `sw.js` serwowany bez cache (Cache-Control: no-cache)
- [ ] Strona ładuje się pod `cat.sh.info.pl` bez błędów w konsoli

### Jak przetestować:

1. **Chrome DevTools → Application → Manifest** — sprawdź czy wszystko się zgadza
2. **Chrome DevTools → Application → Service Workers** — sprawdź status
3. **Lighthouse → PWA audit** — powinno być zielone
4. **iPhone Safari** → otwórz URL → Share → "Add to Home Screen" → sprawdź czy działa standalone

---

## Podsumowanie decyzji

| Opcja | Wysiłek | Efekt | Dla CatCal? |
|-------|---------|-------|-------------|
| **PWA** | Niski (manifest + service worker + ikony) | Ikona na ekranie, standalone, auto-update | ✅ Idealne |
| Capacitor wrapper | Średni (dodatkowy tooling) | Jak PWA + dostęp do natywnych API | ❌ Overkill |
| Natywna apka Swift | Wysoki (osobny codebase) | Pełen dostęp do iOS | ❌ Kompletny overkill |
| TestFlight wrapper | Średni (Apple Developer $99/rok) | Apka w TestFlight do dystrybucji | ❌ Za drogo za prywatną apkę |
