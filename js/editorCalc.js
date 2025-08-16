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
  let lastAns = 0;

  function insert(text) {
    if (!display) return;
    const start = display.selectionStart ?? display.value.length;
    const end = display.selectionEnd ?? display.value.length;
    const before = display.value.slice(0, start);
    const after = display.value.slice(end);
    display.value = before + text + after;
    const pos = start + text.length;
    display.setSelectionRange(pos, pos);
    display.focus();
  }

  function sanitize(expr) {
    expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    if (!/^[-+*/().\d\s]+$/.test(expr)) return null;
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
      history.textContent = expr + ' =';
      display.value = String(result);
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
        break;
      case 'BS':
        if (display.selectionStart !== undefined && display.selectionStart !== display.selectionEnd) {
          insert('');
        } else {
          const pos = display.selectionStart ?? display.value.length;
          if (pos > 0) {
            display.value = display.value.slice(0, pos - 1) + display.value.slice(display.selectionEnd ?? pos);
            const newPos = pos - 1;
            display.setSelectionRange(newPos, newPos);
          }
        }
        break;
      case 'ANS': {
        const pos = display.selectionStart ?? display.value.length;
        const before = display.value.slice(0, pos);
        if (/\bANS$/i.test(before)) return;
        insert('ANS');
        break;
      }
      case 'EQ':
        evaluateExpr();
        break;
      default:
        insert(key);
    }
  }

  // Clicks
  root.querySelectorAll('button[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-key');
      handleButton(k);
    });
  });

  // Keyboard support (scope to calculator display only)
  if (display) {
    display.addEventListener('keydown', (e) => {
      const key = e.key;
      if (/[0-9]/.test(key) || ['+', '-', '*', '/', '(', ')', '.'].includes(key)) {
        handleButton(key);
        e.preventDefault();
      } else if (key === 'Enter' || key === '=') {
        evaluateExpr();
        e.preventDefault();
      } else if (key === 'Backspace') {
        handleButton('BS');
        e.preventDefault();
      } else if (key === '%') {
        handleButton('%');
        e.preventDefault();
      } else if (key === 'Escape') {
        handleButton('C');
        e.preventDefault();
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEditor();
  setupBasicCalculator();
});
