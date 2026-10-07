/* =====================================================================
   BEHAVIOUR — you shouldn't need to touch anything below to change content.
   ===================================================================== */
function s31App() {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wrapStore = st => ({
    get(k) { try { return st.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { st.setItem(k, v); } catch (e) {} },
    del(k) { try { st.removeItem(k); } catch (e) {} }
  });
  const local = wrapStore(window.localStorage || {});
  const sess  = (function () { try { return wrapStore(window.sessionStorage); } catch (e) { return wrapStore({}); } })();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = n => String(n).padStart(2, '0');

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- dates ---------- */
  function nextWeekly(dow, time) {
    const [hh, mm] = time.split(':').map(Number);
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
    if (d <= now) d.setDate(d.getDate() + 7);
    return d;
  }
  function nextMonthly(nth, dow, time) {
    const [hh, mm] = time.split(':').map(Number);
    const now = new Date();
    for (let m = 0; m < 4; m++) {
      const first = new Date(now.getFullYear(), now.getMonth() + m, 1, hh, mm, 0, 0);
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + ((dow - first.getDay() + 7) % 7) + 7 * (nth - 1), hh, mm, 0, 0);
      if (d > now) return d;
    }
    return new Date(now.getTime() + 7 * 864e5);
  }
  const fmtWhen = d => DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

  /* ---------- clearance state ---------- */
  const handle = () => local.get('s31_handle');
  function renderClearance() {
    const h = handle();
    $('#clearChip').textContent = h ? 'Clearance: Cadet · ' + h : 'Clearance: Visitor';
    $('#clearChip').classList.toggle('on', !!h);
    renderTiers();
  }

  /* ---------- hero + facility map ---------- */
  $('#heroTagline').textContent = S31.tagline;
  $('#zoneGrid').innerHTML = S31.zones.map(z =>
    '<a class="zcard" href="#' + z.id + '" style="--z:' + z.color + '">' +
      '<div class="kicker"><span class="led"></span>Zone ' + z.no + ' · ' + esc(z.role) + '</div>' +
      '<h3>' + esc(z.name) + '</h3><p>' + esc(z.line) + '</p>' +
      '<div class="pull">Comes back for: ' + esc(z.pull) + ' →</div></a>').join('');

  /* ---------- redactions: tap/click to reveal (works on touch too) ---------- */
  document.addEventListener('click', e => {
    const r = e.target.closest('.redact');
    if (r) r.classList.toggle('open');
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('redact')) { e.preventDefault(); e.target.classList.toggle('open'); }
  });

  /* ---------- zone 01: comics, filters, pull list ---------- */
  const pull = [];
  /* ---------- catalogues: shelves + stock + specials, reused by every zone ----------
     Zone 1 is the template. A new zone needs: its HTML block (specials / filters / file / grid)
     and one line in CATS. Shelves carry zone:'zoneN' (none = zone1); stock follows its shelf. */
  const PRE = !!S31.prelaunch;             // pre-launch: no prices, Notify me buttons, opening banner
  const waLink = m => 'https://wa.me/' + encodeURIComponent(S31.contact.whatsapp) + '?text=' + encodeURIComponent(m);
  const SHELVES = S31.shelves || [];
  const shelfOf = id => SHELVES.find(s => s.id === id);
  const zoneOf = s => (s && s.zone) || 'zone1';
  const STATUS = { in: '', low: 'Low stock', out: 'Sold out', preorder: 'Pre-order' };
  const CATS = [
    { zone: 'zone1', action: 'pull', collapsed: true, hint: 'Tap a shelf to open it.', el: { sp: '#specialsGrid', filters: '#comicFilters', file: '#shelfFile', grid: '#comicGrid' } },
    { zone: 'zone2', action: 'wa',   collapsed: true, hint: 'Pick a game to see its lessons and gear.', el: { sp: '#kmSpecials',  filters: '#kmFilters',  file: '#kmFile',  grid: '#kmGrid', lessons: '#kmLessons' } },
    { zone: 'zone3', action: 'wa',   collapsed: true, hint: 'Pick a game to open its news, sessions and gear.', el: { sp: '#hdSpecials',  filters: '#hdFilters',  file: '#hdFile',  grid: '#hdGrid', lessons: '#hdLessons', news: '#hdNews', challenges: '#hdChallenges' } },
    { zone: 'zone4', action: 'wa',   collapsed: true, hint: 'Pick a topic to open it.', el: { sp: '#scSpecials',  filters: '#scFilters',  file: '#scFile',  grid: '#scGrid', lessons: '#scLessons', topics: '#scTopics' } },
    { zone: 'zone5', action: 'wa',   collapsed: true, hint: 'Pick an era or mystery to open its files.', el: { sp: '#axSpecials',  filters: '#axFilters',  file: '#axFile',  grid: '#axGrid', cases: '#axFiles', media: '#axMedia', topics: '#axTopics' } },
    { zone: 'zone6', action: 'wa',   collapsed: true, hint: 'Pick a show to open its episodes.', el: { sp: '#pcSpecials', filters: '#pcFilters', file: '#pcFile', grid: '#pcGrid', media: '#pcMedia', topics: '#pcTopics' } },
    { zone: 'zone7', action: 'wa',   collapsed: true, icons: true, hint: 'Tap an icon to open it.', el: { sp: '#swSpecials', filters: '#swFilters', file: '#swFile', grid: '#swGrid', lessons: '#swLessons', media: '#swMedia', topics: '#swTopics' } }
  ].filter(c => $(c.el.grid));
  CATS.forEach(c => { c.filter = c.collapsed ? '' : 'all'; });   // collapsed = shelves stay closed until tapped
  // Icon set for icon-tile category buttons (CATS option icons: true; shelf.icon picks one).
  const ICONS = {
    saber: '<path d="M4 20l2.5-2.5M6.5 17.5l2 2M5 16l3.5 3.5M8 16l12-12"/>',
    helmet: '<path d="M5 14a7 7 0 0 1 14 0v3l-3 2.5H8L5 17z"/><path d="M8 14h8M10 17h4"/>',
    robe: '<path d="M9 3h6l1 4 3 2-2 12H7L5 9l3-2z"/><path d="M12 7v14"/>',
    book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 12h4M17 12h4"/>',
    star: '<path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
  };
  const iconSvg = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || ICONS.spark) + '</svg>';
  const catShelves = c => SHELVES.filter(s => zoneOf(s) === c.zone);
  function catFilters(c) {
    const opts = (c.collapsed ? [] : [['all', 'All']]).concat(catShelves(c).map(s => [s.id, s.name]));
    $(c.el.filters).classList.toggle('shelf-tabs', !!c.collapsed);
    $(c.el.filters).classList.toggle('icon-tiles', !!c.icons);
    $(c.el.filters).innerHTML = opts.map(f => '<button type="button" class="chip' + (c.filter === f[0] ? ' on' : '') + '" data-f="' + esc(f[0]) + '" aria-pressed="' + (c.filter === f[0]) + '"' +
      (c.collapsed ? ' data-peek="' + esc(peek(f[0])) + '"' : '') + '>' + (c.icons ? iconSvg((shelfOf(f[0]) || {}).icon) + '<span>' + esc(f[1]) + '</span>' : esc(f[1])) + '</button>').join('');
  }
  function peek(id) {                       // hover preview: what is inside a shelf
    const n = k => (S31[k] || []).filter(x => x.shelf === id && !x.hidden).length;
    const items = (S31.stock || []).filter(x => x.shelf === id && !x.hidden);
    const prices = items.map(x => Number(String(x.price).replace(/[^\d.]/g, ''))).filter(v => v > 0);
    const parts = [[n('lessons'), 'lesson'], [((S31.ancients || {}).files || []).filter(x => x.shelf === id && !x.hidden).length, 'case file'], [n('media'), 'link'], [n('news'), 'post'], [n('topics'), 'topic']]
      .filter(p => p[0]).map(p => p[0] + ' ' + p[1] + (p[0] > 1 ? 's' : ''));
    if (items.length) parts.push(items.length + ' item' + (items.length > 1 ? 's' : '') + (prices.length && !PRE ? ' · from R' + Math.min.apply(null, prices).toLocaleString('en-ZA') : ''));
    return parts.length ? parts.slice(0, 2).join(' · ') : 'Coming soon';
  }
  function catFile(c) {
    const s = shelfOf(c.filter), box = $(c.el.file);
    if (!s) { box.innerHTML = ''; return; }
    const word = c.zone === 'zone1' ? 'Shelf file' : c.zone === 'zone3' ? 'Game file' : c.zone === 'zone4' ? 'Topic file' : c.zone === 'zone5' ? 'Era file' : c.zone === 'zone6' ? 'Show file' : c.zone === 'zone7' ? 'Academy file' : 'Briefing';
    box.innerHTML = '<div class="card shelf-file"><span class="stamp">' + word.toUpperCase() + '</span>' +
      '<div class="kicker">' + word + ' · ' + esc(s.name) + '</div><h3>' + esc(s.title || s.name) + '</h3>' +
      (s.story ? '<p class="muted">' + esc(s.story) + '</p>' : '') +
      '<div class="sf-cols">' +
        ((s.dyk || []).length ? '<div><div class="fine sf-lbl">Did you know?</div><ul class="dyk">' + s.dyk.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul></div>' : '') +
        (s.note ? '<div class="sf-note"><div class="fine sf-lbl">Fun fact</div><p>' + esc(s.note) + '</p></div>' : '') +
      '</div></div>';
  }
  function catLessons(c) {                  // lessons: booked by WhatsApp with the chosen time
    if (!c.el.lessons) return;
    const box = $(c.el.lessons), all = S31.lessons || [];
    const list = all.filter(l => { const sh = shelfOf(l.shelf); return !l.hidden && sh && zoneOf(sh) === c.zone && (c.filter === 'all' || l.shelf === c.filter); });
    if (!list.length) { box.innerHTML = '<p class="muted">No lessons for this game right now. Ask us and we’ll tell you when a teacher is free.</p>'; return; }
    box.innerHTML = list.map(l => {
      const sh = shelfOf(l.shelf), st = l.status || 'open', slots = l.slots || [];
      const meta = [['Teacher', l.teacher], ['Length', l.length], ['Ages', l.ages], ['Group', l.seats ? 'Up to ' + l.seats : '']].filter(m => m[1] && !(PRE && m[0] === 'Teacher'));
      return '<div class="card lesson" data-li="' + all.indexOf(l) + '">' +
        (l.img ? '<div class="ls-img" style="background-image:url(&quot;' + esc(l.img) + '&quot;)"></div>' : '') +
        '<div class="ls-top"><span class="sp-badge">' + esc(sh.name) + '</span>' + (l.level ? '<span class="fine">' + esc(l.level) + '</span>' : '') +
          (PRE ? '<span class="st st-preorder">Coming soon</span>' : st === 'full' ? '<span class="st st-out">Full</span>' : st === 'paused' ? '<span class="st st-low">Teacher away</span>' : '') + '</div>' +
        '<h4>' + esc(l.title) + '</h4>' + (l.blurb ? '<p>' + esc(l.blurb) + '</p>' : '') +
        (meta.length ? '<dl>' + meta.map(m => '<dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd>').join('') + '</dl>' : '') +
        (slots.length && st !== 'paused' && !PRE ? '<div class="fine sf-lbl">Choose a time</div><div class="slots">' + slots.map((t, i) => '<button type="button" class="slot' + (i ? '' : ' on') + '" data-slot="' + esc(t) + '" aria-pressed="' + !i + '">' + esc(t) + '</button>').join('') + '</div>' : '') +
        '<div class="ls-foot"><b>' + esc(PRE ? '' : (l.price || '')) + '</b><a class="btn small' + (st === 'open' || PRE ? ' primary' : '') + '" target="_blank" rel="noopener" data-book href="' + (PRE ? waLink('Hi Section 31, please let me know when this starts: ' + l.title) : lessonLink(l, slots[0])) + '">' +
          (PRE ? 'Register interest' : st === 'full' ? 'Join waitlist' : st === 'paused' ? 'Notify me' : 'Book') + '</a></div></div>';
    }).join('');
  }
  function lessonLink(l, slot) {
    const st = l.status || 'open', what = l.title + (l.level ? ' (' + l.level + ')' : '');
    const msg = st === 'paused' ? 'Hi Section 31, please let me know when ' + what + ' is back.'
      : 'Hi Section 31, I’d like to ' + (st === 'full' ? 'join the waitlist for ' : 'book ') + what + (slot ? ', ' + slot : '') + '.';
    return 'https://wa.me/' + esc(S31.contact.whatsapp) + '?text=' + encodeURIComponent(msg);
  }
  const inCat = (c, x) => { const sh = shelfOf(x.shelf); return !x.hidden && sh && zoneOf(sh) === c.zone && (c.filter === 'all' || x.shelf === c.filter); };
  function fmtDay(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? +m[3] + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : String(iso || ''); }
  function catNews(c) {                     // game news posts, newest first
    if (!c.el.news) return;
    const list = (S31.news || []).filter(n => inCat(c, n)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 6);
    $(c.el.news).innerHTML = list.length ? list.map(n =>
      '<article class="card lesson">' + (n.img ? '<div class="ls-img" style="background-image:url(&quot;' + esc(n.img) + '&quot;)"></div>' : '') +
      '<div class="ls-top"><span class="sp-badge">' + esc(shelfOf(n.shelf).name) + '</span><span class="fine">' + esc(fmtDay(n.date)) + '</span></div>' +
      '<h4>' + esc(n.title) + '</h4>' + (n.blurb ? '<p>' + esc(n.blurb) + '</p>' : '') +
      (n.url ? '<div class="ls-foot"><span></span><a class="btn small" target="_blank" rel="noopener" href="' + esc(n.url) + '">Read more</a></div>' : '') + '</article>').join('')
      : '<p class="muted">No news for this game yet.</p>';
  }
  function catChallenges(c) {               // challenges with a scoreboard (handles only)
    if (!c.el.challenges) return;
    const now = new Date();
    const list = (S31.challenges || []).filter(x => inCat(c.collapsed ? { zone: c.zone, filter: 'all' } : c, x)).map(x => ({ x: x, end: specialEnd(x) })).sort((a, b) => (a.end && a.end < now) - (b.end && b.end < now));
    $(c.el.challenges).innerHTML = list.length ? list.map(o => {
      const x = o.x, done = o.end && o.end < now, days = o.end ? Math.ceil((o.end - now) / 864e5) : null;
      const when = done ? 'Final results' : o.end == null ? 'Ongoing' : days <= 1 ? 'Ends today' : 'Ends in ' + days + ' days';
      const rows = (x.board || []).slice(0, 10);
      const msg = 'Hi Section 31, here’s my score for “' + x.title + '”. Handle: ___ Score: ___ (screenshot attached)';
      return '<div class="card lesson"><div class="ls-top"><span class="sp-badge">' + esc(shelfOf(x.shelf).name) + '</span><span class="fine">' + when + '</span></div>' +
        '<h4>' + esc(x.title) + '</h4>' + (x.blurb ? '<p>' + esc(x.blurb) + '</p>' : '') +
        (x.prize && !PRE ? '<dl><dt>Prize</dt><dd>' + esc(x.prize) + '</dd></dl>' : '') +
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>Handle</th><th>' + esc(x.unit || 'Score') + '</th></tr></thead><tbody>' +
        (rows.length ? rows.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(r[0]) + '</td><td class="t">' + esc(r[1] || '') + '</td></tr>').join('') : '<tr><td colspan="3" class="muted">No scores yet. Be the first.</td></tr>') +
        '</tbody></table></div>' +
        (done ? '' : '<div class="ls-foot"><span class="fine">Send a screenshot</span><a class="btn small primary" target="_blank" rel="noopener" href="https://wa.me/' + esc(S31.contact.whatsapp) + '?text=' + encodeURIComponent(msg) + '">Submit a score</a></div>') + '</div>';
    }).join('') : '<p class="muted">No challenges for this game right now.</p>';
  }
  function catTopics(c) {                   // conversations & debates on the table
    if (!c.el.topics) return;
    const list = (S31.topics || []).filter(x => inCat(c, x));
    const wa = m => 'https://wa.me/' + esc(S31.contact.whatsapp) + '?text=' + encodeURIComponent(m);
    $(c.el.topics).innerHTML = (list.length ? list.map(x =>
      '<div class="card lesson"><div class="ls-top"><span class="sp-badge">' + esc(shelfOf(x.shelf).name) + '</span>' + (x.format ? '<span class="fine">' + esc(x.format) + '</span>' : '') +
        (x.status === 'soon' ? '<span class="st st-low">Coming soon</span>' : '') + '</div>' +
      '<h4>' + esc(x.title) + '</h4>' + (x.blurb ? '<p>' + esc(x.blurb) + '</p>' : '') +
      ([['When', x.when], ['Host', x.host]].filter(m => m[1]).length ? '<dl>' + [['When', x.when], ['Host', x.host]].filter(m => m[1]).map(m => '<dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd>').join('') + '</dl>' : '') +
      '<div class="ls-foot"><span></span><a class="btn small' + (x.status === 'soon' ? '' : ' primary') + '" target="_blank" rel="noopener" href="' +
        wa('Hi Section 31, ' + (x.status === 'soon' ? 'please tell me when this starts: ' : 'I’d like to join: ') + x.title) + '">' + (x.status === 'soon' ? 'Notify me' : 'Join in') + '</a></div></div>').join('')
      : '<p class="muted">Nothing on the table for this topic yet.</p>') +
      '<p class="fine" style="grid-column:1/-1;margin:0">Got a question worth arguing about? <a target="_blank" rel="noopener" href="' + wa('Hi Section 31, I’d like to suggest a topic: ') + '">Suggest a topic →</a></p>';
  }
  function catCases(c) {                    // case files: evidence and theories side by side
    if (!c.el.cases) return;
    const files = (S31.ancients && S31.ancients.files) || [];
    const list = files.filter(f => !f.hidden && (c.filter === 'all' ? (!f.shelf || (shelfOf(f.shelf) && zoneOf(shelfOf(f.shelf)) === c.zone)) : f.shelf === c.filter));
    $(c.el.cases).innerHTML = list.length ? list.map(f =>
      '<div class="file' + (f.featured ? ' feat' : '') + '" data-axi="' + files.indexOf(f) + '"><span class="stamp">CASE OPEN</span>' +
        '<div class="fid">FILE ' + esc(f.id) + (f.featured ? ' · <span class="feat-tag">Unsolved file of the week</span>' : '') + '</div>' +
        '<h4><span class="redact" tabindex="0" role="button" aria-label="Reveal title">' + esc(f.title) + '</span></h4>' +
        '<dl><dt>Where</dt><dd>' + esc(f.where) + '</dd><dt>When</dt><dd>' + esc(f.when) + '</dd><dt>Status</dt><dd>' + esc(f.status) + '</dd></dl>' +
        '<div class="xf-tabs" role="group" aria-label="Show evidence or theories">' +
          '<button type="button" data-tab="evidence" aria-pressed="true">Evidence</button>' +
          '<button type="button" data-tab="theory" aria-pressed="false">Theories</button></div>' +
        '<p class="xf-body" aria-live="polite">' + esc(f.evidence) + '</p></div>').join('')
      : '<p class="muted">No case files here yet.</p>';
  }
  function catMedia(c) {                    // links to podcasts, videos, research, books, archives
    if (!c.el.media) return;
    const list = (S31.media || []).filter(x => inCat(c, x)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const verb = t => ({ Podcast: 'Listen', Video: 'Watch', Book: 'Read', Article: 'Read', Research: 'Read', Archive: 'Open' }[t] || 'Open');
    $(c.el.media).innerHTML = list.length ? list.map(x => {
      const live = x.url && x.url !== '#';
      return '<div class="card lesson">' + (x.img ? '<div class="ls-img" style="background-image:url(&quot;' + esc(x.img) + '&quot;)"></div>' : '') +
        '<div class="ls-top"><span class="sp-badge">' + esc(x.type || 'Link') + '</span><span class="fine">' + esc(shelfOf(x.shelf).name) + (x.date ? ' · ' + esc(fmtDay(x.date)) : '') + '</span></div>' +
        '<h4>' + esc(x.title) + '</h4>' + (x.source ? '<div class="fine">' + esc(x.source) + '</div>' : '') + (x.blurb ? '<p>' + esc(x.blurb) + '</p>' : '') +
        '<div class="ls-foot"><span></span>' + (live ? '<a class="btn small primary" target="_blank" rel="noopener" href="' + esc(x.url) + '">' + verb(x.type) + '</a>' : '<span class="fine">Link coming soon</span>') + '</div></div>';
    }).join('') : '<p class="muted">Nothing here yet.</p>';
  }
  const BLOCKS = ['file', 'lessons', 'news', 'topics', 'cases', 'media', 'grid'];
  function showBlock(el, on) {              // hide a block and its heading when it has nothing to show
    el.hidden = !on;
    const h = el.previousElementSibling;
    if (h && h.classList.contains('blk-title')) h.hidden = !on;
  }
  function catGrid(c) {
    const blocks = BLOCKS.filter(k => c.el[k]).map(k => $(c.el[k]));
    if (c.collapsed) {                      // closed until a category is tapped; scoreboards always stay visible
      const open = !!c.filter;
      if (!c.hintEl) { c.hintEl = document.createElement('p'); c.hintEl.className = 'shelf-hint'; c.hintEl.textContent = c.hint || 'Tap a shelf to open it.'; $(c.el.file).after(c.hintEl); }
      c.hintEl.hidden = open;
      const note = $('#deliveryNote'); if (note && c.zone === 'zone1') note.hidden = !open;
      if (!open) { blocks.forEach(el => { el.innerHTML = ''; showBlock(el, false); }); catChallenges(c); return; }
    }
    catFile(c); catLessons(c); catNews(c); catChallenges(c); catTopics(c); catCases(c); catMedia(c); catStock(c);
    if (c.collapsed) blocks.forEach(el => {
      showBlock(el, !!el.querySelector('.card, .file, .comic'));
      el.classList.remove('shelf-open'); void el.offsetWidth; el.classList.add('shelf-open');
    });
  }
  function catStock(c) {
    const list = (S31.stock || []).filter(it => { const sh = shelfOf(it.shelf); return !it.hidden && sh && zoneOf(sh) === c.zone && (c.filter === 'all' || it.shelf === c.filter); });
    const grid = $(c.el.grid);
    if (!list.length) { grid.innerHTML = '<p class="muted">Being restocked. Ask us in store.</p>'; return; }
    grid.innerHTML = list.map(it => {
      const key = it.name + (it.line ? ' ' + it.line : ''), sh = shelfOf(it.shelf), st = STATUS[it.status] || '';
      let btn;
      if (PRE) btn = '<a class="btn small" target="_blank" rel="noopener" href="' + waLink('Hi Section 31, please let me know when this arrives: ' + key) + '">Notify me</a>';
      else if (it.status === 'out') btn = '<button type="button" class="btn small" disabled>Sold out</button>';
      else if (c.action === 'pull') {
        const on = pull.indexOf(key) > -1, verb = it.shelf === 'comics' || it.shelf === 'startrek' ? 'Add to pull list' : 'Reserve';
        btn = '<button type="button" class="btn small' + (on ? ' primary' : '') + '" data-pull="' + esc(key) + '">' + (on ? 'On your list ✓' : (it.status === 'preorder' ? 'Pre-order' : verb)) + '</button>';
      } else {
        const msg = 'Hi Section 31, I’d like to ' + (it.status === 'preorder' ? 'pre-order' : 'reserve') + ': ' + key + ' (' + it.price + ')';
        btn = '<a class="btn small" target="_blank" rel="noopener" href="https://wa.me/' + esc(S31.contact.whatsapp) + '?text=' + encodeURIComponent(msg) + '">' + esc(it.cta || (it.status === 'preorder' ? 'Pre-order' : 'Reserve')) + '</a>';
      }
      return '<article class="comic">' +
        '<div class="cover" style="--h:' + (+it.hue || 0) + '">' + (it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" loading="lazy">' : '') + (it.line ? '<span class="iss">' + esc(it.line) + '</span>' : '') + (it.tag ? '<span class="new">' + esc(it.tag) + '</span>' : '') + '<div class="ttl">' + esc(it.name) + '</div></div>' +
        '<div class="meta"><b' + (PRE ? ' class="soon">Coming soon' : '>' + (it.was ? '<s class="was">' + esc(it.was) + '</s> ' : '') + esc(it.price)) + '</b><span class="sub">' + esc(sh ? sh.name : '') + '</span></div>' +
        (st && !PRE ? '<span class="st st-' + esc(it.status) + '">' + st + '</span>' : '') + btn + '</article>';
    }).join('');
  }
  function specialEnd(sp) {
    if (sp.ends === 'month-end') { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59); }
    return sp.ends ? new Date(sp.ends + 'T23:59:59') : null;
  }
  function catSpecials(c) {
    const now = new Date(), grid = $(c.el.sp);
    const live = (S31.specials || []).filter(sp => {
      if (sp.hidden || PRE || zoneOf(sp) !== c.zone) return false;
      const end = specialEnd(sp), start = sp.starts ? new Date(sp.starts + 'T00:00:00') : null;
      return (!end || end >= now) && (!start || start <= now);
    });
    grid.previousElementSibling.style.display = grid.style.display = live.length ? '' : 'none';
    grid.innerHTML = live.map(sp => {
      const end = specialEnd(sp), days = end ? Math.ceil((end - now) / 864e5) : null;
      const when = end == null ? 'Ongoing' : days <= 1 ? 'Ends today' : 'Ends in ' + days + ' days';
      const sh = shelfOf(sp.shelf);
      return '<div class="card special"><div class="sp-top"><span class="sp-badge">' + esc(sp.badge) + '</span><span class="fine">' + when + '</span></div>' +
        '<h4>' + esc(sp.title) + '</h4><p>' + esc(sp.blurb) + '</p>' +
        (sh ? '<button type="button" class="btn small" data-shelf="' + esc(sp.shelf) + '">View ' + esc(sh.name) + '</button>' : '') + '</div>';
    }).join('');
  }
  function renderFilters() { CATS.forEach(catFilters); }
  function renderComics() { CATS.forEach(catGrid); }
  CATS.forEach(c => {
    $(c.el.filters).addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { c.filter = c.collapsed && c.filter === b.dataset.f ? '' : b.dataset.f; catFilters(c); catGrid(c); } });
    $(c.el.sp).addEventListener('click', e => {
      const b = e.target.closest('[data-shelf]'); if (!b) return;
      c.filter = b.dataset.shelf; catFilters(c); catGrid(c);
      $(c.el.filters).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    $(c.el.grid).addEventListener('click', e => {
      const b = e.target.closest('[data-pull]'); if (!b) return;
      const k = b.dataset.pull, i = pull.indexOf(k);
      if (i > -1) pull.splice(i, 1); else pull.push(k);
      renderComics(); renderPull();
    });
    if (c.el.lessons) $(c.el.lessons).addEventListener('click', e => {
      const b = e.target.closest('[data-slot]'); if (!b) return;
      const card = b.closest('[data-li]'), l = (S31.lessons || [])[+card.dataset.li];
      card.querySelectorAll('[data-slot]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      card.querySelector('[data-book]').href = lessonLink(l, b.dataset.slot);
    });
    catSpecials(c);
  });
  $('#deliveryNote').textContent = S31.delivery || '';
  function renderPull() {
    $('#pullChips').innerHTML = pull.length
      ? pull.map((p, i) => '<span class="chip">' + esc(p) + '<button class="x" type="button" data-rm="' + i + '" aria-label="Remove ' + esc(p) + '">×</button></span>').join('')
      : '<span class="empty">Nothing on your list yet.</span>';
  }
  $('#pullChips').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { pull.splice(+b.dataset.rm, 1); renderComics(); renderPull(); } });
  $('#pullForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#pullMsg'), name = $('#pullName').value.trim(), contact = $('#pullContact').value.trim();
    if (!name || !contact) { msg.style.color = 'var(--alert)'; msg.textContent = 'Add your name and a way to reach you.'; return; }
    msg.style.color = 'var(--mint)';
    msg.textContent = 'Logged, ' + name + '. We’ll hold ' + (pull.length ? pull.length + ' title' + (pull.length > 1 ? 's' : '') : 'your picks') + ' for Wednesday.' + (S31.demo ? ' (Demo — nothing was sent.)' : '');
  });

  /* ---------- zone 01: we buy collections ---------- */
  $('#collType').innerHTML = S31.collection.types.map(t => '<option>' + esc(t) + '</option>').join('');
  $('#collSize').innerHTML = S31.collection.sizes.map(t => '<option>' + esc(t) + '</option>').join('');
  $('#collForm').addEventListener('submit', e => {
    e.preventDefault();
    const m = $('#collMsg'), name = $('#collName').value.trim(), contact = $('#collContact').value.trim();
    if (!name || !contact) { m.className = 'result'; m.style.color = 'var(--alert)'; m.textContent = 'Add your name and a way to reach you.'; return; }
    m.className = 'result ok'; m.style.color = '';
    m.innerHTML = '<div class="fine" style="margin-bottom:4px">VALUATION REQUEST LOGGED' + (S31.demo ? ' (DEMO)' : '') + '</div>' + esc($('#collType').value) + ' · ' + esc($('#collSize').value);
  });

  function renderDrop() {
    const d = nextWeekly(3, '10:00');
    const ms = d - new Date();
    const days = Math.floor(ms / 864e5), hrs = Math.floor(ms % 864e5 / 36e5), mins = Math.floor(ms % 36e5 / 6e4);
    $('#dropClock').textContent = 'Next drop: ' + fmtWhen(d) + ' — in ' + days + 'd ' + hrs + 'h ' + mins + 'm';
  }

  /* ---------- evidence locker ---------- */
  $('#lockerFiles').innerHTML = S31.locker.map(f =>
    '<div class="file' + (f.featured ? ' feat' : '') + '"><span class="stamp">CLASSIFIED</span><div class="fid">FILE ' + esc(f.id) + (f.featured ? ' · <span class="feat-tag">Case file of the week</span>' : '') + '</div>' +
      '<h4><span class="redact" tabindex="0" role="button" aria-label="Reveal title">' + esc(f.title) + '</span></h4>' +
      '<dl><dt>Era</dt><dd>' + esc(f.era) + '</dd><dt>Grade</dt><dd>' + esc(f.grade) + '</dd><dt>Note</dt><dd>' + esc(f.note) + '</dd><dt>Price</dt><dd>' + esc(PRE ? 'On enquiry' : f.price) + '</dd></dl>' +
      '<a class="btn small primary" target="_blank" rel="noopener" href="https://wa.me/' + esc(S31.contact.whatsapp) + '?text=' + encodeURIComponent('Hi Section 31 — requesting file ' + f.id + ' (' + f.title + ')') + '">Request file</a></div>').join('');

  /* ---------- zone 02: puzzle + leaderboard ---------- */
  const P = S31.puzzle, norm = s => String(s).toUpperCase().replace(/[^A-Z]/g, '');
  $('#cipherText').textContent = P.cipher;
  function showSolved() {
    const h = handle();
    $('#cipherResult').className = 'result ok';
    $('#cipherResult').innerHTML = '<div class="fine" style="margin-bottom:6px">TRANSMISSION DECRYPTED' + (h ? ' · saved to ' + esc(h) : '') + '</div><div class="code">' + esc(P.reward) + '</div>' +
      '<div class="muted" style="margin-top:6px">Show this at the till. <button class="btn small" id="puzzleReset" type="button" style="margin-left:8px">Reset demo</button></div>';
  }
  if (local.get('s31_puzzle') === '1') showSolved();
  $('#cipherBtn').addEventListener('click', checkCipher);
  $('#cipherInput').addEventListener('keydown', e => { if (e.key === 'Enter') checkCipher(); });
  function checkCipher() {
    const inp = $('#cipherInput'), res = $('#cipherResult');
    if (norm(inp.value) === norm(P.answer)) { local.set('s31_puzzle', '1'); showSolved(); return; }
    res.className = 'result'; res.style.color = 'var(--alert)'; res.textContent = 'Not quite. Check the hint if you’re stuck.';
    inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
  }
  $('#cipherHintBtn').addEventListener('click', () => { const r = $('#cipherResult'); r.className = 'result'; r.style.color = 'var(--amber)'; r.textContent = 'Hint: ' + P.hint; });
  $('#cipherResult').addEventListener('click', e => { if (e.target.id === 'puzzleReset') { local.del('s31_puzzle'); $('#cipherResult').className = 'result'; $('#cipherResult').textContent = ''; $('#cipherInput').value = ''; } });
  $('#boardBody').innerHTML = S31.board.map(r => '<tr><td>' + r[0] + '</td><td>' + esc(r[1]) + '</td><td class="t">' + r[2] + '</td></tr>').join('');
  $('#teamBtn').addEventListener('click', () => S31.bookingLink ? window.open(S31.bookingLink, '_blank', 'noopener') : toast('Set bookingLink in js/data.js and this opens your booking page.'));

  /* ---------- events (zones 02–04) ---------- */
  const queued = new Set();
  function renderEvents() {
    ['zone2', 'zone3', 'zone4', 'zone5', 'zone6', 'zone7'].forEach(z => {
      const list = S31.events.filter(e => e.zone === z).map((e, i) => {
        const d = e.kind === 'monthly' ? nextMonthly(e.nth, e.dow, e.time) : nextWeekly(e.dow, e.time);
        return { e, d, id: z + i };
      });   // authored order is kept on purpose (Program 01, 02, 03…)
      $('#ev' + z.charAt(0).toUpperCase() + z.slice(1)).innerHTML = list.map(x =>
        '<div class="ev"><div><div class="nm">' + esc(x.e.name) + '</div><div class="when">' + (x.e.kind === 'monthly' ? 'Monthly · ' : 'Weekly · ') + 'next ' + fmtWhen(x.d) + '</div><p>' + esc(x.e.blurb) + '</p></div>' +
        '<button type="button" class="btn small' + (queued.has(x.id) ? ' primary' : '') + '" data-q="' + x.id + '">' + (queued.has(x.id) ? 'Queued ✓' : esc(x.e.cta)) + '</button></div>').join('');
    });
  }
  ['evZone2', 'evZone3', 'evZone4', 'evZone5', 'evZone6', 'evZone7'].forEach(id => $('#' + id).addEventListener('click', e => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const k = b.dataset.q; if (queued.has(k)) queued.delete(k); else queued.add(k);
    renderEvents();
    toast(queued.has(k) ? (S31.demo ? 'Saved (demo — nothing is sent).' : 'Saved.') : 'Removed.');
  }));

  /* ---------- zone 03: portal ring ---------- */
  const ring = $('#ring');
  S31.portals.forEach((p, i) => {
    const a = (-90 + i * (360 / S31.portals.length)) * Math.PI / 180, r = 40;
    const n = document.createElement('div');
    n.className = 'node';
    n.style.left = (50 + r * Math.cos(a)) + '%';
    n.style.top = (50 + r * Math.sin(a)) + '%';
    n.innerHTML = '<button type="button" aria-label="Open portal: ' + esc(p.name) + '">' + esc(p.name) + '</button>';
    n.firstChild.addEventListener('click', () => jump(p));
    ring.appendChild(n);
  });
  function jump(p) {
    const w = $('#warp');
    w.classList.remove('go'); void w.offsetWidth;
    if (!reduceMotion) w.classList.add('go');
    setTimeout(() => {
      if (p.url && p.url !== '#') window.open(p.url, '_blank', 'noopener');
      else toast('Portal “' + p.name + '” — your link goes here.');
    }, reduceMotion ? 0 : 520);
  }

  /* ---------- zone 05: ancient x-files ---------- */
  const AX = S31.ancients || { shelf: [], files: [], channels: [] };
  $('#axFiles').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    const card = b.closest('[data-axi]'), f = AX.files[+card.dataset.axi];
    $$('[data-tab]', card).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('.xf-body', card).textContent = b.dataset.tab === 'theory' ? f.theory : f.evidence;
  });
  $('#axLinks').innerHTML = AX.channels.map(c =>
    '<a class="btn small" data-ax-link href="' + esc(c.url) + '"' + (c.url && c.url !== '#' ? ' target="_blank" rel="noopener"' : '') + '>' + esc(c.name) + '</a>').join('');
  $('#axLinks').addEventListener('click', e => {
    const a = e.target.closest('[data-ax-link]');
    if (a && a.getAttribute('href') === '#') { e.preventDefault(); toast('Add your channel links to ancients.channels in js/data.js.'); }
  });

  /* ---------- zone 06: podcast platforms + latest transmission (always visible) ---------- */
  const PC = S31.podcast || { platforms: [] };
  if ($('#pcPlatforms')) {
    $('#pcPlatforms').innerHTML = (PC.platforms || []).map(p => '<a class="btn small" data-pc-link target="_blank" rel="noopener" href="' + esc(p.url || '#') + '">' + esc(p.name) + '</a>').join('');
    $('#pcPlatforms').addEventListener('click', e => {
      const a = e.target.closest('[data-pc-link]');
      if (a && (a.getAttribute('href') === '#' || !a.getAttribute('href'))) { e.preventDefault(); toast('Add this link in the admin: Zone 06 → Listen on.'); }
    });
    const mine = (S31.media || []).filter(x => !x.hidden && shelfOf(x.shelf) && zoneOf(shelfOf(x.shelf)) === 'zone6')
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const L = mine[0];
    $('#pcLatest').innerHTML = L ? '<div class="card pc-latest"><div class="kicker"><span class="onair"></span>Latest transmission · ' + esc(shelfOf(L.shelf).name) + (L.date ? ' · ' + esc(fmtDay(L.date)) : '') + '</div>' +
      '<h3>' + esc(L.title) + '</h3>' + (L.blurb ? '<p class="muted">' + esc(L.blurb) + '</p>' : '') +
      (L.url && L.url !== '#' ? '<a class="btn primary" target="_blank" rel="noopener" href="' + esc(L.url) + '">' + (L.type === 'Podcast' ? 'Listen now' : 'Watch now') + '</a>' : '<span class="fine">Link coming soon</span>') + '</div>' : '';
  }

  /* ---------- zone 04: book a table (WhatsApp), prices, briefings ---------- */
  const TB = S31.tables || {};
  if (PRE) {
    $('#bookForm button[type=submit]').textContent = 'Register interest';
    $('#bookForm .fine:last-child').textContent = 'We open soon. We will confirm your table on WhatsApp closer to opening.';
  }
  if (PRE && $('.hero')) {                   // opening banner under the entrance
    const bn = document.createElement('div'); bn.className = 'prelaunch';
    bn.innerHTML = '<div class="wrap"><span class="onair"></span><p><b>Opening soon.</b> ' + esc(S31.launchNote || '') + '</p>' +
      '<a class="btn small primary" target="_blank" rel="noopener" href="' + waLink('Hi Section 31, please add me to the opening list.') + '">Join the opening list</a></div>';
    $('.hero').after(bn);
  }
  const fillSel = (sel, arr) => { if (arr && arr.length) $(sel).innerHTML = arr.map(v => '<option>' + esc(v) + '</option>').join(''); };
  fillSel('#bkSlot', TB.slots); fillSel('#bkSize', TB.sizes); fillSel('#bkPurpose', TB.purposes);
  const today = new Date();
  $('#bkDate').min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  $('#bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const r = $('#bookResult'), date = $('#bkDate').value, who = $('#bkContact').value.trim();
    if (!date) { r.className = 'result'; r.style.color = 'var(--alert)'; r.textContent = 'Pick a date first.'; return; }
    const d = new Date(date + 'T00:00'), day = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    const msg = (PRE ? 'Hi Section 31, when you open I’d like to book a table: ' : 'Hi Section 31, I’d like to book a table: ') + day + ', ' + $('#bkSlot').value + ', ' + $('#bkSize').value + ', for ' + $('#bkPurpose').value + '.' + (who ? ' Name/team: ' + who + '.' : '');
    r.className = 'result ok'; r.style.color = '';
    r.innerHTML = '<div class="fine" style="margin-bottom:4px">OPENING WHATSAPP</div>' + esc($('#bkPurpose').value) + ' · ' + esc($('#bkSize').value) + '<br>' + day + ' · ' + esc($('#bkSlot').value);
    window.open('https://wa.me/' + encodeURIComponent(S31.contact.whatsapp) + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
  if (PRE) $('#priceList').closest('.card').hidden = true;
  $('#priceList').innerHTML = S31.prices.map(p => '<li><b>' + esc(p[0]) + '</b><span class="p">' + esc(p[1]) + '</span></li>').join('');
  $('#briefGrid').innerHTML = S31.briefings.map((b, i) =>
    '<button type="button" class="card brief" data-brief="' + i + '"><span class="chip" style="cursor:inherit;align-self:flex-start;color:var(--mint);border-color:rgba(94,234,212,.4);background:rgba(94,234,212,.06)">' + esc(b.tag) + '</span>' +
    '<h4>' + esc(b.title) + '</h4><p>' + esc(b.blurb) + '</p><span class="rt">' + esc(b.mins) + '</span></button>').join('');
  $('#briefGrid').addEventListener('click', e => { const b = e.target.closest('[data-brief]'); if (!b) return; const item = S31.briefings[+b.dataset.brief]; if (item && item.url) window.open(item.url, '_blank', 'noopener'); else toast('Add a url to this briefing in js/data.js and it opens here.'); });

  /* ---------- clearance levels + dialog ---------- */
  function renderTiers() {
    const me = handle() ? 'cadet' : 'visitor';
    $('#tierGrid').innerHTML = S31.tiers.map(t =>
      '<div class="card tier' + (t.key === me ? ' me' : '') + '"><div class="kicker">' + (t.key === me ? 'Your level' : 'Level') + '</div><h3>' + esc(t.name).toUpperCase() + '</h3>' +
      '<div class="muted">' + esc(t.blurb) + '</div><ul>' + t.perks.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
      (t.cta && t.key !== me ? '<button class="btn primary small" type="button" data-open-clearance>' + esc(t.cta) + '</button>' : '') + '</div>').join('');
  }
  const dlg = $('#clearDlg');
  function openClearance() {
    $('#handleInput').value = handle() || '';
    $('#handleMsg').textContent = '';
    $('#clearReset').hidden = !handle();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => $('#handleInput').focus(), 30);
  }
  const closeDlg = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
  document.addEventListener('click', e => { if (e.target.closest('[data-open-clearance]') || e.target.closest('#clearChip')) openClearance(); });
  $('#clearCancel').addEventListener('click', closeDlg);
  $('#clearReset').addEventListener('click', () => { local.del('s31_handle'); closeDlg(); renderClearance(); toast('Clearance reset to Visitor.'); });
  $('#clearForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#handleInput').value.trim();
    if (!/^[A-Za-z0-9]{3,16}$/.test(v)) { $('#handleMsg').style.color = 'var(--alert)'; $('#handleMsg').textContent = 'Use 3–16 letters or numbers, no spaces.'; return; }
    local.set('s31_handle', v);
    closeDlg(); renderClearance();
    if (local.get('s31_puzzle') === '1') showSolved();
    toast('Clearance granted: Cadet ' + v + '.');
  });

  /* ---------- door: decorative QR-style plate + contact ---------- */
  (function () {
    const N = 21; let seed = 31;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const finder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    const finderOn = (x, y) => { const f = [[0, 0], [N - 7, 0], [0, N - 7]].find(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7); const lx = x - f[0], ly = y - f[1]; return lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4); };
    let d = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (finder(x, y) ? finderOn(x, y) : rnd() > .52) d += 'M' + x + ' ' + y + 'h1v1h-1z'; }
    $('#doorQr').innerHTML = '<svg viewBox="0 0 ' + N + ' ' + N + '" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true"><path d="' + d + '" fill="#05070a"/></svg>';
  })();
  const C = S31.contact;
  $('#contactList').innerHTML =
    '<li><span class="k">Address</span><span>' + esc(C.address) + '</span></li>' +
    '<li><span class="k">Hours</span>' + C.hours.map(h => '<span>' + esc(h[0]) + ' · ' + esc(h[1]) + '</span>').join('') + '</li>' +
    '<li><span class="k">WhatsApp</span><a href="https://wa.me/' + esc(C.whatsapp) + '" target="_blank" rel="noopener">+' + esc(C.whatsapp) + '</a></li>' +
    '<li><span class="k">Instagram</span><span>' + esc(C.instagram) + '</span></li>' +
    '<li><span class="k">Email</span><a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a></li>';

  /* ---------- header: hide on scroll down, show on scroll up ---------- */
  (function () {
    const hdr = $('#hdr'); let last = window.scrollY, tick = false;
    window.addEventListener('scroll', () => {
      if (tick) return; tick = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        hdr.classList.toggle('hide', y > last && y > 90);
        last = y; tick = false;
      });
    }, { passive: true });
  })();

  /* ---------- hero: holodeck grid floor (vertical lines converge, horizontal lines glide toward you) ---------- */
  (function () {
    const svg = $('#gridFloor'), gV = $('#gfV'), gH = $('#gfH'), H = 130, K = 20, SPREAD = .5, NS = 'http://www.w3.org/2000/svg';
    let W = 0; const rows = [];
    function build() {
      W = svg.clientWidth || window.innerWidth;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      const cx = W / 2, step = Math.max(110, W / 9), n = Math.ceil(cx / step) + 8;
      let d = '';
      for (let i = -n; i <= n; i++) d += 'M' + cx + ' 0L' + (cx + i * step) + ' ' + H;
      gV.innerHTML = '<path d="' + d + '"/>';
      while (rows.length < K + 1) { const l = document.createElementNS(NS, 'line'); gH.appendChild(l); rows.push(l); }
      rows.forEach(l => { l.setAttribute('x1', 0); l.setAttribute('x2', W); });
    }
    function draw(phase) {
      for (let k = 0; k <= K; k++) {
        const m = (k - phase) * SPREAD, y = H / (1 + m), l = rows[k];
        if (m < 0 || y > H) { l.setAttribute('opacity', 0); continue; }
        l.setAttribute('y1', y); l.setAttribute('y2', y);
        l.setAttribute('opacity', (Math.pow(y / H, 1.3) * .85).toFixed(3));
      }
    }
    build(); draw(0);
    addEventListener('resize', () => { build(); draw(0); });
    if (reduceMotion) return;
    const t0 = performance.now();
    (function loop(t) { if (!document.hidden) draw(((t - t0) / 2800) % 1); requestAnimationFrame(loop); })(t0);
  })();

  /* ---------- boot-up intro ---------- */
  let bootRun = 0;
  async function boot() {
    const el = $('#boot'), log = $('#bootLog'), my = ++bootRun;
    el.classList.remove('fade', 'gone');
    document.documentElement.classList.add('intro-active');
    log.textContent = '';
    const h = handle();
    const lines = [
      'SECTION 31 // FACILITY ACCESS TERMINAL',
      S31.demo ? 'build: demo · sub-level archive' : 'sub-level archive',
      '',
      '> locating facility .......... OK',
      '> scanning visitor ........... OK',
      '> CLEARANCE: ' + (h ? 'CADET · ' + h.toUpperCase() : 'VISITOR'),
      '> ACCESS GRANTED'
    ];
    const done = () => bootRun !== my;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const line of lines) {
      for (const ch of line) { if (done()) return; log.textContent += ch; await sleep(13); }
      log.textContent += '\n'; await sleep(line ? 150 : 60);
    }
    await sleep(450);
    if (!done()) finishBoot();
  }
  function finishBoot() {
    bootRun++;
    sess.set('s31_intro_seen', '1');
    const el = $('#boot');
    el.classList.add('fade');
    setTimeout(() => { el.classList.add('gone'); document.documentElement.classList.remove('intro-active'); }, 650);
  }
  $('#bootSkip').addEventListener('click', finishBoot);
  $('#boot').addEventListener('click', e => { if (e.target.id === 'boot') finishBoot(); });
  document.addEventListener('keydown', e => { if (document.documentElement.classList.contains('intro-active') && !$('#boot').classList.contains('gone')) finishBoot(); });
  $('#replayIntro').addEventListener('click', () => { sess.del('s31_intro_seen'); window.scrollTo(0, 0); boot(); });

  /* ---------- go ---------- */

  /* ---------- entrance dock + one-zone-per-page navigation ---------- */
  const ZONES = S31.zones || [];
  const short = z => z.short || z.name;
  const dock = $('#zoneDock'), peekBox = $('#dockPeek');
  if (dock) {
    dock.innerHTML = ZONES.map(z => '<a class="zbtn" href="#' + esc(z.id) + '" data-zid="' + esc(z.id) + '" style="--z:' + esc(z.color) + '">' +
      '<span class="no">' + esc(z.no) + '</span><span class="nm">' + esc(short(z)) + '</span></a>').join('');
    const showPeek = id => {
      const z = ZONES.find(x => x.id === id); if (!z) return;
      peekBox.style.setProperty('--z', z.color);
      peekBox.innerHTML = '<div class="kicker"><span class="led"></span>Zone ' + esc(z.no) + ' · ' + esc(z.role) + '</div><h3>' + esc(z.name) + '</h3><p>' + esc(z.line) + '</p>' +
        '<div class="pull">Comes back for: ' + esc(z.pull) + '</div><div class="go">Click to enter →</div>';
      const r = dock.getBoundingClientRect();     // not enough room below? open it above the buttons
      peekBox.classList.toggle('up', r.bottom + 14 + peekBox.offsetHeight > window.innerHeight && r.top - 14 - peekBox.offsetHeight > 70);
      peekBox.classList.add('show');
    };
    dock.addEventListener('mouseover', e => { const b = e.target.closest('[data-zid]'); if (b) showPeek(b.dataset.zid); });
    dock.addEventListener('focusin', e => { const b = e.target.closest('[data-zid]'); if (b) showPeek(b.dataset.zid); });
    dock.addEventListener('mouseleave', () => peekBox.classList.remove('show'));
    dock.addEventListener('focusout', e => { if (!dock.contains(e.relatedTarget)) peekBox.classList.remove('show'); });
  }
  // header menu follows the zone names set in the admin
  $$('.nav a[href^="#zone"]').forEach(a => { const z = ZONES.find(x => '#' + x.id === a.getAttribute('href')); if (z) a.textContent = short(z); });

  // top and bottom bars on every zone page
  const PAGES = $$('main > section.zone[id]').map(s => s.id);
  const zoneIds = ZONES.map(z => z.id).filter(id => PAGES.indexOf(id) > -1);
  PAGES.forEach(id => {
    const sec = $('#' + id), wrap = $('.wrap', sec); if (!wrap) return;
    const i = zoneIds.indexOf(id);
    const top = document.createElement('div'); top.className = 'page-bar';
    top.innerHTML = '<a href="#top" class="back">← Entrance</a>' + (i > -1 ? '<span class="fine">Zone ' + (i + 1) + ' of ' + zoneIds.length + '</span>' : '');
    wrap.prepend(top);
    if (i > -1) {
      const prev = ZONES.find(z => z.id === zoneIds[i - 1]), next = ZONES.find(z => z.id === zoneIds[i + 1]);
      const bot = document.createElement('div'); bot.className = 'page-next';
      bot.innerHTML = (prev ? '<a class="btn small" href="#' + esc(prev.id) + '" style="--z:' + esc(prev.color) + '">← ' + esc(short(prev)) + '</a>' : '<a class="btn small" href="#top">← Entrance</a>') +
        (next ? '<a class="btn small primary" href="#' + esc(next.id) + '" style="--z:' + esc(next.color) + '">' + esc(short(next)) + ' →</a>' : '<a class="btn small primary" href="#door">Find us →</a>');
      wrap.append(bot);
    }
  });

  function route() {
    const h = location.hash.slice(1), view = PAGES.indexOf(h) > -1 ? h : 'home';
    document.documentElement.setAttribute('data-view', view);
    $$('main > section').forEach(s => s.classList.toggle('on-view', s.id === view));
    $$('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + view));
    const on = $('.nav a.on'), nav = $('.nav'); if (on && nav) nav.scrollLeft = on.offsetLeft - nav.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
    if (peekBox) peekBox.classList.remove('show');
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    const z = ZONES.find(x => x.id === view);
    document.title = (z ? short(z) + ' · ' : '') + baseTitle;
  }
  const baseTitle = document.title;
  window.addEventListener('hashchange', route);
  route();

  renderFilters(); renderComics(); renderPull(); renderEvents(); renderDrop(); renderClearance();
  const ML = S31.mallLink;
  if (ML && ML.show === false) { $('#mallLine').remove(); }
  else if (ML) { const a = $('#mallLink'); a.href = ML.href; a.textContent = ML.label; }
  if (!S31.demo) $$('.demo-note').forEach(n => n.remove());
  setInterval(renderDrop, 30000);
  if (document.documentElement.classList.contains('intro-active') && !reduceMotion) boot();
}

/* =====================================================================
   CONTENT LOADER — reads the content published from the admin page.
   Order: live backend → last copy saved in this browser → built-in content.
   ===================================================================== */
(function () {
  'use strict';
  const api = S31.api || '', CACHE = 's31_cache', FRESH = 10 * 60 * 1000;
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  let started = false;
  function start(data) {
    if (started) return; started = true;
    if (data && typeof data === 'object' && !Array.isArray(data)) { delete data.api; Object.assign(S31, data); }
    s31App();
  }
  if (new URLSearchParams(location.search).has('preview')) {          // admin "Preview draft"
    document.title = '[DRAFT PREVIEW] ' + document.title;
    if (!api) return start(read('s31_local_draft'));
    let token = ''; try { token = sessionStorage.getItem('s31_admin_token') || ''; } catch (e) {}
    fetch(api, { method: 'POST', body: JSON.stringify({ action: 'draft', token: token }) })
      .then(r => r.json()).then(j => start(j && j.ok ? j.data : null)).catch(() => start(null));
    return;
  }
  if (!api) return start(read('s31_local_published'));
  const cached = read(CACHE);
  if (cached && cached.data && Date.now() - cached.t < FRESH) start(cached.data);
  const fallback = setTimeout(() => start(cached && cached.data), 4000);
  fetch(api + '?action=site').then(r => r.json()).then(j => {
    clearTimeout(fallback);
    if (j && j.ok && j.data) { try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), data: j.data })); } catch (e) {} }
    start(j && j.ok && j.data ? j.data : (cached && cached.data));
  }).catch(() => { clearTimeout(fallback); start(cached && cached.data); });
})();
