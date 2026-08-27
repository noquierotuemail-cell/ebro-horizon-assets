(() => {
  const REPO = 'noquierotuemail-cell/ebro-horizon-assets';
  const cache = new Map();

  function assetPath(img) {
    const raw = img.getAttribute('src') || '';
    if (!raw || raw.startsWith('data:')) return null;
    try {
      const u = new URL(raw, location.href);
      if (!u.pathname.startsWith('/assets/')) return null;
      return u.pathname.replace(/^\//, '');
    } catch (_) {
      return null;
    }
  }

  function mime(path) {
    if (/\.webp$/i.test(path)) return 'image/webp';
    if (/\.png$/i.test(path)) return 'image/png';
    if (/\.jpe?g$/i.test(path)) return 'image/jpeg';
    if (/\.gif$/i.test(path)) return 'image/gif';
    if (/\.svg$/i.test(path)) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  async function dataUri(path) {
    if (cache.has(path)) return cache.get(path);
    const promise = (async () => {
      const api = `https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}?ref=main`;
      const r = await fetch(api, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const payload = await r.json();
      if (!payload || payload.type !== 'file' || !payload.content) throw new Error('Invalid asset payload');
      const b64 = String(payload.content).replace(/\s+/g, '');
      return `data:${mime(path)};base64,${b64}`;
    })();
    cache.set(path, promise);
    return promise;
  }

  async function hydrate(img) {
    if (!img || img.dataset.habroInlineHydrated === '1') return;
    const path = assetPath(img);
    if (!path) return;
    img.dataset.habroInlineHydrated = '1';
    try {
      img.src = await dataUri(path);
      img.removeAttribute('srcset');
    } catch (error) {
      img.dataset.habroInlineHydrated = '0';
      console.warn('[HABRO] image fallback failed', path, error);
    }
  }

  function scan(root = document) {
    if (root instanceof HTMLImageElement) hydrate(root);
    if (root.querySelectorAll) root.querySelectorAll('img').forEach(hydrate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  } else {
    scan();
  }

  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
