// ======================================================
// FIREBASE
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBoU0ikw_z5cyL8nTvBpYlrAvgRpDklZ1M",
  authDomain: "text2anki.firebaseapp.com",
  projectId: "text2anki",
  storageBucket: "text2anki.firebasestorage.app",
  messagingSenderId: "354909730446",
  appId: "1:354909730446:web:db9f35da840871c3013bdf"
};

firebase.initializeApp(firebaseConfig);
const auth   = firebase.auth();
const fsDb   = firebase.firestore();

let currentUser   = null;
let existingHashes = new Set();

auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) {
    renderUserInfo(user);
    renderSidebarUser(user);
    document.getElementById('sidebarToggle').style.display = 'flex';
    document.getElementById('floatingDecksPanel').classList.add('fdp-visible');
    await loadUserHashes();
    await loadUserDecks();
  } else {
    document.getElementById('btnSignIn').style.display = '';
    document.getElementById('userInfo').style.display  = 'none';
    document.getElementById('sidebarToggle').style.display = 'none';
    document.getElementById('floatingDecksPanel').classList.remove('fdp-visible');
    existingHashes = new Set();
    userDecks = [];
  }
});

function renderUserInfo(user) {
  document.getElementById('btnSignIn').style.display  = 'none';
  document.getElementById('userInfo').style.display   = 'flex';
  document.getElementById('userName').textContent     = user.displayName || user.email;
  const wrap = document.getElementById('userAvatarWrap');
  if (user.photoURL) {
    wrap.innerHTML = `<img class="user-avatar" src="${user.photoURL}" alt="">`;
  } else {
    const i = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    wrap.innerHTML = `<div class="user-avatar-placeholder">${i}</div>`;
  }
}

async function signInWithGoogle() {
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    showToast('Signed in successfully', 'success');
  } catch (e) { showToast('Sign-in failed: ' + e.message, 'error'); }
}

async function signOut() {
  try { await auth.signOut(); showToast('Signed out', 'info'); }
  catch (e) { showToast('Error signing out', 'error'); }
}

async function loadUserHashes() {
  if (!currentUser) return;
  try {
    const snap = await fsDb.collection('users').doc(currentUser.uid).collection('cardHashes').get();
    existingHashes = new Set(snap.docs.map(d => d.id));
  } catch (e) { console.warn('Hashes load failed:', e); }
}

async function persistHashes(hashes) {
  if (!currentUser || !hashes.length) return;
  const col   = fsDb.collection('users').doc(currentUser.uid).collection('cardHashes');
  const batch = fsDb.batch();
  for (const h of hashes) batch.set(col.doc(h), { t: firebase.firestore.FieldValue.serverTimestamp() });
  await batch.commit();
}

// ======================================================
// SIDEBAR / MY DECKS
// ======================================================
let userDecks = [];

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  const ov = document.getElementById('sidebarOverlay');
  ov.style.display = 'block';
  requestAnimationFrame(() => ov.classList.add('visible'));
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const ov = document.getElementById('sidebarOverlay');
  ov.classList.remove('visible');
  setTimeout(() => { ov.style.display = 'none'; }, 300);
}

function renderSidebarUser(user) {
  const wrap = document.getElementById('sidebarUser');
  const avatarHtml = user.photoURL
    ? `<img class="sidebar-user-avatar" src="${user.photoURL}" alt="">`
    : `<div class="sidebar-user-avatar-placeholder">${(user.displayName||user.email||'U').charAt(0).toUpperCase()}</div>`;
  wrap.innerHTML = `
    ${avatarHtml}
    <div>
      <div class="sidebar-user-name">${user.displayName || ''}</div>
      <div class="sidebar-user-email">${user.email || ''}</div>
    </div>
  `;
}

async function loadUserDecks() {
  if (!currentUser) return;
  try {
    const snap = await fsDb.collection('users').doc(currentUser.uid).collection('decks')
      .orderBy('lastExported', 'desc').limit(50).get();
    userDecks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSidebarDecks();
  } catch (e) {
    // orderBy requires index — fall back without ordering
    try {
      const snap2 = await fsDb.collection('users').doc(currentUser.uid).collection('decks').limit(50).get();
      userDecks = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSidebarDecks();
    } catch (e2) { console.warn('Decks load failed:', e2); }
  }
}

function renderSidebarDecks() {
  const container = document.getElementById('sidebarDecks');
  const statsEl   = document.getElementById('sidebarStats');

  if (!userDecks.length) {
    container.innerHTML = `
      <div class="sidebar-empty">
        <div class="sidebar-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#9aaa9b" stroke-width="1.5" fill="none"/>
            <path d="M3 9h18" stroke="#9aaa9b" stroke-width="1.5"/>
            <path d="M8 5V3M16 5V3" stroke="#9aaa9b" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        No decks yet. Download your first .apkg to see it here.
      </div>`;
    statsEl.style.display = 'none';
    return;
  }

  statsEl.style.display = 'grid';
  const totalCards = userDecks.reduce((s, d) => s + (d.cardCount || 0), 0);
  document.getElementById('statDecks').textContent = userDecks.length;
  document.getElementById('statCards').textContent = totalCards > 999 ? (totalCards/1000).toFixed(1)+'k' : totalCards;

  container.innerHTML = userDecks.map(deck => {
    const initial   = (deck.name || 'D').charAt(0).toUpperCase();
    const cardCount = deck.cardCount || 0;
    const noteType  = deck.noteType || 'Basic';
    const tagClass  = noteType === 'Basic' ? 'basic' : 'cloze';
    const date      = deck.lastExported?.toDate
      ? deck.lastExported.toDate().toLocaleDateString('en-US', { month:'short', day:'numeric' })
      : '';
    const currentDeck = document.getElementById('deckName').value.trim();
    const isActive = deck.name === currentDeck;
    return `
      <div class="deck-item ${isActive ? 'active-deck' : ''}" onclick="loadDeckFromSidebar('${deck.name.replace(/'/g,"\\'")}','${noteType}')">
        <div class="deck-icon">${initial}</div>
        <div class="deck-info">
          <div class="deck-name">${deck.name}</div>
          <div class="deck-meta">${cardCount} card${cardCount !== 1 ? 's' : ''}${date ? ' &middot; ' + date : ''}</div>
        </div>
        <span class="deck-type-tag ${tagClass}">${noteType}</span>
      </div>`;
  }).join('');

  renderFloatingPanel();
}

function renderFloatingPanel() {
  const list    = document.getElementById('fdpList');
  const searchEl = document.getElementById('fdpSearch');
  if (!list) return;

  // Update stats
  const totalCards = userDecks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const deckCount  = document.getElementById('fdpStatDecks');
  const cardCount  = document.getElementById('fdpStatCards');
  if (deckCount) deckCount.textContent = userDecks.length;
  if (cardCount) cardCount.textContent = totalCards > 999 ? (totalCards/1000).toFixed(1)+'k' : totalCards;

  if (!userDecks.length) {
    list.innerHTML = `
      <div class="fdp-empty">
        <div class="fdp-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#8fab87" stroke-width="1.5" fill="none"/>
            <path d="M3 9h18" stroke="#8fab87" stroke-width="1.4"/>
          </svg>
        </div>
        No decks yet.<br>Download your first deck to see it here.
      </div>`;
    return;
  }

  const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const filtered = query
    ? userDecks.filter(d => (d.name||'').toLowerCase().includes(query))
    : userDecks;

  if (!filtered.length) {
    list.innerHTML = `<div class="fdp-empty" style="padding:16px">No decks match "<strong>${query}</strong>"</div>`;
    return;
  }

  const currentDeck = document.getElementById('deckName').value.trim();

  // Group decks by class (prefix before " - " or first word if no prefix)
  const groups = new Map();
  for (const deck of filtered) {
    const name = deck.name || '';
    const sep  = name.indexOf(' - ');
    const cls  = sep > 0 ? name.slice(0, sep).trim() : 'Recent';
    if (!groups.has(cls)) groups.set(cls, []);
    groups.get(cls).push(deck);
  }

  function iconClass(noteType) {
    if (noteType === 'Basic')   return 'fdp-icon-basic';
    if (noteType === 'Cloze++') return 'fdp-icon-clozep';
    return 'fdp-icon-cloze';
  }
  function badgeClass(noteType) {
    if (noteType === 'Basic')   return 'fdp-badge-basic';
    if (noteType === 'Cloze++') return 'fdp-badge-clozep';
    return 'fdp-badge-cloze';
  }
  function timeAgo(deck) {
    const d = deck.lastExported?.toDate?.();
    if (!d) return '';
    const days = Math.floor((Date.now() - d)/86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7)   return days + 'd ago';
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  }

  let html = '';
  for (const [cls, decks] of groups) {
    const isMulti = groups.size > 1;
    if (isMulti) {
      html += `
        <div class="fdp-class-group">
          <div class="fdp-class-header" onclick="toggleFdpGroup(this)">
            <svg class="fdp-class-chevron" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="fdp-class-name">${cls}</span>
            <span class="fdp-class-count">${decks.length}</span>
          </div>
          <div class="fdp-class-decks">`;
    }

    for (const deck of decks) {
      const noteType  = deck.noteType || 'Basic';
      const cardCount = deck.cardCount || 0;
      const isActive  = deck.name === currentDeck;
      const safeName  = deck.name.replace(/'/g, "\\'");
      const initial   = (deck.name || 'D').replace(/^[^a-zA-Z]*/, '').charAt(0).toUpperCase() || (deck.name||'D').charAt(0).toUpperCase();
      const displayName = groups.size > 1 && deck.name.startsWith(cls + ' - ')
        ? deck.name.slice(cls.length + 3)
        : deck.name;
      const ago = timeAgo(deck);
      html += `
        <div class="fdp-item ${isActive ? 'active' : ''}" onclick="loadDeckFromFloating('${safeName}','${noteType}')">
          <div class="fdp-icon ${iconClass(noteType)}">${initial}</div>
          <div class="fdp-info">
            <div class="fdp-name">${displayName}</div>
            <div class="fdp-meta">
              <span>${cardCount} card${cardCount !== 1 ? 's' : ''}</span>
              ${ago ? `<span>·</span><span>${ago}</span>` : ''}
              <span class="fdp-badge ${badgeClass(noteType)}">${noteType}</span>
            </div>
          </div>
        </div>`;
    }

    if (isMulti) {
      html += `</div></div>`;
    }
  }

  list.innerHTML = html;
}

function toggleFdpGroup(header) {
  const decksEl = header.nextElementSibling;
  const chevron = header.querySelector('.fdp-class-chevron');
  decksEl.classList.toggle('collapsed');
  chevron.style.transform = decksEl.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

function loadDeckFromFloating(name, noteType) {
  document.getElementById('deckName').value = name;
  const pill = [...document.querySelectorAll('.type-pill')].find(p => p.dataset.type === noteType);
  if (pill) setCardType(noteType, pill);
  renderFloatingPanel();
  showToast(`Deck "${name}" loaded`, 'info');
}

function loadDeckFromSidebar(name, noteType) {
  document.getElementById('deckName').value = name;
  const pill = [...document.querySelectorAll('.type-pill')].find(p => p.dataset.type === noteType);
  if (pill) setCardType(noteType, pill);
  closeSidebar();
  showToast(`Deck "${name}" loaded`, 'info');
}

async function saveDeckRecord(deckName, noteType, cardCount) {
  if (!currentUser) return;
  try {
    const deckId = deckName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    await fsDb.collection('users').doc(currentUser.uid).collection('decks').doc(deckId).set({
      name: deckName,
      noteType,
      cardCount,
      lastExported: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await loadUserDecks();
  } catch (e) { console.warn('saveDeckRecord failed:', e); }
}

// ======================================================
// APP STATE
// ======================================================
let selectedCardType = 'Basic';
let parsedCards      = [];
let previewData      = [];
let chosenModalFmt   = null;

// ======================================================
// CARD TYPE
// ======================================================
const PLACEHOLDERS = {
  'Basic':   'Q: What is the powerhouse of the cell?\nA: The mitochondria.\n\nQ: What process produces ATP?\nA: Cellular respiration, specifically oxidative phosphorylation.',
  'Cloze+':  'The {{c1::mitochondria}} is responsible for producing ATP || Powerhouse of the cell\nCellular respiration yields {{c1::36 to 38}} ATP per glucose || Varies by organism',
  'Cloze++': 'The {{c1::krebs cycle::TCA cycle}} produces {{c2::3 NADH::electron carrier}} per turn || Occurs in the mitochondrial matrix; each turn also yields 1 FADH2, 1 GTP\n{{c1::Pyruvate decarboxylation::bridge reaction}} links glycolysis to the Krebs cycle || Produces 1 NADH, releases 1 CO2; irreversible'
};

function setCardType(type, btn) {
  selectedCardType = type;
  document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('notesInput').placeholder = PLACEHOLDERS[type] || PLACEHOLDERS['Basic'];
  debounceParse();
}

// ======================================================
// PARSER
// ======================================================
function parseCards(text, noteType) {
  if (!text.trim()) return { cards: [], strategy: 'none' };
  const strategies = [];

  if (noteType !== 'Basic') {
    const cc = [];
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (/\{\{c\d+::/.test(t)) {
        const parts = t.split(' || ');
        cc.push({ front: parts[0], back: parts[1] || '' });
      }
    }
    if (cc.length) strategies.push({ name: 'Cloze syntax', cards: cc });
  }

  const lc = [];
  for (const block of text.split(/\n{2,}/)) {
    let front = '', back = '', mode = '';
    for (const line of block.split('\n')) {
      if (/^(q(uestion)?|front)\s*:/i.test(line)) { front = line.replace(/^[^:]+:\s*/i,''); mode='f'; }
      else if (/^(a(nswer)?|back)\s*:/i.test(line)) { back = line.replace(/^[^:]+:\s*/i,''); mode='b'; }
      else if (mode==='f') front += ' '+line.trim();
      else if (mode==='b') back  += ' '+line.trim();
    }
    if (front.trim() && back.trim()) lc.push({ front: front.trim(), back: back.trim() });
  }
  if (lc.length) strategies.push({ name: 'Q/A labels', cards: lc });

  const tc = text.split('\n').filter(l=>l.includes('\t')).map(l=>{
    const p=l.split('\t'); return { front:p[0].trim(), back:p.slice(1).join('\t').trim() };
  }).filter(c=>c.front&&c.back);
  if (tc.length) strategies.push({ name: 'Tab-separated', cards: tc });

  const sc = text.split('\n').filter(l=>l.includes(';')&&!l.includes('\t')).map(l=>{
    const p=l.split(';'); return { front:p[0].trim(), back:p.slice(1).join(';').trim() };
  }).filter(c=>c.front&&c.back);
  if (sc.length) strategies.push({ name: 'Semicolon-separated', cards: sc });

  const nc = []; const lines = text.split('\n');
  for (let i=0;i<lines.length-1;i++){
    const m=lines[i].match(/^\d+[\.\)]\s+(.+)/);
    if (m){ const b=lines[i+1].trim(); if(b&&!/^\d+[\.\)]/.test(b)){ nc.push({front:m[1].trim(),back:b});i++; } }
  }
  if (nc.length) strategies.push({ name: 'Numbered pairs', cards: nc });

  const al = text.split('\n').filter(l=>l.trim());
  if (al.length>=2 && al.length%2===0) {
    const ac=[];
    for(let i=0;i<al.length;i+=2) ac.push({front:al[i].trim(),back:al[i+1].trim()});
    strategies.push({ name: 'Alternating lines', cards: ac });
  }

  if (!strategies.length) return { cards: [], strategy: 'none' };
  const best = strategies.reduce((a,b) => b.cards.length>a.cards.length ? b : a);
  return { cards: best.cards.map(c=>({...c, noteType})), strategy: best.name };
}

let parseTimer = null;
function debounceParse() {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(runParse, 250);
}
function runParse() {
  const text   = document.getElementById('notesInput').value;
  const result = parseCards(text, selectedCardType);
  parsedCards  = result.cards;
  const badge  = document.getElementById('cardCountBadge');
  const hint   = document.getElementById('formatHint');
  const btn    = document.getElementById('btnPreview');

  const btnDirect = document.getElementById('btnDirectDownload');
  if (parsedCards.length) {
    badge.textContent = parsedCards.length + (parsedCards.length===1 ? ' card' : ' cards');
    badge.classList.add('active');
    hint.innerHTML = `<span class="hint-text">Format detected:</span><span class="strategy-chip">${result.strategy}</span>`;
    btn.disabled = false;
    btnDirect.disabled = false;
  } else {
    badge.textContent = '0 cards';
    badge.classList.remove('active');
    hint.innerHTML = text.trim()
      ? `<span class="hint-text">No recognizable format detected. Try Q:/A: labels, tab-separated, or cloze syntax.</span>`
      : `<span class="hint-text">Paste notes above — format will be detected automatically.</span>`;
    btn.disabled = true;
    btnDirect.disabled = true;
  }
}

document.getElementById('notesInput').addEventListener('input', debounceParse);
document.getElementById('notesInput').placeholder = PLACEHOLDERS['Basic'];

// ======================================================
// PREVIEW
// ======================================================
function doPreview() {
  if (!parsedCards.length) return;

  const seen = new Set(), filtered = [], dupes = [];
  for (const card of parsedCards) {
    const key = (card.noteType||'') + '\x1f' + (card.front||'').trim().toLowerCase() + '\x1f' + (card.back||'').trim().toLowerCase();
    if (seen.has(key)) { dupes.push(card); continue; }
    seen.add(key);
    filtered.push(card);
  }
  previewData = filtered;

  document.getElementById('previewCount').textContent = filtered.length + (filtered.length===1 ? ' card ready' : ' cards ready');
  const db = document.getElementById('dupesBadge');
  if (dupes.length) { db.textContent = dupes.length + ' duplicate'+(dupes.length>1?'s':'')+' skipped'; db.style.display=''; }
  else { db.style.display='none'; }

  const list = document.getElementById('cardsList');
  list.innerHTML = '';
  filtered.forEach((card, i) => {
    const isCloze = card.noteType !== 'Basic';
    const row = document.createElement('div');
    row.className = 'card-row';
    row.innerHTML = `
      <div class="card-num">${i+1}</div>
      <div>
        <div class="card-col-label">${isCloze ? 'Text' : 'Front'}</div>
        <div class="card-front ${isCloze?'cloze-text':''}">${isCloze ? hlCloze(card.front||'') : esc(card.front||'')}</div>
      </div>
      <div>
        <div class="card-col-label">${isCloze ? 'Extra' : 'Back'}</div>
        <div class="card-back">${esc(card.back||'')}</div>
      </div>`;
    list.appendChild(row);
    setTimeout(() => row.classList.add('visible'), 40 + i * 35);
  });

  const sec = document.getElementById('previewSection');
  sec.classList.add('visible');
  setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

function hlCloze(text) {
  return esc(text).replace(/\{\{c(\d+)::([^}:]+)(?:::[^}]*)?\}\}/g,
    (_, n, ans) => `<span class="cloze-mark">{{c${n}::${ans}}}</span>`);
}
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearAll() {
  document.getElementById('notesInput').value = '';
  document.getElementById('deckName').value   = 'My Deck';
  parsedCards = []; previewData = [];
  runParse();
  document.getElementById('previewSection').classList.remove('visible');
  document.getElementById('cardsList').innerHTML = '';
}

// ======================================================
// CRYPTO HELPERS
// ======================================================
async function sha1csum(text) {
  const buf   = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  const bytes = new Uint8Array(buf);
  return ((bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3]) >>> 0;
}
async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function guidFromId(id) {
  return String(id).split('').map(c=>String.fromCharCode(c.charCodeAt(0)+49)).join('');
}

// ======================================================
// APKG DOWNLOAD
// ======================================================
async function doDirectDownload() {
  if (!parsedCards.length) { showToast('No cards detected','error'); return; }
  previewData = parsedCards;
  const btn = document.getElementById('btnDirectDownload');
  btn.disabled = true;
  btn.textContent = 'Building...';
  try {
    await downloadApkg();
  } finally {
    btn.textContent = 'Download .apkg';
    btn.disabled = !parsedCards.length;
  }
}

async function downloadApkg() {
  const btn = document.getElementById('btnDownload');
  btn.disabled = true;
  btn.textContent = 'Building...';
  try {
    if (!previewData.length) { showToast('No cards to export','error'); return; }

    // hash all cards
    const hm = await Promise.all(previewData.map(async card => {
      const key = (card.noteType||'')+'\x1f'+(card.front||'').trim().toLowerCase()+'\x1f'+(card.back||'').trim().toLowerCase();
      return { card, hash: await sha256hex(key) };
    }));

    let toExport = hm, fsSkipped = 0;
    if (currentUser && existingHashes.size) {
      const fresh = hm.filter(x => !existingHashes.has(x.hash));
      fsSkipped   = hm.length - fresh.length;
      toExport    = fresh;
    }

    if (!toExport.length) { showToast('All cards already in your history','info'); return; }
    if (fsSkipped) showToast(`${fsSkipped} card${fsSkipped>1?'s':''} already saved — skipped`,'info');

    const SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
    });
    const db = new SQL.Database();

    const now_s  = Math.floor(Date.now()/1000);
    const now_ms = Date.now();
    const deckId = 1000000000 + Math.floor(Math.random()*999999);
    const deckName = (document.getElementById('deckName').value.trim() || 'My Deck');

    const MID_BASIC  = 1483786767214;
    const MID_CLOZE  = 1577239191269;

    // Model ids must be numbers inside the object, but the JSON keys must be strings
    const BASIC_QFMT = `<div id="bkard">
  <div class="tags">{{Tags}}</div>
  <div class="side-label">Question</div>
  <div class="bfront">{{Front}}</div>
</div>`;

    const BASIC_AFMT = `<div id="bkard">
  <div class="tags">{{Tags}}</div>
  <div class="side-label">Question</div>
  <div class="bfront">{{Front}}</div>
  <div class="divider"><span class="divider-line"></span><span class="divider-diamond"></span><span class="divider-line"></span></div>
  <div class="side-label answer-label">Answer</div>
  <div class="bback">{{Back}}</div>
</div>`;

    const BASIC_CSS = `/* Page — soft warm cream gradient */
html {
    overflow: scroll;
    overflow-x: hidden;
    background: linear-gradient(160deg, #f5f0e8 0%, #ede8f5 50%, #e8f0ed 100%);
    min-height: 100%;
}

/* Card wrapper */
#bkard {
    padding: 32px 24px 28px;
    max-width: 720px;
    margin: 0 auto;
    word-wrap: break-word;
}

/* Card base — frosted glass on warm linen */
.card {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 18px;
    text-align: center;
    color: #3a4a3b;
    line-height: 1.7em;
    background: rgba(255, 253, 248, 0.92);
    border: 1.5px solid rgba(143, 171, 135, 0.35);
    border-radius: 26px;
    box-shadow: 0 8px 40px rgba(100, 120, 100, 0.13), 0 2px 8px rgba(143,171,135,0.10);
}

/* Side labels */
.side-label {
    font-family: 'Avenir', 'Helvetica Neue', sans-serif;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: #8fab87;
    margin-bottom: 16px;
}

.answer-label {
    color: #7fb5b0;
    margin-top: 0;
}

/* Front — strong, clear question */
.bfront {
    font-family: 'Avenir', 'Helvetica Neue', sans-serif;
    font-size: 21px;
    font-weight: 600;
    color: #3a4a3b;
    line-height: 1.5;
    padding: 0 12px;
    letter-spacing: -0.2px;
}

/* Divider */
.divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin: 24px auto;
}

.divider-line {
    height: 1px;
    width: 64px;
    background: linear-gradient(90deg, transparent, rgba(143,171,135,0.4), transparent);
    display: inline-block;
}

.divider-diamond {
    width: 6px;
    height: 6px;
    background: #8fab87;
    transform: rotate(45deg);
    display: inline-block;
    margin: 0 10px;
    opacity: 0.6;
}

/* Back — warm answer text */
.bback {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 19px;
    color: #5a7a5c;
    line-height: 1.7;
    padding: 0 12px 6px;
    font-weight: 400;
}

/* Tags */
.tags {
    color: #b8a8c8;
    opacity: 0;
    font-family: 'Avenir', sans-serif;
    font-size: 10px;
    width: 100%;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
    position: fixed;
    padding: 0;
    top: 0;
    right: 0;
}
.tags:hover { opacity: 1; position: fixed; }

/* Color accents */
b { color: #b07d2a !important; }
u { text-decoration: none; color: #5a9a95; }
i { color: #9a6060; }

u i, i u { color: #5a8a6a !important; font-weight: bold; }
u b, b u { color: #5a9a95 !important; }
i b, b i { color: #9a6060 !important; font-weight: bold; }
u b i, b u i, i u b, i b u, b i u, u i b { color: #9a6090 !important; font-weight: bold; }

a { color: #8fab87 !important; text-decoration: none; font-size: 11px; }

img {
    display: block;
    max-width: 100%;
    margin: 16px auto;
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

/* Night mode */
.card.nightMode {
    background: rgba(30, 36, 30, 0.97);
    color: #d8e0d8;
    border-color: rgba(143,171,135,0.2);
}
.nightMode .bfront { color: #dde8dd; }
.nightMode .bback  { color: #8fab87; }
.nightMode .side-label { color: #6d8f6a; }
.nightMode .answer-label { color: #5e9a95; }

/* Mobile */
.mobile .card { background: rgba(255,253,248,0.98); }
.mobile .tags:hover { opacity: 1; position: relative; }`;

    const basicModel = {
      id: MID_BASIC, name: 'Basic', type: 0, mod: now_s, usn: -1, sortf: 0, did: null,
      tmpls: [{ name:'Card 1', ord:0, qfmt: BASIC_QFMT, afmt: BASIC_AFMT, bqfmt:'', bafmt:'', did:null, bfont:'', bsize:0 }],
      flds: [
        { name:'Front', ord:0, sticky:false, rtl:false, font:'Avenir', size:20, media:[] },
        { name:'Back',  ord:1, sticky:false, rtl:false, font:'Avenir', size:18, media:[] }
      ],
      css: BASIC_CSS,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}', vers:[], tags:[], req:[[0,'any',[0]]]
    };

    const CLOZE_QFMT = `<div id="kard">
<div class="tags">{{Tags}}</div>
{{cloze:Text}}
</div>`;

    const CLOZE_AFMT = `<div id="kard">
    <div class="tags" id='tags'>{{Tags}}</div>
    {{cloze:Text}}
    <div>&nbsp;</div>
    <div id='extra'>{{edit::Extra}}</div>
</div>`;

    const CLOZE_CSS = `/* BACKGROUND AND GENERAL STYLES */
html {
    overflow: scroll;
    overflow-x: hidden;
    background-color: #1F80C1;
}

#kard {
    padding: 15px 10px;
    max-width: 800px;
    margin: 0 auto;
    word-wrap: break-word;
}

.card {
    font-family: Avenir;
    font-size: 18px;
    text-align: center;
    color: #E6E6E7;
    line-height: 1.6em;
    background-color: #1E282C;
    width: auto;
    border: 2px solid white;
    border-radius: 30px;
}

.cloze, .cloze b, .cloze u, .cloze i {
    font-weight: bold;
    color: MediumSeaGreen !important;
}

#extra, #extra i {
    font-size: 15px;
    color: #E6E6E7;
    font-style: italic;
}

.tags {
    color: #A6ABB9;
    opacity: 0;
    font-size: 10px;
    width: 100%;
    text-align: center;
    text-transform: uppercase;
    position: fixed;
    padding: 0;
    top: 0;
    right: 0;
}

.tags:hover {
    opacity: 1;
    position: fixed;
}

.card.nightMode {
    color: #E6E6E7;
    background-color: #1E282C;
}

.mobile .card.night_mode {
    color: #1E282C;
    background-color: #000000;
}

.nightMode .cloze {
    color: #E6E6E7;
    background-color: #1E282C;
}

img {
    display: block;
    max-width: 100%;
    max-height: none;
    margin: 10px auto 10px auto;
}

tr { font-size: 12px; }

b { color: #EABB3D !important; }
u { text-decoration: none; color: #21B2B8; }
i { color: IndianRed; }

u i, i u { color: limegreen !important; font-weight: bold; }
u b, b u { color: #21B2B8 !important; }
i b, b i { color: IndianRed !important; font-weight: bold; }
u b i, b u i, i u b, i b u, b i u, u i b { color: #FF95ED !important; font-weight: bold; }

a { color: LightGray !important; text-decoration: none; font-size: 10px; font-style: normal; }

.mobile .card { color: #E6E6E7; background-color: #000000; }
.mobile .tags:hover { opacity: 1; position: relative; }`;

    const clozeModel = {
      id: MID_CLOZE, name: 'Cloze++', type: 1, mod: now_s, usn: -1, sortf: 0, did: null,
      tmpls: [{ name:'Cloze', ord:0, qfmt: CLOZE_QFMT, afmt: CLOZE_AFMT, bqfmt:'', bafmt:'', did:null, bfont:'', bsize:0 }],
      flds: [
        { name:'Text',  ord:0, sticky:false, rtl:false, font:'Avenir', size:18, media:[] },
        { name:'Extra', ord:1, sticky:false, rtl:false, font:'Avenir', size:15, media:[] }
      ],
      css: CLOZE_CSS,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}', vers:[], tags:[], req:[[0,'any',[0]]]
    };

    // Anki requires all top-level JSON keys to be strings
    const modelsObj = {};
    modelsObj[String(MID_BASIC)] = basicModel;
    modelsObj[String(MID_CLOZE)] = clozeModel;

    const decksObj = {};
    decksObj['1'] = { id:1, name:'Default', conf:1, desc:'', extendNew:0, extendRev:50, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], mod:now_s, usn:0, dyn:0 };
    decksObj[String(deckId)] = { id:deckId, name:deckName, conf:1, desc:'', extendNew:0, extendRev:50, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], mod:now_s, usn:-1, dyn:0 };

    const dconfObj = {};
    dconfObj['1'] = { id:1, name:'Default', replayq:true, lapse:{delays:[10],mult:0,minInt:1,leechFails:8,leechAction:0}, rev:{perDay:200,ease4:1.3,fuzz:0.05,minSpace:1,ivlFct:1,maxIvl:36500}, timer:0, maxTaken:60, usn:0, new:{perDay:20,delays:[1,10],separate:true,ints:[1,4,7],initialFactor:2500,bury:true,order:1}, autoplay:true, mod:0 };

    const colConf = JSON.stringify({ nextPos:1, estTimes:true, activeDecks:[1], sortType:'noteFld', timeLim:0, sortBackwards:false, addToCur:true, curDeck:1, newBury:true, newSpread:0, dueCounts:true, curModel:String(MID_BASIC), collapseTime:1200 });

    db.run(`CREATE TABLE col (id INTEGER PRIMARY KEY, crt INTEGER NOT NULL, mod INTEGER NOT NULL, scm INTEGER NOT NULL, ver INTEGER NOT NULL, dty INTEGER NOT NULL, usn INTEGER NOT NULL, ls INTEGER NOT NULL, conf TEXT NOT NULL, models TEXT NOT NULL, decks TEXT NOT NULL, dconf TEXT NOT NULL, tags TEXT NOT NULL)`);
    db.run(`INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [1, now_s, now_ms, now_ms, 11, 0, 0, 0, colConf, JSON.stringify(modelsObj), JSON.stringify(decksObj), JSON.stringify(dconfObj), '{}']);

    db.run(`CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT NOT NULL, mid INTEGER NOT NULL, mod INTEGER NOT NULL, usn INTEGER NOT NULL, tags TEXT NOT NULL, flds TEXT NOT NULL, sfld INTEGER NOT NULL, csum INTEGER NOT NULL, flags INTEGER NOT NULL, data TEXT NOT NULL)`);
    db.run(`CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER NOT NULL, did INTEGER NOT NULL, ord INTEGER NOT NULL, mod INTEGER NOT NULL, usn INTEGER NOT NULL, type INTEGER NOT NULL, queue INTEGER NOT NULL, due INTEGER NOT NULL, ivl INTEGER NOT NULL, factor INTEGER NOT NULL, reps INTEGER NOT NULL, lapses INTEGER NOT NULL, left INTEGER NOT NULL, odue INTEGER NOT NULL, odid INTEGER NOT NULL, flags INTEGER NOT NULL, data TEXT NOT NULL)`);
    db.run(`CREATE TABLE revlog (id INTEGER PRIMARY KEY, cid INTEGER NOT NULL, usn INTEGER NOT NULL, ease INTEGER NOT NULL, ivl INTEGER NOT NULL, lastIvl INTEGER NOT NULL, factor INTEGER NOT NULL, time INTEGER NOT NULL, type INTEGER NOT NULL)`);
    db.run(`CREATE TABLE graves (usn INTEGER NOT NULL, oid INTEGER NOT NULL, type INTEGER NOT NULL)`);
    db.run(`CREATE INDEX ix_notes_usn ON notes (usn)`);
    db.run(`CREATE INDEX ix_cards_usn ON cards (usn)`);
    db.run(`CREATE INDEX ix_cards_nid ON cards (nid)`);
    db.run(`CREATE INDEX ix_revlog_usn ON revlog (usn)`);
    db.run(`CREATE INDEX ix_revlog_cid ON revlog (cid)`);

    let due = 1;
    for (let idx = 0; idx < toExport.length; idx++) {
      const { card } = toExport[idx];
      const nid    = now_ms + idx;
      const isCloze = card.noteType !== 'Basic';
      const mid    = isCloze ? MID_CLOZE : MID_BASIC;
      const front  = card.front || '';
      const back   = card.back  || '';
      const flds   = front + '\x1f' + back;
      const csum   = await sha1csum(front);
      const guid   = guidFromId(nid);

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [nid, guid, mid, now_s, -1, '', flds, front, csum, 0, '']);

      if (isCloze) {
        const ords = new Set([...front.matchAll(/\{\{c(\d+)::/g)].map(m => parseInt(m[1],10)-1));
        if (!ords.size) ords.add(0);
        for (const ord of ords) {
          db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [nid*100+ord, nid, deckId, ord, now_s, -1, 0, 0, due++, 0, 0, 0, 0, 0, 0, 0, 0, '']);
        }
      } else {
        db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [nid*100, nid, deckId, 0, now_s, -1, 0, 0, due++, 0, 0, 0, 0, 0, 0, 0, 0, '']);
      }
    }

    const dbData = db.export();
    db.close();

    const zip = new JSZip();
    zip.file('collection.anki21', dbData);
    zip.file('media', '{}');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: (deckName.replace(/[^a-z0-9_\-]/gi,'_')||'deck') + '.apkg' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 6000);

    if (currentUser) {
      const newH = toExport.map(x => x.hash);
      await persistHashes(newH);
      newH.forEach(h => existingHashes.add(h));
      await saveDeckRecord(deckName, toExport[0]?.card?.noteType || selectedCardType, toExport.length);
    }

    showToast(`${toExport.length} card${toExport.length>1?'s':''} exported`, 'success');
  } catch (e) {
    console.error(e);
    showToast('Export failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download .apkg';
  }
}

// ======================================================
// MODAL
// ======================================================
function openAIModal() {
  chosenModalFmt = null;
  document.querySelectorAll('.format-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btnGenPrompt').disabled = true;
  document.getElementById('modalView1').style.display = '';
  document.getElementById('modalView2').style.display = 'none';
  document.getElementById('aiModal').classList.add('visible');
}
function closeAIModal() { document.getElementById('aiModal').classList.remove('visible'); }
function closeModalOnBg(e) { if (e.target===document.getElementById('aiModal')) closeAIModal(); }

function selectFmt(fmt, el) {
  chosenModalFmt = fmt;
  document.querySelectorAll('.format-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('btnGenPrompt').disabled = false;
}

function showPromptView() {
  if (!chosenModalFmt) return;
  document.getElementById('promptText').textContent = PROMPTS[chosenModalFmt] || '';
  document.getElementById('modalView1').style.display = 'none';
  document.getElementById('modalView2').style.display = '';
}

function backToView1() {
  document.getElementById('modalView1').style.display = '';
  document.getElementById('modalView2').style.display = 'none';
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(document.getElementById('promptText').textContent);
    showToast('Prompt copied to clipboard', 'success');
  } catch { showToast('Copy failed — select and copy manually', 'error'); }
}

// ======================================================
// PROMPTS
// ======================================================
const PROMPTS = {
'Basic':
`Convert the notes I will paste below into Anki flashcards using EXACTLY this format:

Q: [question]
A: [answer]

[blank line between every card]

RULES:
- Output ONLY the formatted cards — no introduction, no commentary, no confirmation, no extra text whatsoever
- One concept per card
- Answers: 1–3 sentences maximum
- Do not number cards
- Do not add headers or section titles
- One blank line between every card, nothing else

Here are my notes:
[PASTE YOUR NOTES HERE]`,

'Cloze+':
`Convert the notes I will paste below into Anki Cloze+ flashcards using EXACTLY this format — one card per line:

[Sentence with {{c1::hidden answer}} inside it] || [Optional brief context or leave blank]

RULES:
- Output ONLY the formatted cards — no introduction, no commentary, no confirmation, no extra text whatsoever
- Each line is exactly one card
- Use {{c1::...}} to hide the key concept; {{c2::...}} for a second deletion if needed
- Never hide more than two concepts per sentence
- After || add a brief hint or leave blank — keep it short
- Do not add blank lines between cards
- Do not number cards or add headers

Here are my notes:
[PASTE YOUR NOTES HERE]`,

'Cloze++':
`Convert the notes I will paste below into Anki Cloze++ flashcards using EXACTLY this format — one card per line:

[Sentence with {{c1::answer::hint}} syntax] || [Rich context: full explanation, mnemonic, or connections to related concepts]

RULES:
- Output ONLY the formatted cards — no introduction, no commentary, no confirmation, no extra text whatsoever
- {{c1::answer::hint}} — the third :: field is a short clue shown during recall
- Use {{c2::answer::hint}} for a second deletion in the same sentence
- After || write a genuinely rich Extra field (minimum one full sentence) — explanation, why it matters, memory device, related concepts
- Do not add blank lines between cards
- Do not add headers or section titles

Here are my notes:
[PASTE YOUR NOTES HERE]`
};

// ======================================================
// TOAST
// ======================================================
function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('hiding');
    setTimeout(() => t.remove(), 400);
  }, 4000);
}
