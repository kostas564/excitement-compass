// Screen routing and the Home screen. Choose, Act, Release, River and
// Look back gain their logic in later phases.

(() => {
  const $ = (sel) => document.querySelector(sel);

  const data = Storage.load();

  // Screens reached from Home keep Home lit in the bottom navigation.
  const SCREENS = ['home', 'choose', 'act', 'release', 'river', 'lookback', 'about'];
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

  const sameText = (a, b) => a.toLowerCase() === b.toLowerCase();

  function addOption(raw) {
    const text = raw.trim().replace(/\s+/g, ' ');
    if (!text || draft.options.length >= MAX_OPTIONS) return;
    if (draft.options.some((o) => sameText(o, text))) return;
    draft.options.push(text);
    renderEntry();
  }

  function removeOption(text) {
    draft.options = draft.options.filter((o) => o !== text);
    renderEntry();
  }

  // Options from earlier sessions, newest first, not already in the list.
  function suggestions() {
    const seen = [];
    [...data.sessions]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .forEach((s) => (s.options || []).forEach((o) => {
        if (!seen.some((x) => sameText(x, o)) && !draft.options.some((x) => sameText(x, o))) seen.push(o);
      }));
    return seen.slice(0, 8);
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

    const list = full ? [] : suggestions();
    $('#suggestions').hidden = list.length === 0;
    $('#suggestion-chips').replaceChildren(...list.map((o) => chip(o, 'suggestion')));
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

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function itemMeta(iso, withDay) {
    const meta = el('p', 'item-meta');
    const time = el('time', null, withDay ? `${dayLabel(iso)}, ${timeLabel(iso)}` : timeLabel(iso));
    time.dateTime = iso;
    meta.append(time);
    return meta;
  }

  function riverItem(entry, withDay) {
    const li = el('li', 'item item--river');
    const meta = itemMeta(entry.createdAt, withDay);
    if (entry.tag && STRINGS.river.tags[entry.tag]) meta.append(el('span', 'item-tag', STRINGS.river.tags[entry.tag]));
    li.append(meta, el('p', 'item-text', entry.text));
    const session = entry.sessionId && sessionById(entry.sessionId);
    if (session) li.append(el('p', 'item-link', `${STRINGS.river.linked}: ${session.pick}`));
    return li;
  }

  function sessionItem(session) {
    const li = el('li', 'item item--pick');
    const meta = itemMeta(session.createdAt, false);
    if (session.status === 'active') meta.append(el('span', 'item-tag item-tag--live', STRINGS.lookBack.following));
    li.append(meta, el('p', 'item-pick', session.pick));
    const skipped = (session.skipped || []).filter((o) => o !== session.pick);
    if (skipped.length) li.append(el('p', 'item-skipped', `${STRINGS.lookBack.notNow} ${skipped.join(', ')}`));
    if (session.note) li.append(el('p', 'item-note', session.note));
    return li;
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
  }

  start();
})();
