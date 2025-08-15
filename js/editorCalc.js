// Editor + Calculator bundle

// Text Editor with toolbar, autosave, and download
function setupEditor() {
  const editor = document.getElementById('editor-area');
  if (!editor) return;

  const STORAGE_KEY = 'smartfin.editor.v1';

  // Load saved content
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) editor.innerHTML = saved;
  } catch {}

  // Toolbar actions
  const toolbar = editor.closest('.space-y-3')?.querySelectorAll('[data-editor-act]') || [];
  toolbar.forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-editor-act');
      editor.focus();
      switch (act) {
        case 'bold':
          toggleInlineTag('STRONG');
          break;
        case 'italic':
          toggleInlineTag('EM');
          break;
        case 'underline':
          toggleInlineTag('U');
          break;
        case 'monospace': {
          // Toggle code formatting: wrap/unwrap in <code>
          // Fallback: use document.execCommand('formatBlock', false, 'pre') for block mono
          toggleInlineTag('CODE');
          break;
        }
        case 'clear':
          editor.innerHTML = '';
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          break;
        case 'download': {
          const text = editor.innerText.replace(/\u00A0/g, ' ');
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

  // Simple inline code toggler for selection
  function toggleInlineTag(tagName) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;

    // Check if selection is within the tag
    let node = sel.anchorNode;
    while (node && node !== editor && node.nodeType === 1 && node.tagName !== tagName) node = node.parentNode;
    if (node && node.tagName === tagName) {
      // Unwrap this tag
      const el = node;
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return true;
    }

    // Wrap selection in the tag
    try {
      const el = document.createElement(tagName.toLowerCase());
      if (tagName === 'CODE') {
        el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      }
      range.surroundContents(el);
      return true;
    } catch {
      // Fallback: wrap using extract/insert for complex ranges
      const contents = range.extractContents();
      const el = document.createElement(tagName.toLowerCase());
      if (tagName === 'CODE') {
        el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      }
      el.appendChild(contents);
      range.insertNode(el);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(el);
      sel.addRange(newRange);
      return true;
    }
  }

  // Autosave (debounced)
  let t;
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, editor.innerHTML); } catch {}
  };
  const debounced = () => { clearTimeout(t); t = setTimeout(save, 400); };
  editor.addEventListener('input', debounced);

  // Keyboard shortcuts without execCommand
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); toggleInlineTag('STRONG'); }
      if (k === 'i') { e.preventDefault(); toggleInlineTag('EM'); }
      if (k === 'u') { e.preventDefault(); toggleInlineTag('U'); }
    }
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

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    if (!display) return;
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEditor();
  setupBasicCalculator();
});
