// Everything is kept in this browser's localStorage under one versioned key.
// If storage is blocked, the app keeps working in memory without saving.

const Storage = (() => {
  const KEY = 'excitement-compass-v1';
  const SCHEMA_VERSION = 2;

  let available = true;

  function emptyData() {
    return {
      sessions: [],
      river: [],
      // Saved options and the categories they are sorted into. null until
      // the app first builds it (see ensureLibrary in app.js).
      library: null,
      settings: { theme: 'system', schemaVersion: SCHEMA_VERSION },
    };
  }

  // Fill in anything missing so older or partial data is always safe to use.
  function normalise(raw) {
    const data = emptyData();
    if (!raw || typeof raw !== 'object') return data;
    if (Array.isArray(raw.sessions)) data.sessions = raw.sessions;
    if (Array.isArray(raw.river)) data.river = raw.river;
    if (raw.library && Array.isArray(raw.library.categories) && Array.isArray(raw.library.items)) {
      data.library = raw.library;
    }
    if (raw.settings && typeof raw.settings === 'object') {
      data.settings = { ...data.settings, ...raw.settings };
    }
    return migrate(data);
  }

  // Future schema changes go here, one step per version.
  function migrate(data) {
    data.settings.schemaVersion = SCHEMA_VERSION;
    return data;
  }

  function load() {
    let text = null;
    try {
      text = localStorage.getItem(KEY);
      // Some browsers allow reading but block writing, so check both.
      localStorage.setItem(`${KEY}-probe`, '1');
      localStorage.removeItem(`${KEY}-probe`);
    } catch (err) {
      available = false;
    }
    try {
      return normalise(text ? JSON.parse(text) : null);
    } catch (err) {
      // Keep unreadable data aside rather than overwrite it on the next save.
      try { localStorage.setItem(`${KEY}-unreadable`, text); } catch (e) { /* ignore */ }
      return emptyData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      available = true;
      return true;
    } catch (err) {
      available = false;
      return false;
    }
  }

  function newId() {
    try {
      if (crypto.randomUUID) return crypto.randomUUID();
    } catch (err) { /* fall through */ }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  return {
    load,
    save,
    newId,
    get available() { return available; },
  };
})();
