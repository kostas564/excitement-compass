// Screen routing and the Home screen. Choose, Act, Release, River and
// Look back gain their logic in later phases.

(() => {
  const $ = (sel) => document.querySelector(sel);

  const data = Storage.load();

  // Screens reached from Home keep Home lit in the bottom navigation.
  const SCREENS = ['home', 'choose', 'act', 'release', 'saved', 'river', 'lookback', 'about'];
  const NAV_FOR = { choose: 'home', act: 'home', release: 'home' };

  let current = null;

  // ---- Text -------------------------------------------------------------

  function lookup(path) {
    return path.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), STRINGS);
  }

  function fillText() {
    document.querySelectorAll('[data-text]').forEach((el) => {
      el.textContent = lookup(el.dataset.text) ?? '';
    });
    document.querySelectorAll('[data-label]').forEach((el) => {
      el.setAttribute('aria-label', lookup(el.dataset.label) ?? '');
    });
    document.querySelectorAll('[data-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', lookup(el.dataset.placeholder) ?? '');
    });
  }

  // One line at random, never the same one twice in a row.
  const lastShown = {};
  function randomLine(key) {
    const lines = lookup(key);
    if (lines.length < 2) return lines[0];
    let i;
    do { i = Math.floor(Math.random() * lines.length); } while (i === lastShown[key]);
    lastShown[key] = i;
    return lines[i];
  }

  // ---- Routing ----------------------------------------------------------

  function screenFromHash() {
    const name = location.hash.replace('#', '');
    return SCREENS.includes(name) ? name : 'home';
  }

  function show(name) {
    if (name === current) return;
    const prev = current;
    current = name;

    document.querySelectorAll('[data-screen]').forEach((el) => {
      const active = el.dataset.screen === name;
      el.hidden = !active;
      el.classList.toggle('is-entering', active && prev !== null);
    });

    const navName = NAV_FOR[name] || name;
    document.querySelectorAll('[data-nav]').forEach((el) => {
      if (el.dataset.nav === navName) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    if (name === 'home') renderHome();
    if (name === 'choose') renderChoose();
    if (name === 'saved') renderSaved();
    if (name === 'river') renderRiver();
    if (name === 'lookback') renderLookBack();
    if ((name === 'act' && !renderAct()) || (name === 'release' && !renderRelease())) {
      go('home');
      return;
    }

    // Move focus to the new screen's heading so screen readers follow along.
    if (prev !== null) {
      const heading = document.querySelector(`#screen-${name} h1`);
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      window.scrollTo(0, 0);
    }
  }

  // Show the screen straight away (so a tap can still focus a field on
  // phones), then record it in the address for the back button.
  function go(name) {
    show(name);
    if (current === name && location.hash !== `#${name}`) location.hash = name;
  }

  // ---- Home -------------------------------------------------------------

  function activeSession() {
    return data.sessions.find((s) => s.status === 'active') || null;
  }

  function renderHome() {
    const session = activeSession();
    $('#home-idle').hidden = !!session;
    $('#home-active').hidden = !session;
    $('#find-pull').hidden = !!session;
    $('#done-let-go').hidden = !session;

    if (session) {
      $('#home-pick').textContent = session.pick;
    } else {
      $('#home-line').textContent = randomLine('home.idleLines');
    }
  }

  // ---- Saved options library -------------------------------------------
  //
  // Every option written is kept here so it never needs typing again.
  // Items with no categoryId sit in Unsorted.

  const sameText = (a, b) => a.toLowerCase() === b.toLowerCase();

  // Build the library the first time, from options already used.
  function ensureLibrary() {
    if (data.library) return;
    const now = new Date().toISOString();
    const library = {
      categories: STRINGS.saved.defaultCategories.map((name) => ({ id: Storage.newId(), name, createdAt: now })),
      items: [],
    };
    [...data.sessions]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .forEach((s) => (s.options || []).forEach((text) => {
        if (library.items.some((i) => sameText(i.text, text))) return;
        library.items.push({ id: Storage.newId(), text, categoryId: null, createdAt: s.createdAt || now, lastUsedAt: s.createdAt || now });
      }));
    data.library = library;
    persist();
  }

  const libItem = (text) => data.library.items.find((i) => sameText(i.text, text)) || null;
  const categoryById = (id) => data.library.categories.find((c) => c.id === id) || null;

  function saveOption(text, categoryId = null) {
    if (libItem(text)) return false;
    const now = new Date().toISOString();
    data.library.items.push({ id: Storage.newId(), text, categoryId, createdAt: now, lastUsedAt: now });
    persist();
    return true;
  }

  // Most recently used first.
  function sortedItems(filterFn) {
    return data.library.items
      .filter(filterFn)
      .sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
  }

  // ---- Choose: option entry ---------------------------------------------

  const MAX_OPTIONS = 7;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The options being chosen between. Answers are cached for the whole draft,
  // so editing the list and ranking again never repeats a question.
  let draft = null;
  // The finished ranking, waiting for the Act screen.
  let pending = null;

  function newDraft() {
    return { options: [], cache: new Map(), rank: null };
  }

  function addOption(raw) {
    const text = raw.trim().replace(/\s+/g, ' ');
    if (!text || draft.options.length >= MAX_OPTIONS) return;
    if (draft.options.some((o) => sameText(o, text))) return;
    // Use the saved spelling if this option is already saved.
    const saved = libItem(text);
    draft.options.push(saved ? saved.text : text);
    if (!saved) saveOption(text);
    renderEntry();
  }

  function removeOption(text) {
    draft.options = draft.options.filter((o) => o !== text);
    renderEntry();
  }

  // Saved options to tap in, filtered by category ('all', 'unsorted' or an id).
  let chooseCat = 'all';

  function suggestions() {
    const notInDraft = (i) => !draft.options.some((o) => sameText(o, i.text));
    return sortedItems((i) => notInDraft(i) && (
      chooseCat === 'all'
      || (chooseCat === 'unsorted' ? !categoryById(i.categoryId) : i.categoryId === chooseCat)
    ));
  }

  // Category tabs for the saved options on Choose: only those with something in them.
  function renderSuggestionCats() {
    const used = (fn) => data.library.items.some((i) => fn(i) && !draft.options.some((o) => sameText(o, i.text)));
    const cats = data.library.categories.filter((c) => used((i) => i.categoryId === c.id));
    const hasUnsorted = used((i) => !categoryById(i.categoryId));
    const keys = [['all', STRINGS.choose.all], ...cats.map((c) => [c.id, c.name])];
    if (hasUnsorted) keys.push(['unsorted', STRINGS.saved.unsorted]);
    if (!keys.some(([k]) => k === chooseCat)) chooseCat = 'all';

    const container = $('#suggestion-cats');
    container.hidden = keys.length <= 2;
    container.replaceChildren(...keys.map(([key, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag';
      btn.dataset.cat = key;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(key === chooseCat));
      return btn;
    }));
  }

  function chip(text, kind) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip chip--${kind}`;
    btn.dataset.option = text;
    const label = document.createElement('span');
    label.textContent = text;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = kind === 'option' ? '<path d="M7 7l10 10M17 7L7 17"/>' : '<path d="M12 6v12M6 12h12"/>';
    btn.setAttribute('aria-label', kind === 'option' ? `${STRINGS.choose.remove}: ${text}` : `${STRINGS.choose.add}: ${text}`);
    btn.append(label, icon);
    li.append(btn);
    return li;
  }

  function renderEntry() {
    const full = draft.options.length >= MAX_OPTIONS;
    $('#option-chips').replaceChildren(...draft.options.map((o) => chip(o, 'option')));
    $('#option-limit').hidden = !full;
    $('#option-input').disabled = full;
    $('#option-add').disabled = full;
    $('#start-compare').disabled = draft.options.length === 0;

    if (!full) renderSuggestionCats();
    const list = full ? [] : suggestions();
    $('#suggestions').hidden = list.length === 0;
    $('#suggestion-chips').replaceChildren(...list.map((i) => chip(i.text, 'suggestion')));
  }

  function renderChoose() {
    if (!draft) draft = newDraft();
    showEntry();
  }

  function showEntry() {
    draft.rank = null;
    $('#choose-entry').hidden = false;
    $('#compare').hidden = true;
    renderEntry();
  }

  // ---- Choose: pair comparison ------------------------------------------
  //
  // Binary insertion sort. Each option, in the order entered, is placed into
  // the ranked list by comparing it with the middle of the remaining range.
  // A tie keeps the earlier option ahead.

  const pairKey = (a, b) => JSON.stringify([a, b].sort());

  // Most comparisons binary insertion can need for n options.
  function maxComparisons(n) {
    let total = 0;
    for (let k = 1; k < n; k++) total += Math.ceil(Math.log2(k + 1));
    return total;
  }

  function startRank() {
    const opts = draft.options;
    if (opts.length === 1) {
      finishRank([opts[0]]);
      return;
    }
    draft.rank = {
      ranked: [opts[0]],
      index: 1,
      lo: 0,
      hi: 1,
      answered: 0,
      history: [],
      question: null,
      busy: false,
    };
    $('#choose-entry').hidden = true;
    $('#compare').hidden = false;
    nextQuestion();
    $('#compare-title').setAttribute('tabindex', '-1');
    $('#compare-title').focus({ preventScroll: true });
  }

  // An answer is the chosen option's text, or TIE.
  const TIE = null;

  function applyAnswer(r, candidate, answer) {
    const mid = Math.floor((r.lo + r.hi) / 2);
    if (answer === candidate) r.hi = mid;
    else r.lo = mid + 1; // the ranked option won, or a tie
  }

  function nextQuestion() {
    const r = draft.rank;
    const opts = draft.options;

    while (r.index < opts.length) {
      const candidate = opts[r.index];
      if (r.lo >= r.hi) {
        r.ranked.splice(r.lo, 0, candidate);
        r.index += 1;
        r.lo = 0;
        r.hi = r.ranked.length;
        continue;
      }
      const other = r.ranked[Math.floor((r.lo + r.hi) / 2)];
      const cached = draft.cache.get(pairKey(candidate, other));
      if (cached !== undefined) {
        applyAnswer(r, candidate, cached);
        continue;
      }
      r.question = { candidate, other };
      renderQuestion();
      return;
    }

    finishRank(r.ranked);
  }

  function renderQuestion() {
    const r = draft.rank;
    const { candidate, other } = r.question;
    const sides = Math.random() < 0.5 ? [candidate, other] : [other, candidate];
    document.querySelectorAll('#pair .card').forEach((card, i) => {
      card.textContent = sides[i];
      card.dataset.option = sides[i];
      card.classList.remove('is-chosen');
    });
    const total = maxComparisons(draft.options.length);
    $('#progress-fill').style.transform = `scaleX(${Math.min(r.answered / total, 1)})`;
    r.busy = false;
  }

  function answer(choice, card) {
    const r = draft.rank;
    if (!r || r.busy) return;
    r.busy = true;

    const { candidate, other } = r.question;
    r.history.push({
      ranked: [...r.ranked], index: r.index, lo: r.lo, hi: r.hi,
      answered: r.answered, question: r.question,
    });
    draft.cache.set(pairKey(candidate, other), choice);
    applyAnswer(r, candidate, choice);
    r.answered += 1;

    if (card) card.classList.add('is-chosen');
    setTimeout(nextQuestion, card && !reducedMotion.matches ? 450 : 120);
  }

  // Re-ask the previous pair, or go back to editing the list.
  function undo() {
    const r = draft.rank;
    if (!r || r.busy) return;
    const prev = r.history.pop();
    if (!prev) {
      showEntry();
      return;
    }
    Object.assign(r, prev);
    draft.cache.delete(pairKey(prev.question.candidate, prev.question.other));
    renderQuestion();
  }

  function finishRank(ranking) {
    pending = {
      options: [...draft.options],
      ranking,
      skipped: [],
      position: 0,
      createdAt: new Date().toISOString(),
    };
    $('#progress-fill').style.transform = 'scaleX(1)';
    draft = null;
    go('act');
  }

  // ---- Act --------------------------------------------------------------

  function persist() {
    const ok = Storage.save(data);
    $('#storage-notice').hidden = ok;
  }

  function renderAct() {
    if (!pending) return false;
    $('#act-line').textContent = '';
    showPick();
    return true;
  }

  function showPick() {
    $('#act-pick').textContent = pending.ranking[pending.position];
    swingNeedle();
  }

  // The needle swings in from a random angle and settles on the pick,
  // then the geometry brightens for a moment.
  let swing = null;
  function swingNeedle() {
    const needle = $('#needle');
    const compass = $('#compass');
    compass.classList.remove('is-lit');
    if (swing) swing.cancel();

    const settle = () => {
      compass.classList.add('is-lit');
      setTimeout(() => compass.classList.remove('is-lit'), 1400);
    };

    if (reducedMotion.matches || !needle.animate) {
      settle();
      return;
    }

    const from = (Math.random() < 0.5 ? -1 : 1) * (100 + Math.random() * 80);
    swing = needle.animate([
      { transform: `rotate(${from}deg)` },
      { transform: `rotate(${-from * 0.28}deg)`, offset: 0.45 },
      { transform: `rotate(${from * 0.1}deg)`, offset: 0.7 },
      { transform: `rotate(${-from * 0.03}deg)`, offset: 0.87 },
      { transform: 'rotate(0deg)' },
    ], { duration: 1800, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
    swing.onfinish = settle;
  }

  function onIt() {
    if (!pending) return;
    const now = new Date().toISOString();
    pending.options.forEach((text) => {
      const item = libItem(text);
      if (item) item.lastUsedAt = now;
    });
    data.sessions.push({
      id: Storage.newId(),
      createdAt: pending.createdAt,
      options: pending.options,
      ranking: pending.ranking,
      skipped: pending.skipped,
      pick: pending.ranking[pending.position],
      status: 'active',
      releasedAt: null,
      note: '',
    });
    persist();
    pending = null;
    go('home');
  }

  // Move down the ranking. Past the last option, start again with a fresh list.
  function notPossible() {
    if (!pending) return;
    pending.skipped.push(pending.ranking[pending.position]);
    if (pending.position >= pending.ranking.length - 1) {
      pending = null;
      go('choose');
      return;
    }
    pending.position += 1;
    $('#act-line').textContent = randomLine('act.nextLines');
    showPick();
  }

  // ---- Release ----------------------------------------------------------

  let closingTimer = null;

  function renderRelease() {
    const session = activeSession();
    if (!session) return false;
    clearTimeout(closingTimer);
    $('#release-form').hidden = false;
    $('#release-closing').hidden = true;
    $('#release-pick').textContent = session.pick;
    $('#release-note').value = '';
    return true;
  }

  function release(note) {
    const session = activeSession();
    if (!session) return;
    session.status = 'released';
    session.releasedAt = new Date().toISOString();
    session.note = note.trim();
    persist();

    $('#release-form').hidden = true;
    $('#release-closing').hidden = false;
    $('#release-line').textContent = randomLine('release.closingLines');
    $('#release-line').focus({ preventScroll: true });
    closingTimer = setTimeout(() => {
      if (current === 'release') go('home');
    }, 2600);
  }

  // ---- Saved screen -----------------------------------------------------

  // Category new options are saved into; null means Unsorted.
  let savedTarget = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderSaved() {
    const cats = data.library.categories;
    if (savedTarget && !categoryById(savedTarget)) savedTarget = null;

    $('#saved-target').hidden = cats.length === 0;
    $('#saved-target').replaceChildren(el('span', 'tags-label', STRINGS.saved.addTo), ...cats.map((c) => {
      const btn = el('button', 'tag', c.name);
      btn.type = 'button';
      btn.dataset.cat = c.id;
      btn.setAttribute('aria-pressed', String(c.id === savedTarget));
      return btn;
    }));

    const groups = [...cats.map((c) => ({ cat: c, name: c.name })), { cat: null, name: STRINGS.saved.unsorted }];
    $('#saved-groups').replaceChildren(...groups.map(({ cat, name }) => {
      const items = sortedItems((i) => (cat ? i.categoryId === cat.id : !categoryById(i.categoryId)));
      // Unsorted only shows when something is in it.
      if (!cat && items.length === 0) return document.createTextNode('');

      const section = el('section', 'group');
      const head = el('div', 'group-head');
      head.append(el('h2', 'group-title', name));
      if (cat) {
        const more = el('button', 'icon-btn group-more');
        more.type = 'button';
        more.dataset.catMenu = cat.id;
        more.setAttribute('aria-label', STRINGS.saved.categoryOptions(cat.name));
        more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>';
        head.append(more);
      }
      section.append(head);

      if (items.length === 0) {
        section.append(el('p', 'group-empty', STRINGS.saved.emptyGroup));
      } else {
        const list = el('ul', 'saved-list');
        list.append(...items.map((item) => {
          const li = el('li');
          const btn = el('button', 'saved-item', item.text);
          btn.type = 'button';
          btn.dataset.item = item.id;
          li.append(btn);
          return li;
        }));
        section.append(list);
      }
      return section;
    }));
  }

  // ---- Sheet: move, rename, delete ---------------------------------------

  const sheet = $('#sheet');

  function openSheet(title, ...nodes) {
    $('#sheet-title').textContent = title;
    $('#sheet-body').replaceChildren(...nodes);
    if (!sheet.open) sheet.showModal();
  }

  function closeSheet() {
    if (sheet.open) sheet.close();
  }

  function sheetButton(label, className, onClick) {
    const btn = el('button', className, label);
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  // A one-field form (name a category), submitted by Enter or the button.
  function nameForm(value, buttonLabel, onSubmit) {
    const form = el('form', 'sheet-form');
    form.autocomplete = 'off';
    const input = el('input', 'option-input');
    input.type = 'text';
    input.maxLength = 40;
    input.value = value;
    input.placeholder = STRINGS.saved.categoryName;
    input.setAttribute('aria-label', STRINGS.saved.categoryName);
    const submit = el('button', 'btn btn--gold', buttonLabel);
    submit.type = 'submit';
    form.append(input, submit);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (name) onSubmit(name);
    });
    setTimeout(() => input.focus(), 50);
    return form;
  }

  function openItemSheet(item) {
    const targets = [...data.library.categories.map((c) => [c.id, c.name]), [null, STRINGS.saved.unsorted]];
    const current = categoryById(item.categoryId) ? item.categoryId : null;
    const moves = el('div', 'sheet-moves');
    moves.append(...targets.map(([id, name]) => {
      const btn = sheetButton(name, 'tag', () => {
        item.categoryId = id;
        persist();
        closeSheet();
        renderSaved();
      });
      btn.setAttribute('aria-pressed', String(id === current));
      return btn;
    }));
    openSheet(
      item.text,
      el('p', 'sheet-label', STRINGS.saved.moveTo),
      moves,
      sheetButton(STRINGS.saved.delete, 'btn btn--danger', () => {
        data.library.items = data.library.items.filter((i) => i.id !== item.id);
        persist();
        closeSheet();
        renderSaved();
      }),
    );
  }

  function openCategorySheet(cat) {
    openSheet(
      cat.name,
      el('p', 'sheet-label', STRINGS.saved.rename),
      nameForm(cat.name, STRINGS.saved.save, (name) => {
        cat.name = name;
        persist();
        closeSheet();
        renderSaved();
      }),
      sheetButton(STRINGS.saved.deleteCategory, 'btn btn--danger', () => {
        if (!window.confirm(STRINGS.saved.confirmDeleteCategory(cat.name))) return;
        data.library.items.forEach((i) => { if (i.categoryId === cat.id) i.categoryId = null; });
        data.library.categories = data.library.categories.filter((c) => c.id !== cat.id);
        persist();
        closeSheet();
        renderSaved();
      }),
    );
  }

  function openNewCategorySheet() {
    openSheet(
      STRINGS.saved.newCategory,
      nameForm('', STRINGS.saved.create, (name) => {
        const cat = { id: Storage.newId(), name, createdAt: new Date().toISOString() };
        data.library.categories.push(cat);
        savedTarget = cat.id;
        persist();
        closeSheet();
        renderSaved();
      }),
    );
  }

  // ---- River log --------------------------------------------------------

  const TAGS = Object.keys(STRINGS.river.tags);
  let riverTag = null;

  function tagButtons(container, selected, withAll) {
    const keys = withAll ? ['all', ...TAGS] : TAGS;
    container.replaceChildren(...keys.map((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag';
      btn.dataset.tag = key;
      btn.textContent = key === 'all' ? STRINGS.lookBack.all : STRINGS.river.tags[key];
      btn.setAttribute('aria-pressed', String(key === (selected || 'all')));
      return btn;
    }));
  }

  function sessionById(id) {
    return data.sessions.find((s) => s.id === id) || null;
  }

  function renderRiver() {
    tagButtons($('#river-tags'), riverTag, false);
    const session = activeSession();
    $('#river-linked').hidden = !session;
    if (session) $('#river-linked').textContent = `${STRINGS.river.linked}: ${session.pick}`;

    const entries = [...data.river].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    $('#river-empty').hidden = entries.length > 0;
    $('#river-list').replaceChildren(...entries.map((e) => riverItem(e, true)));
  }

  function addRiver(raw) {
    const text = raw.trim().replace(/\s+/g, ' ');
    if (!text) return;
    const session = activeSession();
    data.river.push({
      id: Storage.newId(),
      createdAt: new Date().toISOString(),
      text,
      tag: riverTag,
      sessionId: session ? session.id : null,
    });
    persist();
    riverTag = null;
    renderRiver();
  }

  // ---- Look back --------------------------------------------------------

  const lookFilter = { tag: null, query: '' };

  const dayKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(iso) === dayKey(today.toISOString())) return STRINGS.lookBack.today;
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return STRINGS.lookBack.yesterday;
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('en-GB', opts);
  }

  const timeLabel = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function itemMeta(iso, withDay) {
    const meta = el('span', 'item-meta');
    const time = el('time', null, withDay ? `${dayLabel(iso)}, ${timeLabel(iso)}` : timeLabel(iso));
    time.dateTime = iso;
    meta.append(time);
    return meta;
  }

  // Each timeline entry is a button that opens it for editing.
  function itemButton(className, dataKey, id) {
    const btn = el('button', `item ${className}`);
    btn.type = 'button';
    btn.dataset[dataKey] = id;
    return btn;
  }

  function riverItem(entry, withDay) {
    const btn = itemButton('item--river', 'river', entry.id);
    const meta = itemMeta(entry.createdAt, withDay);
    if (entry.tag && STRINGS.river.tags[entry.tag]) meta.append(el('span', 'item-tag', STRINGS.river.tags[entry.tag]));
    btn.append(meta, el('span', 'item-text', entry.text));
    const session = entry.sessionId && sessionById(entry.sessionId);
    if (session) btn.append(el('span', 'item-link', `${STRINGS.river.linked}: ${session.pick}`));
    const li = el('li');
    li.append(btn);
    return li;
  }

  function sessionItem(session) {
    const btn = itemButton('item--pick', 'session', session.id);
    const meta = itemMeta(session.createdAt, false);
    if (session.status === 'active') meta.append(el('span', 'item-tag item-tag--live', STRINGS.lookBack.following));
    btn.append(meta, el('span', 'item-pick', session.pick));
    const skipped = (session.skipped || []).filter((o) => o !== session.pick);
    if (skipped.length) btn.append(el('span', 'item-skipped', `${STRINGS.lookBack.notNow} ${skipped.join(', ')}`));
    if (session.note) btn.append(el('span', 'item-note', session.note));
    const li = el('li');
    li.append(btn);
    return li;
  }

  // ---- Editing river entries and picks -----------------------------------

  function refreshTimeline() {
    if (current === 'river') renderRiver();
    if (current === 'lookback') renderLookBack();
  }

  // A text field plus a Save button, submitted by Enter or the button.
  function textForm({ value, label, placeholder, maxLength, extra = [], onSubmit }) {
    const form = el('form', 'sheet-form');
    form.autocomplete = 'off';
    const input = el('input', 'option-input');
    input.type = 'text';
    input.maxLength = maxLength;
    input.value = value;
    input.placeholder = placeholder || '';
    input.setAttribute('aria-label', label);
    const submit = el('button', 'btn btn--gold', STRINGS.edit.save);
    submit.type = 'submit';
    form.append(input, ...extra, submit);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSubmit(input.value.trim().replace(/\s+/g, ' '));
    });
    return form;
  }

  function openRiverSheet(entry) {
    let tag = entry.tag || null;
    const tags = el('div', 'tags');
    const drawTags = () => tagButtons(tags, tag, false);
    tags.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tag]');
      if (!btn) return;
      tag = tag === btn.dataset.tag ? null : btn.dataset.tag;
      drawTags();
    });
    drawTags();

    openSheet(
      STRINGS.edit.riverTitle,
      textForm({
        value: entry.text,
        label: STRINGS.edit.text,
        maxLength: 200,
        extra: [tags],
        onSubmit: (text) => {
          if (!text) return;
          entry.text = text;
          entry.tag = tag;
          persist();
          closeSheet();
          refreshTimeline();
        },
      }),
      sheetButton(STRINGS.edit.delete, 'btn btn--danger', () => {
        if (!window.confirm(STRINGS.edit.confirmDeleteRiver)) return;
        data.river = data.river.filter((r) => r.id !== entry.id);
        persist();
        closeSheet();
        refreshTimeline();
      }),
    );
  }

  function openPickSheet(session) {
    openSheet(
      session.pick,
      el('p', 'sheet-label', STRINGS.edit.note),
      textForm({
        value: session.note || '',
        label: STRINGS.edit.note,
        placeholder: STRINGS.edit.notePlaceholder,
        maxLength: 200,
        onSubmit: (note) => {
          session.note = note;
          persist();
          closeSheet();
          refreshTimeline();
        },
      }),
      sheetButton(STRINGS.edit.delete, 'btn btn--danger', () => {
        if (!window.confirm(STRINGS.edit.confirmDeletePick)) return;
        data.sessions = data.sessions.filter((s) => s.id !== session.id);
        persist();
        closeSheet();
        refreshTimeline();
      }),
    );
  }

  function onTimelineClick(e) {
    const riverBtn = e.target.closest('[data-river]');
    if (riverBtn) {
      const entry = data.river.find((r) => r.id === riverBtn.dataset.river);
      if (entry) openRiverSheet(entry);
      return;
    }
    const pickBtn = e.target.closest('[data-session]');
    if (pickBtn) {
      const session = sessionById(pickBtn.dataset.session);
      if (session) openPickSheet(session);
    }
  }

  // ---- Clear history and reset -------------------------------------------

  function clearHistory() {
    if (!window.confirm(STRINGS.about.confirmClearHistory)) return;
    data.sessions = [];
    data.river = [];
    pending = null;
    persist();
    go('home');
  }

  function resetApp() {
    if (!window.confirm(STRINGS.about.confirmReset)) return;
    Storage.clear();
    const fresh = Storage.load();
    Object.keys(data).forEach((key) => delete data[key]);
    Object.assign(data, fresh);
    ensureLibrary();
    applyTheme(data.settings.theme);
    renderThemeChoice();
    renderInstall();
    $('#data-status').textContent = '';
    pending = null;
    draft = null;
    riverTag = null;
    savedTarget = null;
    chooseCat = 'all';
    go('home');
  }

  function matches(texts) {
    const q = lookFilter.query.trim().toLowerCase();
    return !q || texts.some((t) => t && t.toLowerCase().includes(q));
  }

  function renderLookBack() {
    tagButtons($('#lookback-tags'), lookFilter.tag, true);

    const items = [];
    if (!lookFilter.tag) {
      data.sessions.forEach((s) => {
        if (matches([s.pick, s.note, ...(s.options || [])])) items.push({ at: s.createdAt, node: () => sessionItem(s) });
      });
    }
    data.river.forEach((e) => {
      if (lookFilter.tag && e.tag !== lookFilter.tag) return;
      const session = e.sessionId && sessionById(e.sessionId);
      if (matches([e.text, session && session.pick])) items.push({ at: e.createdAt, node: () => riverItem(e, false) });
    });
    items.sort((a, b) => b.at.localeCompare(a.at));

    const hasAny = data.sessions.length > 0 || data.river.length > 0;
    $('#lookback-filters').hidden = !hasAny;
    $('#lookback-empty').hidden = items.length > 0;
    $('#lookback-empty').textContent = hasAny ? STRINGS.lookBack.noMatch : STRINGS.lookBack.empty;

    const days = [];
    items.forEach((item) => {
      const key = dayKey(item.at);
      let day = days[days.length - 1];
      if (!day || day.key !== key) {
        day = { key, at: item.at, items: [] };
        days.push(day);
      }
      day.items.push(item);
    });

    $('#lookback-days').replaceChildren(...days.map((day) => {
      const section = el('section', 'day');
      section.append(el('h2', 'day-title', dayLabel(day.at)));
      const list = el('ol', 'timeline');
      list.append(...day.items.map((item) => item.node()));
      section.append(list);
      return section;
    }));
  }

  // ---- Theme ------------------------------------------------------------

  const THEME_COLORS = { dark: '#070a1f', light: '#eef1f8' };

  function applyTheme(theme) {
    const root = document.documentElement;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
      metas.forEach((m) => m.setAttribute('content', THEME_COLORS[theme]));
    } else {
      root.removeAttribute('data-theme');
      metas.forEach((m) => {
        m.setAttribute('content', m.media.includes('light') ? THEME_COLORS.light : THEME_COLORS.dark);
      });
    }
  }

  function renderThemeChoice() {
    const theme = data.settings.theme || 'system';
    $('#theme-choice').replaceChildren(...Object.entries(STRINGS.about.themes).map(([key, label]) => {
      const btn = el('button', 'tag', label);
      btn.type = 'button';
      btn.dataset.theme = key;
      btn.setAttribute('aria-pressed', String(key === theme));
      return btn;
    }));
  }

  // ---- Install ----------------------------------------------------------
  //
  // Chrome and Edge offer a real install prompt, which we hold on to until
  // the button is tapped. iPhones have no prompt, so the button shows the
  // steps instead. Once installed, the section hides.

  let installPrompt = null;
  // The tab you install from stays a browser tab, so remember the install.
  let justInstalled = false;

  const isInstalled = () => justInstalled
    || window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function renderInstall() {
    $('#install-section').hidden = isInstalled();
  }

  // The iOS Share icon: a box with an arrow pointing up.
  const SHARE_ICON = '<svg class="step-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16M12 3.5V14M8.5 7 12 3.5 15.5 7"/></svg>';

  function showInstallSteps() {
    const ios = isIos();
    const list = el('ol', 'steps');
    (ios ? STRINGS.about.installIos : STRINGS.about.installOther).forEach((text, i) => {
      const li = el('li', null, text);
      if (ios && i === 0) li.insertAdjacentHTML('beforeend', SHARE_ICON);
      list.append(li);
    });
    openSheet(STRINGS.about.installStepsTitle, list);
  }

  async function install() {
    if (!installPrompt) {
      showInstallSteps();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    prompt.prompt();
    try { await prompt.userChoice; } catch (err) { /* dismissed */ }
    renderInstall();
  }

  // ---- Backup -----------------------------------------------------------

  function exportData() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `excitement-compass-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    const backup = { app: 'excitement-compass', exportedAt: d.toISOString(), ...data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Add anything from a backup that isn't here yet. Matching is by id, and
  // saved options and categories also match by name, so nothing doubles up.
  // Returns how many sessions, river entries and saved options were added.
  function mergeBackup(incoming) {
    let added = 0;
    const addNew = (target, list) => (list || []).forEach((item) => {
      if (!item || !item.id || target.some((x) => x.id === item.id)) return;
      target.push(item);
      added += 1;
    });
    addNew(data.sessions, incoming.sessions);
    addNew(data.river, incoming.river);

    if (incoming.library) {
      const catIds = {};
      incoming.library.categories.forEach((c) => {
        if (!c || !c.id || !c.name) return;
        const same = data.library.categories.find((x) => x.id === c.id || sameText(x.name, c.name));
        if (same) catIds[c.id] = same.id;
        else {
          data.library.categories.push(c);
          catIds[c.id] = c.id;
        }
      });
      incoming.library.items.forEach((i) => {
        if (!i || !i.id || !i.text) return;
        if (data.library.items.some((x) => x.id === i.id || sameText(x.text, i.text))) return;
        data.library.items.push({ ...i, categoryId: catIds[i.categoryId] || null });
        added += 1;
      });
    }

    // Only one pick can be active: keep the newest, release the rest.
    const active = data.sessions
      .filter((s) => s.status === 'active')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    active.slice(1).forEach((s) => {
      s.status = 'released';
      s.releasedAt = s.releasedAt || s.createdAt;
    });
    return added;
  }

  async function importData(file) {
    const status = $('#data-status');
    try {
      const raw = JSON.parse(await file.text());
      const valid = raw && (raw.app === 'excitement-compass' || Array.isArray(raw.sessions));
      if (!valid) throw new Error('not a backup');
      const added = mergeBackup(Storage.normalise(raw));
      persist();
      status.textContent = STRINGS.about.importDone(added);
    } catch (err) {
      status.textContent = STRINGS.about.importFailed;
    }
  }

  // ---- About ------------------------------------------------------------

  function renderAbout() {
    const lines = $('#about-lines');
    STRINGS.about.lines.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      lines.append(p);
    });

    const body = $('#about-body');
    STRINGS.about.body.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      body.append(p);
    });

    const a = STRINGS.about;
    const link = document.createElement('a');
    link.href = a.creditUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = a.creditName;
    $('#about-credit').append(a.creditBefore, link, a.creditAfter);
  }

  // ---- Start ------------------------------------------------------------

  function start() {
    fillText();
    ensureLibrary();
    applyTheme(data.settings.theme);
    renderThemeChoice();
    renderAbout();

    if (!Storage.available) $('#storage-notice').hidden = false;

    $('#find-pull').addEventListener('click', () => go('choose'));
    $('#done-let-go').addEventListener('click', () => go('release'));
    $('#home-add-river').addEventListener('click', () => {
      go('river');
      $('#river-input').focus();
    });

    $('#option-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#option-input');
      addOption(input.value);
      input.value = '';
      if (!input.disabled) input.focus();
    });
    $('#option-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-option]');
      if (btn) removeOption(btn.dataset.option);
    });
    $('#suggestion-cats').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      chooseCat = btn.dataset.cat;
      renderEntry();
    });
    $('#suggestion-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-option]');
      if (btn) addOption(btn.dataset.option);
    });
    $('#start-compare').addEventListener('click', () => {
      // Include anything typed but not yet added.
      const input = $('#option-input');
      if (input.value.trim()) {
        addOption(input.value);
        input.value = '';
      }
      if (draft.options.length) startRank();
    });
    $('#pair').addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) answer(card.dataset.option, card);
    });
    $('#compare-tie').addEventListener('click', () => answer(TIE, null));
    $('#compare-undo').addEventListener('click', undo);

    $('#act-on-it').addEventListener('click', onIt);
    $('#act-not-possible').addEventListener('click', notPossible);

    $('#release-form').addEventListener('submit', (e) => {
      e.preventDefault();
      release($('#release-note').value);
    });
    $('#release-skip').addEventListener('click', () => release(''));
    $('#release-closing').addEventListener('click', () => go('home'));

    $('#saved-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#saved-input');
      const text = input.value.trim().replace(/\s+/g, ' ');
      if (text) {
        const existing = libItem(text);
        if (!existing) saveOption(text, savedTarget);
        else if (savedTarget) {
          existing.categoryId = savedTarget;
          persist();
        }
        renderSaved();
      }
      input.value = '';
    });
    $('#saved-target').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      savedTarget = savedTarget === btn.dataset.cat ? null : btn.dataset.cat;
      renderSaved();
    });
    $('#saved-groups').addEventListener('click', (e) => {
      const menu = e.target.closest('[data-cat-menu]');
      if (menu) {
        const cat = categoryById(menu.dataset.catMenu);
        if (cat) openCategorySheet(cat);
        return;
      }
      const btn = e.target.closest('[data-item]');
      const item = btn && data.library.items.find((i) => i.id === btn.dataset.item);
      if (item) openItemSheet(item);
    });
    $('#new-category').addEventListener('click', openNewCategorySheet);
    $('#sheet-close').addEventListener('click', closeSheet);
    // Tapping outside the sheet closes it.
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

    $('#river-form').addEventListener('submit', (e) => {
      e.preventDefault();
      addRiver($('#river-input').value);
      $('#river-input').value = '';
    });
    $('#river-tags').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tag]');
      if (!btn) return;
      riverTag = riverTag === btn.dataset.tag ? null : btn.dataset.tag;
      tagButtons($('#river-tags'), riverTag, false);
    });

    $('#river-list').addEventListener('click', onTimelineClick);
    $('#lookback-days').addEventListener('click', onTimelineClick);
    $('#theme-choice').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme]');
      if (!btn) return;
      data.settings.theme = btn.dataset.theme;
      persist();
      applyTheme(data.settings.theme);
      renderThemeChoice();
    });
    renderInstall();
    $('#install-app').addEventListener('click', install);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      justInstalled = true;
      renderInstall();
    });

    $('#export-data').addEventListener('click', exportData);
    $('#import-data').addEventListener('click', () => {
      $('#data-status').textContent = '';
      $('#import-file').click();
    });
    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importData(file);
      e.target.value = '';
    });
    $('#clear-history').addEventListener('click', clearHistory);
    $('#reset-app').addEventListener('click', resetApp);

    $('#lookback-search').addEventListener('input', (e) => {
      lookFilter.query = e.target.value;
      renderLookBack();
    });
    $('#lookback-tags').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tag]');
      if (!btn) return;
      lookFilter.tag = btn.dataset.tag === 'all' ? null : btn.dataset.tag;
      renderLookBack();
    });

    window.addEventListener('hashchange', () => show(screenFromHash()));
    show(screenFromHash());

    // Keep the app's files on the device so it opens without a connection.
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  start();
})();
