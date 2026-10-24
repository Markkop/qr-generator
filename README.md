# QR Generator

Make QR codes for links, text, Wi-Fi, email, phone, SMS, contacts and locations. Style them, add a logo, and download PNG, SVG, JPEG or WebP, or copy the image straight to the clipboard.

Everything runs in the browser. There is no backend, no account and no tracking. History lives in IndexedDB on your device, and the app works offline once loaded.

## Features

- Eight content types with the payload formats phones understand: `https://`, `WIFI:`, `mailto:`, `tel:`, `SMSTO:`, vCard 3.0 and `geo:`. Special characters are escaped per the ZXing and RFC 6350 conventions.
- Live preview with a built-in scan check. Every render is decoded with [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) and compared to the expected content, so you know before printing whether it scans.
- Defaults from the QR spec: a 4-module quiet zone, error correction M, raised to H automatically when a logo is added, and a logo knockout capped at about 12% of the code area.
- Warnings for low contrast, inverted colors, dense codes, small margins and insecure `http://` links.
- Colors, dot and corner shapes, and a center logo. Logos are downscaled and stored locally.
- Export to PNG, JPEG or WebP at 256 to 2048 px, or to SVG for print. Copy the image or the raw content, or use the share sheet on mobile.
- History with search, type filter, pin, rename, delete and "open in editor". Identical codes are stored once. JSON export and import let you back it up or move it to another device.
- Brazilian Portuguese (default) and English, switchable from the header. The choice is saved in the browser.
- Installable PWA with dark mode, keyboard navigation and screen reader labels.
- An empty preview illustrates the scan experience for the selected QR type on Android or iOS. It infers the initial system from passive device hints, remembers manual selection, and offers pause, replay and manual steps. No camera or permission requests; reduced-motion preferences show a static result.

## Stack

Vite, React 19, TypeScript, Tailwind CSS 4, [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) for rendering, Dexie for IndexedDB, vite-plugin-pwa for offline support, Vitest and Playwright for tests.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests
pnpm test:e2e     # builds, serves with production headers, runs Playwright
pnpm lint && pnpm typecheck && pnpm format:check
```

The first e2e run needs a browser: `pnpm exec playwright install chromium`.

## Project layout

```
src/lib/payload   content types and payload builders (pure, unit tested)
src/lib/qr        encoding, styling, rendering and the scan check
src/lib/db.ts     history storage, pruning, export and import
src/i18n          dictionaries (pt-BR is the source of truth for keys) and the translator
src/components    UI
e2e               Playwright tests, including a scan round trip for every type
```

## Notes

- `qr-code-styling` passes text to its encoder one UTF-16 unit per byte, which garbles non-Latin text. `src/lib/qr/encode.ts` converts content to UTF-8 bytes first. The Unicode e2e test covers this.
- The zxing wasm file is bundled rather than loaded from a CDN, so the scan check works offline and the CSP can stay at `'self'`.
- Security headers live in `vercel.json`. `vite preview` serves the same headers, so the e2e suite runs under the production CSP and fails on any violation.

## Deployment

The site is static and deploys to Vercel with zero config beyond `vercel.json`: pnpm install, `pnpm build`, output in `dist`.

## License

MIT
