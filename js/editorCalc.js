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

  // Toolbar actions & active state management
  const toolbarBtns = editor.closest('.space-y-3')?.querySelectorAll('[data-editor-act]') || [];

  function setBtnActive(btn, active) {
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    // Keep border always; switch colors per theme
    const activeClasses = [
      'bg-primary-100', 'text-primary-700', 'border-primary-400',
      'dark:bg-primary-900/30', 'dark:text-primary-200', 'dark:border-primary-600'
    ];
    const inactiveClasses = [
      'bg-white', 'text-gray-800', 'border-gray-300',
      'dark:bg-transparent', 'dark:text-gray-100', 'dark:border-gray-700'
    ];

    if (active) {
      inactiveClasses.forEach(c => btn.classList.remove(c));
      activeClasses.forEach(c => btn.classList.add(c));
      btn.classList.add('border');
    } else {
      activeClasses.forEach(c => btn.classList.remove(c));
      inactiveClasses.forEach(c => btn.classList.add(c));
      btn.classList.add('border');
    }
  }

  function getFormattingState() {
    const state = { bold: false, italic: false, underline: false, code: false };
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return state;
    let node = sel.anchorNode;
    // Prefer startContainer for collapsed consistency
    if (sel.getRangeAt(0)) node = sel.getRangeAt(0).startContainer;
    while (node && node !== editor) {
      if (node.nodeType === 1) {
        const tag = node.tagName;
        if (tag === 'B' || tag === 'STRONG') state.bold = true;
        if (tag === 'I' || tag === 'EM') state.italic = true;
        if (tag === 'U') state.underline = true;
        if (tag === 'CODE') state.code = true;
      }
      node = node.parentNode;
    }
    // Also consult execCommand state for caret-based styles
    try {
      state.bold = state.bold || document.queryCommandState('bold');
      state.italic = state.italic || document.queryCommandState('italic');
      state.underline = state.underline || document.queryCommandState('underline');
    } catch {}
    return state;
  }

  function updateToolbarState() {
    const st = getFormattingState();
    toolbarBtns.forEach(b => {
      const act = b.getAttribute('data-editor-act');
      if (act === 'bold') setBtnActive(b, !!st.bold);
      else if (act === 'italic') setBtnActive(b, !!st.italic);
      else if (act === 'underline') setBtnActive(b, !!st.underline);
      else if (act === 'monospace') setBtnActive(b, !!st.code);
    });
  }

  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-editor-act');
      editor.focus();
      switch (act) {
        case 'bold':
          document.execCommand('bold');
          break;
        case 'italic':
          document.execCommand('italic');
          break;
        case 'underline':
          document.execCommand('underline');
          break;
        case 'monospace': {
          // Preserve existing inline styles when entering code mode
          const prev = getFormattingState();
          toggleCodeInline();
          if (prev.bold) document.execCommand('bold');
          if (prev.italic) document.execCommand('italic');
          if (prev.underline) document.execCommand('underline');
          break;
        }
        case 'clear': {
          // Preserve current formatting states
          const before = getFormattingState();
          // Clear content but keep caret in editor
          editor.innerHTML = '';
          const placeholder = document.createTextNode('\u200B');
          editor.appendChild(placeholder);
          const rng = document.createRange();
          rng.setStart(placeholder, 1);
          rng.collapse(true);
          const sel = document.getSelection();
          sel.removeAllRanges();
          sel.addRange(rng);
          // Re-apply formatting modes for continued typing
          if (before.code) {
            toggleCodeInline(); // enters code mode at caret
          }
          if (before.bold) document.execCommand('bold');
          if (before.italic) document.execCommand('italic');
          if (before.underline) document.execCommand('underline');
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          break;
        }
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
      updateToolbarState();
    });
  });

  // Inline CODE toggler that supports collapsed caret typing
  function toggleCodeInline() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);

    // Helper: find nearest CODE ancestor within editor
    const getCodeAncestor = (n) => {
      let node = n;
      while (node && node !== editor) {
        if (node.nodeType === 1 && node.tagName === 'CODE') return node;
        node = node.parentNode;
      }
      return null;
    };

    const codeAncestor = getCodeAncestor(range.startContainer);

    if (range.collapsed) {
      if (codeAncestor) {
        // Exit code: unwrap and place caret where code was
        const el = codeAncestor;
        const parent = el.parentNode;
        const marker = document.createTextNode('\u200B');
        parent.insertBefore(marker, el.nextSibling);
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        const newRange = document.createRange();
        newRange.setStartBefore(marker);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        // cleanup marker soon
        setTimeout(() => { marker.parentNode && marker.parentNode.removeChild(marker); }, 0);
        return true;
      } else {
        // Enter code: insert empty <code> and move caret inside
        const code = document.createElement('code');
        code.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        code.appendChild(document.createTextNode('\u200B'));
        range.insertNode(code);
        const newRange = document.createRange();
        newRange.setStart(code.firstChild, 1); // after zwnbsp for nicer typing
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        return true;
      }
    }

    // Non-collapsed: toggle wrap/unwrap
    if (codeAncestor && codeAncestor.contains(range.commonAncestorContainer)) {
      // Unwrap selected code block (if selection inside a single code)
      const el = codeAncestor;
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return true;
    } else {
      try {
        const el = document.createElement('code');
        el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        range.surroundContents(el);
        return true;
      } catch {
        const contents = range.extractContents();
        const el = document.createElement('code');
        el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        el.appendChild(contents);
        range.insertNode(el);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(el);
        sel.addRange(newRange);
        return true;
      }
    }
  }

  // Autosave (debounced)
  let t;
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, editor.innerHTML); } catch {}
  };
  const debounced = () => { clearTimeout(t); t = setTimeout(save, 400); };
  editor.addEventListener('input', debounced);

  // Keep toolbar state in sync with selection/caret
  document.addEventListener('selectionchange', () => {
    if (!editor.contains(document.activeElement) && !editor.contains((document.getSelection()?.anchorNode || null))) return;
    updateToolbarState();
  });

  // Keyboard shortcuts (use execCommand for live typing + undo/redo integration)
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); document.execCommand('bold'); updateToolbarState(); }
      if (k === 'i') { e.preventDefault(); document.execCommand('italic'); updateToolbarState(); }
      if (k === 'u') { e.preventDefault(); document.execCommand('underline'); updateToolbarState(); }
    }
  });

  // Initial toolbar sync
  updateToolbarState();
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
