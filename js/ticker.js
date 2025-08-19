// Ticker: Frankfurter (USD/INR) + Binance (BTC)
// No API keys needed

(function () {
  const track = document.getElementById('market-ticker-track');
  const meta = document.getElementById('market-ticker-meta');
  const viewport = document.getElementById('market-ticker-viewport');

  if (!track || !meta || !viewport) return;

  const fmtINR = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
  const fmtNum = (n, d = 4) => Number(n).toFixed(d);
  const nowTime = () => new Date().toLocaleTimeString();
  const SNAPSHOT_KEY = 'ticker_snapshot_v1';

  // Display names
  const FX_NAMES = {
    'USD/INR': 'US Dollar',
    'EUR/INR': 'Euro',
    'GBP/INR': 'British Pound',
    'JPY/INR': 'Japanese Yen',
  };
  // Preferred FX pairs list (for placeholders)
  const FX_PAIRS = [
    { from: 'USD', to: 'INR', label: 'USD/INR' },
    { from: 'EUR', to: 'INR', label: 'EUR/INR' },
    { from: 'GBP', to: 'INR', label: 'GBP/INR' },
    { from: 'JPY', to: 'INR', label: 'JPY/INR' },
  ];
  const CRYPTO_NAMES = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'Binance Coin',
    XRP: 'Ripple',
  };

  // Fetch multiple FX pairs against INR
  async function fetchFrankfurterFX() {
    const requests = FX_PAIRS.map((p) =>
      fetch(`https://api.frankfurter.app/latest?from=${p.from}&to=${p.to}`, { cache: 'no-store' })
        .then((r) => {
          if (!r.ok) throw new Error('Frankfurter fetch failed');
          return r.json();
        })
        .then((d) => ({ label: p.label, rate: d?.rates?.[p.to] }))
    );
    const settled = await Promise.allSettled(requests);
    const out = [];
    for (const s of settled) {
      if (s.status === 'fulfilled' && Number.isFinite(Number(s.value.rate))) {
        out.push({ label: s.value.label, rate: Number(s.value.rate) });
      }
    }
    if (!out.length) throw new Error('No FX data');
    return out;
  }

  async function fetchBinance24h(symbol) {
    // e.g. symbol: BTCUSDT, ETHUSDT, BNBUSDT
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Binance fetch failed');
    const data = await res.json();
    const lastPrice = Number(data?.lastPrice);
    if (!Number.isFinite(lastPrice)) throw new Error(`${symbol} price missing`);
    const changePct = Number(data?.priceChangePercent);
    return { symbol, priceUsd: lastPrice, changePct24h: Number.isFinite(changePct) ? changePct : null };
  }

  function renderItems(items) {
    track.innerHTML = '';

    // Build one sequence of nodes
    const seqNodes = items.map((it) => renderItemNode(it));

    // Append once and measure
    seqNodes.forEach((n) => track.appendChild(n.cloneNode(true)));

    // Ensure the single sequence is at least as wide as the viewport
    // If it's narrower, append more copies until it exceeds the viewport width
    const minWidth = viewport.clientWidth + 32; // a small buffer
    while (track.scrollWidth < minWidth) {
      seqNodes.forEach((n) => track.appendChild(n.cloneNode(true)));
    }

    // Record the width of one full sequence (current scrollWidth)
    const sequenceWidth = track.scrollWidth;
    track.dataset.seqWidth = String(sequenceWidth);

    // Append one more copy to enable seamless loop
    seqNodes.forEach((n) => {
      const node = n.cloneNode(true);
      node.setAttribute('aria-hidden', 'true');
      track.appendChild(node);
    });
  }

  function renderItemNode(it) {
    const wrapper = document.createElement('div');
    wrapper.className =
      'flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700';

    // Special case: animated separator between groups
    if (it.type === 'sep') {
      const chip = document.createElement('span');
      chip.className =
        'text-[10px] md:text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ' +
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 animate-pulse';
      chip.textContent = it.label || 'Crypto';
      wrapper.appendChild(chip);
      return wrapper;
    }

    // Icon helper
    const iconFor = (node) => {
      if (node.type === 'fx') return '💱';
      if (node.type === 'crypto') {
        switch (node.symbol) {
          case 'BTC':
            return '₿';
          case 'ETH':
            return 'Ξ';
          case 'BNB':
            return '◈';
          case 'XRP':
            return '✕';
          default:
            return '⧉';
        }
      }
      return '';
    };

    // Unavailable item styling
    if (it.unavailable) {
      const icon = document.createElement('span');
      icon.className = 'text-[12px] opacity-70';
      icon.textContent = iconFor(it);
      const label = document.createElement('span');
      label.className = 'text-[11px] md:text-xs font-semibold text-gray-500 dark:text-gray-400';
      label.textContent = it.label;
      const value = document.createElement('span');
      value.className = 'text-[11px] md:text-xs italic text-gray-400 dark:text-gray-500';
      value.textContent = 'Unavailable';
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      wrapper.appendChild(value);
      return wrapper;
    }

    const icon = document.createElement('span');
    icon.className = 'text-[12px]';
    icon.textContent = iconFor(it);
    const label = document.createElement('span');
    label.className = 'text-[11px] md:text-xs font-semibold text-gray-700 dark:text-gray-300';
    label.textContent = it.label;

    const value = document.createElement('span');
    value.className = 'text-[11px] md:text-xs font-mono text-gray-900 dark:text-gray-100';
    value.textContent = it.value;

    wrapper.appendChild(icon);
    wrapper.appendChild(label);
    wrapper.appendChild(value);

    if (typeof it.changePct === 'number') {
      const chip = document.createElement('span');
      const up = it.changePct >= 0;
      chip.className =
        'text-[11px] md:text-xs font-semibold px-1.5 py-0.5 rounded ' +
        (up
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300');
      chip.textContent = (up ? '▲ ' : '▼ ') + fmtNum(it.changePct, 2) + '%';
      wrapper.appendChild(chip);
    }

    return wrapper;
  }

  function updateMeta(sources) {
    meta.textContent = `Updated ${nowTime()} • Sources: ${sources.join(', ')}`;
  }

  // Simple marquee animation (seamless infinite loop)
  function startMarquee() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // respect user preference

    let pos = 0;
    let last = performance.now();
    let paused = false;

    // Use stored sequence width for exact loop reset
    const measureSeq = () => {
      const v = Number(track.dataset.seqWidth);
      return Number.isFinite(v) && v > 0 ? v : track.scrollWidth / 2;
    };
    let seqWidth = measureSeq();

    const speedPxPerSec = 40; // adjust for speed
    const loop = (t) => {
      if (!viewport.isConnected) return; // stop if DOM removed
      if (!paused) {
        const dt = (t - last) / 1000;
        pos -= speedPxPerSec * dt;
        if (-pos >= seqWidth) {
          // Reset position after one full cycle of the base sequence
          pos += seqWidth;
        }
        track.style.transform = `translateX(${pos}px)`;
      }
      last = t;
      requestAnimationFrame(loop);
    };

    // Pause on hover/focus
    viewport.addEventListener('mouseenter', () => (paused = true));
    viewport.addEventListener('mouseleave', () => (paused = false));
    viewport.addEventListener('focusin', () => (paused = true));
    viewport.addEventListener('focusout', () => (paused = false));

    // Recalculate on resize (layout changes)
    const onResize = () => {
      seqWidth = measureSeq();
    };
    window.addEventListener('resize', onResize);

    requestAnimationFrame(loop);
  }

  async function init() {
    try {
      meta.textContent = 'Fetching…';

      const [fxSet, btc, eth, bnb, xrp] = await Promise.allSettled([
        fetchFrankfurterFX(),
        fetchBinance24h('BTCUSDT'),
        fetchBinance24h('ETHUSDT'),
        fetchBinance24h('BNBUSDT'),
        fetchBinance24h('XRPUSDT'),
      ]);

      let usdInr = null;
      let sources = [];

      const items = [];

      if (fxSet.status === 'fulfilled' && fxSet.value.length) {
        sources.push('Frankfurter');
        // Add group separator for Forex
        items.push({ type: 'sep', label: 'Forex' });
        // Build FX items and also extract USD/INR for INR conversions
        const present = new Set(fxSet.value.map((x) => x.label));
        for (const fx of fxSet.value) {
          if (fx.label === 'USD/INR') usdInr = fx.rate;
          const full = FX_NAMES[fx.label];
          const display = full ? `${fx.label} (${full})` : fx.label;
          items.push({ type: 'fx', label: display, value: `₹${fmtNum(fx.rate, 4)}` });
        }
        // Add placeholders for any missing FX pairs
        for (const p of FX_PAIRS) {
          if (!present.has(p.label)) {
            const full = FX_NAMES[p.label];
            const display = full ? `${p.label} (${full})` : p.label;
            items.push({ type: 'fx', label: display, unavailable: true });
          }
        }
      }

      // Determine if we have any crypto data before appending crypto items
      const hasCrypto =
        btc.status === 'fulfilled' || eth.status === 'fulfilled' || bnb.status === 'fulfilled' || xrp.status === 'fulfilled';

      // Insert animated separator if both FX and Crypto are present
      if (fxSet.status === 'fulfilled' && fxSet.value.length && hasCrypto) {
        items.push({ type: 'sep', label: 'Crypto' });
      }

      let addedBinance = false;
      if (btc.status === 'fulfilled') {
        const btcUsd = btc.value.priceUsd;
        const btcChange = btc.value.changePct24h;
        const btcInr = usdInr ? btcUsd * usdInr : null;
        items.push({ type: 'crypto', symbol: 'BTC', label: `BTC (${CRYPTO_NAMES.BTC})`, value: btcInr ? fmtINR(btcInr) : `$${fmtNum(btcUsd, 2)} USD`, changePct: typeof btcChange === 'number' ? btcChange : null });
        addedBinance = true;
      } else {
        items.push({ type: 'crypto', symbol: 'BTC', label: `BTC (${CRYPTO_NAMES.BTC})`, unavailable: true });
      }
      if (eth.status === 'fulfilled') {
        const ethUsd = eth.value.priceUsd;
        const ethChange = eth.value.changePct24h;
        const ethInr = usdInr ? ethUsd * usdInr : null;
        items.push({ type: 'crypto', symbol: 'ETH', label: `ETH (${CRYPTO_NAMES.ETH})`, value: ethInr ? fmtINR(ethInr) : `$${fmtNum(ethUsd, 2)} USD`, changePct: typeof ethChange === 'number' ? ethChange : null });
        addedBinance = true;
      } else {
        items.push({ type: 'crypto', symbol: 'ETH', label: `ETH (${CRYPTO_NAMES.ETH})`, unavailable: true });
      }
      if (bnb.status === 'fulfilled') {
        const bnbUsd = bnb.value.priceUsd;
        const bnbChange = bnb.value.changePct24h;
        const bnbInr = usdInr ? bnbUsd * usdInr : null;
        items.push({ type: 'crypto', symbol: 'BNB', label: `BNB (${CRYPTO_NAMES.BNB})`, value: bnbInr ? fmtINR(bnbInr) : `$${fmtNum(bnbUsd, 2)} USD`, changePct: typeof bnbChange === 'number' ? bnbChange : null });
        addedBinance = true;
      } else {
        items.push({ type: 'crypto', symbol: 'BNB', label: `BNB (${CRYPTO_NAMES.BNB})`, unavailable: true });
      }
      if (xrp.status === 'fulfilled') {
        const xrpUsd = xrp.value.priceUsd;
        const xrpChange = xrp.value.changePct24h;
        const xrpInr = usdInr ? xrpUsd * usdInr : null;
        items.push({ type: 'crypto', symbol: 'XRP', label: `XRP (${CRYPTO_NAMES.XRP})`, value: xrpInr ? fmtINR(xrpInr) : `$${fmtNum(xrpUsd, 4)} USD`, changePct: typeof xrpChange === 'number' ? xrpChange : null });
        addedBinance = true;
      } else {
        items.push({ type: 'crypto', symbol: 'XRP', label: `XRP (${CRYPTO_NAMES.XRP})`, unavailable: true });
      }
      if (addedBinance) sources.push('Binance');

      if (!items.length) {
        throw new Error('No data available');
      }

      // Persist snapshot for offline fallback
      try {
        const snapshot = { ts: Date.now(), items, sources };
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      } catch (_) { /* ignore quota or serialization errors */ }

      // Render and animate
      renderItems(items);
      updateMeta(sources);

      // Ensure track layout is row with gaps
      track.style.display = 'inline-flex';
      track.style.gap = '1rem';
      track.style.whiteSpace = 'nowrap';
      track.style.alignItems = 'center';
      track.style.padding = '0';
      track.style.margin = '0';
      track.style.willChange = 'transform';
      track.style.transform = 'translateX(0)';

      startMarquee();
    } catch (err) {
      console.error(err);
      // Try offline fallback from last snapshot
      try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (raw) {
          const snap = JSON.parse(raw);
          if (snap && Array.isArray(snap.items) && Array.isArray(snap.sources)) {
            renderItems(snap.items);
            const when = new Date(snap.ts).toLocaleString();
            meta.textContent = `Last updated ${when} • Offline cache`;

            // Ensure track styles and animation
            track.style.display = 'inline-flex';
            track.style.gap = '1rem';
            track.style.whiteSpace = 'nowrap';
            track.style.alignItems = 'center';
            track.style.padding = '0';
            track.style.margin = '0';
            track.style.willChange = 'transform';
            track.style.transform = 'translateX(0)';

            startMarquee();
            return; // done with offline render
          }
        }
      } catch (_) { /* ignore parse errors */ }

      // No snapshot available — show error message
      meta.textContent = 'Failed to fetch data';
      track.innerHTML = '<span class="text-xs text-rose-600 dark:text-rose-400">Unable to load market ticker.</span>';
    }
  }

  // Initialize after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();