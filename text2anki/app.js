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
  const wall = document.getElementById('signinWall');
  if (user) {
    if (wall) wall.classList.remove('visible');
    renderUserInfo(user);
    renderSidebarUser(user);
    document.getElementById('sidebarToggle').style.display = 'flex';
    document.getElementById('floatingDecksPanel').classList.add('fdp-visible');
    await loadUserHashes();
    await loadUserDecks();
    await loadUserNamedPresets();
  } else {
    if (wall) wall.classList.add('visible');
    document.getElementById('btnSignIn').style.display = '';
    document.getElementById('userInfo').style.display  = 'none';
    document.getElementById('sidebarToggle').style.display = 'none';
    document.getElementById('floatingDecksPanel').classList.remove('fdp-visible');
    existingHashes = new Set();
    userDecks = [];
  }
});

function renderUserInfo(user) {
  document.getElementById('btnSignIn').style.display = 'none';
  document.getElementById('userInfo').style.display  = 'flex';

  const avatarHtml = user.photoURL
    ? `<img class="user-avatar" src="${user.photoURL}" alt="">`
    : `<div class="user-avatar-placeholder">${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</div>`;

  // Header avatar button
  document.getElementById('userAvatarWrap').innerHTML = avatarHtml;

  // Dropdown
  document.getElementById('profileDdName').textContent  = user.displayName || '';
  document.getElementById('profileDdEmail').textContent = user.email || '';
  document.getElementById('profileDdAvatar').innerHTML  = avatarHtml;

  // Settings panel
  document.getElementById('settingsName').textContent  = user.displayName || '';
  document.getElementById('settingsEmail').textContent = user.email || '';
  document.getElementById('settingsAvatar').innerHTML  = avatarHtml;
}

// ---- Profile dropdown ----
function toggleProfileDropdown(e) {
  e.stopPropagation();
  const dd  = document.getElementById('profileDropdown');
  const btn = document.getElementById('userAvatarBtn');
  const open = dd.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  if (open) {
    // close on next outside click
    setTimeout(() => document.addEventListener('click', closeProfileDropdownOutside, { once: true }), 0);
  }
}
function closeProfileDropdownOutside(e) {
  if (!document.getElementById('profileDropdown')?.contains(e.target)) closeProfileDropdown();
}
function closeProfileDropdown() {
  document.getElementById('profileDropdown')?.classList.remove('open');
  document.getElementById('userAvatarBtn')?.setAttribute('aria-expanded', 'false');
}

// ---- Settings panel ----
function openSettings() {
  closeProfileDropdown();
  document.getElementById('settingsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function settingsOverlayClick(e) {
  if (e.target === document.getElementById('settingsOverlay')) closeSettings();
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
  if (!wrap) return;
  const avatarHtml = user.photoURL
    ? `<img class="sb-user-avatar" src="${user.photoURL}" alt="">`
    : `<div class="sb-user-avatar-placeholder">${(user.displayName||user.email||'U').charAt(0).toUpperCase()}</div>`;
  wrap.innerHTML = `
    ${avatarHtml}
    <div>
      <div class="sb-user-name">${user.displayName || ''}</div>
      <div class="sb-user-email">${user.email || ''}</div>
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
    try {
      const snap2 = await fsDb.collection('users').doc(currentUser.uid).collection('decks').limit(50).get();
      userDecks = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSidebarDecks();
    } catch (e2) { console.warn('Decks load failed:', e2); }
  }
}

function renderSidebarDecks() {
  const container = document.getElementById('sidebarDecks');
  const totalCards = userDecks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const statDecksEl = document.getElementById('statDecks');
  const statCardsEl = document.getElementById('statCards');
  if (statDecksEl) statDecksEl.textContent = userDecks.length;
  if (statCardsEl) statCardsEl.textContent = totalCards > 999 ? (totalCards/1000).toFixed(1)+'k' : totalCards;

  const query = (document.getElementById('sidebarSearch')?.value || '').trim().toLowerCase();
  const filtered = query ? userDecks.filter(d => (d.name||'').toLowerCase().includes(query)) : userDecks;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="sidebar-empty">
        <div class="sidebar-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#8fab87" stroke-width="1.5" fill="none"/>
            <path d="M3 9h18" stroke="#8fab87" stroke-width="1.4"/>
          </svg>
        </div>
        ${query ? 'No decks match "' + query + '"' : 'No decks yet.<br>Download your first .apkg to see it here.'}
      </div>`;
    renderFloatingPanel();
    return;
  }

  function iconClass(t) {
    if (t === 'Basic')   return 'deck-icon-basic';
    if (t === 'Cloze++') return 'deck-icon-clozep';
    return 'deck-icon-cloze';
  }
  function tagClass(t) {
    if (t === 'Basic')   return 'basic';
    if (t === 'Cloze++') return 'clozep';
    return 'cloze';
  }

  const groups = new Map();
  for (const deck of filtered) {
    const name = deck.name || '';
    const sep  = name.indexOf('::');
    const cls  = sep > 0 ? name.slice(0, sep).trim() : '';
    if (!groups.has(cls)) groups.set(cls, []);
    groups.get(cls).push(deck);
  }

  const currentFullName = getExportDeckName();
  let html = '';

  for (const [cls, decks] of groups) {
    if (cls) {
      html += `
        <div class="sb-class-header" onclick="toggleSbGroup(this)">
          <svg class="sb-class-chevron" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${cls}
          <span class="sb-class-count">${decks.length}</span>
        </div>
        <div class="sb-class-decks" style="max-height:${decks.length * 80}px">`;
    }

    for (const deck of decks) {
      const noteType   = deck.noteType || 'Basic';
      const cardCount  = deck.cardCount || 0;
      const isActive   = deck.name === currentFullName;
      const safeName   = deck.name.replace(/'/g, "\\'");
      const initial    = (deck.name || 'D').replace(/^[^a-zA-Z]*/, '').charAt(0).toUpperCase() || (deck.name||'D').charAt(0).toUpperCase();
      const displayName = cls && deck.name.startsWith(cls + '::')
        ? deck.name.slice(cls.length + 2)
        : deck.name;
      const date = deck.lastExported?.toDate
        ? deck.lastExported.toDate().toLocaleDateString('en-US', { month:'short', day:'numeric' })
        : '';
      html += `
        <div class="deck-item ${isActive ? 'active-deck' : ''}" onclick="loadDeckFromSidebar('${safeName}','${noteType}')">
          <div class="deck-icon ${iconClass(noteType)}">${initial}</div>
          <div class="deck-info">
            <div class="deck-name">${displayName}</div>
            <div class="deck-meta">${cardCount} card${cardCount !== 1 ? 's' : ''}${date ? '<span>·</span>' + date : ''}</div>
          </div>
          <span class="deck-type-tag ${tagClass(noteType)}">${noteType}</span>
          <button class="deck-delete-btn" onclick="event.stopPropagation(); confirmDeleteDeck('${deck.id}','${displayName.replace(/'/g,"\\'")}')" title="Delete deck">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3h9M5 3V2h3v1M3.5 3l.5 7.5h5L10 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>`;
    }

    if (cls) html += `</div>`;
  }

  container.innerHTML = html;
  renderFloatingPanel();
}

function confirmDeleteDeck(deckId, deckName) {
  const overlay = document.getElementById('deleteDeckOverlay');
  document.getElementById('deleteDeckName').textContent = deckName;
  overlay.dataset.deckId = deckId;
  overlay.classList.add('visible');
}

function cancelDeleteDeck() {
  document.getElementById('deleteDeckOverlay').classList.remove('visible');
}

async function deleteDeck() {
  const overlay = document.getElementById('deleteDeckOverlay');
  const deckId = overlay.dataset.deckId;
  overlay.classList.remove('visible');
  if (!currentUser || !deckId) return;
  try {
    const userRef = fsDb.collection('users').doc(currentUser.uid);
    const deckRef = userRef.collection('decks').doc(deckId);
    const deckSnap = await deckRef.get();
    const hashes = deckSnap.exists ? (deckSnap.data().hashes || []) : [];
    if (hashes.length) {
      const hashCol = userRef.collection('cardHashes');
      for (let i = 0; i < hashes.length; i += 500) {
        const batch = fsDb.batch();
        hashes.slice(i, i + 500).forEach(h => batch.delete(hashCol.doc(h)));
        await batch.commit();
      }
      hashes.forEach(h => existingHashes.delete(h));
    }
    await deckRef.delete();
    userDecks = userDecks.filter(d => d.id !== deckId);
    renderSidebarDecks();
    renderFloatingPanel();
    showToast('Deck deleted', 'info');
  } catch (e) {
    showToast('Failed to delete deck', 'error');
  }
}

function toggleSbGroup(header) {
  const decksEl = header.nextElementSibling;
  const chevron = header.querySelector('.sb-class-chevron');
  decksEl.classList.toggle('collapsed');
  chevron.style.transform = decksEl.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

function renderFloatingPanel() {
  const list    = document.getElementById('fdpList');
  const searchEl = document.getElementById('fdpSearch');
  if (!list) return;

  const totalCards = userDecks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const deckCount  = document.getElementById('fdpStatDecks');
  const cardCount  = document.getElementById('fdpStatCards');
  if (deckCount) deckCount.textContent = userDecks.length;
  if (cardCount) cardCount.textContent = totalCards > 999 ? (totalCards/1000).toFixed(1)+'k' : totalCards;

  const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const filtered = query
    ? userDecks.filter(d => (d.name||'').toLowerCase().includes(query))
    : userDecks;

  const currentDeck = getExportDeckName();

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
  function deckItemHtml(deck, showFullName) {
    const noteType  = deck.noteType || 'Basic';
    const cardCount = deck.cardCount || 0;
    const isActive  = deck.name === currentDeck;
    const safeName  = deck.name.replace(/'/g, "\\'");
    const sep = deck.name.indexOf('::');
    const rawDisplay = sep > 0 ? deck.name.slice(sep + 2) : deck.name;
    const displayName = showFullName ? deck.name : rawDisplay;
    const safeDisplay = displayName.replace(/'/g, "\\'");
    const initial   = rawDisplay.replace(/^[^a-zA-Z]*/, '').charAt(0).toUpperCase() || rawDisplay.charAt(0).toUpperCase();
    const ago = timeAgo(deck);
    return `
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
        <button class="fdp-delete-btn" onclick="event.stopPropagation(); confirmDeleteDeck('${deck.id}','${safeDisplay}')" title="Delete deck">
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <path d="M2 3h9M5 3V2h3v1M3.5 3l.5 7.5h5L10 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>`;
  }

  const userClasses = getUserClasses();
  const deckClasses = [...new Set(
    userDecks.map(d => { const s = d.name.indexOf('::'); return s > 0 ? d.name.slice(0, s).trim() : null; }).filter(Boolean)
  )];
  const allClasses = [...new Set([...userClasses, ...deckClasses])];
  const ungrouped = filtered.filter(d => !d.name.includes('::'));

  let html = '';

  if (allClasses.length) html += `<div class="fdp-section-label fdp-section-label-classes">My Classes</div>`;

  for (const cls of allClasses) {
    if (query && !cls.toLowerCase().includes(query) && !filtered.some(d => d.name.startsWith(cls + '::'))) continue;
    const classDecks = filtered.filter(d => d.name.startsWith(cls + '::'));
    const safeClass = cls.replace(/'/g, "\\'");
    html += `
      <div class="fdp-class-group">
        <div class="fdp-class-header">
          <button class="fdp-class-toggle" onclick="toggleFdpGroup(this.closest('.fdp-class-group').querySelector('.fdp-class-decks'), this)" title="Collapse">
            <svg class="fdp-class-chevron" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="fdp-class-name fdp-class-name-clickable" onclick="fdpStartCreateDeck('${safeClass}')" title="Tap to create a deck in ${cls}">${cls}</span>
          <span class="fdp-class-count">${classDecks.length}</span>
          <button class="fdp-class-add-btn" onclick="event.stopPropagation(); fdpStartCreateDeck('${safeClass}')" title="Add deck to ${cls}">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
          <button class="fdp-class-del-btn" onclick="event.stopPropagation(); confirmDeleteClass('${safeClass}')" title="Remove class">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="fdp-class-decks">
          ${classDecks.length
            ? classDecks.map(d => deckItemHtml(d, false)).join('')
            : `<div class="fdp-class-empty">No decks yet — click <strong>+</strong> to add one</div>`
          }
        </div>
      </div>`;
  }

  if (ungrouped.length) {
    if (allClasses.length) html += `<div class="fdp-section-label">Other decks</div>`;
    html += ungrouped.map(d => deckItemHtml(d, false)).join('');
  }

  if (!html) {
    if (query) {
      html = `<div class="fdp-empty" style="padding:16px">No decks match "<strong>${query}</strong>"</div>`;
    } else {
      html = `
        <div class="fdp-empty">
          <div class="fdp-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="#8fab87" stroke-width="1.5" fill="none"/>
              <path d="M3 9h18" stroke="#8fab87" stroke-width="1.4"/>
            </svg>
          </div>
          Create a class or download your first deck.
        </div>`;
    }
  }

  list.innerHTML = html;
}

function toggleFdpGroup(decksEl, btn) {
  decksEl.classList.toggle('collapsed');
  const chevron = btn?.querySelector('.fdp-class-chevron');
  if (chevron) chevron.style.transform = decksEl.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

// ======================================================
// FLOATING PANEL — CLASS & DECK CREATION
// ======================================================

function getUserClasses() {
  try { return JSON.parse(localStorage.getItem('t2a_classes') || '[]'); } catch { return []; }
}
function saveUserClasses(arr) {
  localStorage.setItem('t2a_classes', JSON.stringify(arr));
}

function fdpStartCreateClass() {
  document.getElementById('fdpCreateClassForm').style.display = '';
  document.getElementById('fdpCreateDeckForm').style.display = 'none';
  const inp = document.getElementById('fdpNewClassName');
  inp.value = '';
  requestAnimationFrame(() => inp.focus());
}

function fdpCancelCreateClass() {
  document.getElementById('fdpCreateClassForm').style.display = 'none';
}

function fdpConfirmCreateClass() {
  const name = (document.getElementById('fdpNewClassName')?.value || '').trim();
  if (!name) return;
  const classes = getUserClasses();
  if (!classes.includes(name)) {
    classes.push(name);
    saveUserClasses(classes);
  }
  document.getElementById('fdpCreateClassForm').style.display = 'none';
  renderFloatingPanel();
  showToast(`Class "${name}" created`, 'success');
}

let pendingDeckClass = null;

function fdpStartCreateDeck(className) {
  pendingDeckClass = className || null;
  const label = document.getElementById('fdpCreateDeckLabel');
  if (label) label.textContent = className ? `New deck in ${className}` : 'New deck (no class)';
  document.getElementById('fdpCreateDeckForm').style.display = '';
  document.getElementById('fdpCreateClassForm').style.display = 'none';
  const inp = document.getElementById('fdpNewDeckName');
  inp.value = '';
  requestAnimationFrame(() => inp.focus());
}

function fdpCancelCreateDeck() {
  document.getElementById('fdpCreateDeckForm').style.display = 'none';
  pendingDeckClass = null;
}

function fdpConfirmCreateDeck() {
  const deck = (document.getElementById('fdpNewDeckName')?.value || '').trim();
  if (!deck) { document.getElementById('fdpNewDeckName')?.focus(); return; }
  document.getElementById('fdpCreateDeckForm').style.display = 'none';
  selectClass(pendingDeckClass || '');
  document.getElementById('deckName').value  = deck;
  updateDeckFullnamePreview();
  pendingDeckClass = null;
  renderFloatingPanel();
  const fullName = getExportDeckName();
  showToast(`Ready: ${fullName}`, 'info');
  document.getElementById('deckName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function confirmDeleteClass(className) {
  const overlay = document.getElementById('deleteClassOverlay');
  document.getElementById('deleteClassName').textContent = className;
  overlay.dataset.className = className;
  overlay.classList.add('visible');
}

function cancelDeleteClass() {
  document.getElementById('deleteClassOverlay').classList.remove('visible');
}

async function fdpDeleteClass() {
  const overlay = document.getElementById('deleteClassOverlay');
  const className = overlay.dataset.className;
  overlay.classList.remove('visible');
  if (!className) return;

  const classes = getUserClasses().filter(c => c !== className);
  saveUserClasses(classes);

  if (currentUser) {
    const classDecks = userDecks.filter(d => d.name.startsWith(className + '::'));
    if (classDecks.length) {
      const userRef  = fsDb.collection('users').doc(currentUser.uid);
      const hashCol  = userRef.collection('cardHashes');
      const allHashes = [];
      for (const deck of classDecks) {
        try {
          const snap = await userRef.collection('decks').doc(deck.id).get();
          if (snap.exists) allHashes.push(...(snap.data().hashes || []));
          await userRef.collection('decks').doc(deck.id).delete();
        } catch (e) { console.warn('Error deleting deck', deck.id, e); }
      }
      for (let i = 0; i < allHashes.length; i += 500) {
        const batch = fsDb.batch();
        allHashes.slice(i, i + 500).forEach(h => batch.delete(hashCol.doc(h)));
        await batch.commit();
      }
      allHashes.forEach(h => existingHashes.delete(h));
      userDecks = userDecks.filter(d => !d.name.startsWith(className + '::'));
    }
  }

  renderSidebarDecks();
  renderFloatingPanel();
  showToast(`Class "${className}" and all its decks deleted`, 'info');
}

function fdpFocusNew() {
  fdpStartCreateDeck(null);
}

// ======================================================
// RESET ACCOUNT
// ======================================================
function confirmResetAccount() {
  document.getElementById('resetAccountOverlay').classList.add('visible');
}

function cancelResetAccount() {
  document.getElementById('resetAccountOverlay').classList.remove('visible');
}

async function resetAccount() {
  document.getElementById('resetAccountOverlay').classList.remove('visible');
  if (!currentUser) return;

  showToast('Resetting account…', 'info');
  const userRef = fsDb.collection('users').doc(currentUser.uid);

  try {
    const decksSnap = await userRef.collection('decks').get();
    for (let i = 0; i < decksSnap.docs.length; i += 500) {
      const batch = fsDb.batch();
      decksSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    const hashesSnap = await userRef.collection('cardHashes').get();
    for (let i = 0; i < hashesSnap.docs.length; i += 500) {
      const batch = fsDb.batch();
      hashesSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    userDecks = [];
    existingHashes = new Set();
    saveUserClasses([]);
    localStorage.removeItem('t2a_classes');

    renderSidebarDecks();
    renderFloatingPanel();
    showToast('Account reset — you\'re starting fresh!', 'success');
  } catch (e) {
    showToast('Reset failed: ' + e.message, 'error');
  }
}

function parseDeckName(fullName) {
  const sep = fullName.indexOf('::');
  if (sep > 0) return { className: fullName.slice(0, sep).trim(), deckName: fullName.slice(sep + 2).trim() };
  const legacySep = fullName.indexOf(' - ');
  if (legacySep > 0) return { className: fullName.slice(0, legacySep).trim(), deckName: fullName.slice(legacySep + 3).trim() };
  return { className: '', deckName: fullName };
}

function getExportDeckName() {
  const cls  = (document.getElementById('className')?.value || '').trim();
  const deck = (document.getElementById('deckName')?.value || '').trim();
  return cls ? `${cls}::${deck}` : deck;
}

// ======================================================
// CLASS DROPDOWN (main form)
// ======================================================
function buildClassDropdownOptions() {
  const userClasses = getUserClasses();
  const deckClasses = [...new Set(
    userDecks.map(d => { const s = (d.name||'').indexOf('::'); return s > 0 ? d.name.slice(0, s).trim() : null; }).filter(Boolean)
  )];
  return [...new Set([...userClasses, ...deckClasses])];
}

function refreshClassDropdown() {
  const menu = document.getElementById('classDropdownMenu');
  if (!menu) return;
  const classes = buildClassDropdownOptions();
  const current = document.getElementById('className')?.value || '';
  let html = `<div class="class-dd-option${current === '' ? ' selected' : ''}" onclick="selectClass('')">No class</div>`;
  html += classes.map(c =>
    `<div class="class-dd-option${c === current ? ' selected' : ''}" onclick="selectClass('${c.replace(/'/g,"\\'")}')">${c}</div>`
  ).join('');
  if (!classes.length) {
    html += `<div class="class-dd-empty">No classes yet — create one in My Library</div>`;
  }
  menu.innerHTML = html;
}

function toggleClassDropdown() {
  const menu    = document.getElementById('classDropdownMenu');
  const trigger = document.getElementById('classDropdownTrigger');
  if (!menu) return;
  refreshClassDropdown();
  const open = menu.classList.toggle('open');
  trigger?.classList.toggle('open', open);
  if (open) {
    setTimeout(() => document.addEventListener('click', closeClassDropdown, { once: true }), 0);
  }
}

function closeClassDropdown() {
  document.getElementById('classDropdownMenu')?.classList.remove('open');
  document.getElementById('classDropdownTrigger')?.classList.remove('open');
}

function selectClass(cls) {
  document.getElementById('className').value = cls;
  const display = document.getElementById('classDropdownDisplay');
  if (display) display.textContent = cls || 'No class';
  document.querySelectorAll('.class-dd-option').forEach(el => {
    el.classList.toggle('selected', el.textContent === (cls || 'No class'));
  });
  closeClassDropdown();
  updateDeckFullnamePreview();
}

function updateDeckFullnamePreview() {
  const preview = document.getElementById('deckFullnamePreview');
  if (!preview) return;
  const cls  = (document.getElementById('className')?.value || '').trim();
  const deck = (document.getElementById('deckName')?.value || '').trim();
  if (cls && deck) {
    preview.textContent = `${cls}::${deck}`;
  } else {
    preview.textContent = '';
  }
}

function loadDeckFromFloating(name, noteType) {
  const { className, deckName } = parseDeckName(name);
  selectClass(className);
  document.getElementById('deckName').value  = deckName;
  updateDeckFullnamePreview();
  const pill = [...document.querySelectorAll('.type-pill')].find(p => p.dataset.type === noteType);
  if (pill) setCardType(noteType, pill);
  renderFloatingPanel();
  showToast(`Deck "${name}" loaded`, 'info');
}

function loadDeckFromSidebar(name, noteType) {
  const { className, deckName } = parseDeckName(name);
  selectClass(className);
  document.getElementById('deckName').value  = deckName;
  updateDeckFullnamePreview();
  const pill = [...document.querySelectorAll('.type-pill')].find(p => p.dataset.type === noteType);
  if (pill) setCardType(noteType, pill);
  closeSidebar();
  showToast(`Deck "${name}" loaded`, 'info');
}

async function saveDeckRecord(deckName, noteType, cardCount, hashes = []) {
  if (!currentUser) return;
  try {
    const deckId = deckName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existing = await fsDb.collection('users').doc(currentUser.uid).collection('decks').doc(deckId).get();
    const prevHashes = existing.exists ? (existing.data().hashes || []) : [];
    const allHashes  = [...new Set([...prevHashes, ...hashes])];
    await fsDb.collection('users').doc(currentUser.uid).collection('decks').doc(deckId).set({
      name: deckName,
      noteType,
      cardCount,
      hashes: allHashes,
      lastExported: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await loadUserDecks();
  } catch (e) { console.warn('saveDeckRecord failed:', e); }
}

function getFullDeckNameForExport() {
  return getExportDeckName();
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
  populateThemeSelector();
  debounceParse();
}

// ======================================================
// PARSER
// ======================================================
/* Strip backslash-escaped HTML tags that LLMs sometimes produce, e.g. \<b\> → <b> */
function cleanHtmlTags(s) {
  return s.replace(/\\<(\/?(?:b|i|u|strong|em|sub|sup|br))\\>/gi, '<$1>');
}
function normalizeLatex(s) {
  // Step 1: Fix already-present but double-escaped delimiters: \\( → \(
  let out = s.replace(/\\\\(\(|\)|\[|\])/g, '\\$1');

  // Step 2: Detect bare-paren equations and wrap in \( \)
  // Match (...) that contains LaTeX commands (\\cmd or \cmd) or math syntax (^, {}, =)
  // Detect if parenthesized content is a math equation
  const hasLatexCmd = t => /\\\\?[a-zA-Z]{2,}/.test(t) || /\\(frac|sqrt|int|sum|prod|lim|infty|partial|nabla|Delta|alpha|beta|gamma|mu|pi|sigma|rho|epsilon|hbar|hat|mathbf|text|ge|le|ne|cdot|times|rightarrow|leftarrow|Psi|psi|phi|Phi|lambda|Lambda|theta|omega)/.test(t);
  const hasMathSyntax = t => /[_^]\{/.test(t) || /[_^]\w/.test(t) || (/\{/.test(t) && /\}/.test(t));
  // Simple equation pattern: single letters/short tokens around = sign, like F = ma, E = hf, E = mc^2
  const isSimpleEquation = t => /^[A-Za-z0-9\s^_=+\-*\/().]+$/.test(t.trim()) && /[A-Za-z]\s*=\s*[A-Za-z0-9]/.test(t) && t.trim().length <= 30;
  const isMath = t => hasLatexCmd(t) || hasMathSyntax(t) || isSimpleEquation(t);

  // Step 1.5: Fix cloze hint placement and missing braces
  // Case A: AI writes }}::hint} but should be }::hint}} (hint placed after cloze close)
  out = out.replace(/(\{\{c\d+::[\s\S]*?)\}\}::([^}]+)\}/g, '$1}::$2}}');
  // Case B: AI writes {{cN::...}::hint} with only one } — add missing }
  // Match {{cN:: ... }::hint} where there's no }} (cloze needs two })
  out = out.replace(/(\{\{c\d+::[^}]*(?:\{[^}]*\}[^}]*)*?)(\}::([^}]+))\}(?!\})/g, '$1$2}}');

  // Process from right to left so index positions stay stable
  // Find outermost ( ... ) groups that are NOT preceded by a backslash
  // Track brace depth; skip cloze markers {{cN:: and }} to avoid miscounting
  const matches = [];
  let depth = 0, start = -1, braceD = 0;
  for (let i = 0; i < out.length; i++) {
    // Skip cloze openers {{cN:: — don't count their {{ as brace opens
    const clozeOpen = out.substring(i).match(/^\{\{c\d+::/);
    if (clozeOpen) { i += clozeOpen[0].length - 1; continue; }
    // Skip cloze closers }} — don't count as brace closes
    if (out[i] === '}' && out[i+1] === '}') {
      // Check if this looks like a cloze closer (preceded by non-brace content)
      // Simple heuristic: if braceD would go negative or is 0, it's a cloze closer
      if (braceD <= 1) { i++; continue; }
    }
    if (out[i] === '{') { braceD++; continue; }
    if (out[i] === '}') { if (braceD > 0) braceD--; continue; }
    if (braceD > 0) continue; // skip chars inside braces
    if (out[i] === '(' && (i === 0 || out[i-1] !== '\\')) {
      if (depth === 0) start = i;
      depth++;
    } else if (out[i] === ')' && depth > 0) {
      depth--;
      if (depth === 0) {
        matches.push([start, i]);
      }
    }
  }

  // Process matches in reverse to preserve indices
  for (let k = matches.length - 1; k >= 0; k--) {
    const [a, b] = matches[k];
    const inner = out.substring(a + 1, b);
    if (isMath(inner)) {
      let cleaned = inner.replace(/\\\\/g, '\\').replace(/\\_/g, '_');
      out = out.substring(0, a) + '\\(' + cleaned + '\\)' + out.substring(b + 1);
    }
  }

  // Step 3: Fix internals of any \(...\) or \[...\] blocks
  function fixLatexInternals(m) {
    return m.replace(/\\\\/g, '\\').replace(/\\_/g, '_');
  }
  out = out.replace(/\\\([\s\S]*?\\\)/g, fixLatexInternals);
  out = out.replace(/\\\[[\s\S]*?\\\]/g, fixLatexInternals);

  // Step 3.5: Fix missing subscript underscores inside LaTeX — }2 → }_2 (AI writes \text{H}2 instead of \text{H}_2)
  out = out.replace(/\\\([\s\S]*?\\\)/g, m => m.replace(/\}(\d)/g, '}_$1'));
  out = out.replace(/\\\[[\s\S]*?\\\]/g, m => m.replace(/\}(\d)/g, '}_$1'));
  // Also fix in bare text that contains \text{} patterns (before Step 2 wraps in \(...\))
  out = out.replace(/(\\text\{[^}]*\})(\d)/g, '$1_$2');

  // Step 4: Fix }} inside cloze content that would prematurely close the cloze.
  // Strategy: for each cloze, find ALL }} positions. The last }} is the true
  // cloze closer; fix all earlier }} by replacing with }\ }.
  // We must be careful with multiple clozes: only look up to the next {{cN::.
  let result = '';
  let i = 0;
  while (i < out.length) {
    const clozeMatch = out.substring(i).match(/^\{\{c\d+::/);
    if (clozeMatch) {
      result += clozeMatch[0];
      i += clozeMatch[0].length;
      // Find the boundary: next {{cN:: or end of string
      const nextCloze = out.substring(i).search(/\{\{c\d+::/);
      const boundary = nextCloze >= 0 ? i + nextCloze : out.length;
      // Find all }} positions within [i, boundary)
      // Don't skip overlapping matches — }}} has }} at both pos N and N+1
      const ddPositions = [];
      for (let j = i; j < boundary - 1; j++) {
        if (out[j] === '}' && out[j+1] === '}') {
          ddPositions.push(j);
        }
      }
      if (ddPositions.length === 0) {
        // No }} — broken cloze, emit content up to boundary as-is
        result += out.substring(i, boundary);
        i = boundary;
        continue;
      }
      // Last }} is the cloze closer; fix all earlier }}
      const closerPos = ddPositions[ddPositions.length - 1];
      let content = out.substring(i, closerPos);
      content = content.replace(/\}\}/g, '}\\ }');
      // If content ends with }, it would merge with the cloze-closing }}
      // to form }}} — Anki would see }} prematurely. Insert \ to separate.
      if (content.endsWith('}')) {
        content += '\\ ';
      }
      result += content + '}}';
      i = closerPos + 2;
    } else {
      result += out[i];
      i++;
    }
  }
  out = result;
  return out;
}

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
      else if (mode==='b') back  += (back.trim() ? '<br>' : '') + line.trim();
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
  // Q/A labels and Cloze syntax are explicit formats — prefer them over heuristic strategies
  const preferred = strategies.find(s => s.name === 'Q/A labels' || s.name === 'Cloze syntax');
  const best = preferred || strategies.reduce((a,b) => b.cards.length>a.cards.length ? b : a);
  return { cards: best.cards.map(c=>({...c, front: normalizeLatex(cleanHtmlTags(c.front||'')), back: normalizeLatex(cleanHtmlTags(c.back||'')), noteType})), strategy: best.name };
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
    const extraHtml = isCloze && card.back
      ? `<div>
          <button class="card-reveal-btn" onclick="toggleCardBack(this)">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 3v2.5l1.5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Show back
          </button>
          <div class="card-extra-hidden">${safeHtml(card.back)}</div>
        </div>`
      : `<div>
          <div class="card-col-label">Back</div>
          <div class="card-back">${safeHtml(card.back||'')}</div>
        </div>`;

    row.innerHTML = `
      <div class="card-num">${i+1}</div>
      <div>
        <div class="card-col-label">${isCloze ? 'Text' : 'Front'}</div>
        <div class="card-front ${isCloze?'cloze-text':''}">${isCloze ? hlCloze(card.front||'') : safeHtml(card.front||'')}</div>
      </div>
      ${extraHtml}`;
    list.appendChild(row);
    setTimeout(() => row.classList.add('visible'), 40 + i * 35);
  });

  const sec = document.getElementById('previewSection');
  sec.classList.add('visible');
  setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

  // Render MathJax equations in preview
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([list]).catch(() => {});
  }
}

function toggleCardBack(btn) {
  const extra = btn.nextElementSibling;
  const isHidden = extra.classList.contains('card-extra-hidden');
  extra.className = isHidden ? 'card-extra-visible' : 'card-extra-hidden';
  btn.innerHTML = isHidden
    ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 2l7 7M9 2L2 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Hide back`
    : `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 3v2.5l1.5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Show back`;
  // Typeset newly revealed back content
  if (isHidden && window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([extra]).catch(() => {});
  }
}

function safeHtml(s) {
  // Protect LaTeX/MathJax delimiters before escaping HTML
  let out = s;
  const latexBlocks = [];
  out = out.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (m) => {
    latexBlocks.push(m);
    return `%%SH_LATEX_${latexBlocks.length - 1}%%`;
  });
  out = out
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/&lt;(\/?(b|i|u|strong|em|sub|sup|br))&gt;/gi, '<$1>');
  out = out.replace(/%%SH_LATEX_(\d+)%%/g, (_, idx) => {
    const latex = latexBlocks[parseInt(idx)];
    if (!latex) return '';
    // Strip cloze syntax inside LaTeX so MathJax can render it
    let clean = latex.replace(/\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\}\}/g, '$1');
    return clean.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  });
  return out;
}
function hlCloze(text) {
  // Protect LaTeX blocks from being mangled by cloze regex
  const latexBlocks = [];
  let safe = text.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (m) => {
    latexBlocks.push(m);
    return `%%HL_LATEX_${latexBlocks.length - 1}%%`;
  });
  safe = safeHtml(safe);
  safe = safe.replace(/\{\{c(\d+)::([^}:]+)(?:::[^}]*)?\}\}/g,
    (_, n, ans) => `<span class="cloze-mark">{{c${n}::${ans}}}</span>`);
  safe = safe.replace(/%%HL_LATEX_(\d+)%%/g, (_, idx) => {
    const latex = latexBlocks[parseInt(idx)];
    if (!latex) return '';
    // Strip cloze syntax inside LaTeX so MathJax can render it.
    // Replace {{cN::answer::hint}} or {{cN::answer}} with just the answer.
    let clean = latex.replace(/\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\}\}/g, '$1');
    return clean.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  });
  return safe;
}
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearAll() {
  document.getElementById('notesInput').value = '';
  document.getElementById('deckName').value   = 'My Deck';
  selectClass('');
  updateDeckFullnamePreview();
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
  if(btn) { btn.disabled = true; btn.textContent = 'Building...'; }
  try {
    if (!previewData.length) { showToast('No cards to export','error'); return; }

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

    const selectedTheme = document.getElementById('themeSelect')?.value || '';
    const [SQL, cardStyles] = await Promise.all([
      initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` }),
      loadCardStyles(selectedTheme || null)
    ]);
    const db = new SQL.Database();

    const now_s  = Math.floor(Date.now()/1000);
    const now_ms = Date.now();
    const deckId = 1000000000 + Math.floor(Math.random()*999999);
    const deckName = (getExportDeckName() || 'My Deck');

    const MID_BASIC  = 1483786767214;
    const MID_CLOZE  = 1577239191269;

    const BASIC_QFMT = `<div id="bkard">
  <div class="tags">{{Tags}}</div>
  <div class="side-label">Question</div>
  <div class="bfront">{{Front}}</div>
</div>`;

    const dividerHtml = getDividerHTML(cardStyles.basicData);
    const BASIC_AFMT = `<div id="bkard">
  <div class="tags">{{Tags}}</div>
  <div class="side-label">Question</div>
  <div class="bfront">{{Front}}</div>
  ${dividerHtml}
  <div class="side-label answer-label">Answer</div>
  <div class="bback">{{Back}}</div>
</div>`;

    const basicModel = {
      id: MID_BASIC, name: 'Basic', type: 0, mod: now_s, usn: -1, sortf: 0, did: null,
      tmpls: [{ name:'Card 1', ord:0, qfmt: BASIC_QFMT, afmt: BASIC_AFMT, bqfmt:'', bafmt:'', did:null, bfont:'', bsize:0, id: Math.floor(Math.random()*1000000000) }],
      flds: [
        { name:'Front', ord:0, sticky:false, rtl:false, font:'Avenir', size:20, description:'', plainText:false, collapsed:false, excludeFromSearch:false, id: Math.floor(Math.random()*1000000000), tag:null, preventDeletion:false, media:[] },
        { name:'Back',  ord:1, sticky:false, rtl:false, font:'Avenir', size:18, description:'', plainText:false, collapsed:false, excludeFromSearch:false, id: Math.floor(Math.random()*1000000000), tag:null, preventDeletion:false, media:[] }
      ],
      css: cardStyles.basicCSS,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\usepackage[version=4]{mhchem}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
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

    const clozeModel = {
      id: MID_CLOZE, name: 'Cloze++', type: 1, mod: now_s, usn: -1, sortf: 0, did: null,
      tmpls: [{ name:'Cloze', ord:0, qfmt: CLOZE_QFMT, afmt: CLOZE_AFMT, bqfmt:'', bafmt:'', did:null, bfont:'', bsize:0, id: Math.floor(Math.random()*1000000000) }],
      flds: [
        { name:'Text',  ord:0, sticky:false, rtl:false, font:'Avenir', size:18, description:'', plainText:false, collapsed:false, excludeFromSearch:false, id: Math.floor(Math.random()*1000000000), tag:null, preventDeletion:false, media:[] },
        { name:'Extra', ord:1, sticky:false, rtl:false, font:'Avenir', size:15, description:'', plainText:false, collapsed:false, excludeFromSearch:false, id: Math.floor(Math.random()*1000000000), tag:null, preventDeletion:false, media:[] }
      ],
      css: (toExport[0]?.card?.noteType === 'Cloze++') ? cardStyles.clozepCSS : cardStyles.clozeCSS,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\usepackage[version=4]{mhchem}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}', vers:[], tags:[], req:[[0,'any',[0]]]
    };

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
      // Strip HTML strictly for the sort field to be perfectly aligned with Anki defaults
      const sfld   = front.replace(/<[^>]+>/g, '');

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [nid, guid, mid, now_s, -1, '', flds, sfld, csum, 0, '']);

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
    zip.file('meta', new Uint8Array([0x08, 0x02]));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const fileName = (deckName.replace(/[^a-z0-9_\-]/gi,'_')||'deck') + '.apkg';
    // Safari-compatible download: anchor must be in the DOM, and we re-wrap
    // the blob with an explicit MIME type so Safari doesn't try to render it.
    const typedBlob = new Blob([blob], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(typedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 6000);

    if (currentUser) {
      const newH = toExport.map(x => x.hash);
      await persistHashes(newH);
      newH.forEach(h => existingHashes.add(h));
      await saveDeckRecord(deckName, toExport[0]?.card?.noteType || selectedCardType, toExport.length, newH);
    }

    showToast(`${toExport.length} card${toExport.length>1?'s':''} exported`, 'success');
  } catch (e) {
    console.error(e);
    showToast('Export failed: ' + e.message, 'error');
  } finally {
    if(btn) { btn.disabled = false; btn.textContent = 'Download .apkg'; }
  }
}

// ======================================================
// CARD STYLE LOADER (reads from Firestore, falls back to defaults)
// ======================================================
const STYLE_DEFAULTS = {
  basic: {
    'b-bg1': '#f5f0e8', 'b-bg2': '#ede8f5', 'b-bg3': '#e8f0ed',
    'b-cardbg': '#fffdf8', 'b-border': '#8fab87', 'b-radius': 26,
    'b-frontsize': 21, 'b-backsize': 19,
    'b-font': 'Georgia, serif',
    'b-front-color': '#3a4a3b', 'b-back-color': '#5a7a5c',
    'b-label-color': '#8fab87', 'b-divider-color': '#8fab87',
    'b-bold': '#b07d2a', 'b-italic': '#9a6060', 'b-underline': '#5a9a95',
    'b-divider-shape': 'diamond', 'b-divider-thickness': 1
  },
  cloze: {
    'c-bg': '#1F80C1', 'c-cardbg': '#1E282C', 'c-border': '#ffffff', 'c-radius': 30,
    'c-text': '#E6E6E7', 'c-cloze': '#3CB371', 'c-extra': '#E6E6E7', 'c-fontsize': 18, 'c-extrasize': 14,
    'c-bold': '#EABB3D', 'c-italic': '#CD5C5C', 'c-underline': '#21B2B8',
    'c-font': 'Avenir, Helvetica Neue, sans-serif'
  },
  clozep: {
    'cp-bg': '#1F80C1', 'cp-cardbg': '#1E282C', 'cp-border': '#ffffff', 'cp-radius': 30,
    'cp-text': '#E6E6E7', 'cp-cloze': '#3CB371', 'cp-extra': '#E6E6E7', 'cp-fontsize': 18, 'cp-extrasize': 14,
    'cp-bold': '#EABB3D', 'cp-italic': '#CD5C5C', 'cp-underline': '#21B2B8',
    'cp-font': 'Avenir, Helvetica Neue, sans-serif'
  }
};

function buildBasicCSSFrom(d) {
  const g = k => d[k] ?? STYLE_DEFAULTS.basic[k];
  const bg1=g('b-bg1'), bg2=g('b-bg2'), bg3=g('b-bg3');
  const cardbg=g('b-cardbg'), border=g('b-border'), radius=g('b-radius');
  const frontSize=g('b-frontsize'), backSize=g('b-backsize');
  const font=g('b-font'), frontC=g('b-front-color'), backC=g('b-back-color');
  const labelC=g('b-label-color'), divC=g('b-divider-color');
  const divThickness=g('b-divider-thickness') || 1;
  const divShape=g('b-divider-shape') || 'diamond';
  const isLineOnly = divShape === 'line-only';
  const lineWidth = isLineOnly ? '140px' : '64px';
  const boldC=g('b-bold'), italicC=g('b-italic'), ulC=g('b-underline');
  return `
html { overflow: scroll; overflow-x: hidden; background: linear-gradient(160deg, ${bg1} 0%, ${bg2} 50%, ${bg3} 100%) !important; background-color: ${bg1} !important; }
body { background: transparent !important; margin: 0; padding: 0; }
.card { font-family: ${font}; font-size: 18px; text-align: center; color: ${frontC}; line-height: 1.7em; background: linear-gradient(160deg, ${bg1} 0%, ${bg2} 50%, ${bg3} 100%) !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; min-height: 100vh; }
#bkard { padding: 32px 24px 28px; max-width: 720px; margin: 0 auto; word-wrap: break-word; background: ${cardbg}; border: 1.5px solid ${border}44; border-radius: ${radius}px; box-shadow: 0 8px 40px rgba(100,120,100,0.13); }
.side-label { font-family: ${font}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: ${labelC}; margin-bottom: 16px; }
.answer-label { color: ${divC}; margin-top: 0; }
.bfront { font-family: ${font}; font-size: ${frontSize}px; font-weight: 600; color: ${frontC}; line-height: 1.5; padding: 0 12px; letter-spacing: -0.2px; }
.divider { display: flex; align-items: center; justify-content: center; margin: 24px auto; }
.divider-line { height: ${divThickness}px; width: ${lineWidth}; background: linear-gradient(90deg, transparent, ${divC}88, transparent); display: inline-block; }
.divider-shape { display: inline-flex; align-items: center; justify-content: center; margin: 0 10px; opacity: 0.65; color: ${divC}; font-size: 10px; line-height: 1; }
.divider-diamond { display: none; }
.bback { font-family: ${font}; font-size: ${backSize}px; color: ${backC}; line-height: 1.7; padding: 0 12px 6px; font-weight: 400; }
.tags { color: #b8a8c8; opacity: 0; font-size: 10px; width: 100%; text-align: center; text-transform: uppercase; letter-spacing: 1px; position: fixed; padding: 0; top: 0; right: 0; }
.tags:hover { opacity: 1; }
b, strong { color: ${boldC} !important; font-weight: 700; text-shadow: 0 0 0.5px ${boldC}44; letter-spacing: 0.01em; }
u { text-decoration: none; color: ${ulC}; background-image: linear-gradient(${ulC}, ${ulC}); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; padding-bottom: 1px; }
i, em { color: ${italicC}; font-style: italic; letter-spacing: 0.02em; }
u i, i u, u em, em u { color: limegreen !important; font-weight: bold; background-image: linear-gradient(limegreen, limegreen); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; }
u b, b u, u strong, strong u { color: ${ulC} !important; background-image: linear-gradient(${ulC}, ${ulC}); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; }
i b, b i, em strong, strong em { color: ${italicC} !important; font-weight: 700; text-shadow: 0 0 0.5px ${italicC}44; }
a { color: ${labelC} !important; text-decoration: none; font-size: 11px; }
img { display: block; max-width: 100%; margin: 16px auto; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.card.nightMode { background: linear-gradient(160deg, ${bg1} 0%, ${bg2} 50%, ${bg3} 100%) !important; color: ${frontC} !important; }
.nightMode #bkard { background: ${cardbg}; border-color: ${border}44; }
.nightMode .bfront { color: ${frontC} !important; }
.nightMode .bback  { color: ${backC} !important; }
.nightMode .side-label { color: ${labelC} !important; }
.nightMode .answer-label { color: ${divC} !important; }
.mobile .card { background: linear-gradient(160deg, ${bg1} 0%, ${bg2} 50%, ${bg3} 100%) !important; color: ${frontC} !important; }
.mobile #bkard { background: ${cardbg}; }
.mobile .bfront { color: ${frontC} !important; }
.mobile .bback { color: ${backC} !important; }
.mobile .tags:hover { opacity: 1; position: relative; }
  `.trim();
}

function getDividerHTML(d) {
  const shape = (d && d['b-divider-shape']) || STYLE_DEFAULTS.basic['b-divider-shape'] || 'diamond';
  if (shape === 'line-only') {
    return '<div class="divider"><span class="divider-line"></span></div>';
  }
  const shapeMap = {
    'diamond': '&#9670;',
    'square':  '&#9632;',
    'star':    '&#9733;',
    'circle':  '&#9679;',
    'dots':    '&#8226;&#8226;&#8226;',
    'heart':   '&#9829;'
  };
  const entity = shapeMap[shape] || shapeMap['diamond'];
  const extraStyle = shape === 'dots' ? ' style="letter-spacing:4px;font-size:8px"' : '';
  return `<div class="divider"><span class="divider-line"></span><span class="divider-shape"${extraStyle}>${entity}</span><span class="divider-line"></span></div>`;
}

function buildClozeCSSFrom(d, pfx) {
  const p = k => d[pfx+'-'+k] ?? STYLE_DEFAULTS[pfx === 'c' ? 'cloze' : 'clozep'][pfx+'-'+k];
  const bg=p('bg'), cardbg=p('cardbg'), border=p('border'), radius=p('radius');
  const textC=p('text'), clozeC=p('cloze'), extraC=p('extra'), fs=p('fontsize'), extraFs=p('extrasize') || 14;
  const boldC=p('bold'), italicC=p('italic'), ulC=p('underline');
  const font=p('font') || 'Avenir, Helvetica Neue, sans-serif';
  return `
html { overflow: scroll; overflow-x: hidden; background-color: ${bg} !important; }
body { background: transparent !important; margin: 0; padding: 0; }
.card { font-family: ${font}; font-size: ${fs}px; text-align: center; color: ${textC}; line-height: 1.6em; background-color: ${bg} !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; min-height: 100vh; }
#kard { padding: 15px 10px; max-width: 800px; margin: 0 auto; word-wrap: break-word; background-color: ${cardbg}; border: 2px solid ${border}; border-radius: ${radius}px; }
.cloze, .cloze b, .cloze u, .cloze i { font-weight: bold; color: ${clozeC} !important; }
#extra, #extra i, #extra em { font-size: ${extraFs}px; color: ${extraC}; font-style: italic; }
.tags { color: #A6ABB9; opacity: 0; font-size: 10px; width: 100%; text-align: center; text-transform: uppercase; position: fixed; padding: 0; top: 0; right: 0; }
.tags:hover { opacity: 1; }
b, strong { color: ${boldC} !important; font-weight: 700; text-shadow: 0 0 0.5px ${boldC}44; letter-spacing: 0.01em; }
u { text-decoration: none; color: ${ulC}; background-image: linear-gradient(${ulC}, ${ulC}); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; padding-bottom: 1px; }
i, em { color: ${italicC}; font-style: italic; letter-spacing: 0.02em; }
u i, i u, u em, em u { color: limegreen !important; font-weight: bold; background-image: linear-gradient(limegreen, limegreen); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; }
u b, b u, u strong, strong u { color: ${ulC} !important; background-image: linear-gradient(${ulC}, ${ulC}); background-position: 0 88%; background-repeat: no-repeat; background-size: 100% 2px; }
i b, b i, em strong, strong em { color: ${italicC} !important; font-weight: 700; text-shadow: 0 0 0.5px ${italicC}44; }
a { color: LightGray !important; text-decoration: none; font-size: 10px; font-style: normal; }
img { display: block; max-width: 100%; margin: 10px auto; }
tr { font-size: 12px; }
.card.nightMode { color: ${textC} !important; background-color: ${bg} !important; }
.nightMode #kard { background-color: ${cardbg}; }
.nightMode html, .nightMode body { background-color: ${bg} !important; }
.mobile .card { color: ${textC} !important; background-color: ${bg} !important; }
.mobile #kard { background-color: ${cardbg}; }
.mobile .tags:hover { opacity: 1; position: relative; }
  `.trim();
}

// ======================================================
// BUILT-IN PRESETS
// ======================================================
const BUILTIN_PRESETS = {
  basic: {
    'Moonstone': {
      'b-bg1':'#1a1a2e','b-bg2':'#16213e','b-bg3':'#1a1a30',
      'b-cardbg':'#222244','b-border':'#4a4a7a','b-radius':22,'b-frontsize':21,'b-backsize':18,
      'b-font':"'Avenir', 'Helvetica Neue', sans-serif",
      'b-front-color':'#e8e4f0','b-back-color':'#c0b8d8',
      'b-label-color':'#8878b0','b-divider-color':'#6a5a9a',
      'b-bold':'#f2b0c8','b-italic':'#7ec8e8','b-underline':'#98e0a8'
    },
    'Honey Dusk': {
      'b-bg1':'#fef3e2','b-bg2':'#fce8cc','b-bg3':'#fdf0d8',
      'b-cardbg':'#fff9f0','b-border':'#c8956a','b-radius':24,'b-frontsize':21,'b-backsize':18,
      'b-font':'Georgia, serif',
      'b-front-color':'#4a3520','b-back-color':'#6a5540',
      'b-label-color':'#c8956a','b-divider-color':'#d4a878',
      'b-bold':'#b85828','b-italic':'#7a5898','b-underline':'#1a8878'
    },
    'Arctic Mist': {
      'b-bg1':'#eaf2f8','b-bg2':'#e0eef8','b-bg3':'#e8f0f8',
      'b-cardbg':'#f8fbff','b-border':'#5b8fb9','b-radius':20,'b-frontsize':21,'b-backsize':18,
      'b-font':"'Avenir', 'Helvetica Neue', sans-serif",
      'b-front-color':'#2a3a4a','b-back-color':'#4a6070',
      'b-label-color':'#5b8fb9','b-divider-color':'#7aaad0',
      'b-bold':'#c06828','b-italic':'#4870a8','b-underline':'#1a8860'
    }
  },
  cloze: {
    'Aurora Night': {
      'c-bg':'#0d1117','c-cardbg':'#161b22','c-border':'#30363d','c-radius':20,
      'c-text':'#e6edf3','c-cloze':'#58d68d','c-extra':'#8b949e','c-fontsize':18,'c-extrasize':14,
      'c-bold':'#f0b878','c-italic':'#80c0f0','c-underline':'#d0a0e8'
    },
    'Soft Coral': {
      'c-bg':'#fff0f0','c-cardbg':'#ffffff','c-border':'#e8b0b0','c-radius':22,
      'c-text':'#4a3035','c-cloze':'#e05a5a','c-extra':'#9a8088','c-fontsize':18,'c-extrasize':14,
      'c-bold':'#c87838','c-italic':'#6850a8','c-underline':'#1a9080'
    },
    'Forest Dew': {
      'c-bg':'#1a2f25','c-cardbg':'#22382c','c-border':'#3a6b4a','c-radius':24,
      'c-text':'#d8e8d8','c-cloze':'#7dcea0','c-extra':'#a0c0a8','c-fontsize':18,'c-extrasize':14,
      'c-bold':'#f0c860','c-italic':'#78c8e8','c-underline':'#e8a888'
    }
  },
  clozep: {
    'Aurora Night': {
      'cp-bg':'#0d1117','cp-cardbg':'#161b22','cp-border':'#30363d','cp-radius':20,
      'cp-text':'#e6edf3','cp-cloze':'#58d68d','cp-extra':'#8b949e','cp-fontsize':18,'cp-extrasize':14,
      'cp-bold':'#f0b878','cp-italic':'#80c0f0','cp-underline':'#d0a0e8'
    },
    'Soft Coral': {
      'cp-bg':'#fff0f0','cp-cardbg':'#ffffff','cp-border':'#e8b0b0','cp-radius':22,
      'cp-text':'#4a3035','cp-cloze':'#e05a5a','cp-extra':'#9a8088','cp-fontsize':18,'cp-extrasize':14,
      'cp-bold':'#c87838','cp-italic':'#6850a8','cp-underline':'#1a9080'
    },
    'Forest Dew': {
      'cp-bg':'#1a2f25','cp-cardbg':'#22382c','cp-border':'#3a6b4a','cp-radius':24,
      'cp-text':'#d8e8d8','cp-cloze':'#7dcea0','cp-extra':'#a0c0a8','cp-fontsize':18,'cp-extrasize':14,
      'cp-bold':'#f0c860','cp-italic':'#78c8e8','cp-underline':'#e8a888'
    }
  }
};

// Named presets cache loaded on sign-in
let userNamedPresets = { basic: {}, cloze: {}, clozep: {} };

async function loadUserNamedPresets() {
  if (!currentUser) return;
  try {
    const snap = await fsDb.collection('users').doc(currentUser.uid).collection('settings').doc('namedPresets').get();
    if (snap.exists) userNamedPresets = Object.assign({ basic:{}, cloze:{}, clozep:{} }, snap.data());
    populateThemeSelector();
  } catch (e) { console.warn('loadUserNamedPresets failed:', e); }
}

function getAllPresets(typeKey) {
  return { ...(BUILTIN_PRESETS[typeKey] || {}), ...(userNamedPresets[typeKey] || {}) };
}

function populateThemeSelector() {
  const sel = document.getElementById('themeSelect');
  const row = document.getElementById('themeSelectRow');
  if (!sel || !row) return;

  const cardType = selectedCardType;
  const typeKey = cardType === 'Basic' ? 'basic' : cardType === 'Cloze++' ? 'clozep' : 'cloze';
  // Only show user's own saved presets + Default
  const userPresets = userNamedPresets[typeKey] || {};
  const names = Object.keys(userPresets);

  const savedTheme = (localStorage.getItem('t2a_theme_' + typeKey) || '');
  const activeTheme = names.includes(savedTheme) ? savedTheme : '';

  sel.innerHTML = '<option value="">Default (saved style)</option>' +
    names.map(n => `<option value="${n.replace(/"/g,'&quot;')}"${n === activeTheme ? ' selected' : ''}>${n}</option>`).join('');

  const display = document.getElementById('themeSelectDisplay');
  if (display) display.textContent = activeTheme || 'Default (saved style)';

  const dropdown = document.getElementById('themeSelectDropdown');
  if (dropdown) {
    const allOptions = [{ val: '', label: 'Default (saved style)' }, ...names.map(n => ({ val: n, label: n }))];
    dropdown.innerHTML = allOptions.map(o =>
      `<div class="custom-select-option${o.val === activeTheme ? ' selected' : ''}" onclick="selectThemeOption('${o.val.replace(/'/g,"\\'")}',this)">${o.label}</div>`
    ).join('');
  }

  // Always show the selector row
  row.style.display = '';
}

function toggleThemeDropdown() {
  const dropdown = document.getElementById('themeSelectDropdown');
  const trigger  = document.getElementById('themeSelectTrigger');
  if (!dropdown) return;
  const open = dropdown.classList.toggle('open');
  trigger?.classList.toggle('open', open);
  if (open) {
    setTimeout(() => {
      document.addEventListener('click', closeThemeDropdown, { once: true });
    }, 0);
  }
}

function closeThemeDropdown() {
  document.getElementById('themeSelectDropdown')?.classList.remove('open');
  document.getElementById('themeSelectTrigger')?.classList.remove('open');
}

function selectThemeOption(value, el) {
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = value;
  const display = document.getElementById('themeSelectDisplay');
  if (display) display.textContent = value || 'Default (saved style)';
  document.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  closeThemeDropdown();
  onThemeChange(value);
}

function onThemeChange(value) {
  const cardType = selectedCardType;
  const typeKey = cardType === 'Basic' ? 'basic' : cardType === 'Cloze++' ? 'clozep' : 'cloze';
  if (value) localStorage.setItem('t2a_theme_' + typeKey, value);
  else localStorage.removeItem('t2a_theme_' + typeKey);
}

async function loadCardStyles(themeOverride) {
  const out = {
    basicCSS: buildBasicCSSFrom({}),
    clozeCSS: buildClozeCSSFrom({}, 'c'),
    clozepCSS: buildClozeCSSFrom({}, 'cp'),
    basicData: {}
  };
  try {
    if (currentUser) {
      const snap = await fsDb.collection('users').doc(currentUser.uid).collection('settings').doc('cardStyles').get();
      const saved = snap.exists ? (snap.data() || {}) : {};
      if (saved.basic)  { out.basicCSS  = buildBasicCSSFrom(saved.basic);  out.basicData = saved.basic; }
      if (saved.cloze)  out.clozeCSS  = buildClozeCSSFrom(saved.cloze, 'c');
      if (saved.clozep) out.clozepCSS = buildClozeCSSFrom(saved.clozep, 'cp');
    }

    if (themeOverride) {
      const cardType = selectedCardType;
      const typeKey = cardType === 'Basic' ? 'basic' : cardType === 'Cloze++' ? 'clozep' : 'cloze';
      const presetData = getAllPresets(typeKey)[themeOverride];
      if (presetData) {
        if (typeKey === 'basic')  { out.basicCSS  = buildBasicCSSFrom(presetData); out.basicData = presetData; }
        if (typeKey === 'cloze')  out.clozeCSS  = buildClozeCSSFrom(presetData, 'c');
        if (typeKey === 'clozep') out.clozepCSS = buildClozeCSSFrom(presetData, 'cp');
      }
    }
  } catch (e) {
    console.warn('Could not load card styles:', e);
  }
  return out;
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

function openInstructions() { document.getElementById('instructionsModal').classList.add('visible'); }
function closeInstructions() { document.getElementById('instructionsModal').classList.remove('visible'); }
function closeInstructionsOnBg(e) { if (e.target===document.getElementById('instructionsModal')) closeInstructions(); }

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
A: [answer line 1]
• [bullet point if needed]
• [bullet point if needed]

[ONE blank line between every card]

RULES:
- Output ONLY the formatted cards — no introduction, no commentary, no confirmation, no extra text whatsoever
- One concept per card
- Each card starts with "Q: " on its own line, then "A: " on the next line
- Continuation lines of an answer (like bullet points) go on their own lines directly below "A:" with NO blank line between them
- Separate cards from each other with exactly ONE blank line
- Do not number cards
- Do not add headers or section titles
- Do NOT include images, image links, or any media references

FORMATTING — use ONLY real HTML tags (the literal characters < and >) inside Q and A:
- CRITICAL: use ONLY these exact tags: <b>word</b> for bold, <i>word</i> for italics, <u>word</u> for underline
- Do NOT use asterisks, markdown, or any other formatting syntax — only the HTML tags above (exception: LaTeX math — see MATH section below)
- Do NOT escape the angle brackets — write <b> not \\<b\\>
- Wrap the single most important word or phrase in <b>bold</b> — every card should have at least one
- Use <i>italics</i> for technical terms, definitions, or secondary emphasis
- Use <u>underline</u> for dates, numbers, formulas, or anything that must be memorized exactly
- For list-style answers: write each bullet on its own line starting with •
- For chemical formulas use <sub> and <sup> tags: H<sub>2</sub>O, Ca<sup>2+</sup>, CO<sub>2</sub>

MATH & SCIENCE — use Anki-native MathJax for equations:
- CRITICAL: Anki uses MathJax. You MUST wrap math in \\( and \\) for inline or \\[ and \\] for display blocks
- Use SINGLE backslashes only. Write \\( not \\\\(. Write \\frac not \\\\frac
- Do NOT use dollar signs ($..$ or $$..$$) — Anki only recognizes \\( \\) and \\[ \\]
- Inline example: \\(E = mc^2\\)
- Display example: \\[\\int_0^\\infty e^{-x}\\,dx = 1\\]
- Use LaTeX for ALL math: fractions \\(\\frac{a}{b}\\), roots \\(\\sqrt{x}\\), Greek letters \\(\\alpha\\), sums \\(\\sum\\), integrals \\(\\int\\), etc.
- Simple chemical formulas can use HTML: H<sub>2</sub>O, Ca<sup>2+</sup>
- NEVER wrap LaTeX in <b>, <i>, or <u> tags — keep them separate

CHEMISTRY — for reactions, use LaTeX with \\xrightarrow for reagents above/below the arrow:
- Basic reaction: \\(\\text{A} + \\text{B} \\rightarrow \\text{C}\\)
- Reaction with reagent over arrow: \\(\\text{CH}_3\\text{CH}_2\\text{Br} \\xrightarrow{\\text{NaOH}} \\text{CH}_3\\text{CH}_2\\text{OH}\\)
- Reaction with reagent above and conditions below: \\(\\text{R-Br} \\xrightarrow[\\Delta]{\\text{KOH/EtOH}} \\text{R=R'}\\)
- Use \\text{} for chemical names and formulas: \\text{CH}_3, \\text{OH}, \\text{NaOH}
- CRITICAL: subscripts MUST use underscore _. Write \\text{H}_2\\text{O} NOT \\text{H}2\\text{O}. The _ is required for subscript numbers in LaTeX
- Common compounds: \\text{H}_2\\text{O} (water), \\text{CO}_2 (carbon dioxide), \\text{H}_2\\text{SO}_4 (sulfuric acid), \\text{NaBH}_4 (sodium borohydride), \\text{LiAlH}_4 (lithium aluminum hydride)
- For structural notation: use \\text{CH}_3\\text{COOH} or \\text{R-OH}
- Organic groups: \\text{-OH} (hydroxyl), \\text{-COOH} (carboxyl), \\text{-NH}_2 (amino)

EXAMPLE (two cards separated by a blank line):

Q: What are the <b>three stages</b> of <i>cellular respiration</i>?
A: The three stages are:
• <b>Glycolysis</b> — occurs in the <u>cytoplasm</u>, yields <u>2 ATP</u>
• <b>Krebs cycle</b> — occurs in the <i>mitochondrial matrix</i>
• <b>Electron transport chain</b> — occurs on the <i>inner mitochondrial membrane</i>, yields most ATP

Q: What is the <b>quadratic formula</b>?
A: For \\(ax^2 + bx + c = 0\\), the solutions are: \\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]

Q: What product forms when <b>ethanol</b> is oxidized?
A: \\(\\text{CH}_3\\text{CH}_2\\text{OH} \\xrightarrow{\\text{KMnO}_4} \\text{CH}_3\\text{COOH}\\) — <i>ethanol</i> is oxidized to <b>acetic acid</b> (ethanoic acid)

Q: What is the role of <b>ATP synthase</b> in cellular respiration?
A: <b>ATP synthase</b> is an enzyme that uses the <i>proton gradient</i> across the inner mitochondrial membrane to produce <u>~34 ATP</u> molecules per glucose.

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
- Do NOT include images, image links, or any media references
- HINTS must NOT give away the answer — use a category, context, or direction instead. BAD: {{c1::mitochondria::powerhouse of the cell}} GOOD: {{c1::mitochondria::organelle}}. BAD: {{c1::1776::year of independence}} GOOD: {{c1::1776::year}}. The hint should jog memory, not make the answer obvious
- Equations do NOT always have to be inside the cloze — if the equation is given context, it can appear outside and the cloze can hide a fact about it

FORMATTING — use real HTML tags (the literal characters < and >) to highlight important words:
- CRITICAL: use ONLY these exact tags: <b>word</b> for bold, <i>word</i> for italics, <u>word</u> for underline
- Do NOT use asterisks, markdown, or any other formatting syntax — only HTML tags (exception: LaTeX math — see below)
- Wrap key terms outside the cloze in <b>bold</b> — every card should have at least one <b> tag
- Use <i>italics</i> for technical terms, categories, or proper names
- Use <u>underline</u> for numbers, dates, or values that must be memorized exactly
- You MAY wrap the cloze deletion itself in bold: <b>{{c1::answer}}</b>
- For chemical formulas use <sub> and <sup> tags: H<sub>2</sub>O, Ca<sup>2+</sup>

MATH & SCIENCE — use Anki-native MathJax for equations:
- CRITICAL: Anki uses MathJax. You MUST wrap math in \\( and \\) for inline or \\[ and \\] for display
- Use SINGLE backslashes only. Write \\( not \\\\(. Write \\frac not \\\\frac
- Do NOT use dollar signs ($..$ or $$..$$) — Anki only recognizes \\( \\) and \\[ \\]
- DANGER: inside a cloze {{c1::...}}, LaTeX closing braces }} will break the cloze! Always insert \\ (backslash-space) between consecutive closing braces: write }\\ } not }}. Example: \\(\\frac{\\partial \\mathbf{B}\\ }{\\partial t}\\) NOT \\(\\frac{\\partial \\mathbf{B}}{\\partial t}\\)
- HINT PLACEMENT: the ::hint MUST come BEFORE the closing }}. Write {{c1::answer::hint}} NOT {{c1::answer}}::hint}. For LaTeX answers ending in }, place the hint after the last }: {{c1:\\text{NaOH}::reagent}}
- Equations can be INSIDE or OUTSIDE the cloze depending on what should be memorized
- To hide the equation: {{c1::\\(E = mc^2\\)}}
- To show the equation and hide a fact about it: \\(a^2 + b^2 = c^2\\) is the {{c1::Pythagorean theorem}}
- NEVER wrap LaTeX in <b>, <i>, or <u> tags

CHEMISTRY — for reactions, use LaTeX with \\xrightarrow for reagents above/below the arrow:
- Reaction with reagent over arrow: \\(\\text{R-Br} \\xrightarrow{\\text{NaOH}} \\text{R-OH}\\)
- Reagent above + conditions below: \\(\\text{R-Br} \\xrightarrow[\\Delta]{\\text{KOH/EtOH}} \\text{R=R'}\\)
- Use \\text{} for chemical names: \\text{CH}_3, \\text{OH}, \\text{NaOH}
- CRITICAL: subscripts MUST use underscore _. Write \\text{H}_2\\text{O} NOT \\text{H}2\\text{O}. The _ is required for subscript numbers in LaTeX
- Common compounds: \\text{H}_2\\text{O} (water), \\text{CO}_2, \\text{H}_2\\text{SO}_4, \\text{NaBH}_4, \\text{LiAlH}_4
- To hide a reagent in cloze: \\(\\text{R-Br} \\xrightarrow{ {{c1::\\text{NaOH} }} } \\text{R-OH}\\)
- To hide a product: \\(\\text{CH}_3\\text{OH} \\xrightarrow{\\text{H}^+} {{c1::\\text{CH}_3\\text{OCH}_3}}\\)

EXAMPLE:
The <b>derivative</b> of \\(x^n\\) is {{c1::\\(nx^{n-1}\\)}} || <b>Power rule</b>
\\(a^2 + b^2 = c^2\\) is the {{c1::Pythagorean theorem::geometry}} || Relates the sides of a <b>right triangle</b>
<b>Ethanol</b> undergoes <i>elimination</i> via \\(\\text{CH}_3\\text{CH}_2\\text{OH} \\xrightarrow{ {{c1::\\text{H}_2\\text{SO}_4}} } \\text{CH}_2\\text{=CH}_2 + \\text{H}_2\\text{O}\\) || <b>Dehydration</b> reaction
Many <i>Religious Zionist</i> congregations recite the full <b>{{c1::Hallel}}</b> (Psalms <u>113–118</u>) to thank G-d || Same as on <b>Passover</b> and <b>Sukkot</b>

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
- Do NOT include images, image links, or any media references
- HINTS must NOT give away the answer — use a category, context, or direction instead. BAD: {{c1::mitochondria::powerhouse of the cell}} GOOD: {{c1::mitochondria::organelle}}. BAD: {{c1::1776::year of independence}} GOOD: {{c1::1776::year}}. The hint should jog memory, not make the answer obvious
- Equations do NOT always have to be inside the cloze — if the equation is given context, it can appear outside and the cloze can hide a fact about it

FORMATTING — use real HTML tags (the literal characters < and >) to highlight important words:
- CRITICAL: use ONLY these exact tags: <b>word</b> for bold, <i>word</i> for italics, <u>word</u> for underline
- Do NOT use asterisks, markdown, or any other formatting syntax — only HTML tags (exception: LaTeX math — see below)
- Wrap the most important non-cloze word in <b>bold</b> — every card needs at least one
- Use <i>italics</i> for technical terms, synonyms, or proper names
- Use <u>underline</u> for numbers, dates, or exact values that must be memorized
- You MAY bold the cloze itself: <b>{{c1::answer::hint}}</b>
- In the Extra field after ||, bold the single key takeaway
- For chemical formulas use <sub> and <sup> tags: H<sub>2</sub>O, Ca<sup>2+</sup>

MATH & SCIENCE — use Anki-native MathJax for equations:
- CRITICAL: Anki uses MathJax. You MUST wrap math in \\( and \\) for inline or \\[ and \\] for display
- Use SINGLE backslashes only. Write \\( not \\\\(. Write \\frac not \\\\frac
- Do NOT use dollar signs ($..$ or $$..$$) — Anki only recognizes \\( \\) and \\[ \\]
- DANGER: inside a cloze {{c1::...}}, LaTeX closing braces }} will break the cloze! Always insert \\ (backslash-space) between consecutive closing braces: write }\\ } not }}. Example: \\(\\frac{\\partial \\mathbf{B}\\ }{\\partial t}\\) NOT \\(\\frac{\\partial \\mathbf{B}}{\\partial t}\\)
- HINT PLACEMENT: the ::hint MUST come BEFORE the closing }}. Write {{c1::answer::hint}} NOT {{c1::answer}}::hint}. For LaTeX answers ending in }, place the hint after the last }: {{c1:\\text{NaOH}::reagent}}
- Equations can be INSIDE or OUTSIDE the cloze depending on what should be memorized
- To hide the equation: {{c1::\\(E = mc^2\\)::energy equation}}
- To show the equation and hide a fact: \\(a^2 + b^2 = c^2\\) is the {{c1::Pythagorean theorem::geometry}}
- NEVER wrap LaTeX in <b>, <i>, or <u> tags

CHEMISTRY — for reactions, use LaTeX with \\xrightarrow for reagents above/below the arrow:
- Reaction with reagent over arrow: \\(\\text{R-Br} \\xrightarrow{\\text{NaOH}} \\text{R-OH}\\)
- Reagent above + conditions below: \\(\\text{R-Br} \\xrightarrow[\\Delta]{\\text{KOH/EtOH}} \\text{R=R'}\\)
- Use \\text{} for chemical names: \\text{CH}_3, \\text{OH}, \\text{NaOH}
- CRITICAL: subscripts MUST use underscore _. Write \\text{H}_2\\text{O} NOT \\text{H}2\\text{O}. The _ is required for subscript numbers in LaTeX
- Common compounds: \\text{H}_2\\text{O} (water), \\text{CO}_2, \\text{H}_2\\text{SO}_4, \\text{NaBH}_4, \\text{LiAlH}_4
- To hide a reagent in cloze: \\(\\text{R-Br} \\xrightarrow{ {{c1::\\text{NaOH}::reagent}} } \\text{R-OH}\\)
- To hide a product: \\(\\text{CH}_3\\text{OH} \\xrightarrow{\\text{H}^+} {{c1::\\text{CH}_3\\text{OCH}_3::ether product}}\\)

EXAMPLES:
The <b>{{c1::Krebs cycle::TCA cycle}}</b> produces <u>3 NADH</u> and <u>1 FADH₂</u> per turn || Occurs in the <i>mitochondrial matrix</i>; also yields <u>1 GTP</u> and <u>2 CO₂</u> per turn — <b>net energy capture step</b> of aerobic respiration
\\(a^2 + b^2 = c^2\\) is called the <b>{{c1::Pythagorean theorem::geometry}}</b> || Relates the three sides of a <b>right triangle</b>; one of the oldest known mathematical results
In <b>organic chemistry</b>, \\(\\text{CH}_3\\text{CH}_2\\text{Br} \\xrightarrow{ {{c1::\\text{NaOH}::strong base}} } \\text{CH}_3\\text{CH}_2\\text{OH}\\) is an {{c2::S<sub>N</sub>2 reaction::substitution}} || The <b>hydroxide ion</b> attacks the carbon bearing the leaving group in a single concerted step
The <b>quadratic formula</b> states that for \\(ax^2 + bx + c = 0\\), the roots are {{c1::\\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}\\ }{2a}\\)::solve for x}} || Derived by <b>completing the square</b>; the discriminant \\(b^2 - 4ac\\) determines whether roots are real or complex
In the <b>ideal gas law</b>, {{c1::\\(PV = nRT\\)::gas equation}}, <i>R</i> is the {{c2::universal gas constant::8.314 J/(mol·K)}} || Combines <b>Boyle's</b>, <b>Charles's</b>, and <b>Avogadro's</b> laws into one expression

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