(function(){
  const API = 'https://financialmodelingprep.com/api/v3/quotes/index?apikey=demo';
  // Target broader set of Indian indices. We'll try symbols first, then name match.
  const SYMBOLS = ['^NSEI','^BSESN','^NSEBANK','^CNXIT','^CNXMIDCAP','^CNXSMALLCAP'];
  const REFRESH_MS = 90_000; // 90s
  const SPEED_PX_PER_S = 70; // slightly faster for more items

  let animationId = null;
  let paused = false;
  let currentMarquee = null; // { track, clone, contentWidth, wrapper }

  // Simple debounce
  function debounce(fn, wait=200){
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
  }

  function qs(sel, root=document){ return root.querySelector(sel); }

  function formatNumber(n){
    try {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
    } catch { return String(n); }
  }

  function buildItem({ label, price, changePercent }) {
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-2 text-sm md:text-base';

    const name = document.createElement('span');
    name.className = 'font-semibold text-gray-800 dark:text-gray-100';
    name.textContent = label;

    const priceEl = document.createElement('span');
    priceEl.className = 'text-gray-600 dark:text-gray-200';
    priceEl.textContent = formatNumber(price);

    const chip = document.createElement('span');
    const up = typeof changePercent === 'number' && changePercent >= 0;
    chip.className = (up
      ? 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
      : 'px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300') + ' text-xs md:text-sm';
    chip.textContent = (up ? '+' : '') + (changePercent?.toFixed ? changePercent.toFixed(2) : changePercent) + '%';

    wrap.appendChild(name);
    wrap.appendChild(priceEl);
    wrap.appendChild(chip);
    return wrap;
  }

  async function fetchIndices() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Bad payload');
      // Map desired symbols
      const wanted = data.filter(d => SYMBOLS.includes(d.symbol));
      // Fallback: search by name if symbol mismatch
      const nameMap = {
        '^NSEI': ['NIFTY 50','Nifty 50','NIFTY50'],
        '^BSESN': ['BSE SENSEX','Sensex','SENSEX'],
        '^NSEBANK': ['NIFTY BANK','Bank Nifty','NIFTY BANK INDEX'],
        '^CNXIT': ['NIFTY IT','CNX IT','NIFTY INFORMATION TECHNOLOGY'],
        '^CNXMIDCAP': ['NIFTY MIDCAP 100','CNX MIDCAP','NIFTY MIDCAP'],
        '^CNXSMALLCAP': ['NIFTY SMALLCAP 100','CNX SMALLCAP','NIFTY SMALLCAP']
      };
      SYMBOLS.forEach(sym => {
        if (!wanted.find(w => w.symbol === sym)) {
          const alt = data.find(d => nameMap[sym]?.some(n => (d.name||'').toLowerCase().includes(n.toLowerCase())));
          if (alt) wanted.push(alt);
        }
      });
      return wanted.map(row => {
        const price = row.price ?? row.previousClose ?? row.open ?? 0;
        const prev = row.previousClose ?? row.prevClose ?? null;
        let cp = row.changesPercentage ?? row.changePercent;
        if ((cp === undefined || cp === null) && typeof price === 'number' && typeof prev === 'number' && prev) {
          cp = ((price - prev) / prev) * 100;
        }
        return {
          label: row.name || row.symbol,
          price,
          previousClose: prev,
          changePercent: typeof cp === 'number' ? cp : 0
        };
      }).filter(x => x.label);
    } catch (e) {
      // Graceful fallback with static sample so UI still works
      console.warn('Ticker fetch failed, using fallback:', e);
      return [
        { label: 'NIFTY 50', price: 24500.15, changePercent: 0.42 },
        { label: 'SENSEX', price: 81234.77, changePercent: -0.18 },
        { label: 'NIFTY BANK', price: 52123.4, changePercent: 0.25 },
        { label: 'NIFTY IT', price: 36987.1, changePercent: -0.35 }
      ];
    }
  }

  function setupMarquee(track) {
    // Duplicate content for seamless loop
    const wrapper = track.parentElement;
    // Ensure wrapper is relative for absolute children, and fix its height
    wrapper.style.position = 'relative';
    const contentWidth = track.scrollWidth;
    const height = track.offsetHeight;
    if (height) wrapper.style.height = height + 'px';

    const clone = track.cloneNode(true);
    // Mark clone for cleanup; keep it non-interactive when visible
    clone.dataset.tickerClone = '1';
    clone.style.pointerEvents = 'none';
    clone.style.userSelect = 'none';

    // Position both tracks absolutely to keep a single visual lane
    Object.assign(track.style, { position: 'absolute', left: '0px', top: '0px' });
    Object.assign(clone.style, { position: 'absolute', left: '0px', top: '0px' });

    wrapper.appendChild(clone);

    currentMarquee = { track, clone, contentWidth, wrapper };

    let x = 0;
    function step(ts){
      if (!step.last) step.last = ts;
      const dt = (ts - step.last) / 1000;
      step.last = ts;
      if (!paused) {
        x -= SPEED_PX_PER_S * dt;
        const total = contentWidth;
        if (Math.abs(x) >= total) x += total; // wrap
        track.style.transform = `translate3d(${x}px,0,0)`;
        clone.style.transform = `translate3d(${x + contentWidth}px,0,0)`;
      }
      animationId = requestAnimationFrame(step);
    }
    animationId = requestAnimationFrame(step);
  }

  function clearAnimation(){
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
  }

  function setPauseHandlers(el){
    // Only pause on hover; no selection/copy handling
    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
  }

  async function render() {
    const root = qs('#market-ticker');
    if (!root) return;
    const track = qs('#market-ticker-track');
    if (!track) return;

    // Clear existing
    track.innerHTML = '';

    const items = await fetchIndices();
    items.forEach(item => {
      const n = buildItem(item);
      const sep = document.createElement('span');
      sep.className = 'text-gray-300 dark:text-gray-500';
      sep.textContent = '·';
      track.appendChild(n);
      track.appendChild(sep);
    });
    if (track.lastChild) track.removeChild(track.lastChild); // remove trailing separator

    // Update meta: data source + last updated
    const meta = qs('#market-ticker-meta');
    if (meta) {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
      meta.textContent = `Not live data · Updated ${time}`;
      meta.title = 'Source: Financial Modeling Prep (demo). This feed is delayed.';
    }

    // Reset animation
    clearAnimation();
    // Remove previous clone if any
    const wrapper = track.parentElement;
    // Remove previous clones if any
    [...wrapper.querySelectorAll('[data-ticker-clone="1"]')].forEach(n => n.remove());
    track.style.transform = 'translateX(0)';

    // Defer to allow layout
    requestAnimationFrame(() => setupMarquee(track));
  }

  function startAutoRefresh(){
    setInterval(render, REFRESH_MS);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Pause on hover over the viewport
    const viewport = qs('#market-ticker-viewport');
    if (viewport) setPauseHandlers(viewport);
    render();
    startAutoRefresh();
    // Rebuild marquee on resize for consistent dimensions
    window.addEventListener('resize', debounce(() => {
      render();
    }, 200));
  });
})();
