/* ------------------------------------------------------------------
   EHBO Meldingen Dashboard – applicatielogica (vanilla JS)
   Alle schermen worden als HTML-string gerenderd in #app.
   Klikken lopen via data-action attributen (event delegation).
------------------------------------------------------------------ */

const TYPES = {
  MEDICAL: { label: 'Medisch', className: 'type-medical' },
  SECURITY: { label: 'Security', className: 'type-security' },
  TOILET: { label: 'Toilet', className: 'type-toilet' },
  AFVAL: { label: 'Afval', className: 'type-afval' },
  KAPOT: { label: 'Kapot', className: 'type-kapot' },
  OVERIG: { label: 'Overig', className: 'type-overig' },
};
const STATUS_LABEL = { OPEN: 'Open', IN_BEHANDELING: 'In behandeling', AFGEHANDELD: 'Afgehandeld' };
const EMERGENCY_TYPES = ['MEDICAL', 'SECURITY'];
const NEW_THRESHOLD_MIN = 5;
const REFRESH_MS = 10000;

const DEFAULT_DISPLAY = { fontSize: 'standard', strongerText: false, highContrast: false, spacious: false, reduceMotion: false };
const DEFAULT_SETTINGS = { sound: true, desktopNotices: false, autoRefresh: true };

const state = {
  user: null,
  loginError: false,
  incidents: [],
  view: 'list', // list | map | accessibility | settings
  selectedId: null,
  statusFilter: 'ALLE',
  typeFilter: 'ALLE',
  crowd: false,
  lastSync: null,
  syncError: false,
  display: load('ehbo.display', DEFAULT_DISPLAY),
  settings: load('ehbo.settings', DEFAULT_SETTINGS),
};

let refreshTimer = null;
const root = document.getElementById('app');

/* ---------- Hulpfuncties ---------- */

function load(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...fallback }; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* opslag niet beschikbaar */ }
}

// Meldingen komen van bezoekers: alles escapen voordat het in de HTML komt.
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function minutesSince(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
function relativeTime(iso) {
  const min = minutesSince(iso);
  if (min < 1) return 'zojuist';
  if (min < 60) return `${min} min geleden`;
  const hours = Math.floor(min / 60);
  return `${hours} uur geleden`;
}
function clock(date) {
  return new Date(date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}
function fullDate(iso) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return `${today ? 'Vandaag' : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}, ${clock(d)}`;
}
function isNew(incident) {
  return incident.status === 'OPEN' && minutesSince(incident.aangemaakt_op) < NEW_THRESHOLD_MIN;
}
function hasLocation(incident) {
  return incident.lat != null && incident.lon != null;
}
function openCount() {
  return state.incidents.filter((i) => i.status === 'OPEN').length;
}
function sortNewestFirst(list) {
  return [...list].sort((a, b) => new Date(b.aangemaakt_op) - new Date(a.aangemaakt_op));
}

/* ---------- Kleine componenten ---------- */

const typeBadge = (type) =>
  `<span class="type-badge ${TYPES[type].className}"><span class="type-dot"></span>${TYPES[type].label}</span>`;

const statusBadge = (status) =>
  `<span class="status-badge status-${status.toLowerCase()}"><span></span>${STATUS_LABEL[status]}</span>`;

const settingRow = (key, title, description, enabled) => `
  <div class="setting-row">
    <div><strong>${title}</strong><p>${description}</p></div>
    <label class="switch"><input type="checkbox" data-setting="${key}" ${enabled ? 'checked' : ''} aria-label="${title}"><i></i></label>
  </div>`;

const pageHeading = (eyebrow, title, intro, extra = '') => `
  <div class="page-heading">
    <div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${intro}</p></div>
    ${extra}
  </div>`;

/* ---------- Schermen ---------- */

function renderLogin() {
  return `
  <main class="login-page">
    <section class="login-brand-panel">
      <div class="login-brand">
        <span class="brand-mark">${icon('pulse', 25)}</span>
        <span><strong>EVENT AID</strong><small>EHBO &amp; beveiliging</small></span>
      </div>
      <div class="login-intro">
        <p class="login-eyebrow">OPERATIECENTRUM</p>
        <h1>Samen zorgen we voor een veilig evenement.</h1>
        <p>Bekijk noodmeldingen direct, stuur de juiste hulp en houd overzicht op het hele terrein.</p>
      </div>
      <div class="login-status">
        <span>${icon('shield', 20)}</span>
        <div><strong>Beveiligde werkomgeving</strong><small>Alleen toegankelijk voor geautoriseerde medewerkers</small></div>
      </div>
    </section>
    <section class="login-form-panel">
      <form class="login-form" id="login-form" novalidate>
        <div class="login-mobile-brand"><span class="brand-mark">${icon('pulse', 23)}</span><strong>EVENT AID</strong></div>
        <p class="eyebrow">WELKOM TERUG</p>
        <h2>Inloggen</h2>
        <p class="form-intro">Gebruik je medewerkersaccount om verder te gaan.</p>
        <label><span>Gebruikersnaam</span>
          <input type="text" name="username" placeholder="Bijv. mees.jansen" autocomplete="username"></label>
        <label><span>Wachtwoord</span>
          <input type="password" name="password" placeholder="Vul je wachtwoord in" autocomplete="current-password"></label>
        <p class="login-error" id="login-error" role="alert" ${state.loginError ? '' : 'hidden'}>${icon('alert', 16)}<span>${esc(state.loginError || '')}</span></p>
        <div class="remember-row">
          <label><input type="checkbox" name="remember"> <span>Ingelogd blijven op dit apparaat</span></label>
          <button type="button" data-action="forgot">Wachtwoord vergeten?</button>
        </div>
        <button class="login-button" type="submit">Inloggen ${icon('arrow', 18)}</button>
        <p class="login-help">Hulp nodig? Neem contact op met de coördinator.</p>
      </form>
    </section>
  </main>`;
}

function renderShell(content) {
  const d = state.display;
  const classes = ['app-shell', `font-${d.fontSize}`, d.strongerText && 'text-strong', d.highContrast && 'high-contrast', d.spacious && 'spacious-ui', d.reduceMotion && 'reduced-motion'].filter(Boolean).join(' ');
  const nav = (view, iconName, label, badge = '') =>
    `<button class="${state.view === view ? 'active' : ''}" data-action="nav" data-view="${view}" data-focus="nav-${view}">${icon(iconName)}<span>${label}</span>${badge}</button>`;
  const syncText = state.syncError ? 'Verbinding verbroken' : state.lastSync ? `Live · bijgewerkt ${clock(state.lastSync)}` : 'Verbinden…';

  return `
  <div class="${classes}">
    <header class="topbar">
      <button class="brand" data-action="nav" data-view="list" aria-label="Naar meldingenoverzicht">
        <span class="brand-mark">${icon('pulse', 24)}</span>
        <span><strong>EVENT AID</strong><small>EHBO &amp; beveiliging</small></span>
      </button>
      <div class="topbar-right">
        <div class="sync" aria-live="polite"><span ${state.syncError ? 'style="background:#e34c50;box-shadow:0 0 0 4px #e34c5020"' : ''}></span> ${syncText}</div>
        <div class="divider"></div>
        <button class="profile" data-action="nav" data-view="settings" aria-label="Instellingen openen">
          <span class="avatar">${esc(state.user.initialen)}</span>
          <span class="profile-copy"><strong>${esc(state.user.naam)}</strong><small>${esc(state.user.rol)}</small></span>
          <span class="profile-chevron">⌄</span>
        </button>
      </div>
    </header>
    <div class="workspace">
      <aside class="sidebar">
        <nav aria-label="Hoofdnavigatie">
          ${nav('list', 'list', 'Meldingen', `<b>${openCount()}</b>`)}
          ${nav('map', 'map', 'Kaart')}
          ${nav('accessibility', 'accessibility', 'Leesbaarheid')}
          ${nav('settings', 'settings', 'Instellingen')}
        </nav>
        <div class="sidebar-footer">
          <div class="service-state"><span></span><div><strong>${state.syncError ? 'Geen verbinding met server' : 'Alle systemen actief'}</strong><small>Laatste controle ${state.lastSync ? clock(state.lastSync) : '–'}</small></div></div>
          <p>EVENT AID <span>v1.0</span></p>
        </div>
      </aside>
      <main id="main">${content}</main>
    </div>
  </div>`;
}

function renderList() {
  const filtered = sortNewestFirst(state.incidents).filter((i) => {
    const statusOk = state.statusFilter === 'ALLE' || i.status === state.statusFilter;
    const emergency = EMERGENCY_TYPES.includes(i.type);
    const typeOk = state.typeFilter === 'ALLE' || (state.typeFilter === 'NOOD' ? emergency : !emergency);
    return statusOk && typeOk;
  });

  const filterButtons = (group, options) => options.map(([value, label]) => {
    const active = state[group] === value;
    return `<button class="${active ? 'active' : ''}" aria-pressed="${active}" data-action="filter" data-group="${group}" data-value="${value}" data-focus="${group}-${value}">${label}</button>`;
  }).join('');

  const cards = filtered.map((i) => {
    const fresh = isNew(i);
    return `
    <button class="incident-card ${fresh ? 'is-new' : ''}" data-action="open" data-id="${esc(i.id)}">
      <span class="incident-stripe ${TYPES[i.type].className}"></span>
      <div class="incident-main">
        <div class="incident-tags">${typeBadge(i.type)}${fresh ? '<span class="new-label">Nieuw</span>' : ''}</div>
        <strong class="incident-title">${esc(i.beschrijving)}</strong>
        <span class="incident-location">${icon('pin', 15)}${esc(i.locatie || 'Geen locatie gedeeld')}</span>
      </div>
      <div class="incident-time"><strong>${relativeTime(i.aangemaakt_op)}</strong><span>${esc(i.id)}</span></div>
      ${statusBadge(i.status)}
      <span class="card-arrow">${icon('arrow', 20)}</span>
    </button>`;
  }).join('');

  return `
  <section class="content list-view">
    ${pageHeading('LIVE OVERZICHT', 'Meldingen', 'Bekijk en behandel binnenkomende meldingen op het terrein.',
      `<div class="open-counter"><span>${openCount()}</span><div><strong>Open meldingen</strong><small>vragen om aandacht</small></div></div>`)}
    <div class="filters" role="group" aria-label="Meldingen filteren">
      <div class="filter-group"><span>Status</span>
        ${filterButtons('statusFilter', [['ALLE', 'Alle'], ['OPEN', 'Open'], ['IN_BEHANDELING', 'In behandeling'], ['AFGEHANDELD', 'Afgehandeld']])}
      </div>
      <div class="filter-divider"></div>
      <div class="filter-group"><span>Type</span>
        ${filterButtons('typeFilter', [['ALLE', 'Alle'], ['NOOD', 'Nood'], ['OVERIG', 'Overig']])}
      </div>
    </div>
    <div class="list-meta"><strong>${filtered.length} ${filtered.length === 1 ? 'melding' : 'meldingen'}</strong><span>Nieuwste eerst</span></div>
    <div class="incident-list">
      ${cards || '<div class="empty-state">Geen meldingen binnen deze filters.</div>'}
    </div>
  </section>`;
}

function renderDetail(i) {
  const actions = [
    i.status === 'OPEN' && `<button class="primary-action" data-action="status" data-id="${esc(i.id)}" data-status="IN_BEHANDELING">${icon('activity')}In behandeling nemen</button>`,
    i.status !== 'AFGEHANDELD' && `<button class="complete-action" data-action="status" data-id="${esc(i.id)}" data-status="AFGEHANDELD">${icon('check')}Afhandelen</button>`,
  ].filter(Boolean).join('');

  const location = hasLocation(i)
    ? festivalMap({ compact: true, highlighted: i.type })
    : `<div class="no-location"><span>${icon('pin', 24)}</span><strong>Geen locatie gedeeld</strong><p>De melder heeft geen GPS-locatie meegestuurd.</p></div>`;

  return `
  <section class="content detail-view">
    <button class="back-button" data-action="back" data-focus="back">${icon('back', 19)} Terug naar meldingen</button>
    <div class="detail-heading">
      <div>
        <div class="detail-labels">${typeBadge(i.type)}${statusBadge(i.status)}</div>
        <h1>${esc(i.beschrijving)}</h1>
        <div class="detail-time">${icon('clock', 17)}${fullDate(i.aangemaakt_op)}<span>·</span>${esc(i.id)}</div>
      </div>
      <div class="detail-actions">${actions}</div>
    </div>
    <div class="detail-grid">
      <div class="detail-column">
        <article class="panel description-panel"><p class="panel-kicker">BESCHRIJVING</p><p>${esc(i.detail || i.beschrijving)}</p></article>
        <article class="panel reporter-panel">
          <p class="panel-kicker">MELDER</p>
          <div class="reporter">
            <span class="reporter-icon">${icon('user')}</span>
            <div><strong>${esc(i.melder || 'Anoniem')}</strong><small>${i.gebruiker_id ? `Gebruikers-ID · ${esc(i.gebruiker_id)}` : 'Geen gebruikersgegevens gedeeld'}</small></div>
          </div>
        </article>
        <div class="tip">${icon('alert', 20)}<p><strong>Veiligheid voorop</strong><br>Neem bij twijfel altijd contact op met de coördinator via de portofoon.</p></div>
      </div>
      <article class="panel location-panel">
        <div class="location-header">
          <div><p class="panel-kicker">LOCATIE</p><strong>${esc(i.locatie || 'Onbekend')}</strong></div>
          ${hasLocation(i) ? `<span>${Number(i.lat).toFixed(4)}, ${Number(i.lon).toFixed(4)}</span>` : ''}
        </div>
        ${location}
      </article>
    </div>
  </section>`;
}

function renderMap() {
  const active = sortNewestFirst(state.incidents).filter((i) => i.status !== 'AFGEHANDELD' && hasLocation(i));
  const items = active.map((i) => `
    <button data-action="open" data-id="${esc(i.id)}">
      ${typeBadge(i.type)}
      <strong>${esc(i.beschrijving)}</strong>
      <small>${relativeTime(i.aangemaakt_op)} · ${esc(i.locatie)}</small>
    </button>`).join('');

  return `
  <section class="content map-view">
    <div class="page-heading map-heading">
      <div><p class="eyebrow">LIVE OVERZICHT</p><h1>Terreinkaart</h1><p>${active.length} actieve meldingen op het festivalterrein.</p></div>
      <label class="toggle"><span><strong>Drukte tonen</strong><small>Live drukte per podium</small></span>
        <input type="checkbox" data-toggle="crowd" ${state.crowd ? 'checked' : ''}><i></i></label>
    </div>
    <div class="map-layout">
      ${festivalMap({ crowd: state.crowd, incidents: active })}
      <aside class="map-list">
        <div class="map-list-heading"><strong>Actieve meldingen</strong><span>${active.length}</span></div>
        ${items}
        <div class="legend"><p>Kaartlegenda</p><span><i class="legend-medical"></i>Medisch</span><span><i class="legend-security"></i>Security</span><span><i class="legend-other"></i>Overig</span></div>
      </aside>
    </div>
  </section>`;
}

/* Getekende plattegrond uit het ontwerp. Pinposities zijn nu vaste plekken;
   vervang PIN_POSITIONS door een lat/lon -> % omrekening of een echte kaartlaag (bijv. Leaflet) zodra de terreingrenzen bekend zijn. */
const PIN_POSITIONS = [[31, 28], [66, 33], [25, 67], [72, 71]];

function festivalMap({ crowd = false, incidents = [], compact = false, highlighted = null } = {}) {
  const pins = compact
    ? `<span class="map-pin pin-focus ${highlighted ? TYPES[highlighted].className : ''}" role="img" aria-label="Locatie van de melding">${icon('pin', 20)}</span>`
    : incidents.map((i, index) => {
        const [left, top] = PIN_POSITIONS[index % PIN_POSITIONS.length];
        return `<button class="map-pin ${TYPES[i.type].className}" style="left:${left}%;top:${top}%" data-action="open" data-id="${esc(i.id)}" aria-label="${TYPES[i.type].label}: ${esc(i.beschrijving)}">${icon('pin', 19)}</button>`;
      }).join('');

  return `
  <div class="festival-map ${compact ? 'compact' : ''}">
    <div class="map-grid"></div>
    <div class="water water-one"></div><div class="water water-two"></div>
    <div class="road road-one"></div><div class="road road-two"></div>
    <div class="stage stage-a ${crowd ? 'crowd-red' : ''}"><b>NORTH</b><span>STAGE</span></div>
    <div class="stage stage-b ${crowd ? 'crowd-orange' : ''}"><b>CORE</b><span>STAGE</span></div>
    <div class="stage stage-c ${crowd ? 'crowd-green' : ''}"><b>SOUTH</b><span>STAGE</span></div>
    <div class="facility facility-one">EHBO</div>
    <div class="facility facility-two">FOOD</div>
    <div class="facility facility-three">WC</div>
    <div class="map-label entrance">HOOFDINGANG</div>
    ${pins}
    <div class="map-controls"><button aria-label="Inzoomen">+</button><button aria-label="Uitzoomen">−</button></div>
    <div class="map-scale">50 m</div>
  </div>`;
}

function renderAccessibility() {
  const d = state.display;
  const sizes = [['standard', 'Standaard'], ['large', 'Groot'], ['extra-large', 'Extra groot']].map(([value, label]) => `
    <button class="${d.fontSize === value ? 'active' : ''}" aria-pressed="${d.fontSize === value}" data-action="font-size" data-value="${value}" data-focus="size-${value}">
      <span class="size-sample sample-${value}">Aa</span><strong>${label}</strong>
      <i ${d.fontSize === value ? '' : 'hidden'}>${icon('check', 13)}</i>
    </button>`).join('');

  return `
  <section class="content accessibility-view">
    ${pageHeading('PERSOONLIJKE WEERGAVE', 'Leesbaarheid', 'Pas het dashboard aan voor prettig en snel gebruik.',
      '<button class="reset-display" data-action="reset-display" data-focus="reset-display">Standaard herstellen</button>')}
    <div class="accessibility-layout">
      <div class="accessibility-options">
        <article class="settings-card">
          <div class="settings-card-heading"><span><span class="text-size-icon">Aa</span></span><div><h2>Tekstgrootte</h2><p>Vergroot alle informatie zonder functies te verbergen.</p></div></div>
          <div class="size-options" role="group" aria-label="Tekstgrootte">${sizes}</div>
        </article>
        <article class="settings-card">
          <div class="settings-card-heading"><span>${icon('eye')}</span><div><h2>Duidelijkheid en contrast</h2><p>Maak tekst, randen en bediening makkelijker te onderscheiden.</p></div></div>
          ${settingRow('display.strongerText', 'Stevigere tekst', 'Gebruik een hoger lettergewicht voor labels en beschrijvingen.', d.strongerText)}
          ${settingRow('display.highContrast', 'Hoog contrast', 'Maak tekst donkerder en randen duidelijker zichtbaar.', d.highContrast)}
        </article>
        <article class="settings-card">
          <div class="settings-card-heading"><span>${icon('layout')}</span><div><h2>Bediening en beweging</h2><p>Vergroot klikvlakken of verminder visuele beweging.</p></div></div>
          ${settingRow('display.spacious', 'Ruimere bediening', 'Meer ruimte tussen regels en grotere knoppen voor touchgebruik.', d.spacious)}
          ${settingRow('display.reduceMotion', 'Minder animatie', 'Schakel knipperende meldingen en bewegingseffecten uit.', d.reduceMotion)}
        </article>
      </div>
      <aside class="readability-preview">
        <p class="panel-kicker">LIVE VOORBEELD</p>
        <h2>Zo ziet een melding eruit</h2>
        <div class="preview-incident">${typeBadge('MEDICAL')}<strong>Bezoeker heeft medische hulp nodig</strong><p>Hoofdpodium · vak B</p>${statusBadge('OPEN')}</div>
        <div class="preview-tip">${icon('eye', 18)}<span>Wijzigingen zijn direct zichtbaar in het hele dashboard.</span></div>
      </aside>
    </div>
  </section>`;
}

function renderSettings() {
  const s = state.settings;
  return `
  <section class="content settings-view">
    ${pageHeading('PERSOONLIJKE VOORKEUREN', 'Instellingen', 'Beheer meldingen en je actieve werksessie.')}
    <div class="settings-layout">
      <div class="settings-main">
        <article class="settings-card">
          <div class="settings-card-heading"><span>${icon('volume')}</span><div><h2>Meldingen</h2><p>Bepaal hoe nieuwe meldingen je aandacht krijgen.</p></div></div>
          ${settingRow('settings.sound', 'Geluid bij noodmeldingen', 'Speel een signaal af bij nieuwe medische en securitymeldingen.', s.sound)}
          ${settingRow('settings.desktopNotices', 'Desktopmeldingen', 'Toon een melding buiten het actieve browservenster.', s.desktopNotices)}
        </article>
        <article class="settings-card">
          <div class="settings-card-heading"><span>${icon('refresh')}</span><div><h2>Synchronisatie</h2><p>Instellingen voor het ophalen van nieuwe data.</p></div></div>
          ${settingRow('settings.autoRefresh', 'Automatisch verversen', `Vraag elke ${REFRESH_MS / 1000} seconden de nieuwste meldingen op.`, s.autoRefresh)}
          <div class="setting-info"><span>Verversingsinterval</span><strong>${s.autoRefresh ? `${REFRESH_MS / 1000} seconden` : 'Uitgeschakeld'}</strong></div>
        </article>
      </div>
      <aside class="account-card">
        <div class="account-avatar">${esc(state.user.initialen)}</div>
        <h2>${esc(state.user.naam)}</h2>
        <p>${esc(state.user.rol)}</p>
        <div class="account-details">
          <span><small>Medewerker-ID</small><strong>${esc(state.user.medewerker_id || 'EVT-0241')}</strong></span>
          <span><small>Actieve dienst</small><strong>${esc(state.user.dienst || '14:00 – 22:00')}</strong></span>
          <span><small>Team</small><strong>${esc(state.user.team || 'Central control')}</strong></span>
        </div>
        <button class="logout-button" data-action="logout">${icon('logout', 18)}Veilig uitloggen</button>
      </aside>
    </div>
  </section>`;
}

/* ---------- Render ---------- */

function render() {
  // Focus bewaren over re-renders heen (belangrijk voor toetsenbordgebruik).
  const focusKey = document.activeElement?.dataset?.focus || document.activeElement?.dataset?.setting;

  if (!state.user) {
    root.innerHTML = renderLogin();
    return;
  }

  const selected = state.incidents.find((i) => i.id === state.selectedId);
  let content;
  if (selected) content = renderDetail(selected);
  else if (state.view === 'map') content = renderMap();
  else if (state.view === 'accessibility') content = renderAccessibility();
  else if (state.view === 'settings') content = renderSettings();
  else content = renderList();

  root.innerHTML = renderShell(content);
  document.title = `${openCount() ? `(${openCount()}) ` : ''}EHBO Meldingen · Event Aid`;

  if (focusKey) {
    root.querySelector(`[data-focus="${focusKey}"], [data-setting="${focusKey}"]`)?.focus();
  }
}

/* ---------- Data & live verversen ---------- */

async function refresh({ notify = true } = {}) {
  try {
    const previousIds = new Set(state.incidents.map((i) => i.id));
    const incidents = await Api.getIncidents();
    const arrived = incidents.filter((i) => !previousIds.has(i.id));
    state.incidents = incidents;
    state.lastSync = new Date();
    state.syncError = false;
    if (notify && previousIds.size) alertNewIncidents(arrived);
  } catch (error) {
    console.error(error);
    state.syncError = true;
  }
  render();
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (state.settings.autoRefresh) refreshTimer = setInterval(refresh, REFRESH_MS);
}
function stopAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = null;
}

function alertNewIncidents(arrived) {
  const emergencies = arrived.filter((i) => EMERGENCY_TYPES.includes(i.type));
  if (!emergencies.length) return;
  if (state.settings.sound) playAlertSound();
  if (state.settings.desktopNotices && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
    emergencies.forEach((i) => new Notification(`${TYPES[i.type].label}: ${i.beschrijving}`, { body: i.locatie || '', tag: i.id }));
  }
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
  } catch { /* geen audio beschikbaar */ }
}

/* ---------- Events ---------- */

root.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action } = el.dataset;

  switch (action) {
    case 'nav':
      state.view = el.dataset.view;
      state.selectedId = null;
      break;
    case 'filter':
      state[el.dataset.group] = el.dataset.value;
      break;
    case 'open':
      state.selectedId = el.dataset.id;
      window.scrollTo(0, 0);
      break;
    case 'back':
      state.selectedId = null;
      break;
    case 'status': {
      el.disabled = true;
      try {
        const updated = await Api.updateStatus(el.dataset.id, el.dataset.status);
        state.incidents = state.incidents.map((i) => (i.id === updated.id ? { ...i, ...updated } : i));
      } catch (error) {
        console.error(error);
        alert('De status kon niet worden opgeslagen. Probeer het opnieuw.');
      }
      break;
    }
    case 'font-size':
      state.display.fontSize = el.dataset.value;
      save('ehbo.display', state.display);
      break;
    case 'reset-display':
      state.display = { ...DEFAULT_DISPLAY };
      save('ehbo.display', state.display);
      break;
    case 'logout':
      Api.logout();
      stopAutoRefresh();
      state.user = null;
      state.selectedId = null;
      state.view = 'list';
      break;
    case 'forgot':
      return; // TODO: koppelen aan wachtwoord-herstel van de backend
    default:
      return;
  }
  render();
});

root.addEventListener('change', (event) => {
  const input = event.target;

  if (input.dataset.toggle === 'crowd') {
    state.crowd = input.checked;
    return render();
  }

  if (input.dataset.setting) {
    const [group, key] = input.dataset.setting.split('.');
    state[group][key] = input.checked;
    save(`ehbo.${group}`, state[group]);

    if (group === 'settings' && key === 'autoRefresh') startAutoRefresh();
    if (group === 'settings' && key === 'desktopNotices' && input.checked && 'Notification' in window) {
      Notification.requestPermission();
    }
    render();
  }
});

root.addEventListener('submit', async (event) => {
  if (event.target.id !== 'login-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const errorEl = document.getElementById('login-error');

  const showError = (message) => {
    errorEl.querySelector('span').textContent = message;
    errorEl.hidden = false;
  };

  if (!username || !password) return showError('Vul je gebruikersnaam en wachtwoord in.');

  try {
    state.user = await Api.login(username, password);
    state.user.initialen ||= state.user.naam.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    await refresh({ notify: false });
    startAutoRefresh();
  } catch (error) {
    console.error(error);
    showError('Inloggen mislukt. Controleer je gegevens.');
  }
});

// Verberg de inlogfout zodra er weer getypt wordt.
root.addEventListener('input', (event) => {
  if (event.target.closest('#login-form')) document.getElementById('login-error').hidden = true;
});

// Relatieve tijden ("2 min geleden") ook bijwerken als verversen uit staat.
setInterval(() => { if (state.user && !state.settings.autoRefresh) render(); }, 60000);

render();
