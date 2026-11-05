// Renders a store-style concept page from the JSON in <script id="concept"> and reports
// visits and button taps to the Meta Pixel. Shared by every play/<concept>/ page.
(() => {
  'use strict';

  // Events Manager → Data sources → your pixel → Settings. Leave empty to only log to the console.
  const META_PIXEL_ID = '1147099554499969';
  // Shared with the cookie banner on the main site.
  const CONSENT_KEY = 'tapnine_cookie_consent';

  const concept = JSON.parse(document.getElementById('concept').textContent);
  const slug = concept.slug || location.pathname.split('/').filter(Boolean).pop();

  // ---- Tracking ----------------------------------------------------------------------------

  // Meta's script isn't loaded until the visitor accepts cookies, so events wait here until then.
  const pending = [];
  let pixelLoaded = false;
  const sentOnce = new Set();

  function track(event, { custom = false, once = false, params = {} } = {}) {
    if (once) {
      if (sentOnce.has(event)) return;
      sentOnce.add(event);
    }
    const payload = { content_name: slug, content_category: 'concept_test', ...params };
    console.info('[store]', event, payload);
    if (pixelLoaded) send(event, payload, custom);
    else pending.push([event, payload, custom]);
  }

  function send(event, payload, custom) {
    window.fbq(custom ? 'trackCustom' : 'track', event, payload);
  }

  function loadPixel() {
    if (pixelLoaded || !META_PIXEL_ID) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    pixelLoaded = true;
    pending.splice(0).forEach(([event, payload, custom]) => send(event, payload, custom));
  }

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
  }

  function writeConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage blocked */ }
  }

  function setupConsent() {
    const stored = readConsent();
    if (stored === 'true') return loadPixel();
    if (stored === 'false') return;

    const bar = el('div', 'consent');
    const text = el('p', null, 'We use cookies to measure our ads. ');
    const policy = el('a', null, 'Privacy');
    policy.href = '../../privacy.html';
    text.append(policy);
    const decline = el('button', null, 'Decline');
    const accept = el('button', 'accept', 'Accept');
    decline.type = accept.type = 'button';
    decline.addEventListener('click', () => {
      writeConsent('false');
      pending.length = 0;
      bar.remove();
    });
    accept.addEventListener('click', () => {
      writeConsent('true');
      loadPixel();
      bar.remove();
    });
    bar.append(text, decline, accept);
    document.body.append(bar);
  }

  // ---- Rendering ---------------------------------------------------------------------------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function img(src, alt, className) {
    const node = el('img', className);
    node.src = src;
    node.alt = alt;
    return node;
  }

  function render() {
    if (concept.accent) document.documentElement.style.setProperty('--accent', concept.accent);

    const topbar = el('header', 'topbar');
    const home = el('a');
    home.href = '../../';
    home.append(img('../../logo.png', ''), document.createTextNode('Tap Nine Games'));
    topbar.append(home);

    const main = el('main', 'store');

    const head = el('section', 'app-head');
    const title = el('div', 'app-title');
    const dev = el('a', 'app-dev', concept.developer || 'Tap Nine Games');
    dev.href = '../../';
    const note = el('p', 'app-note');
    note.append(el('span', 'badge', concept.badge || 'Coming soon'));
    if (concept.note) note.append(el('span', null, concept.note));
    title.append(el('h1', null, concept.title), dev, note);
    head.append(img(concept.icon, `${concept.title} icon`, 'app-icon'), title);

    const stats = el('ul', 'app-stats');
    for (const stat of concept.stats || []) {
      const item = el('li');
      item.append(el('strong', null, stat.value), el('span', null, stat.label));
      stats.append(item);
    }

    const cta = el('button', 'cta', concept.cta || "I'm interested");
    cta.type = 'button';
    cta.addEventListener('click', onCta);

    const shots = el('div', 'shots');
    (concept.screenshots || []).forEach((src, i) => {
      const shot = img(src, `${concept.title} screenshot ${i + 1}`);
      if (i > 1) shot.loading = 'lazy';
      shot.addEventListener('click', () => openShot(src, shot.alt));
      shots.append(shot);
    });
    shots.addEventListener('scroll', () => track('ScreenshotScroll', { custom: true, once: true }), { passive: true });

    main.append(head, stats, cta, shots, renderAbout(), renderReviews());

    const footer = el('footer');
    const privacy = el('a', null, 'Privacy Policy');
    privacy.href = '../../privacy.html';
    const terms = el('a', null, 'Terms');
    terms.href = '../../terms.html';
    footer.append(
      document.createTextNode('© 2026 Tap Nine UG (haftungsbeschränkt) · '),
      privacy,
      document.createTextNode(' · '),
      terms,
    );

    document.body.append(topbar, main, footer, renderThanks(), renderLightbox());
  }

  function renderAbout() {
    const about = el('section', 'section');
    about.append(el('h2', null, 'About this game'), el('p', null, concept.tagline));

    const more = el('div', 'more');
    more.hidden = true;
    for (const paragraph of concept.description || []) more.append(el('p', null, paragraph));
    if (concept.features && concept.features.length) {
      const list = el('ul');
      for (const feature of concept.features) list.append(el('li', null, feature));
      more.append(list);
    }

    const toggle = el('button', 'more-toggle', 'Read more');
    toggle.type = 'button';
    toggle.addEventListener('click', () => {
      more.hidden = !more.hidden;
      toggle.textContent = more.hidden ? 'Read more' : 'Show less';
      if (!more.hidden) track('ReadMore', { custom: true, once: true });
    });

    const tags = el('ul', 'tags');
    for (const tag of concept.tags || []) tags.append(el('li', null, tag));

    about.append(more, toggle, tags);
    return about;
  }

  function renderReviews() {
    const reviews = el('section', 'section');
    reviews.append(
      el('h2', null, 'Ratings and reviews'),
      el('p', null, 'Ratings and reviews will appear once the game is released.'),
    );
    return reviews;
  }

  function renderThanks() {
    const dialog = el('dialog', 'thanks');
    dialog.id = 'thanks';
    const form = el('form');
    form.method = 'dialog';
    const ok = el('button', 'cta', 'OK');
    form.append(ok);
    dialog.append(
      img(concept.icon, ''),
      el('h2', null, concept.thanksTitle || 'Thanks for your interest!'),
      el('p', null, concept.thanksBody || `${concept.title} is still in development and isn't available yet. Check back soon.`),
      form,
    );
    return dialog;
  }

  function renderLightbox() {
    const dialog = el('dialog', 'lightbox');
    dialog.id = 'lightbox';
    dialog.append(el('img'));
    dialog.addEventListener('click', () => dialog.close());
    return dialog;
  }

  function onCta() {
    track('Lead', { once: true });
    document.getElementById('thanks').showModal();
  }

  function openShot(src, alt) {
    const dialog = document.getElementById('lightbox');
    const image = dialog.querySelector('img');
    image.src = src;
    image.alt = alt;
    dialog.showModal();
    track('ScreenshotOpen', { custom: true, once: true });
  }

  render();
  track('PageView');
  track('ViewContent');
  setupConsent();
})();
