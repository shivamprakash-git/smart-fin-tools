// Editor + Calculator bundle

// Simple Text Editor with autosave, clear, and download
function setupEditor() {
  const editor = document.getElementById('editor-area');
  if (!editor) return;

  const STORAGE_KEY = 'smartfin.editor.v1';
  const stripTags = (s) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '') : '';
  const indicator = document.getElementById('editor-save-indicator');
  let savedIndicatorTimer;
  const showSaved = () => {
    if (!indicator) return;
    indicator.classList.remove('opacity-0');
    indicator.classList.add('opacity-100');
    clearTimeout(savedIndicatorTimer);
    savedIndicatorTimer = setTimeout(() => {
      indicator.classList.add('opacity-0');
      indicator.classList.remove('opacity-100');
    }, 1500);
  };

  // Load saved content
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) editor.value = stripTags(saved);
  } catch {}

  // Toolbar actions
  const toolbar = editor.closest('.space-y-3')?.querySelectorAll('[data-editor-act]') || [];
  toolbar.forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-editor-act');
      editor.focus();
      switch (act) {
        case 'clear':
          editor.value = '';
          // Persist empty state so cleared editor stays cleared across reloads
          try { localStorage.setItem(STORAGE_KEY, ''); } catch {}
          showSaved();
          break;
        case 'download': {
          // Normalize line endings for portability
          const text = editor.value.replace(/\r\n/g, '\n');
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
          a.download = `notes-${ts}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          break;
        }
      }
    });
  });

  // Autosave (debounced)
  let t;
  const save = (showIndicator = true) => {
    try {
      const normalized = editor.value.replace(/\r\n/g, '\n');
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}
    if (showIndicator) showSaved();
  };
  const debounced = () => { clearTimeout(t); t = setTimeout(save, 400); };
  editor.addEventListener('input', debounced);

  // Flush pending saves when page is hidden or unloading to avoid data loss
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(t);
      // Avoid indicator flash during tab switches/refresh
      save(false);
    }
  });
  window.addEventListener('beforeunload', () => {
    clearTimeout(t);
    // Avoid indicator flash during unload/refresh
    save(false);
  });
}

// Basic Calculator with BODMAS via JS operator precedence
function setupBasicCalculator() {
  const root = document.getElementById('clock-calc');
  if (!root) return;
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');
  const caretViz = document.getElementById('calc-caret-display');
  const caretPosEl = document.getElementById('calc-caret-pos');
  let lastAns = 0;
  let caretPos = 0; // internal caret for read-only display

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  // Measure helper to check if a value would overflow the display box
  let measureEl;
  function ensureMeasure() {
    if (measureEl || !display) return;
    measureEl = document.createElement('span');
    // Keep offscreen but measurable
    measureEl.style.position = 'absolute';
    measureEl.style.visibility = 'hidden';
    measureEl.style.whiteSpace = 'pre';
    measureEl.style.top = '-9999px';
    measureEl.style.left = '-9999px';
    // Copy relevant typography from the input for accurate width
    const cs = getComputedStyle(display);
    measureEl.style.fontFamily = cs.fontFamily;
    measureEl.style.fontSize = cs.fontSize;
    measureEl.style.fontWeight = cs.fontWeight;
    measureEl.style.letterSpacing = cs.letterSpacing;
    document.body.appendChild(measureEl);
  }

  function fitsValue(val) {
    if (!display) return true;
    ensureMeasure();
    measureEl.textContent = val;
    // Add a tiny epsilon to account for subpixel rounding
    const epsilon = 2;
    return measureEl.offsetWidth <= (display.clientWidth - epsilon);
  }

  function renderCaret() {
    if (!display) return;
    // Prefer the real selection when focused, fallback to internal caretPos
    const isFocused = document.activeElement === display;
    const selPos = isFocused && display.selectionStart != null ? display.selectionStart : caretPos;
    caretPos = clamp(selPos, 0, display.value.length);
    if (caretPosEl) caretPosEl.textContent = `Pos: ${caretPos}`;
  }

  function insert(text) {
    if (!display) return;
    const isFocused = document.activeElement === display;
    const start = isFocused ? (display.selectionStart ?? display.value.length) : caretPos;
    const end = isFocused ? (display.selectionEnd ?? display.value.length) : caretPos;
    const before = display.value.slice(0, start);
    const after = display.value.slice(end);
    const nextVal = before + text + after;
    if (!fitsValue(nextVal)) {
      // Provide subtle feedback via history line
      if (history) {
        history.textContent = 'Max width reached';
        setTimeout(() => { if (history.textContent === 'Max width reached') history.textContent = ''; }, 700);
      }
      return;
    }
    display.value = nextVal;
    const pos = start + text.length;
    // Avoid caret/focus operations when disabled
    if (isFocused && !display.disabled) {
      try { display.setSelectionRange(pos, pos); } catch {}
      try { display.focus(); } catch {}
    }
    if (!isFocused) {
      caretPos = pos;
      renderCaret();
    }
  }

  function sanitize(expr) {
    // Normalize pretty symbols to operators for evaluation
    expr = expr.replace(/[×]/g, '*').replace(/[÷]/g, '/');
    expr = expr.replace(/(\d+(?:\.\d+)?)%(?!\s*[\d(])/g, '($1/100)');
    // Allow modulus operator '%'
    if (!/^[-+*/()%().\d\s]+$/.test(expr)) return null;
    return expr;
  }

  function evaluateExpr() {
    if (!display) return;
    let expr = display.value.trim();
    if (!expr) return;
    expr = expr.replace(/\bANS\b/gi, String(lastAns));
    const sanitized = sanitize(expr);
    if (sanitized == null) {
      history.textContent = 'Invalid input';
      return;
    }
    try {
      // eslint-disable-next-line no-new-func
      let result = Function('"use strict"; return (' + sanitized + ')')();
      if (!isFinite(result)) throw new Error('Math error');
      result = parseFloat(result.toFixed(10));
      // Keep a full string for tooltip/accessibility
      const fullOut = String(result);
      history.textContent = expr + ' =';
      // Format to fit the display width if necessary
      let out = String(result);
      if (!fitsValue(out) && typeof result === 'number') {
        // Try reducing decimals
        if (!Number.isInteger(result)) {
          for (let d = 9; d >= 0; d--) {
            out = result.toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
            if (fitsValue(out)) break;
          }
        }
        // If still too long, try exponential with decreasing precision
        if (!fitsValue(out)) {
          for (let d = 10; d >= 0; d--) {
            out = result.toExponential(d).replace(/\.0+e/,'e');
            if (fitsValue(out)) break;
          }
        }
      }
      display.value = out;
      // If we compacted the value, hint with approximation and tooltip
      if (out !== fullOut) {
        if (history) history.textContent = expr + ' = \u2248 ' + out; // ≈
        if (display) {
          display.title = fullOut;
          display.setAttribute('aria-label', `Result approximately ${out}. Full value ${fullOut}`);
        }
      } else {
        if (display) {
          display.title = fullOut;
          display.setAttribute('aria-label', `Result ${fullOut}`);
        }
      }
      lastAns = result;
    } catch (e) {
      history.textContent = 'Error';
    }
  }

  function handleButton(key) {
    switch (key) {
      case 'C':
        display.value = '';
        history.textContent = '';
        caretPos = 0;
        renderCaret();
        break;
      case 'BS': {
        const isFocused = document.activeElement === display;
        if (isFocused && !display.disabled && display.selectionStart !== undefined && display.selectionStart !== display.selectionEnd) {
          insert('');
        } else {
          const pos = isFocused ? (display.selectionStart ?? display.value.length) : caretPos;
          if (pos > 0) {
            display.value = display.value.slice(0, pos - 1) + display.value.slice(display.selectionEnd ?? pos);
            const newPos = pos - 1;
            if (isFocused && !display.disabled) {
              try { display.setSelectionRange(newPos, newPos); } catch {}
            }
            if (!isFocused) {
              caretPos = newPos;
              renderCaret();
            }
          }
        }
        break;
      }
      case 'ANS': {
        const isFocused = document.activeElement === display;
        const pos = isFocused ? (display.selectionStart ?? display.value.length) : caretPos;
        const before = display.value.slice(0, pos);
        if (/\bANS$/i.test(before)) return;
        insert('ANS');
        break;
      }
      case 'EQ':
        evaluateExpr();
        // Move caret to end after evaluation
        caretPos = display.value.length;
        renderCaret();
        break;
      default:
        // Show pretty symbols for multiply/divide
        if (key === '*') insert('×');
        else if (key === '/') insert('÷');
        else insert(key);
    }
  }

  // Clicks
  root.querySelectorAll('button[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-key');
      handleButton(k);
      // Ensure input keeps focus so caret remains visible
      if (display && !display.disabled) {
        try {
          display.focus();
          const pos = clamp(caretPos, 0, display.value.length);
          display.setSelectionRange(pos, pos);
        } catch {}
      }
    });
  });

  // Caret navigation buttons
  const prevBtn = document.getElementById('calc-prev');
  const nextBtn = document.getElementById('calc-next');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    const isFocused = document.activeElement === display;
    const current = isFocused && display.selectionStart != null ? display.selectionStart : caretPos;
    const pos = clamp(current - 1, 0, display.value.length);
    if (isFocused && !display.disabled) {
      try { display.setSelectionRange(pos, pos); } catch {}
      try { display.focus(); } catch {}
    } else {
      caretPos = pos;
    }
    renderCaret();
    if (display && !display.disabled) {
      try { display.focus(); display.setSelectionRange(caretPos, caretPos); } catch {}
    }
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const isFocused = document.activeElement === display;
    const current = isFocused && display.selectionStart != null ? display.selectionStart : caretPos;
    const pos = clamp(current + 1, 0, display.value.length);
    if (isFocused && !display.disabled) {
      try { display.setSelectionRange(pos, pos); } catch {}
      try { display.focus(); } catch {}
    } else {
      caretPos = pos;
    }
    renderCaret();
    if (display && !display.disabled) {
      try { display.focus(); display.setSelectionRange(caretPos, caretPos); } catch {}
    }
  });

  // Disable text entry from keyboard; allow only on-screen buttons
  if (display) {
    // Prevent the soft keyboard on mobile
    display.setAttribute('inputmode', 'none');
    // Block any keyboard interaction altogether
    display.addEventListener('keydown', (e) => {
      e.preventDefault();
    });
    display.addEventListener('beforeinput', (e) => e.preventDefault());
    display.addEventListener('paste', (e) => e.preventDefault());
    display.addEventListener('drop', (e) => e.preventDefault());
    // Allow focus so native caret is visible; typing is blocked by handlers above
  }

  // Initialize caret visuals
  caretPos = display?.value.length || 0;
  renderCaret();
  // Focus input on init so caret blinks at end
  if (display && !display.disabled) {
    try {
      display.focus();
      const pos = clamp(caretPos, 0, display.value.length);
      display.setSelectionRange(pos, pos);
    } catch {}
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEditor();
  setupBasicCalculator();
});
