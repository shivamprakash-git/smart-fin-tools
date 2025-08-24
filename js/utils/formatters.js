// Utility functions for formatting and validation

// Format currency with decimals
export function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

// Show ∞ only when the value is actually non-finite
export function formatCurrencyOrInfinity(amount) {
    if (!isFinite(amount)) {
        return '∞';
    }
    return formatCurrency(amount);
}

// Compact Indian-style formatter for very large values (for charts/tooltips)
// Uses full unit names: Thousand, Lakh, Crore, Arab, Kharab, Neel, Padma, Shankh
// Keeps output readable while using full names per request
export function formatIndianCompact(value, withCurrency = true) {
    if (!isFinite(value)) return '∞';
    const sign = value < 0 ? '-' : '';
    const n = Math.abs(value);

    // Thresholds (descending)
    const units = [
        { v: 1e17, s: 'Shankh' },
        { v: 1e15, s: 'Padma'  },
        { v: 1e13, s: 'Neel'   },
        { v: 1e11, s: 'Kharab' },
        { v: 1e9,  s: 'Arab'   },
        { v: 1e7,  s: 'Crore'  },
        { v: 1e5,  s: 'Lakh'   },
        { v: 1e3,  s: 'Thousand' }
    ];

    let out;
    for (const u of units) {
        if (n >= u.v) {
            out = (n / u.v);
            break;
        }
    }
    if (out === undefined) {
        // For small values, keep 2 decimals and Indian grouping with full currency
        const small = withCurrency ? formatCurrency(n) : n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        return sign + small;
    }

    // If the ratio itself is enormous (beyond top named unit coverage), avoid 'e' notation
    let str;
    if (out >= 1e9) {
        // Use exponential then convert to mantissa × 10^exp
        const expStr = out.toExponential(2); // e.g., 3.45e+12
        const match = expStr.match(/([\d.]+)e\+?(\d+)/i);
        if (match) {
            const mantissa = match[1].replace(/\.00?$/,'');
            const exp = match[2];
            const unit = units.find(u => n >= u.v).s;
            const prefix = withCurrency ? '₹' : '';
            return `${sign}${prefix}${mantissa} × 10^${exp} ${unit}`;
        }
        // Fallback if parsing fails
        str = out.toString();
    } else {
        // Format with up to 2 decimals, strip trailing zeros
        str = out.toFixed(out >= 100 ? 0 : out >= 10 ? 1 : 2).replace(/\.00?$|0$/,'');
    }

    const unit = units.find(u => n >= u.v).s;
    const prefix = withCurrency ? '₹' : '';
    return `${sign}${prefix}${str} ${unit}`;
}

export function formatCurrencyCompact(amount) {
    return formatIndianCompact(amount, true);
}

// Validate number inputs
export function validateNumberInput(input, min, max) {
    let value = parseFloat(input.value);
    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;
    input.value = value;
    return value;
}

// Clamp helper for live typing without forcing when empty
export function clampInputIfOutOfRange(input, min, max) {
    const raw = input.value;
    const v = parseFloat(raw);
    if (isNaN(v)) return null; // allow empty/partial input while typing
    let clamped = v;
    if (v < min) clamped = min;
    if (v > max) clamped = max;
    if (clamped !== v) input.value = clamped;
    return clamped;
}

// Exponential slider mapping helpers for large monetary ranges
// We normalize slider range to [0..1000] steps for smooth control, while mapping
// to [minAmount..maxAmount] exponentially so early movement changes slowly.
export const SLIDER_NORM_MIN = 0;
export const SLIDER_NORM_MAX = 1000; // 1001 discrete positions

export function amountFromSliderPos(pos, minAmount, maxAmount) {
    const minA = Math.max(1, minAmount);
    const p = Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
    // Early discrete ladder: 1, 500, 1000, ..., 10000
    const EARLY_STEPS = [1, ...Array.from({ length: 20 }, (_, i) => 500 * (i + 1))]; // 1, 500..10000
    const EARLY_ZONE_POS = EARLY_STEPS.length - 1; // one slider tick per early step
    if (p <= EARLY_ZONE_POS) {
        const idx = Math.max(0, Math.min(EARLY_STEPS.length - 1, Math.round(p)));
        const val = EARLY_STEPS[idx];
        return Math.max(minA, val);
    }
    // Exponential mapping for the remaining positions from last early to max
    const startVal = Math.max(minA, EARLY_STEPS[EARLY_STEPS.length - 1]); // typically 10000
    const span = SLIDER_NORM_MAX - EARLY_ZONE_POS;
    const t2 = (p - EARLY_ZONE_POS) / span; // 0..1
    const ratio = maxAmount / startVal;
    return startVal * Math.pow(ratio, t2);
}

export function sliderPosFromAmount(amount, minAmount, maxAmount) {
    const minA = Math.max(1, minAmount);
    const a = Math.min(maxAmount, Math.max(minA, amount));
    const EARLY_STEPS = [1, ...Array.from({ length: 20 }, (_, i) => 500 * (i + 1))];
    const EARLY_ZONE_POS = EARLY_STEPS.length - 1;
    const lastEarly = Math.max(minA, EARLY_STEPS[EARLY_STEPS.length - 1]);
    if (a <= lastEarly) {
        // Map to closest early step index; each index equals one slider tick
        let idx = 0;
        for (let i = 0; i < EARLY_STEPS.length; i++) {
            if (a >= Math.max(minA, EARLY_STEPS[i])) idx = i; else break;
        }
        const pos = idx; // direct mapping
        return Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
    }
    // Exponential region inverse mapping
    const span = SLIDER_NORM_MAX - EARLY_ZONE_POS;
    const ratio = maxAmount / lastEarly;
    const t2 = Math.log(a / lastEarly) / Math.log(ratio); // 0..1
    const pos = Math.round(EARLY_ZONE_POS + t2 * span);
    return Math.min(SLIDER_NORM_MAX, Math.max(SLIDER_NORM_MIN, pos));
}

// Round to a "nice" step depending on magnitude (to avoid odd decimals)
export function roundNiceAmount(n) {
    // Start with 1, then jump to 500, 1000, 1500, ...
    if (n < 500) return 1;
    if (n < 10000) return Math.round(n / 500) * 500; // 500-steps up to <10k
    if (n < 100000) return Math.round(n / 1000) * 1000; // 1k steps
    if (n < 1000000) return Math.round(n / 5000) * 5000; // 5k steps
    if (n < 10000000) return Math.round(n / 10000) * 10000; // 10k steps
    if (n < 100000000) return Math.round(n / 50000) * 50000; // 50k steps
    if (n < 1000000000) return Math.round(n / 100000) * 100000; // 1 lakh steps
    return Math.round(n / 500000) * 500000; // 5 lakh steps and above
}
