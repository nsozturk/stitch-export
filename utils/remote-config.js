/**
 * Remote config: a small JSON file on GitHub Pages (docs/config.json) that can
 * announce a newer version, require a minimum version (exports stop below it)
 * or show a notice. It is data only, never code, and it fails open: without a
 * network connection the extension keeps working as usual.
 *
 * Shared by the popup (<script>) and the service worker (importScripts).
 */

const REMOTE_CONFIG_URL = 'https://nsozturk.github.io/stitch-export/config.json';
const REMOTE_CONFIG_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const REMOTE_CONFIG_CACHE = 'stitch-export-remote-config';

// -1 / 0 / 1 for dotted versions like "1.3.10" vs "1.3.9"
function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Cached for 6 h in the extension's Cache Storage (works in popup and service worker
// without the "storage" permission). force=true skips the cache.
async function getRemoteConfig(force = false) {
  let cache = null;
  try {
    cache = await caches.open(REMOTE_CONFIG_CACHE);
    if (!force) {
      const hit = await cache.match(REMOTE_CONFIG_URL);
      if (hit && Date.now() - Number(hit.headers.get('x-fetched-at') || 0) < REMOTE_CONFIG_TTL_MS) {
        return await hit.json();
      }
    }
  } catch (e) { /* no cache available: fetch below */ }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(REMOTE_CONFIG_URL, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const config = await res.json();
    if (cache) {
      await cache.put(REMOTE_CONFIG_URL, new Response(JSON.stringify(config), {
        headers: { 'content-type': 'application/json', 'x-fetched-at': String(Date.now()) }
      }));
    }
    return config;
  } catch (e) {
    // Offline or the file is unreachable: use a stale copy if we have one, else nothing
    try {
      const stale = cache && await cache.match(REMOTE_CONFIG_URL);
      if (stale) return await stale.json();
    } catch (_) { /* ignore */ }
    return null;
  }
}

// { state: 'required' | 'available' | 'ok', latest, min, message, notice }
function versionStatus(config, currentVersion) {
  if (!config) return { state: 'ok' };
  const out = {
    latest: config.latestVersion || null,
    min: config.minVersion || null,
    message: config.updateMessage || '',
    notice: config.notice && config.notice.text ? config.notice : null
  };
  if (out.min && compareVersions(currentVersion, out.min) < 0) return { ...out, state: 'required' };
  if (out.latest && compareVersions(currentVersion, out.latest) < 0) return { ...out, state: 'available' };
  return { ...out, state: 'ok' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compareVersions, versionStatus };
}
