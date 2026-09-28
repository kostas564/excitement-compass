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

  function go(name) {
    if (location.hash === `#${name}`) show(name);
    else location.hash = name;
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
    $('#home-add-river').addEventListener('click', () => go('river'));

    window.addEventListener('hashchange', () => show(screenFromHash()));
    show(screenFromHash());
  }

  start();
})();
