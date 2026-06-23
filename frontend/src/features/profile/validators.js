export function isRequired(value) {
    return String(value ?? '').trim().length > 0;
  }
  
  export function isTenDigitPhone(value) {
    return !value || /^\d{10}$/.test(value);
  }
  
  // S2-BR-015 — for dated entries in Experience/Education.
  export function endNotBeforeStart(start, end) {
    if (!start || !end) return true;
    return new Date(end) >= new Date(start);
  }
  
  // S2-BR-016 — for the Skills section. Case/space-insensitive.
  export function hasNoDuplicates(list) {
    const seen = new Set();
    for (const item of list ?? []) {
      const key = String(item).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }