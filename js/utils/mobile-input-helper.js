// Mobile input focus scrolling functionality
// Ensures focused inputs are visible on mobile (avoid being hidden by keyboard)

export function setupInputFocusScroll() {
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const vv = window.visualViewport || null;
    
    // Track manual user scrolling to avoid snapping back to the focused input
    let userScrolling = false;
    let userScrollTimer = null;
    
    // Helper: is a text-editing control (likely to summon keyboard/caret)
    const isTextualInput = (el) => !!el && el.matches && el.matches('textarea, input:not([type]), input[type="text"], input[type="number"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], input[type="password"]');
    
    const onUserScroll = () => {
        userScrolling = true;
        clearTimeout(userScrollTimer);
        userScrollTimer = setTimeout(() => { userScrolling = false; }, 500);
    };
    
    // Debounced scroll handler for better performance
    let scrollTimeout;
    const debouncedScrollHandler = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(onUserScroll, 16); // ~60fps
    };
    
    // Only blur on explicit user gesture scrolls (wheel/touchmove), not generic scrolls
    const onGestureScroll = () => {
        userScrolling = true;
        clearTimeout(userScrollTimer);
        if (activeEl && isTextualInput(activeEl)) {
            try { activeEl.blur(); } catch (e) {}
            activeEl = null;
        }
        userScrollTimer = setTimeout(() => { userScrolling = false; }, 500);
    };

    const getHeaderOffset = () => {
        const header = document.querySelector('header');
        // Add small padding for comfort
        return (header ? header.getBoundingClientRect().height : 96) + 8;
    };

    // Keyboard height helper (when visualViewport is available)
    const getKeyboardHeight = () => {
        if (!vv) return 0;
        const kb = (window.innerHeight - vv.height - (vv.offsetTop || 0));
        return Math.max(0, kb);
    };

    let activeEl = null;
    let scheduleTimer = null;

    const scheduleScroll = () => {
        if (!activeEl) return;
        // If user is actively scrolling, do not auto-correct position
        if (userScrolling) return;
        clearTimeout(scheduleTimer);
        scheduleTimer = setTimeout(() => {
            // Use rAF to read/layout just-in-time
            requestAnimationFrame(() => {
                if (!activeEl) return;
                const rect = activeEl.getBoundingClientRect();
                const viewportHeight = vv ? vv.height : window.innerHeight;
                const viewportTopOffset = vv ? vv.offsetTop : 0;
                const topThreshold = getHeaderOffset();
                const bottomThreshold = (viewportHeight + viewportTopOffset) - 20;

                const isAbove = (rect.top - viewportTopOffset) < topThreshold;
                const isBelow = (rect.bottom - viewportTopOffset) > bottomThreshold;

                if (!isAbove && !isBelow) return; // Already comfortably visible

                let target;
                if (isAbove) {
                    target = window.scrollY + rect.top - topThreshold;
                } else {
                    const minimalTop = window.scrollY + (rect.bottom - bottomThreshold);
                    const oneThirdTop = window.scrollY + (rect.top - viewportTopOffset) - (viewportHeight / 3);
                    target = Math.max(0, Math.min(minimalTop, oneThirdTop));
                }

                const current = window.scrollY;
                // Only scroll if the difference is significant (prevents micro-scrolls)
                if (Math.abs(current - target) > 5) {
                    window.scrollTo({ top: target, behavior: prefersReduce ? 'auto' : 'smooth' });
                }
            });
        }, isIOS ? 280 : 120);
    };

    const onFocusIn = (e) => {
        const el = e.target;
        if (!el || !(el instanceof Element)) return;
        if (!el.matches('input, textarea, select')) return;
        activeEl = el;

        // Handle input focus for scrolling
        scheduleScroll();
    };

    const onFocusOut = (e) => {
        if (e.target === activeEl) {
            activeEl = null;
            clearTimeout(scheduleTimer);
            scheduleTimer = null;
        }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    
    // Observe manual scrolling gestures
    window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    window.addEventListener('wheel', onGestureScroll, { passive: true });
    window.addEventListener('touchmove', onGestureScroll, { passive: true });

    // If the user taps/presses on a slider/range control, proactively blur any text input
    const onPreInteract = (e) => {
        const t = e.target;
        const isRange = t && (t.matches && (t.matches('input[type="range"], .range-slider')));
        if (!isRange) return;
        if (activeEl && isTextualInput(activeEl) && activeEl !== t) {
            // Prevent the browser from auto-scrolling the old focused text field back into view
            try { activeEl.blur(); } catch (err) {}
            activeEl = null;
            // Temporarily mark as user scrolling to disable scheduled auto-scroll
            userScrolling = true;
            clearTimeout(userScrollTimer);
            userScrollTimer = setTimeout(() => { userScrolling = false; }, 400);
        }
    };
    document.addEventListener('pointerdown', onPreInteract, { passive: true, capture: true });
    document.addEventListener('touchstart', onPreInteract, { passive: true, capture: true });

    // Reposition on visual viewport changes (keyboard height/movement)
    if (vv) {
        // Maintain a padding-bottom so content can scroll above the keyboard reliably
        const applyKeyboardPadding = () => {
            const kb = getKeyboardHeight();
            document.body.style.paddingBottom = kb > 0 ? (kb + 8) + 'px' : '';
        };
        applyKeyboardPadding();

        let vvTimer = null;
        const onVVChange = () => {
            applyKeyboardPadding();
            if (!activeEl) return;
            // Do not interfere if user is manually scrolling
            if (userScrolling) return;
            // Only reposition when the on-screen keyboard is actually visible
            const kbNow = getKeyboardHeight();
            if (kbNow <= 0) return;
            clearTimeout(vvTimer);
            vvTimer = setTimeout(() => {
                scheduleScroll();
            }, isIOS ? 150 : 75);
        };
        vv.addEventListener('resize', onVVChange);
        vv.addEventListener('scroll', onVVChange);
    }
}
