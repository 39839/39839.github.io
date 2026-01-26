// Main Application Entry Point - QUERY FIX FOR COMMENT BADGES + GENERAL PARSHA CHAT
import { TORAH_PARSHAS } from './config.js';
import { fetchCurrentParsha, fetchParshaText, loadCommentaryData, loadMitzvahChallenges } from './api.js';
import { state, setState } from './state.js';
import { isImportantVerse, getImportantVerseData } from './important-verses.js';
import { getDisplayNameFromEmail } from './name-utils.js';
import {
    showLoading,
    hideLoading,
    showError,
    hideError,
    updateParshaHeader,
    highlightCurrentParsha,
    updateNavigationButtons,
    populateParshaSelector,
    hideInfoPanel,
    showInfoPanel,
    showKeywordDefinition,
    showCommentary,
    showVerseSignificance,
    openCommentsPanel,
    closeCommentsPanel,
    displayComments,
    updateCommentInputState,
    showCommentStatus,
    getSavedUsername,
    updateUsernameDisplay,
    setCurrentUserEmail,
    displayOnlineUsers,
    hideOnlineUsers,
    displayLastLogin,
    hideLastLogin
} from './ui.js';

import {
    initAuth,
    getCurrentUserId,
    getCurrentUserEmail,
    signInWithEmail,
    createAccountWithEmail,
    signOutUser,
    hideLoginModal,
    sendPasswordReset,
    submitComment,
    listenForComments,
    stopListeningForComments,
    db,
    submitReaction,
    getUserReactions,
    getReactionCountsForBook,
    getBookmarkCountsForBook,
    getBookmarkCountsForVerses,
    addBookmark,
    removeBookmark,
    isVerseBookmarked,
    getUserBookmarks,
    addDailyQuoteBookmark,
    removeDailyQuoteBookmark,
    isDailyQuoteBookmarked,
    getUserDailyQuoteBookmarks,
    recordUserLogin,
    updateUserPresence,
    markUserOffline,
    listenForOnlineUsers,
    stopListeningForOnlineUsers,
    getUserInfo,
    getUsersWithinThreeWeeks,
    listenForMitzvahReflections,
    stopListeningForMitzvahReflections,
    submitMitzvahReflection,
    submitMitzvahReflectionReaction,
    getMitzvahCompletionStatus,
    setMitzvahCompletionStatus,
    updateMitzvahLeaderboard,
    recalculateMitzvahLeaderboard,
    getMitzvahLeaderboard,
    formatTimeAgo
} from './firebase.js';

import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let verseCommentCounts = {};
let verseReactionCounts = {};
let userReactions = {};
let isAuthReady = false;
let bookmarkedVerses = new Set();
let verseBookmarkCounts = {};
let bookmarkedQuoteIds = new Set();
let cachedQuoteBookmarks = [];
const verseDisplayTexts = {};

// User presence tracking
let lastUserId = null;
let presenceIntervalId = null;
const PRESENCE_UPDATE_INTERVAL = 30000; // Update every 30 seconds
let currentUserProfile = null;
const FRIEND_LOGINS_REFRESH_INTERVAL = 90000; // Update every 90 seconds for 3-week window
let friendLoginsRefreshIntervalId = null;
const FRIEND_PRESENCE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // 3 weeks
let trackedOnlineFriends = [];
let trackedRecentFriendLogins = [];

// Weekly mitzvah challenge tracking
let currentMitzvahChallengeId = null;
let currentMitzvahCompletion = false;
let mitzvahChatMessages = [];
let isSubmittingMitzvahReflection = false;
let mitzvahCountdownIntervalId = null;
let mitzvahModalWasShown = false;
const MITZVAH_MODAL_DISMISS_KEY_PREFIX = 'mitzvahModalDismissed:';
const MITZVAH_LEADERBOARD_LIMIT = 10;
let isLoadingMitzvahLeaderboard = false;
let currentMitzvahChallengeMode = 'none';
const WEEKLY_PARSHA_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
let weeklyParshaCheckIntervalId = null;
let isWeeklyParshaCheckRunning = false;
let pendingWeeklyParshaCheck = false;
let pendingWeeklyParshaForceAdvance = false;

function escapeForAttributeSelector(value) {
    if (typeof value !== 'string') {
        return '';
    }
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
}

function findVerseElement(verseRef) {
    if (!verseRef) {
        return null;
    }
    const escaped = escapeForAttributeSelector(verseRef);
    return document.querySelector(`[data-ref="${escaped}"]`);
}

function getVerseTextSnippet(verseRef) {
    if (!verseRef) {
        return '';
    }

    if (verseDisplayTexts[verseRef] && verseDisplayTexts[verseRef].english) {
        return verseDisplayTexts[verseRef].english;
    }

    const verseElement = findVerseElement(verseRef);
    if (verseElement) {
        const englishElement = verseElement.querySelector('.english-text');
        if (englishElement) {
            const text = englishElement.textContent.trim();
            verseDisplayTexts[verseRef] = { english: text };
            return text;
        }
    }

    return '';
}

function getCurrentDailyQuotePayload() {
    const container = document.getElementById('daily-inspiration');
    const quoteFromWindow = typeof window !== 'undefined' ? window.currentDailyQuote : null;
    const quoteId = quoteFromWindow && (quoteFromWindow.id ?? quoteFromWindow.quoteId);

    if (quoteFromWindow && quoteId != null) {
        return {
            ...quoteFromWindow,
            id: String(quoteId),
            quoteId: String(quoteId),
            displayDate: quoteFromWindow.displayDate || container?.dataset?.quoteDate || null
        };
    }

    if (container && container.dataset.quoteId) {
        return {
            id: String(container.dataset.quoteId),
            quoteId: String(container.dataset.quoteId),
            displayDate: container.dataset.quoteDate || null,
            hebrew: container.querySelector('[data-quote-hebrew]')?.textContent?.trim() || '',
            translation: container.querySelector('[data-quote-translation]')?.textContent?.trim() || '',
            source: container.querySelector('[data-quote-source]')?.textContent?.trim() || '',
            reflection: container.querySelector('[data-quote-reflection]')?.textContent?.trim() || ''
        };
    }

    return null;
}

function updateDailyQuoteBookmarkButtonState() {
    const button = document.querySelector('[data-quote-bookmark]');
    if (!button) {
        return;
    }

    const payload = getCurrentDailyQuotePayload();
    const quoteId = payload ? String(payload.quoteId || payload.id) : null;
    const isActive = quoteId ? bookmarkedQuoteIds.has(quoteId) : false;

    button.classList.toggle('is-active', Boolean(isActive));
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    const label = isActive ? 'Remove this quote from your bookmarks' : 'Bookmark this quote';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', isActive ? 'Saved to your quotes' : 'Save this quote');
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getWeekStartForDate(referenceDate = new Date()) {
    const weekStart = new Date(referenceDate);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay(); // 0 = Sunday
    weekStart.setDate(weekStart.getDate() - day);
    return weekStart;
}

function getStoredWeeklyWeekWindow() {
    if (state.weeklyParshaWeekStart) {
        const weekStart = new Date(state.weeklyParshaWeekStart);
        if (!Number.isNaN(weekStart.getTime())) {
            const deadline = addDays(weekStart, 7);
            return { weekStart, deadline };
        }
    }
    return calculateMitzvahWeekWindow();
}

function getNextWeeklyParshaInfo() {
    if (!Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return null;
    }
    const currentIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : (typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0
            ? state.currentParshaIndex
            : 0);
    const nextIndex = (currentIndex + 1) % state.allParshas.length;
    const parsha = state.allParshas[nextIndex];
    if (!parsha) {
        return null;
    }
    return { parsha, index: nextIndex };
}

function parseVerseReference(verseRef) {
    if (!verseRef || typeof verseRef !== 'string') {
        return null;
    }

    const match = verseRef.trim().match(/^([A-Za-z]+)\s+(\d+):(\d+)$/);
    if (!match) {
        return null;
    }

    return {
        bookName: match[1],
        chapter: parseInt(match[2], 10),
        verse: parseInt(match[3], 10)
    };
}

function isVerseWithinParshaRange(verseDetails, parshaRange) {
    if (!verseDetails || !parshaRange) {
        return false;
    }

    if (verseDetails.bookName !== parshaRange.bookName) {
        return false;
    }

    const startChapter = parshaRange.startChapter;
    const startVerse = parshaRange.startVerse;
    const endChapter = parshaRange.endChapter ?? parshaRange.startChapter;
    const endVerse = parshaRange.endVerse ?? parshaRange.startVerse;

    if (verseDetails.chapter < startChapter || verseDetails.chapter > endChapter) {
        return false;
    }

    if (verseDetails.chapter === startChapter && verseDetails.verse < startVerse) {
        return false;
    }

    if (verseDetails.chapter === endChapter && verseDetails.verse > endVerse) {
        return false;
    }

    return true;
}

function findParshaForVerse(verseRef) {
    const verseDetails = parseVerseReference(verseRef);
    if (!verseDetails || !Array.isArray(state.allParshas)) {
        return null;
    }

    for (const parsha of state.allParshas) {
        const range = parseParshaReference(parsha.reference);
        if (isVerseWithinParshaRange(verseDetails, range)) {
            return parsha;
        }
    }

    return state.allParshas.find((parsha) => parsha.reference.startsWith(`${verseDetails.bookName} `)) || null;
}

function highlightVerseAndScroll(verseRef, attempt = 0) {
    const target = findVerseElement(verseRef);
    if (!target) {
        if (attempt < 12) {
            setTimeout(() => highlightVerseAndScroll(verseRef, attempt + 1), 120);
        }
        return;
    }

    document.querySelectorAll('.bookmark-highlight').forEach((el) => {
        el.classList.remove('bookmark-highlight');
    });

    target.classList.add('bookmark-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        target.classList.remove('bookmark-highlight');
    }, 2600);
}

async function init() {
    try {
        // Wait for the first authentication state result before continuing
        await new Promise((resolve) => {
            let initialResolved = false;
            initAuth(async (user) => {
                isAuthReady = true;
                try {
                    await handleAuthStateChange(user);
                } catch (error) {
                    console.error('Error in auth state change handler:', error);
                }
                if (!initialResolved) {
                    initialResolved = true;
                    resolve();
                }
            });
        });

        console.log('✅ Auth initialized');

        const [commentaryData, mitzvahChallengeData] = await Promise.all([
            loadCommentaryData(),
            loadMitzvahChallenges()
        ]);

        console.log('✅ Data loaded');

        setState({
            commentaryData,
            mitzvahChallenges: (mitzvahChallengeData && Array.isArray(mitzvahChallengeData.challenges))
                ? mitzvahChallengeData.challenges
                : []
        });
        setState({ allParshas: TORAH_PARSHAS });

        const currentParshaName = await fetchCurrentParsha();

        console.log('✅ Current parsha fetched:', currentParshaName);

        if (currentParshaName) {
            const matchingParsha = TORAH_PARSHAS.find(p =>
                p.name.toLowerCase() === currentParshaName.toLowerCase() ||
                currentParshaName.toLowerCase().includes(p.name.toLowerCase())
            );

            if (matchingParsha) {
                const matchingIndex = TORAH_PARSHAS.indexOf(matchingParsha);
                const initialWeekStart = getWeekStartForDate();
                setState({
                    currentParshaRef: matchingParsha.reference,
                    currentParshaIndex: matchingIndex,
                    weeklyParshaRef: matchingParsha.reference,
                    weeklyParshaIndex: matchingIndex,
                    weeklyParshaWeekStart: initialWeekStart.toISOString()
                });
                console.log('✅ Matched current parsha:', matchingParsha.name);
            }
        }

        if (!state.currentParshaRef && TORAH_PARSHAS.length > 0) {
            setState({
                currentParshaRef: TORAH_PARSHAS[0].reference,
                currentParshaIndex: 0
            });
            console.log('✅ Set to first parsha');
        }

        if ((state.weeklyParshaIndex == null || state.weeklyParshaIndex < 0) && state.currentParshaRef) {
            const fallbackIndex = state.currentParshaIndex >= 0 ? state.currentParshaIndex : 0;
            const initialWeekStart = getWeekStartForDate();
            setState({
                weeklyParshaRef: state.currentParshaRef,
                weeklyParshaIndex: fallbackIndex,
                weeklyParshaWeekStart: state.weeklyParshaWeekStart || initialWeekStart.toISOString()
            });
        }

        populateParshaSelector();
        updateNavigationButtons();
        setupEventListeners();

        console.log('✅ Setup complete, loading parsha:', state.currentParshaRef);

        if (state.currentParshaRef) {
            await loadParsha(state.currentParshaRef);
        }

        startWeeklyParshaMonitor();

        console.log('✅ Application initialized successfully');

    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
        hideLoading();
    }
}

function setupEventListeners() {
    setupMitzvahChallengeEventListeners();

    // Add change listener to ALL parsha selector elements (desktop and mobile)
    document.querySelectorAll('select#parsha-selector').forEach((selector) => {
        selector.addEventListener('change', async (e) => {
            const selectedRef = e.target.value;
            const index = state.allParshas.findIndex(p => p.reference === selectedRef);
            setState({
                currentParshaIndex: index,
                currentParshaRef: selectedRef
            });
            await loadParsha(selectedRef);
            updateNavigationButtons();
            // Update the selected value in ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = selectedRef;
            });
        });
    });
    
    document.getElementById('prev-parsha').addEventListener('click', async () => {
        if (state.currentParshaIndex > 0) {
            const newIndex = state.currentParshaIndex - 1;
            const prevParsha = state.allParshas[newIndex];
            setState({
                currentParshaIndex: newIndex,
                currentParshaRef: prevParsha.reference
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = prevParsha.reference;
            });
            await loadParsha(prevParsha.reference);
            updateNavigationButtons();
        }
    });

    document.getElementById('next-parsha').addEventListener('click', async () => {
        if (state.currentParshaIndex < state.allParshas.length - 1) {
            const newIndex = state.currentParshaIndex + 1;
            const nextParsha = state.allParshas[newIndex];
            setState({
                currentParshaIndex: newIndex,
                currentParshaRef: nextParsha.reference
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = nextParsha.reference;
            });
            await loadParsha(nextParsha.reference);
            updateNavigationButtons();
        }
    });
    
    const weeklyButton = document.getElementById('go-to-weekly');
    if (weeklyButton) {
        weeklyButton.addEventListener('click', async () => {
            const weeklyRef = state.weeklyParshaRef || state.currentParshaRef;
            if (!weeklyRef) {
                return;
            }
            const index = state.allParshas.findIndex(p => p.reference === weeklyRef);
            if (index < 0) {
                return;
            }
            setState({
                currentParshaIndex: index,
                currentParshaRef: weeklyRef
            });
            // Update ALL select elements to keep them in sync
            document.querySelectorAll('select#parsha-selector').forEach((s) => {
                s.value = weeklyRef;
            });
            await loadParsha(weeklyRef);
            updateNavigationButtons();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const significanceButton = document.getElementById('show-significance');
    if (significanceButton) {
        significanceButton.addEventListener('click', openParshaSignificanceModal);
    }

    // Significance Button (Mobile)
    const significanceButtonMobile = document.getElementById('show-significance-mobile');
    if (significanceButtonMobile) {
        significanceButtonMobile.addEventListener('click', openParshaSignificanceModal);
    }

    // General Parsha Chat Button (Desktop)
    const parshaChatButton = document.getElementById('general-parsha-chat');
    if (parshaChatButton) {
        parshaChatButton.addEventListener('click', () => {
            const parshaRef = state.currentParshaRef || 'Genesis 1:1';
            const parshaName = state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
            const generalChatRef = `PARSHA:${parshaRef}`;
            openCommentsPanel(generalChatRef, (ref) => {
                listenForComments(ref, displayComments);
            }, parshaName);
        });
    }

    // General Parsha Chat Button (Mobile)
    const parshaChatButtonMobile = document.getElementById('general-parsha-chat-mobile');
    if (parshaChatButtonMobile) {
        parshaChatButtonMobile.addEventListener('click', () => {
            const parshaRef = state.currentParshaRef || 'Genesis 1:1';
            const parshaName = state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
            const generalChatRef = `PARSHA:${parshaRef}`;
            openCommentsPanel(generalChatRef, (ref) => {
                listenForComments(ref, displayComments);
            }, parshaName);
        });
    }
    
    document.getElementById('close-panel-button').addEventListener('click', hideInfoPanel);
    
    document.getElementById('info-panel').addEventListener('click', (e) => {
        if (e.target.id === 'info-panel') {
            hideInfoPanel();
        }
    });
    
    document.getElementById('parsha-text').addEventListener('click', handleTextClick);
    
    setupCommentPanelListeners();
    setupLoginListeners();

    window.addEventListener('focus', () => scheduleImmediateWeeklyParshaCheck());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideInfoPanel();
            closeCommentsPanel(stopListeningForComments);
        }
        
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            if (e.key === 'ArrowLeft' && state.currentParshaIndex > 0) {
                document.getElementById('prev-parsha').click();
            } else if (e.key === 'ArrowRight' && state.currentParshaIndex < state.allParshas.length - 1) {
                document.getElementById('next-parsha').click();
            }
        }
    });

    document.addEventListener('dailyQuoteBookmarkToggle', (event) => {
        if (!event || !event.detail) {
            return;
        }
        handleDailyQuoteBookmarkToggle(event.detail);
    });

    document.addEventListener('dailyQuoteRendered', () => {
        updateDailyQuoteBookmarkButtonState();
    });
}

function setupMitzvahChallengeEventListeners() {
    const checklistInput = document.getElementById('mitzvah-challenge-checkbox');
    if (checklistInput) {
        checklistInput.addEventListener('click', handleMitzvahChecklistToggle);
        checklistInput.addEventListener('change', handleMitzvahChecklistToggle);
    }

    const chatSubmitButton = document.getElementById('mitzvah-chat-submit');
    if (chatSubmitButton) {
        chatSubmitButton.addEventListener('click', handleMitzvahChatSubmit);
    }

    const chatInput = document.getElementById('mitzvah-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleMitzvahChatSubmit();
            }
        });
    }

    const modalClose = document.getElementById('mitzvah-modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => dismissMitzvahModal(true));
    }

    const modalOverlay = document.getElementById('mitzvah-modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => dismissMitzvahModal(false));
    }

    const modalRemind = document.getElementById('mitzvah-modal-remind');
    if (modalRemind) {
        modalRemind.addEventListener('click', () => dismissMitzvahModal(false));
    }

    const modalOpen = document.getElementById('mitzvah-modal-open');
    if (modalOpen) {
        modalOpen.addEventListener('click', () => {
            scrollToMitzvahChallenge();
            dismissMitzvahModal(true);
        });
    }
}

function normalizeParshaName(rawName) {
    if (!rawName || typeof rawName !== 'string') {
        return '';
    }
    return rawName
        .toLowerCase()
        .replace(/parashat|parshat|parasha|parshah|parsha/gi, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function findMatchingParshaByName(rawName) {
    if (!rawName || !Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return null;
    }
    const normalizedTarget = normalizeParshaName(rawName);
    if (!normalizedTarget) {
        return null;
    }

    let fallbackMatch = null;

    for (let i = 0; i < state.allParshas.length; i++) {
        const parsha = state.allParshas[i];
        if (!parsha?.name) continue;
        const normalizedCandidate = normalizeParshaName(parsha.name);
        if (!normalizedCandidate) continue;

        if (normalizedCandidate === normalizedTarget) {
            return { parsha, index: i };
        }

        if (!fallbackMatch && (normalizedTarget.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTarget))) {
            fallbackMatch = { parsha, index: i };
        }
    }

    return fallbackMatch;
}

function startWeeklyParshaMonitor() {
    stopWeeklyParshaMonitor();
    weeklyParshaCheckIntervalId = setInterval(() => {
        runWeeklyParshaCheck();
    }, WEEKLY_PARSHA_CHECK_INTERVAL);
    runWeeklyParshaCheck();
}

function stopWeeklyParshaMonitor() {
    if (weeklyParshaCheckIntervalId) {
        clearInterval(weeklyParshaCheckIntervalId);
        weeklyParshaCheckIntervalId = null;
    }
}

function scheduleImmediateWeeklyParshaCheck(options = {}) {
    const forceAdvance = Boolean(options.forceAdvance);
    if (forceAdvance) {
        pendingWeeklyParshaForceAdvance = true;
    }
    if (isWeeklyParshaCheckRunning) {
        pendingWeeklyParshaCheck = true;
        return;
    }
    runWeeklyParshaCheck({ forceAdvance: forceAdvance || pendingWeeklyParshaForceAdvance });
}

async function runWeeklyParshaCheck(options = {}) {
    const pendingForce = pendingWeeklyParshaForceAdvance;
    pendingWeeklyParshaForceAdvance = false;
    const forceAdvance = Boolean(options.forceAdvance || pendingForce);

    if (isWeeklyParshaCheckRunning) {
        pendingWeeklyParshaCheck = true;
        pendingWeeklyParshaForceAdvance = pendingWeeklyParshaForceAdvance || forceAdvance;
        return;
    }
    isWeeklyParshaCheckRunning = true;
    try {
        await checkAndApplyWeeklyParsha({ forceAdvance });
    } catch (error) {
        console.warn('Unable to refresh weekly parsha from calendar:', error);
    } finally {
        isWeeklyParshaCheckRunning = false;
        if (pendingWeeklyParshaCheck) {
            const shouldForce = pendingWeeklyParshaForceAdvance;
            pendingWeeklyParshaCheck = false;
            pendingWeeklyParshaForceAdvance = false;
            runWeeklyParshaCheck({ forceAdvance: shouldForce });
        }
    }
}

async function checkAndApplyWeeklyParsha({ forceAdvance = false } = {}) {
    if (!Array.isArray(state.allParshas) || state.allParshas.length === 0) {
        return;
    }

    const storedWeekStart = state.weeklyParshaWeekStart ? new Date(state.weeklyParshaWeekStart) : null;
    const hasStoredWeekStart = storedWeekStart instanceof Date && !Number.isNaN(storedWeekStart.getTime());
    const expectedNextWeekStart = hasStoredWeekStart ? addDays(storedWeekStart, 7) : null;
    const hasWeekExpired = expectedNextWeekStart ? Date.now() >= expectedNextWeekStart.getTime() : false;

    const prevWeeklyRef = state.weeklyParshaRef;

    let latestParshaName = null;
    try {
        latestParshaName = await fetchCurrentParsha();
    } catch (error) {
        latestParshaName = null;
    }

    let match = null;
    if (latestParshaName) {
        match = findMatchingParshaByName(latestParshaName);
        if (!match) {
            console.warn('Calendar parsha not found in local list:', latestParshaName);
        }
    }

    if (match && (forceAdvance || hasWeekExpired) && prevWeeklyRef && match.parsha.reference === prevWeeklyRef) {
        const nextMatch = getNextWeeklyParshaInfo();
        if (nextMatch) {
            match = nextMatch;
        }
    }

    if (!match && (forceAdvance || hasWeekExpired)) {
        match = getNextWeeklyParshaInfo();
    }

    if (!match) {
        return;
    }

    const alreadyCurrent = prevWeeklyRef === match.parsha.reference && state.weeklyParshaIndex === match.index;
    if (alreadyCurrent && !hasWeekExpired && !forceAdvance) {
        return;
    }

    const wasViewingWeekly = Boolean(prevWeeklyRef && state.currentParshaRef === prevWeeklyRef);

    let newWeekStart = null;
    const shouldUpdateWeekStart = !alreadyCurrent || !state.weeklyParshaWeekStart;
    if (shouldUpdateWeekStart) {
        if ((forceAdvance || hasWeekExpired) && hasStoredWeekStart) {
            newWeekStart = addDays(storedWeekStart, 7);
        } else {
            newWeekStart = getWeekStartForDate();
        }
    }

    setState({
        weeklyParshaRef: match.parsha.reference,
        weeklyParshaIndex: match.index,
        ...(newWeekStart ? { weeklyParshaWeekStart: newWeekStart.toISOString() } : {})
    });

    if (wasViewingWeekly || !state.currentParshaRef) {
        await goToParshaAfterWeeklyChange(match.parsha.reference, match.index);
    } else {
        const activeParshaName = state.allParshas[state.currentParshaIndex]?.name || null;
        if (activeParshaName) {
            updateMitzvahChallengeForParsha(activeParshaName);
        }
    }
}

async function goToParshaAfterWeeklyChange(reference, index) {
    if (!reference) {
        return;
    }

    const resolvedIndex = (typeof index === 'number' && index >= 0)
        ? index
        : state.allParshas.findIndex(p => p.reference === reference);

    if (resolvedIndex < 0) {
        return;
    }

    setState({
        currentParshaIndex: resolvedIndex,
        currentParshaRef: reference
    });

    document.querySelectorAll('select#parsha-selector').forEach((selector) => {
        selector.value = reference;
    });

    await loadParsha(reference);
    updateNavigationButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getMitzvahChallengeId(parshaName) {
    if (!parshaName || typeof parshaName !== 'string') {
        return null;
    }
    return `mitzvah-${parshaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getMitzvahChallengeByParsha(parshaName) {
    if (!parshaName || !state.mitzvahChallenges || !Array.isArray(state.mitzvahChallenges)) {
        return null;
    }
    return state.mitzvahChallenges.find((challenge) => {
        return challenge?.parsha && challenge.parsha.toLowerCase() === parshaName.toLowerCase();
    }) || null;
}

function updateMitzvahChallengeForParsha(parshaName) {
    if (!parshaName) {
        teardownMitzvahChallenge();
        setState({
            currentMitzvahChallenge: null,
            currentMitzvahChallengeId: null
        });
        return;
    }
    renderMitzvahChallengeSection(parshaName);
}

function startMitzvahReflectionsListener(challengeId) {
    stopListeningForMitzvahReflections();
    mitzvahChatMessages = [];
    renderMitzvahChatMessages([]);

    if (!challengeId) {
        return;
    }

    listenForMitzvahReflections(challengeId, (reflections) => {
        mitzvahChatMessages = Array.isArray(reflections) ? reflections : [];
        renderMitzvahChatMessages(mitzvahChatMessages);
        // Re-render leaderboard so tie-breaking by earliest reflection applies
        if (Array.isArray(state.mitzvahLeaderboard) && state.mitzvahLeaderboard.length > 0) {
            renderMitzvahLeaderboard(state.mitzvahLeaderboard);
        }
    });
}

async function renderMitzvahChallengeSection(parshaName, providedChallenge = null) {
    const section = document.getElementById('mitzvah-challenge-section');
    const lockedContainer = document.getElementById('mitzvah-challenge-locked');
    const lockedHeading = document.getElementById('mitzvah-locked-heading');
    const lockedMessage = document.getElementById('mitzvah-locked-message');
    if (!section) {
        return;
    }

    const challenge = providedChallenge || getMitzvahChallengeByParsha(parshaName);

    if (!challenge) {
        teardownMitzvahChallenge();
        if (lockedContainer) {
            lockedContainer.classList.add('hidden');
        }
        return;
    }

    if (lockedContainer) {
        lockedContainer.classList.add('hidden');
    }

    const parshaIndex = state.allParshas.findIndex((parsha) => parsha.name === parshaName);
    const weeklyIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : ((typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0)
            ? state.currentParshaIndex
            : parshaIndex);

    let challengeMode = 'current';
    if (weeklyIndex != null && weeklyIndex >= 0 && parshaIndex >= 0) {
        if (parshaIndex > weeklyIndex) {
            challengeMode = 'future';
        } else if (parshaIndex < weeklyIndex) {
            challengeMode = 'past';
        }
    }

    if (challengeMode === 'future') {
        teardownMitzvahChallenge();
        currentMitzvahChallengeMode = 'future';
        if (lockedContainer) {
            if (lockedHeading) {
                lockedHeading.textContent = `${parshaName} Challenge Unlocks Soon`;
            }
            if (lockedMessage) {
                lockedMessage.textContent = 'Return during this parsha’s week to read the mitzvah challenge and share reflections.';
            }
            lockedContainer.classList.remove('hidden');
        }
        return;
    }

    const challengeId = getMitzvahChallengeId(parshaName);
    currentMitzvahChallengeId = challengeId;
    currentMitzvahCompletion = false;
    currentMitzvahChallengeMode = challengeMode;

    const titleEl = document.getElementById('mitzvah-challenge-heading');
    const mitzvahEl = document.getElementById('mitzvah-challenge-mitzvah');
    const explanationEl = document.getElementById('mitzvah-challenge-explanation');
    const connectionEl = document.getElementById('mitzvah-challenge-connection');
    const actionEl = document.getElementById('mitzvah-challenge-action');
    const countdownEl = document.getElementById('mitzvah-countdown');
    const chatStatusEl = document.getElementById('mitzvah-chat-status');

    if (chatStatusEl) {
        chatStatusEl.textContent = '';
        chatStatusEl.classList.remove('mitzvah-chat-status--success');
    }

    if (countdownEl) {
        countdownEl.textContent = '';
        countdownEl.classList.remove('is-closed');
    }

    if (titleEl) {
        titleEl.textContent = `Weekly Mitzvah Challenge — ${parshaName}`;
    }
    if (mitzvahEl) {
        mitzvahEl.innerHTML = buildMitzvahLabel(challenge);
    }
    if (explanationEl) {
        explanationEl.innerHTML = formatText(challenge.explanation || '');
    }
    if (connectionEl) {
        connectionEl.innerHTML = formatText(challenge.connection || '');
    }
    if (actionEl) {
        actionEl.innerHTML = formatText(challenge.challenge || '');
    }

    const weekWindow = getWeekWindowForParsha(parshaIndex);
    const weekStart = weekWindow.weekStart;
    const deadline = weekWindow.deadline;

    setState({
        currentMitzvahChallenge: { ...challenge, parsha: parshaName },
        currentMitzvahChallengeId: challengeId,
        currentMitzvahWeekStart: weekStart ? weekStart.toISOString() : null,
        currentMitzvahDeadline: deadline ? deadline.toISOString() : null
    });

    mitzvahModalWasShown = false;

    section.classList.remove('hidden');

    const card = section.querySelector('.mitzvah-card');
    if (card) {
        card.classList.toggle('mitzvah-card--closed', challengeMode !== 'current');
    }

    clearMitzvahCountdown();
    startMitzvahCountdown(deadline);

    startMitzvahReflectionsListener(challengeId);

    await refreshMitzvahCompletionStatus(challengeId);
    updateMitzvahAuthState();
    refreshMitzvahLeaderboardDisplay();

    if (challengeMode === 'current') {
        populateMitzvahModalContent(challenge, parshaName);
        maybeShowMitzvahModal();
    } else {
        hideMitzvahModal(false);
    }
}

function buildMitzvahLabel(challenge) {
    if (!challenge || typeof challenge !== 'object') {
        return '';
    }
    const heb = challenge.mitzvahHebrew;
    const translit = challenge.mitzvahTransliteration;
    const english = challenge.mitzvahEnglish;
    const legacy = challenge.mitzvah;

    if (heb || translit || english) {
        const hebrewLine = heb
            ? `<span class=\"mitzvah-label__he\" dir=\"rtl\" lang=\"he\">${escapeHtml(heb)}</span>`
            : '';
        const subParts = [];
        if (translit) {
            subParts.push(`<span class=\"mitzvah-label__translit\">${escapeHtml(translit)}</span>`);
        }
        if (english) {
            subParts.push(`<span class=\"mitzvah-label__eng\">${escapeHtml(english)}</span>`);
        }
        const subLine = subParts.length
            ? `<span class=\"mitzvah-label__sub\">${subParts.join('<span class=\"mitzvah-label__divider\">•</span>')}</span>`
            : '';
        return `<span class=\"mitzvah-label\">${hebrewLine}${subLine}</span>`;
    }
    return escapeHtml(legacy || '');
}

function teardownMitzvahChallenge() {
    const section = document.getElementById('mitzvah-challenge-section');
    if (section) {
        section.classList.add('hidden');
    }
    stopListeningForMitzvahReflections();
    currentMitzvahChallengeId = null;
    currentMitzvahCompletion = false;
    mitzvahChatMessages = [];
    clearMitzvahCountdown();
    mitzvahModalWasShown = false;
    currentMitzvahChallengeMode = 'none';

    const chatContainer = document.getElementById('mitzvah-chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = '<p class="mitzvah-chat-empty">Weekly mitzvah reflections will appear here.</p>';
    }

    const chatStatus = document.getElementById('mitzvah-chat-status');
    if (chatStatus) {
        chatStatus.textContent = '';
        chatStatus.classList.remove('mitzvah-chat-status--success');
    }

    const checklistHelper = document.getElementById('mitzvah-checklist-helper');
    if (checklistHelper) {
        checklistHelper.textContent = '';
        checklistHelper.dataset.state = '';
    }

    const countdownEl = document.getElementById('mitzvah-countdown');
    if (countdownEl) {
        countdownEl.textContent = '';
        countdownEl.classList.remove('is-closed');
    }

    const modalCountdownEl = document.getElementById('mitzvah-modal-countdown');
    if (modalCountdownEl) {
        modalCountdownEl.textContent = '';
    }

    const leaderboardList = document.getElementById('mitzvah-leaderboard-list');
    if (leaderboardList) {
        leaderboardList.innerHTML = '<p class="mitzvah-leaderboard__empty">Complete mitzvah challenges to appear on the leaderboard.</p>';
    }

    hideMitzvahModal(false);

    const lockedContainer = document.getElementById('mitzvah-challenge-locked');
    if (lockedContainer) {
        lockedContainer.classList.add('hidden');
    }

    const card = section ? section.querySelector('.mitzvah-card') : null;
    if (card) {
        card.classList.remove('mitzvah-card--closed');
    }

    setState({
        currentMitzvahChallenge: null,
        currentMitzvahChallengeId: null,
        currentMitzvahWeekStart: null,
        currentMitzvahDeadline: null,
        mitzvahLeaderboard: []
    });
}

function updateMitzvahAuthState() {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const chatInput = document.getElementById('mitzvah-chat-input');
    const chatSubmit = document.getElementById('mitzvah-chat-submit');
    const authMessage = document.getElementById('mitzvah-chat-auth');
    const chatStatus = document.getElementById('mitzvah-chat-status');
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (checkbox) {
        checkbox.disabled = true;
        checkbox.checked = Boolean(userId && currentMitzvahCompletion);
    }

    if (chatInput && chatSubmit) {
        if (!windowOpen) {
            chatInput.value = '';
            chatInput.placeholder = 'Reflection sharing for this mitzvah is closed.';
            chatInput.disabled = true;
            chatSubmit.disabled = true;
        } else if (!userId) {
            chatInput.value = '';
            chatInput.placeholder = 'Sign in to share how your mitzvah went.';
            chatInput.disabled = true;
            chatSubmit.disabled = true;
        } else {
            chatInput.disabled = false;
            chatSubmit.disabled = false;
            chatInput.placeholder = 'How did the mitzvah go for you this week?';
        }
    }

    if (authMessage) {
        if (!userId && windowOpen) {
            authMessage.classList.remove('hidden');
        } else {
            authMessage.classList.add('hidden');
        }
    }

    if (chatStatus && !isSubmittingMitzvahReflection) {
        if (!windowOpen) {
            chatStatus.textContent = 'The reflection window for this mitzvah has closed.';
            chatStatus.classList.remove('mitzvah-chat-status--success');
        } else if (!userId) {
            chatStatus.textContent = '';
            chatStatus.classList.remove('mitzvah-chat-status--success');
        }
    }

    updateMitzvahChecklistUI();
}

function updateMitzvahChecklistUI(statusMessage = null) {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const helper = document.getElementById('mitzvah-checklist-helper');
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (!checkbox || !helper) {
        return;
    }

    checkbox.disabled = true;
    checkbox.checked = Boolean(userId && currentMitzvahCompletion);

    if (!windowOpen) {
        helper.textContent = 'This challenge window has closed. Join us for next week\'s mitzvah!';
        helper.dataset.state = 'status';
        return;
    }

    if (!userId) {
        checkbox.checked = false;
        helper.textContent = 'Sign in to track your challenge progress.';
        helper.dataset.state = '';
        return;
    }

    if (statusMessage) {
        helper.textContent = statusMessage;
        helper.dataset.state = 'status';
    } else if (currentMitzvahCompletion) {
        helper.textContent = 'Completed! Feel free to revisit or share how it went.';
        helper.dataset.state = 'success';
    } else {
        helper.textContent = 'Share your reflection below to mark this challenge complete.';
        helper.dataset.state = 'status';
    }
}

async function refreshMitzvahCompletionStatus(challengeId) {
    const checkbox = document.getElementById('mitzvah-challenge-checkbox');
    const helper = document.getElementById('mitzvah-checklist-helper');

    currentMitzvahCompletion = false;

    if (!challengeId || !checkbox || !helper) {
        updateMitzvahChecklistUI();
        return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
        updateMitzvahAuthState();
        return;
    }

    checkbox.dataset.loading = 'true';
    checkbox.disabled = true;
    helper.textContent = 'Checking your progress...';
    helper.dataset.state = '';

    let hadError = false;
    try {
        const status = await getMitzvahCompletionStatus(userId, challengeId);
        currentMitzvahCompletion = Boolean(status.completed);
        console.log('[Mitzvah Completion] Status loaded:', {
            userId,
            challengeId,
            completed: status.completed,
            currentMitzvahCompletion
        });
    } catch (error) {
        console.error('Unable to load mitzvah completion status:', error);
        helper.textContent = 'Unable to load your progress right now.';
        helper.dataset.state = 'error';
        hadError = true;
    } finally {
        checkbox.dataset.loading = 'false';
        if (hadError) {
            checkbox.disabled = true;
        } else {
            updateMitzvahAuthState();
        }
    }
}

async function handleMitzvahChecklistToggle(event) {
    event.preventDefault();
    const checkbox = event.target;
    const helper = document.getElementById('mitzvah-checklist-helper');

    if (!checkbox) {
        return;
    }

    checkbox.checked = Boolean(currentMitzvahCompletion && getCurrentUserId());

    // Show red error if user tries to check without sharing reflection
    if (!currentMitzvahCompletion && getCurrentUserId()) {
        helper.textContent = 'You must first share the reflection to mark as complete';
        helper.dataset.state = 'error';
        // Clear the error after 3 seconds
        setTimeout(() => {
            updateMitzvahChecklistUI();
        }, 3000);
    } else {
        updateMitzvahChecklistUI(currentMitzvahCompletion
            ? 'You\'ve already marked this challenge complete by sharing a reflection.'
            : 'Share your reflection below to mark this challenge complete.');
    }
}

function sanitizeReflectionUsername(value) {
    if (typeof value !== 'string') {
        return '';
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('@') || trimmed.toLowerCase() === 'friend') {
        return '';
    }
    return trimmed;
}

function candidateMatchesReflectionUser(candidate, userId) {
    if (!candidate || !userId) {
        return false;
    }
    if (candidate.userId && candidate.userId === userId) {
        return true;
    }
    if (candidate.canonicalUserId && candidate.canonicalUserId === userId) {
        return true;
    }
    if (Array.isArray(candidate.authUserIds) && candidate.authUserIds.includes(userId)) {
        return true;
    }
    return false;
}

function deriveDisplayNameFromCandidate(candidate) {
    const candidateUsername = sanitizeReflectionUsername(candidate?.username);
    if (candidateUsername) {
        return candidateUsername;
    }

    const emailCandidates = [];
    if (typeof candidate?.email === 'string') {
        emailCandidates.push(candidate.email);
    }
    if (Array.isArray(candidate?.emails)) {
        candidate.emails.forEach((value) => {
            if (typeof value === 'string') {
                emailCandidates.push(value);
            }
        });
    }

    for (const email of emailCandidates) {
        const trimmed = email && typeof email === 'string' ? email.trim() : '';
        if (!trimmed) {
            continue;
        }
        const displayName = getDisplayNameFromEmail(trimmed);
        if (displayName && displayName !== 'Anonymous' && displayName !== 'Friend') {
            return displayName;
        }
    }

    return '';
}

function findDisplayNameForReflectionUserId(userId) {
    if (!userId) {
        return '';
    }

    if (currentUserProfile && candidateMatchesReflectionUser(currentUserProfile, userId)) {
        const name = deriveDisplayNameFromCandidate(currentUserProfile);
        if (name) {
            return name;
        }
    }

    const presenceSources = [trackedOnlineFriends, trackedRecentFriendLogins];
    for (const list of presenceSources) {
        if (!Array.isArray(list)) {
            continue;
        }
        for (const candidate of list) {
            if (candidateMatchesReflectionUser(candidate, userId)) {
                const name = deriveDisplayNameFromCandidate(candidate);
                if (name) {
                    return name;
                }
            }
        }
    }

    return '';
}

function getMitzvahReflectionDisplayName(message) {
    if (!message || typeof message !== 'object') {
        return 'Friend';
    }

    const initialName = sanitizeReflectionUsername(message.username);
    if (initialName) {
        return initialName;
    }

    const userId = typeof message.userId === 'string' ? message.userId : '';
    if (userId) {
        const lookupName = findDisplayNameForReflectionUserId(userId);
        if (lookupName) {
            return lookupName;
        }
    }

    return 'Friend';
}

function renderMitzvahChatMessages(messages = []) {
    const messagesContainer = document.getElementById('mitzvah-chat-messages');
    if (!messagesContainer) {
        return;
    }

    messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
        const emptyMessage = currentMitzvahChallengeMode === 'past'
            ? 'No reflections were shared during this mitzvah week.'
            : 'Share how the mitzvah went this week.';
        messagesContainer.innerHTML = `<p class="mitzvah-chat-empty">${emptyMessage}</p>`;
        return;
    }

    const currentUserId = getCurrentUserId();
    messages.forEach((message) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('mitzvah-chat-message');
        if (message.userId && currentUserId && message.userId === currentUserId) {
            wrapper.classList.add('mitzvah-chat-message--self');
        }

        const meta = document.createElement('div');
        meta.classList.add('mitzvah-chat-message__meta');

        const author = document.createElement('span');
        author.classList.add('mitzvah-chat-message__author');
        author.textContent = getMitzvahReflectionDisplayName(message);

        const time = document.createElement('span');
        time.classList.add('mitzvah-chat-message__time');
        time.textContent = formatTimeAgo(message.createdAt || message.updatedAt);

        meta.appendChild(author);
        meta.appendChild(time);

        const body = document.createElement('div');
        body.classList.add('mitzvah-chat-message__body');
        body.innerHTML = convertMitzvahMessageText(message.message || '');

        wrapper.appendChild(meta);
        wrapper.appendChild(body);

        // Add reaction buttons for each reflection
        const reactionsSection = document.createElement('div');
        reactionsSection.classList.add('mitzvah-message-reactions');

        const reactions = message.reactions || {};
        const emphasizes = reactions.emphasize || [];
        const hearts = reactions.heart || [];

        // Emphasize reaction button (matching verse reaction style)
        const emphasizeBtn = document.createElement('button');
        emphasizeBtn.className = 'reaction-btn emphasize-btn';
        if (currentUserId && emphasizes.includes(currentUserId)) {
            emphasizeBtn.classList.add('active');
        }
        emphasizeBtn.setAttribute('aria-label', 'Emphasize this reflection');
        emphasizeBtn.innerHTML = `
            <span class="reaction-icon emphasize-icon"></span>
            <span class="reaction-count">${emphasizes.length > 0 ? emphasizes.length : ''}</span>
        `;
        emphasizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUserId && message.id) {
                handleMitzvahReflectionReaction(message.id, 'emphasize', currentUserId);
            }
        });

        // Heart reaction button (matching verse reaction style)
        const heartBtn = document.createElement('button');
        heartBtn.className = 'reaction-btn heart-btn';
        if (currentUserId && hearts.includes(currentUserId)) {
            heartBtn.classList.add('active');
        }
        heartBtn.setAttribute('aria-label', 'Heart this reflection');
        heartBtn.innerHTML = `
            <span class="reaction-icon heart-icon"></span>
            <span class="reaction-count">${hearts.length > 0 ? hearts.length : ''}</span>
        `;
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUserId && message.id) {
                handleMitzvahReflectionReaction(message.id, 'heart', currentUserId);
            }
        });

        reactionsSection.appendChild(emphasizeBtn);
        reactionsSection.appendChild(heartBtn);
        wrapper.appendChild(reactionsSection);

        messagesContainer.appendChild(wrapper);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function convertMitzvahMessageText(text) {
    if (!text) {
        return '';
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function calculateMitzvahWeekWindow(referenceDate = new Date()) {
    const weekStart = getWeekStartForDate(referenceDate);
    const deadline = addDays(weekStart, 7);
    return { weekStart, deadline };
}

function getWeekWindowForParsha(parshaIndex) {
    const baseWindow = getStoredWeeklyWeekWindow();
    const weekStart = new Date(baseWindow.weekStart);
    const deadline = new Date(baseWindow.deadline);
    const weeklyIndex = (typeof state.weeklyParshaIndex === 'number' && state.weeklyParshaIndex >= 0)
        ? state.weeklyParshaIndex
        : ((typeof state.currentParshaIndex === 'number' && state.currentParshaIndex >= 0)
            ? state.currentParshaIndex
            : parshaIndex);

    if (weeklyIndex == null || weeklyIndex < 0 || parshaIndex == null || parshaIndex < 0) {
        return { weekStart, deadline };
    }

    const diff = weeklyIndex - parshaIndex;
    if (diff !== 0) {
        weekStart.setDate(weekStart.getDate() - diff * 7);
        deadline.setDate(deadline.getDate() - diff * 7);
    }

    return { weekStart, deadline };
}

function isMitzvahWindowOpen() {
    const deadline = state.currentMitzvahDeadline;
    if (!deadline) {
        return true;
    }
    return Date.now() < new Date(deadline).getTime();
}

function startMitzvahCountdown(deadline) {
    clearMitzvahCountdown();
    if (!deadline) {
        updateCountdownDisplays('', false, null);
        return;
    }

    const target = new Date(deadline);

    const update = () => {
        const now = Date.now();
        const diff = target.getTime() - now;
        if (diff <= 0) {
            updateCountdownDisplays('', true, target);
            handleMitzvahWindowClosed();
            clearMitzvahCountdown();
            return;
        }

        updateCountdownDisplays(`Time remaining: ${formatCountdown(diff)}`, false, target);
    };

    update();
    mitzvahCountdownIntervalId = setInterval(update, 1000);
}

function clearMitzvahCountdown() {
    if (mitzvahCountdownIntervalId) {
        clearInterval(mitzvahCountdownIntervalId);
        mitzvahCountdownIntervalId = null;
    }
}

function updateCountdownDisplays(text, isClosed, deadlineDate) {
    const countdownEl = document.getElementById('mitzvah-countdown');
    const displayText = isClosed
        ? (deadlineDate ? `Challenge window closed on ${formatDeadlineDisplay(deadlineDate)}` : 'Challenge window closed')
        : text;
    if (countdownEl) {
        countdownEl.textContent = displayText || '';
        countdownEl.classList.toggle('is-closed', Boolean(displayText && isClosed));
    }

    const modalCountdownEl = document.getElementById('mitzvah-modal-countdown');
    if (modalCountdownEl) {
        if (isClosed) {
            modalCountdownEl.textContent = deadlineDate ? `Closed ${formatDeadlineDisplayShort(deadlineDate)}` : 'Closed';
        } else {
            modalCountdownEl.textContent = text ? text.replace('Time remaining: ', '') : '';
        }
    }
}

function formatCountdown(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const segments = [];
    if (days > 0) {
        segments.push(`${days}d`);
    }
    if (hours > 0 || days > 0) {
        segments.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        segments.push(`${minutes}m`);
    }
    segments.push(`${seconds}s`);

    return segments.join(' ');
}

function formatDeadlineDisplay(date) {
    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatDeadlineDisplayShort(date) {
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function handleMitzvahWindowClosed() {
    if (currentMitzvahChallengeMode === 'current') {
        hideMitzvahModal(true);
        scheduleImmediateWeeklyParshaCheck({ forceAdvance: true });
    }
    updateMitzvahAuthState();
}

function maybeShowMitzvahModal(force = false) {
    const modal = document.getElementById('mitzvah-modal');
    const challenge = state.currentMitzvahChallenge;
    const challengeId = currentMitzvahChallengeId;
    const windowOpen = isMitzvahWindowOpen();
    const userId = getCurrentUserId();

    if (currentMitzvahChallengeMode !== 'current') {
        return;
    }

    if (!modal || !challenge || !challengeId || !windowOpen || !userId) {
        return;
    }

    if (!force) {
        if (mitzvahModalWasShown) {
            return;
        }
        const dismissedKey = localStorage.getItem(`${MITZVAH_MODAL_DISMISS_KEY_PREFIX}${challengeId}`);
        if (dismissedKey) {
            return;
        }
    }

    populateMitzvahModalContent(challenge, challenge.parsha || state.allParshas[state.currentParshaIndex]?.name || 'This Week');
    showMitzvahModal();
}

function showMitzvahModal() {
    const modal = document.getElementById('mitzvah-modal');
    if (!modal) {
        return;
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    mitzvahModalWasShown = true;
    // Prevent background scroll while modal is open
    try {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
    } catch (e) {
        // noop
    }
}

function hideMitzvahModal(persist = false) {
    const modal = document.getElementById('mitzvah-modal');
    if (!modal) {
        return;
    }
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (persist && currentMitzvahChallengeId) {
        localStorage.setItem(`${MITZVAH_MODAL_DISMISS_KEY_PREFIX}${currentMitzvahChallengeId}`, '1');
    }

    mitzvahModalWasShown = persist;

    // Restore background scroll
    try {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
    } catch (e) {
        // noop
    }
}

function dismissMitzvahModal(persist) {
    hideMitzvahModal(persist);
}

function populateMitzvahModalContent(challenge, parshaName) {
    const titleEl = document.getElementById('mitzvah-modal-title');
    const mitzvahEl = document.getElementById('mitzvah-modal-mitzvah');
    const summaryEl = document.getElementById('mitzvah-modal-summary');

    if (titleEl) {
        titleEl.textContent = `${parshaName || 'This Week'} — Weekly Challenge`;
    }
    if (mitzvahEl) {
        mitzvahEl.innerHTML = buildMitzvahLabel(challenge || {});
    }
    if (summaryEl) {
        const pieces = [];
        if (challenge?.explanation) {
            pieces.push(`<div class="mitzvah-modal__paragraph">${formatText(challenge.explanation)}</div>`);
        }
        if (challenge?.connection) {
            pieces.push(`<div class="mitzvah-modal__paragraph">${formatText(challenge.connection)}</div>`);
        }
        if (challenge?.challenge) {
            pieces.push(`<div class="mitzvah-modal__paragraph mitzvah-modal__callout">${formatText(challenge.challenge)}</div>`);
        }
        summaryEl.innerHTML = pieces.join('');
    }
}

function scrollToMitzvahChallenge() {
    const section = document.getElementById('mitzvah-challenge-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resolveCanonicalLeaderboardUserId(userId) {
    if (!userId) {
        return null;
    }

    if (currentUserProfile && typeof currentUserProfile.canonicalUserId === 'string' && currentUserProfile.canonicalUserId.trim()) {
        return currentUserProfile.canonicalUserId.trim();
    }

    return userId;
}

function resolveLeaderboardUsernameForDisplay(preferredUsername) {
    const preferred = sanitizeReflectionUsername(preferredUsername);
    if (preferred) {
        return preferred;
    }

    const profileName = sanitizeReflectionUsername(currentUserProfile && currentUserProfile.username);
    if (profileName) {
        return profileName;
    }

    const savedName = sanitizeReflectionUsername(getSavedUsername());
    if (savedName) {
        return savedName;
    }

    const profileEmail = (currentUserProfile && typeof currentUserProfile.email === 'string' && currentUserProfile.email.trim())
        ? currentUserProfile.email
        : (currentUserProfile && Array.isArray(currentUserProfile.emails)
            ? currentUserProfile.emails.find((value) => typeof value === 'string' && value.trim())
            : null);

    if (profileEmail) {
        return getDisplayNameFromEmail(profileEmail);
    }

    return 'Friend';
}

function applyLocalMitzvahLeaderboardIncrement(userId, username, delta = 1) {
    const canonicalUserId = resolveCanonicalLeaderboardUserId(userId);
    const deltaNumber = Number(delta);

    if (!canonicalUserId || !Number.isFinite(deltaNumber) || deltaNumber === 0) {
        return;
    }

    const leaderboard = Array.isArray(state.mitzvahLeaderboard)
        ? [...state.mitzvahLeaderboard]
        : [];
    const existingIndex = leaderboard.findIndex((entry) => entry && entry.userId === canonicalUserId);
    const existingEntry = existingIndex >= 0 ? leaderboard[existingIndex] : null;
    const baseTotal = (existingEntry && typeof existingEntry.totalCompleted === 'number')
        ? existingEntry.totalCompleted
        : 0;
    const newTotal = Math.max(0, baseTotal + deltaNumber);
    const resolvedUsername = resolveLeaderboardUsernameForDisplay(username)
        || (existingEntry ? existingEntry.username : null)
        || 'Friend';

    const nextEntry = {
        ...(existingEntry || {}),
        userId: canonicalUserId,
        username: resolvedUsername,
        totalCompleted: newTotal
    };

    if (existingIndex >= 0) {
        leaderboard[existingIndex] = nextEntry;
    } else {
        leaderboard.push(nextEntry);
    }

    setState({ mitzvahLeaderboard: leaderboard });
    renderMitzvahLeaderboard(leaderboard);
}

function mergeLeaderboardWithLocalState(fetched = []) {
    const serverList = Array.isArray(fetched) ? fetched : [];
    const localList = Array.isArray(state.mitzvahLeaderboard) ? state.mitzvahLeaderboard : [];

    const byUser = new Map();

    const upsert = (entry, isLocal = false) => {
        if (!entry || !entry.userId) {
            return;
        }
        const existing = byUser.get(entry.userId) || {};
        const existingTotal = typeof existing.totalCompleted === 'number' ? existing.totalCompleted : 0;
        const newTotal = typeof entry.totalCompleted === 'number' ? entry.totalCompleted : 0;
        const mergedTotal = Math.max(existingTotal, newTotal);

        const merged = {
            ...existing,
            ...(isLocal ? {} : entry),
            ...(isLocal ? entry : {})
        };
        merged.totalCompleted = mergedTotal;
        merged.userId = entry.userId;
        merged.username = entry.username || existing.username || 'Friend';

        byUser.set(entry.userId, merged);
    };

    serverList.forEach((entry) => upsert(entry, false));
    localList.forEach((entry) => upsert(entry, true));

    return Array.from(byUser.values());
}

function renderMitzvahLeaderboard(leaderboard = []) {
    const listEl = document.getElementById('mitzvah-leaderboard-list');
    if (!listEl) {
        return;
    }

    if (!leaderboard || leaderboard.length === 0) {
        const emptyText = currentMitzvahChallengeMode === 'past'
            ? 'No completions were recorded during this mitzvah week.'
            : 'Be the first to complete this week’s mitzvah!';
        listEl.innerHTML = `<p class="mitzvah-leaderboard__empty">${emptyText}</p>`;
        return;
    }

    const currentUserId = getCurrentUserId();
    const currentCanonicalUserId = (currentUserProfile && currentUserProfile.userId) || null;
    listEl.innerHTML = '';

    // For tie-breaking: earliest reflection in the current challenge wins
    const earliestReflectionByUser = {};
    if (Array.isArray(mitzvahChatMessages) && mitzvahChatMessages.length > 0) {
        mitzvahChatMessages.forEach((msg) => {
            const uid = msg && msg.userId;
            const ts = msg && msg.createdAt;
            const t = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (ts ? new Date(ts).getTime() : NaN);
            if (uid && Number.isFinite(t)) {
                if (!(uid in earliestReflectionByUser)) {
                    earliestReflectionByUser[uid] = t;
                } else if (t < earliestReflectionByUser[uid]) {
                    earliestReflectionByUser[uid] = t;
                }
            }
        });
    }

    // Sort by total desc, then earliest reflection asc, then username for stability
    const sorted = [...leaderboard].sort((a, b) => {
        const aScore = Number(a?.totalCompleted) || 0;
        const bScore = Number(b?.totalCompleted) || 0;
        if (bScore !== aScore) return bScore - aScore;

        const aTie = earliestReflectionByUser[a?.userId] ?? (a?.firstCompletedAt?.toMillis ? a.firstCompletedAt.toMillis() : (a?.firstCompletedAt ? new Date(a.firstCompletedAt).getTime() : Number.POSITIVE_INFINITY));
        const bTie = earliestReflectionByUser[b?.userId] ?? (b?.firstCompletedAt?.toMillis ? b.firstCompletedAt.toMillis() : (b?.firstCompletedAt ? new Date(b.firstCompletedAt).getTime() : Number.POSITIVE_INFINITY));
        if (aTie !== bTie) return aTie - bTie;

        const an = (a?.username || '').toLowerCase();
        const bn = (b?.username || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return (a?.userId || '').localeCompare(b?.userId || '');
    });

    sorted.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'mitzvah-leaderboard__item';
        if (entry.userId && ((currentUserId && entry.userId === currentUserId) || (currentCanonicalUserId && entry.userId === currentCanonicalUserId))) {
            item.classList.add('is-self');
        }

        const rank = document.createElement('span');
        rank.className = 'mitzvah-leaderboard__rank';
        const displayRank = index + 1;
        rank.textContent = `#${displayRank}`;

        // Create a flex container for name and badge to keep them together
        const nameContainer = document.createElement('div');
        nameContainer.className = 'mitzvah-leaderboard__name-container';

        const name = document.createElement('span');
        name.className = 'mitzvah-leaderboard__name';
        name.textContent = entry.username || 'Friend';
        nameContainer.appendChild(name);

        const count = document.createElement('span');
        count.className = 'mitzvah-leaderboard__count';
        count.textContent = `${entry.totalCompleted}`;

        item.appendChild(rank);
        item.appendChild(nameContainer);
        item.appendChild(count);

        listEl.appendChild(item);
    });
}

async function refreshMitzvahLeaderboardDisplay() {
    const listEl = document.getElementById('mitzvah-leaderboard-list');
    const challengeActive = Boolean(state.currentMitzvahChallengeId);
    if (!listEl || !challengeActive) {
        return;
    }

    if (isLoadingMitzvahLeaderboard) {
        return;
    }

    isLoadingMitzvahLeaderboard = true;
    listEl.innerHTML = '<p class="mitzvah-leaderboard__empty">Loading leaderboard…</p>';

    try {
        const leaderboard = await getMitzvahLeaderboard(MITZVAH_LEADERBOARD_LIMIT);
        const merged = mergeLeaderboardWithLocalState(leaderboard);
        setState({ mitzvahLeaderboard: merged });
        renderMitzvahLeaderboard(merged);
    } catch (error) {
        console.error('Unable to load mitzvah leaderboard:', error);
        listEl.innerHTML = '<p class="mitzvah-leaderboard__error">Unable to load leaderboard right now.</p>';
    } finally {
        isLoadingMitzvahLeaderboard = false;
    }
}

async function handleMitzvahChatSubmit() {
    const input = document.getElementById('mitzvah-chat-input');
    const statusEl = document.getElementById('mitzvah-chat-status');
    const submitButton = document.getElementById('mitzvah-chat-submit');

    if (!input || !statusEl) {
        return;
    }

    const challengeId = currentMitzvahChallengeId;
    const userId = getCurrentUserId();
    const windowOpen = isMitzvahWindowOpen();

    if (!challengeId) {
        statusEl.textContent = 'Select a parsha with a mitzvah challenge to share reflections.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (!windowOpen) {
        statusEl.textContent = 'The reflection window for this mitzvah has closed.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (!userId) {
        statusEl.textContent = 'Sign in to share your reflection.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    const message = input.value.trim();
    if (!message) {
        statusEl.textContent = 'Please write a reflection before sharing.';
        statusEl.classList.remove('mitzvah-chat-status--success');
        return;
    }

    if (isSubmittingMitzvahReflection) {
        return;
    }

    isSubmittingMitzvahReflection = true;
    statusEl.textContent = '';
    statusEl.classList.remove('mitzvah-chat-status--success');

    if (submitButton) {
        submitButton.disabled = true;
    }
    input.disabled = true;

    const wasCompleted = currentMitzvahCompletion;

    try {
        const username = (currentUserProfile && currentUserProfile.username && !currentUserProfile.username.includes('@'))
            ? currentUserProfile.username
            : getSavedUsername();

        const profilePrimaryEmail = (currentUserProfile && typeof currentUserProfile.email === 'string')
            ? currentUserProfile.email
            : null;
        const profileAlternateEmail = (currentUserProfile && Array.isArray(currentUserProfile.emails))
            ? currentUserProfile.emails.find((value) => typeof value === 'string' && value.trim())
            : null;
        const accountEmail = typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : null;
        const submissionEmail = profilePrimaryEmail || profileAlternateEmail || accountEmail || null;

        console.log('[Mitzvah Reflection] Submitting reflection:', {
            challengeId,
            userId,
            username,
            submissionEmail,
            wasCompleted,
            currentMitzvahCompletion
        });

        await submitMitzvahReflection(challengeId, message, userId, username, submissionEmail);
        input.value = '';

        if (!wasCompleted) {
            try {
                console.log('[Mitzvah Reflection] First completion! Updating leaderboard...', {
                    userId,
                    challengeId,
                    username,
                    submissionEmail
                });
                await setMitzvahCompletionStatus(userId, challengeId, true);
                currentMitzvahCompletion = true;
                updateMitzvahChecklistUI('Challenge marked as completed!');
                await updateMitzvahLeaderboard(userId, username, 1, submissionEmail);
                applyLocalMitzvahLeaderboardIncrement(userId, username, 1);
                console.log('[Mitzvah Reflection] Leaderboard incremented successfully');
            } catch (error) {
                console.error('Error finalizing mitzvah completion:', error);
                updateMitzvahChecklistUI('Reflection saved, but we could not update completion status. Please try again later.');
            }
        } else {
            console.log('[Mitzvah Reflection] Already completed this challenge - skipping increment', {
                challengeId,
                currentMitzvahCompletion
            });
            updateMitzvahChecklistUI();
        }

        // Ensure leaderboard total is accurate by recalculating from progress
        try {
            console.log('[Mitzvah Reflection] Recalculating leaderboard total...');
            const recalcResult = await recalculateMitzvahLeaderboard(userId, username, submissionEmail);
            console.log('[Mitzvah Reflection] Recalculation result:', recalcResult);

            // Add a small delay to ensure Firestore propagation
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('[Mitzvah Reflection] Refreshing leaderboard display...');
            await refreshMitzvahLeaderboardDisplay();
            console.log('[Mitzvah Reflection] Leaderboard display refreshed successfully');
        } catch (e) {
            console.error('Unable to recalculate leaderboard:', e);
        }

        statusEl.textContent = 'Reflection shared!';
        statusEl.classList.add('mitzvah-chat-status--success');
    } catch (error) {
        console.error('Error sharing mitzvah reflection:', error);
        statusEl.textContent = 'Could not share reflection. Please try again.';
    } finally {
        isSubmittingMitzvahReflection = false;
        if (submitButton) {
            submitButton.disabled = false;
        }
        input.disabled = false;
        input.focus();
        updateMitzvahAuthState();
        setTimeout(() => {
            if (statusEl.classList.contains('mitzvah-chat-status--success')) {
                statusEl.textContent = '';
                statusEl.classList.remove('mitzvah-chat-status--success');
            }
        }, 2500);
    }
}

async function handleMitzvahReflectionReaction(reflectionId, reactionType, userId) {
    if (!userId) {
        return;
    }

    try {
        await submitMitzvahReflectionReaction(reflectionId, reactionType, userId);
    } catch (error) {
        console.error('Error submitting reflection reaction:', error);
        // Optionally, show an error to the user
    }
}

function setupCommentPanelListeners() {
    document.getElementById('close-comment-panel').addEventListener('click', () => {
        closeCommentsPanel(stopListeningForComments);
    });
    
    document.getElementById('comment-overlay').addEventListener('click', () => {
        closeCommentsPanel(stopListeningForComments);
    });
    
    document.getElementById('submit-comment-btn').addEventListener('click', handleCommentSubmit);
    
    document.getElementById('comment-input').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaCmd) && e.key === 'Enter') {
            handleCommentSubmit();
        }
    });
}

function setupLoginListeners() {
    const loginBtn = document.getElementById('login-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const myBookmarksBtn = document.getElementById('my-bookmarks-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Password reset modal elements
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetEmail = document.getElementById('reset-email');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = loginEmail.value.trim();
            const password = loginPassword.value.trim();

            if (!email || !password) {
                showLoginError(loginError, 'Please enter email and password');
                return;
            }

            try {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Signing In...';

                await signInWithEmail(email, password);
                hideLoginModal();
                loginEmail.value = '';
                loginPassword.value = '';
                loginError.classList.add('hidden');
            } catch (error) {
                console.error('Sign-in error:', error);
                let errorMessage = 'Sign-in failed. Check your credentials.';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email. Click "Create Account" to sign up.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                }
                showLoginError(loginError, errorMessage);
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });

        // Enter key to sign in
        [loginEmail, loginPassword].forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            });
        });
    }

    // Forgot Password Button
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            // Reset the password reset form
            resetEmail.value = '';
            resetError.classList.add('hidden');
            resetSuccess.classList.add('hidden');
            resetPasswordModal.classList.remove('hidden');
        });
    }

    // Send Reset Email Button
    if (sendResetBtn) {
        sendResetBtn.addEventListener('click', async () => {
            const email = resetEmail.value.trim();

            if (!email) {
                resetError.textContent = 'Please enter your email address';
                resetError.classList.remove('hidden');
                resetSuccess.classList.add('hidden');
                return;
            }

            try {
                sendResetBtn.disabled = true;
                sendResetBtn.textContent = 'Sending...';

                const result = await sendPasswordReset(email);

                if (result.success) {
                    resetSuccess.innerHTML = 'Password reset email sent!<br><strong>Please check your spam folder</strong> if you don\'t see it in your inbox.';
                    resetSuccess.classList.remove('hidden');
                    resetError.classList.add('hidden');
                    resetEmail.value = '';
                } else {
                    resetError.textContent = result.error || 'Failed to send reset email';
                    resetError.classList.remove('hidden');
                    resetSuccess.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error sending password reset:', error);
                resetError.textContent = 'Error sending reset email. Please try again.';
                resetError.classList.remove('hidden');
                resetSuccess.classList.add('hidden');
            } finally {
                sendResetBtn.disabled = false;
                sendResetBtn.textContent = 'Send Reset Email';
            }
        });
    }

    // Back to Login Button
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            resetPasswordModal.classList.add('hidden');
            resetEmail.value = '';
            resetError.classList.add('hidden');
            resetSuccess.classList.add('hidden');
        });
    }

    // Enter key to send reset email
    if (resetEmail) {
        resetEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && sendResetBtn) {
                sendResetBtn.click();
            }
        });
    }

    if (myBookmarksBtn) {
        myBookmarksBtn.addEventListener('click', openBookmarksPanel);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOutUser();
                closeCommentsPanel(stopListeningForComments);
                hideInfoPanel();
            } catch (error) {
                console.error('Sign-out error:', error);
            }
        });
    }
}

function showLoginError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

async function handleCommentSubmit() {
    const commentInput = document.getElementById('comment-input');
    const verseRefInput = document.getElementById('current-comment-verse-ref');
    const submitButton = document.getElementById('submit-comment-btn');

    const text = commentInput.value.trim();
    const verseRef = verseRefInput.value;
    const userId = getCurrentUserId();
    const username = getSavedUsername();

    if (!userId) {
        showCommentStatus('Please wait, connecting...', true);
        return;
    }

    if (!username) {
        showCommentStatus('Please set your name first', true);
        document.getElementById('username-setup').classList.remove('hidden');
        return;
    }

    if (!text) {
        showCommentStatus('Please enter a comment', true);
        return;
    }

    if (!verseRef) {
        showCommentStatus('Error: No verse selected', true);
        return;
    }

    submitButton.disabled = true;
    commentInput.disabled = true;
    showCommentStatus('Submitting...', false);

    try {
        await submitComment(verseRef, text, userId, username);
        commentInput.value = '';
        showCommentStatus('Comment added!', false);

        await updateCommentCount(verseRef);

    } catch (error) {
        console.error('Error submitting comment:', error);
        showCommentStatus('Error submitting comment. Please try again.', true);
    } finally {
        submitButton.disabled = false;
        commentInput.disabled = false;
    }
}

async function loadCommentCounts(parshaRef) {
    if (!isAuthReady) {
        return;
    }
    
    const { bookName, startChapter, startVerse, endChapter, endVerse } = parseParshaReference(parshaRef);
    
    // Query full book range (lexicographic safe) and filter to parsha client-side
    const startRef = `${bookName} `;
    const endRef = `${bookName}~`;
    
    try {
        const commentsQuery = query(
            collection(db, 'comments'),
            where('verseRef', '>=', startRef),
            where('verseRef', '<=', endRef)
        );
        const querySnapshot = await getDocs(commentsQuery);
        const counts = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const verseRef = data.verseRef;
            
            // Additional client-side filtering to ensure verse is in our exact range
            const match = verseRef.match(/^(\w+)\s+(\d+):(\d+)$/);
            if (match) {
                const [, book, chapter, verse] = match;
                const chapterNum = parseInt(chapter);
                const verseNum = parseInt(verse);
                
                // Check if this verse is within our parsha range
                if (book === bookName) {
                    let isInRange = false;
                    
                    if (!endChapter) {
                        // Single chapter parsha
                        isInRange = chapterNum === startChapter;
                    } else {
                        // Multi-chapter parsha
                        if (chapterNum > startChapter && chapterNum < endChapter) {
                            // Middle chapters - include all verses
                            isInRange = true;
                        } else if (chapterNum === startChapter && verseNum >= startVerse) {
                            // First chapter - only verses >= startVerse
                            isInRange = true;
                        } else if (chapterNum === endChapter && verseNum <= endVerse) {
                            // Last chapter - only verses <= endVerse
                            isInRange = true;
                        }
                    }
                    
                    if (isInRange) {
                        counts[verseRef] = (counts[verseRef] || 0) + 1;
                    }
                }
            }
        });
        
        verseCommentCounts = counts;
        
        // Use requestAnimationFrame for better DOM sync
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateAllCommentBadges();
            });
        });
        
    } catch (error) {
        console.error('❌ Error loading comment counts:', error);
        console.error('❌ Error details:', error.message);
        if (error.code) {
            console.error('❌ Error code:', error.code);
        }
    }
}

async function updateCommentCount(verseRef) {
    try {
        const commentsQuery = query(
            collection(db, 'comments'),
            where('verseRef', '==', verseRef)
        );

        const querySnapshot = await getDocs(commentsQuery);
        verseCommentCounts[verseRef] = querySnapshot.size;

        const verseContainer = document.querySelector(`[data-ref="${verseRef}"]`);
        if (verseContainer) {
            updateCommentBadge(verseContainer, verseRef);
        }

    } catch (error) {
        console.error('Error updating comment count:', error);
    }
}

// ========================================
// BOOKMARK COUNTING FUNCTIONS
// ========================================

async function loadBookmarkCounts(parshaRef) {
    const { bookName } = parseParshaReference(parshaRef);

    try {
        const counts = await getBookmarkCountsForBook(bookName);

        // Remove stale counts for this book before merging
        Object.keys(verseBookmarkCounts).forEach((ref) => {
            if (ref.startsWith(`${bookName} `)) {
                delete verseBookmarkCounts[ref];
            }
        });

        Object.entries(counts).forEach(([ref, value]) => {
            verseBookmarkCounts[ref] = Math.max(0, value || 0);
        });

        applyBookmarkStateToVisibleVerses();
    } catch (error) {
        console.error('Error loading bookmark counts:', error);
    }
}

// ========================================
// REACTION FUNCTIONS
// ========================================

async function loadReactionCounts(parshaRef) {
    if (!isAuthReady) {
        return;
    }

    const { bookName } = parseParshaReference(parshaRef);

    try {
        // Load all reaction counts for this book
        verseReactionCounts = await getReactionCountsForBook(bookName);

        // Load current user's reactions
        const userId = getCurrentUserId();
        if (userId) {
            const allVerseRefs = Object.keys(verseReactionCounts);

            // Process in batches of 30 (Firestore 'in' query limit)
            for (let i = 0; i < allVerseRefs.length; i += 30) {
                const batch = allVerseRefs.slice(i, i + 30);
                const batchUserReactions = await getUserReactions(userId, batch);
                userReactions = { ...userReactions, ...batchUserReactions };
            }
        }

        // Update all verse UI with reactions
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateAllReactionUI();
            });
        });

    } catch (error) {
        console.error('Error loading reaction counts:', error);
    }
}

async function handleReactionClick(verseRef, reactionType) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please wait, connecting...');
        return;
    }

    try {
        const result = await submitReaction(verseRef, reactionType, userId);

        // Update local state
        if (!verseReactionCounts[verseRef]) {
            verseReactionCounts[verseRef] = { emphasize: 0, heart: 0 };
        }

        if (!userReactions[verseRef]) {
            userReactions[verseRef] = [];
        }

        if (result.action === 'added') {
            verseReactionCounts[verseRef][reactionType]++;
            userReactions[verseRef].push(reactionType);
        } else {
            verseReactionCounts[verseRef][reactionType] = Math.max(0, verseReactionCounts[verseRef][reactionType] - 1);
            userReactions[verseRef] = userReactions[verseRef].filter(r => r !== reactionType);
        }

        // Update UI for this verse
        const verseContainer = document.querySelector(`[data-ref="${verseRef}"]`);
        if (verseContainer) {
            updateVerseReactionUI(verseContainer, verseRef);
        }

    } catch (error) {
        console.error('Error submitting reaction:', error);
        alert('Error submitting reaction. Please try again.');
    }
}

async function handleAuthStateChange(user) {
    updateCommentInputState(Boolean(user));

    if (user) {
        // Set the user's email so display name can be extracted from it
        setCurrentUserEmail(user.email);
        updateUsernameDisplay();
        await refreshBookmarkedVerses();
        await refreshBookmarkedQuotes();

        let userProfile = null;

        // Record user login activity
        try {
            await recordUserLogin(user.uid, user.email);
        } catch (error) {
            console.error('Error recording login:', error);
        }

        // Fetch the latest user profile (captures Firestore timestamps)
        try {
            userProfile = await getUserInfo(user.uid);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }

        currentUserProfile = userProfile;

        // Reflect latest login status in UI
        updateCurrentUserStatusDisplay(userProfile, user.email);

        // Set up presence tracking
        startPresenceTracking(user.uid);

        // Re-fetch shortly after login so server timestamps resolve
        setTimeout(() => {
            refreshCurrentUserProfile();
        }, 2000);

        if (currentMitzvahChallengeId) {
            await refreshMitzvahCompletionStatus(currentMitzvahChallengeId);
        }
        updateMitzvahAuthState();
        if (currentMitzvahChallengeId) {
            startMitzvahReflectionsListener(currentMitzvahChallengeId);
        }
        refreshMitzvahLeaderboardDisplay();
        maybeShowMitzvahModal();

    } else {
        setCurrentUserEmail(null);
        updateUsernameDisplay();
        bookmarkedVerses.clear();
        clearBookmarkUIState();
        clearQuoteBookmarkUIState();
        currentUserProfile = null;

        // Mark user as offline
        if (lastUserId) {
            try {
                await markUserOffline(lastUserId);
            } catch (error) {
                console.error('Error marking offline:', error);
            }
        }

        // Stop presence tracking
        stopPresenceTracking();

        currentMitzvahCompletion = false;
        updateMitzvahAuthState();
        hideMitzvahModal(false);
        startMitzvahReflectionsListener(null);
    }
}

async function refreshBookmarkedVerses(options = {}) {
    const userId = getCurrentUserId();

    if (!userId) {
        bookmarkedVerses.clear();
        clearBookmarkUIState();
        return options.returnList ? [] : undefined;
    }

    try {
        const bookmarks = await getUserBookmarks(userId);
        bookmarkedVerses = new Set(bookmarks.map((bookmark) => bookmark.verseRef));

        bookmarks.forEach((bookmark) => {
            if (bookmark.verseText && (!verseDisplayTexts[bookmark.verseRef] || !verseDisplayTexts[bookmark.verseRef].english)) {
                verseDisplayTexts[bookmark.verseRef] = {
                    english: bookmark.verseText
                };
            }
        });

        if (bookmarks.length > 0) {
            const uniqueRefs = Array.from(new Set(bookmarks.map((bookmark) => bookmark.verseRef)));
            const bookmarkCounts = await getBookmarkCountsForVerses(uniqueRefs);
            Object.entries(bookmarkCounts).forEach(([ref, value]) => {
                verseBookmarkCounts[ref] = Math.max(0, value || 0);
            });
        }

        applyBookmarkStateToVisibleVerses();
        return options.returnList ? bookmarks : undefined;
    } catch (error) {
        console.error('Error refreshing bookmarks:', error);
        if (options.returnList) {
            throw error;
        }
        return undefined;
    }
}

async function refreshBookmarkedQuotes(options = {}) {
    const userId = getCurrentUserId();

    if (!userId) {
        bookmarkedQuoteIds.clear();
        cachedQuoteBookmarks = [];
        updateDailyQuoteBookmarkButtonState();
        return options.returnList ? [] : undefined;
    }

    try {
        const quoteBookmarks = await getUserDailyQuoteBookmarks(userId);
        cachedQuoteBookmarks = quoteBookmarks;
        bookmarkedQuoteIds = new Set(
            quoteBookmarks
                .map((bookmark) => bookmark.quoteId)
                .filter((value) => value !== undefined && value !== null)
                .map((value) => String(value))
        );
        updateDailyQuoteBookmarkButtonState();
        return options.returnList ? quoteBookmarks : undefined;
    } catch (error) {
        console.error('Error refreshing quote bookmarks:', error);
        if (options.returnList) {
            throw error;
        }
        return undefined;
    }
}

function applyBookmarkStateToVisibleVerses() {
    const buttons = document.querySelectorAll('.bookmark-btn');
    buttons.forEach((btn) => {
        const verseRef = btn.getAttribute('data-verse-ref');
        const isActive = verseRef && bookmarkedVerses.has(verseRef);
        const baseCount = verseRef ? (verseBookmarkCounts[verseRef] || 0) : 0;
        const displayCount = Math.max(baseCount, isActive ? 1 : 0);
        btn.classList.toggle('active', Boolean(isActive));
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        const countSpan = btn.querySelector('.bookmark-count');
        if (countSpan) {
            countSpan.textContent = displayCount > 0 ? displayCount : '';
            countSpan.style.display = displayCount > 0 ? 'inline-flex' : 'none';
        }
        if (verseRef) {
            const countText = displayCount > 0
                ? `${displayCount} ${displayCount === 1 ? 'person has' : 'people have'} bookmarked this verse`
                : 'No bookmarks yet';
            btn.setAttribute(
                'title',
                isActive ? `Remove bookmark • ${countText}` : `Bookmark this verse • ${countText}`
            );
            btn.setAttribute(
                'aria-label',
                `${isActive ? 'Remove your bookmark.' : 'Bookmark this verse.'} ${countText}.`
            );
        }
    });
}

function clearBookmarkUIState() {
    applyBookmarkStateToVisibleVerses();
}

function clearQuoteBookmarkUIState() {
    bookmarkedQuoteIds.clear();
    cachedQuoteBookmarks = [];
    updateDailyQuoteBookmarkButtonState();
}

async function handleBookmarkClick(verseRef, bookmarkBtn) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please sign in to bookmark verses');
        return;
    }

    try {
        const isBookmarked = bookmarkedVerses.has(verseRef)
            ? true
            : await isVerseBookmarked(verseRef, userId);

        if (isBookmarked) {
            // Remove bookmark
            await removeBookmark(verseRef, userId);
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.setAttribute('aria-pressed', 'false');
            bookmarkedVerses.delete(verseRef);
            if (verseBookmarkCounts[verseRef]) {
                verseBookmarkCounts[verseRef] = Math.max(0, verseBookmarkCounts[verseRef] - 1);
            }
        } else {
            // Add bookmark
            const verseText = getVerseTextSnippet(verseRef);
            await addBookmark(verseRef, userId, { verseText });
            bookmarkBtn.classList.add('active');
            bookmarkBtn.setAttribute('aria-pressed', 'true');
            bookmarkedVerses.add(verseRef);
            verseBookmarkCounts[verseRef] = (verseBookmarkCounts[verseRef] || 0) + 1;
        }

        // Ensure all instances stay in sync (e.g., if verse appears twice)
        applyBookmarkStateToVisibleVerses();

    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert('Error saving bookmark. Please try again.');
    }
}

async function handleDailyQuoteBookmarkToggle(quotePayload) {
    const userId = getCurrentUserId();

    if (!userId) {
        alert('Please sign in to bookmark quotes');
        return;
    }

    const quoteId = quotePayload && (quotePayload.quoteId ?? quotePayload.id);
    if (quoteId == null) {
        showError('Unable to save this quote right now.');
        return;
    }

    const normalizedQuote = {
        hebrew: quotePayload.hebrew || '',
        translation: quotePayload.translation || '',
        source: quotePayload.source || '',
        reflection: quotePayload.reflection || '',
        displayDate: quotePayload.displayDate || null,
        id: String(quoteId),
        quoteId: String(quoteId)
    };

    try {
        const isBookmarked = bookmarkedQuoteIds.has(String(quoteId))
            ? true
            : await isDailyQuoteBookmarked(String(quoteId), userId);

        if (isBookmarked) {
            await removeDailyQuoteBookmark(String(quoteId), userId);
            bookmarkedQuoteIds.delete(String(quoteId));
        } else {
            await addDailyQuoteBookmark(normalizedQuote, userId, { displayDate: normalizedQuote.displayDate });
            bookmarkedQuoteIds.add(String(quoteId));
        }

        updateDailyQuoteBookmarkButtonState();
        await refreshBookmarkedQuotes();
    } catch (error) {
        console.error('Error toggling quote bookmark:', error);
        alert('Error saving quote. Please try again.');
    }
}

function updateAllReactionUI() {
    const containers = document.querySelectorAll('.verse-container');

    containers.forEach(container => {
        const verseRef = container.dataset.ref;
        if (verseRef) {
            updateVerseReactionUI(container, verseRef);
        }
    });
}

function updateVerseReactionUI(container, verseRef) {
    if (!container) return;

    const counts = verseReactionCounts[verseRef] || { emphasize: 0, heart: 0 };
    const userReacted = userReactions[verseRef] || [];

    // Update data attributes for CSS styling
    container.setAttribute('data-emphasize', counts.emphasize);
    container.setAttribute('data-heart', counts.heart);

    // Update button states and counts
    const emphasizeBtn = container.querySelector('.emphasize-btn');
    const heartBtn = container.querySelector('.heart-btn');

    if (emphasizeBtn) {
        const countSpan = emphasizeBtn.querySelector('.reaction-count');
        if (countSpan) {
            countSpan.textContent = counts.emphasize || '';
        }

        if (userReacted.includes('emphasize')) {
            emphasizeBtn.classList.add('active');
        } else {
            emphasizeBtn.classList.remove('active');
        }
    }

    if (heartBtn) {
        const countSpan = heartBtn.querySelector('.reaction-count');
        if (countSpan) {
            countSpan.textContent = counts.heart || '';
        }

        if (userReacted.includes('heart')) {
            heartBtn.classList.add('active');
        } else {
            heartBtn.classList.remove('active');
        }
    }
}

function updateCommentBadge(container, verseRef) {
    if (!container) {
        return;
    }
    
    const indicatorsSection = container.querySelector('.verse-indicators');
    if (!indicatorsSection) {
        return;
    }
    
    const count = verseCommentCounts[verseRef] || 0;
    let badge = indicatorsSection.querySelector('.comment-count-badge');
    
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'comment-count-badge';
        badge.dataset.verseRef = verseRef;
        indicatorsSection.appendChild(badge);
    }
    
    if (count > 0) {
        badge.textContent = `${count} ${count === 1 ? 'comment' : 'comments'}`;
        badge.style.display = 'inline-flex';
        badge.style.visibility = 'visible';
        badge.style.opacity = '1';
    } else {
        badge.style.display = 'none';
    }
}

function updateAllCommentBadges() {
    const containers = document.querySelectorAll('.verse-container');
    
    let visibleCount = 0;
    containers.forEach(container => {
        const verseRef = container.dataset.ref;
        if (verseRef) {
            updateCommentBadge(container, verseRef);
            if (verseCommentCounts[verseRef] > 0) {
                visibleCount++;
            }
        }
    });
}

async function loadParsha(parshaRef) {
    if (parshaRef && state.currentParshaRef !== parshaRef) {
        setState({ currentParshaRef: parshaRef });
    }
    showLoading();
    hideError();

    try {
        console.log('📖 Fetching parsha text for:', parshaRef);
        const data = await fetchParshaText(parshaRef);
        console.log('✅ Parsha text received');

        console.log('🎨 Rendering parsha...');
        renderParsha(data, parshaRef);
        console.log('✅ Parsha rendered');

        highlightCurrentParsha(parshaRef);

        console.log('📊 Loading counts (comments, reactions, bookmarks)...');
        // Load both comments and reactions
        await Promise.all([
            loadCommentCounts(parshaRef),
            loadReactionCounts(parshaRef),
            loadBookmarkCounts(parshaRef)
        ]);
        console.log('✅ Counts loaded');

        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log('✅ Parsha fully loaded');

    } catch (error) {
        console.error('❌ Error loading parsha:', error, error.stack);
        showError('Failed to load the Torah text. Please try again later.');
    } finally {
        hideLoading();
    }
}

function parseParshaReference(parshaRef) {
    const match = parshaRef.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+):(\d+))?$/);

    if (!match) {
        const simpleMatch = parshaRef.match(/^(\w+)\s+(\d+):(\d+)$/);
        if (simpleMatch) {
            return {
                bookName: simpleMatch[1],
                startChapter: parseInt(simpleMatch[2]),
                startVerse: parseInt(simpleMatch[3]),
                endChapter: null,
                endVerse: null
            };
        }
        return { bookName: 'Torah', startChapter: 1, startVerse: 1, endChapter: null, endVerse: null };
    }
    
    return {
        bookName: match[1],
        startChapter: parseInt(match[2]),
        startVerse: parseInt(match[3]),
        endChapter: match[4] ? parseInt(match[4]) : null,
        endVerse: match[5] ? parseInt(match[5]) : null
    };
}

function openParshaSignificanceModal() {
    const significance = state.currentParshaSignificance;
    if (!significance) return;

    const parshaName = state.currentParshaSignificanceName || state.allParshas[state.currentParshaIndex]?.name || 'Torah Portion';
    const infoContent = document.getElementById('info-content');
    infoContent.innerHTML = `
        <div class="text-xl font-bold mb-3 text-blue-900">${escapeHtml(parshaName)} — Significance</div>
        <div class="text-gray-800 leading-relaxed">${formatText(significance)}</div>
    `;
    showInfoPanel();
}

function renderParsha(data, parshaRef) {
    const textContainer = document.getElementById('parsha-text');
    
    updateParshaHeader(data.book || 'Torah Portion', parshaRef);
    textContainer.innerHTML = '';

    let significanceText = null;
    let significanceParshaName = null;
    let activeParsha = null;
    try {
        activeParsha = state.allParshas.find(p => p.reference === parshaRef);
        if (activeParsha && state.commentaryData && Array.isArray(state.commentaryData.parshas)) {
            const parshaEntry = state.commentaryData.parshas.find(p => p.name === activeParsha.name);
            if (parshaEntry && parshaEntry.significance) {
                significanceText = parshaEntry.significance;
                significanceParshaName = activeParsha.name;
                // Significance will only display in modal when button is clicked
            }
        }
    } catch (e) {
        console.warn('Unable to render significance for parsha:', e);
    }

    setState({
        currentParshaSignificance: significanceText,
        currentParshaSignificanceName: significanceParshaName
    });

    // Update both desktop and mobile significance buttons
    const significanceButton = document.getElementById('show-significance');
    if (significanceButton) {
        const enabled = Boolean(significanceText);
        significanceButton.disabled = !enabled;
        significanceButton.classList.toggle('opacity-40', !enabled);
        significanceButton.classList.toggle('cursor-not-allowed', !enabled);
        significanceButton.classList.toggle('pointer-events-none', !enabled);
    }

    const significanceButtonMobile = document.getElementById('show-significance-mobile');
    if (significanceButtonMobile) {
        const enabled = Boolean(significanceText);
        significanceButtonMobile.disabled = !enabled;
        significanceButtonMobile.classList.toggle('opacity-40', !enabled);
        significanceButtonMobile.classList.toggle('cursor-not-allowed', !enabled);
        significanceButtonMobile.classList.toggle('pointer-events-none', !enabled);
    }

    updateMitzvahChallengeForParsha(activeParsha?.name || null);
    
    const englishText = Array.isArray(data.text) ? data.text : [data.text];
    const hebrewText = Array.isArray(data.he) ? data.he : [data.he];
    
    const { bookName, startChapter, startVerse, endChapter, endVerse } = parseParshaReference(parshaRef);
    
    if (Array.isArray(englishText[0])) {
        let currentChapterNumber = startChapter;
        let isFirstChapter = true;
        
        englishText.forEach((chapterVerses, chapterIndex) => {
            if (!Array.isArray(chapterVerses)) {
                chapterVerses = [chapterVerses];
            }
            
            const hebrewChapterVerses = Array.isArray(hebrewText[chapterIndex]) ? 
                hebrewText[chapterIndex] : [hebrewText[chapterIndex] || ''];
            
            const isStartChapter = currentChapterNumber === startChapter;
            const isEndChapter = endChapter ? currentChapterNumber === endChapter : false;
            const chapterStartVerse = isStartChapter ? startVerse : 1;
            const chapterEndVerse = isEndChapter ? endVerse : null;
            
            if (!isFirstChapter) {
                const chapterHeader = document.createElement('div');
                chapterHeader.className = 'chapter-header';
                chapterHeader.textContent = `${bookName} Chapter ${currentChapterNumber}`;
                textContainer.appendChild(chapterHeader);
            }
            isFirstChapter = false;
            
            for (let localIndex = 0; localIndex < chapterVerses.length; localIndex++) {
                const verseText = chapterVerses[localIndex];
                if (!verseText || verseText.trim() === '') continue;
                
                const verseNumber = chapterStartVerse + localIndex;
                
                if (chapterEndVerse && verseNumber > chapterEndVerse) {
                    break;
                }
                
                const hebrewVerseText = hebrewChapterVerses[localIndex] || '';
                const verseRef = `${bookName} ${currentChapterNumber}:${verseNumber}`;
                
                const verseElement = createVerseElement(verseText, hebrewVerseText, verseRef, verseNumber);
                textContainer.appendChild(verseElement);
            }
            
            currentChapterNumber++;
        });
    } else {
        const flatEnglish = flattenTextArray(englishText);
        const flatHebrew = flattenTextArray(hebrewText);
        
        flatEnglish.forEach((verseText, index) => {
            if (!verseText || verseText.trim() === '') return;
            
            const hebrewVerseText = flatHebrew[index] || '';
            const verseNumber = startVerse + index;
            const verseRef = `${bookName} ${startChapter}:${verseNumber}`;
            
            const verseElement = createVerseElement(verseText, hebrewVerseText, verseRef, verseNumber);
            textContainer.appendChild(verseElement);
        });
    }

    applyBookmarkStateToVisibleVerses();
}

function createVerseElement(englishText, hebrewText, verseRef, verseNumber) {
    const container = document.createElement('div');
    container.className = 'verse-container';
    container.dataset.ref = verseRef;
    
    const hasCommentary = checkForCommentary(verseRef);
    const hasKeywords = checkForKeywords(verseRef);
    const isImportant = isImportantVerse(verseRef);

    if (hasCommentary || hasKeywords || isImportant) {
        container.classList.add('has-content');
        if (hasCommentary) container.classList.add('has-commentary');
        if (hasKeywords) container.classList.add('has-keywords');
        if (isImportant) container.classList.add('has-important');
    }
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'verse-content-wrapper';
    
    const verseNumSpan = document.createElement('div');
    verseNumSpan.className = 'verse-number';
    verseNumSpan.textContent = verseNumber;
    contentWrapper.appendChild(verseNumSpan);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'verse-text-container';
    
    const hebrewDiv = document.createElement('div');
    hebrewDiv.className = 'hebrew-text';
    hebrewDiv.setAttribute('lang', 'he');
    hebrewDiv.setAttribute('dir', 'rtl');
    hebrewDiv.innerHTML = hebrewText;

    const englishDiv = document.createElement('div');
    englishDiv.className = 'english-text';
    const cleanedEnglish = cleanSefariaAnnotationsFromText(englishText);
    const processedEnglish = processKeywords(cleanedEnglish, verseRef);
    englishDiv.innerHTML = processedEnglish;
    verseDisplayTexts[verseRef] = {
        english: cleanedEnglish.trim()
    };

    textContainer.appendChild(hebrewDiv);
    textContainer.appendChild(englishDiv);

    contentWrapper.appendChild(textContainer);
    
    container.appendChild(contentWrapper);
    
    const indicatorsSection = document.createElement('div');
    indicatorsSection.className = 'verse-indicators';
    
    if (hasCommentary) {
        const commentaryIndicator = document.createElement('div');
        commentaryIndicator.className = 'content-indicator commentary-indicator';
        commentaryIndicator.textContent = 'Commentary Available';
        commentaryIndicator.title = 'Click to view commentary';
        indicatorsSection.appendChild(commentaryIndicator);
    }
    
    if (hasKeywords) {
        const keywordIndicator = document.createElement('div');
        keywordIndicator.className = 'content-indicator keyword-indicator';
        keywordIndicator.textContent = 'Definitions Available';
        keywordIndicator.title = 'Click highlighted words for definitions';
        indicatorsSection.appendChild(keywordIndicator);
    }
    
    // Create badge element (will be updated by loadCommentCounts)
    const commentBadge = document.createElement('div');
    commentBadge.className = 'comment-count-badge';
    commentBadge.style.display = 'none';
    commentBadge.dataset.verseRef = verseRef;
    indicatorsSection.appendChild(commentBadge);

    container.appendChild(indicatorsSection);

    // Add reaction buttons section
    const reactionsSection = document.createElement('div');
    reactionsSection.className = 'verse-reactions';

    // Emphasize button
    const emphasizeBtn = document.createElement('button');
    emphasizeBtn.className = 'reaction-btn emphasize-btn';
    emphasizeBtn.setAttribute('aria-label', 'Emphasize this verse');
    emphasizeBtn.innerHTML = `
        <span class="reaction-icon emphasize-icon"></span>
        <span class="reaction-count"></span>
    `;
    emphasizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleReactionClick(verseRef, 'emphasize');
    });

    // Heart button
    const heartBtn = document.createElement('button');
    heartBtn.className = 'reaction-btn heart-btn';
    heartBtn.setAttribute('aria-label', 'Heart this verse');
    heartBtn.innerHTML = `
        <span class="reaction-icon heart-icon"></span>
        <span class="reaction-count"></span>
    `;
    heartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleReactionClick(verseRef, 'heart');
    });

    // Bookmark button
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'reaction-btn bookmark-btn';
    bookmarkBtn.setAttribute('aria-label', 'Bookmark this verse');
    bookmarkBtn.setAttribute('data-verse-ref', verseRef);
    bookmarkBtn.setAttribute('aria-pressed', 'false');
    bookmarkBtn.setAttribute('title', 'Bookmark this verse');
    bookmarkBtn.innerHTML = `
        <svg class="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="currentColor"></path>
        </svg>
        <span class="bookmark-count"></span>
    `;
    bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleBookmarkClick(verseRef, bookmarkBtn);
    });

    reactionsSection.appendChild(emphasizeBtn);
    reactionsSection.appendChild(heartBtn);
    reactionsSection.appendChild(bookmarkBtn);
    container.appendChild(reactionsSection);

    // Add purple asterisk for extremely important verses (bottom right of container)
    if (isImportantVerse(verseRef)) {
        const asterisk = document.createElement('div');
        asterisk.className = 'important-verse-asterisk';
        asterisk.innerHTML = '*';
        asterisk.setAttribute('title', 'Click to see why this verse is extremely important');
        asterisk.setAttribute('data-verse-ref', verseRef);
        asterisk.addEventListener('click', (e) => {
            e.stopPropagation();
            const verseData = getImportantVerseData(verseRef);
            if (verseData) {
                showVerseSignificance(verseRef, verseData.explanation);
            }
        });
        container.appendChild(asterisk);
    }

    // Store bookmark button reference for later updates
    container.dataset.bookmarkBtn = true;

    return container;
}

function cleanSefariaAnnotationsFromText(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    const temp = document.createElement('textarea');
    temp.innerHTML = cleaned;
    cleaned = temp.value;
    
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

function checkForKeywords(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return false;
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords && verse.keywords.length > 0) {
                return true;
            }
        }
    }
    return false;
}

function flattenTextArray(arr) {
    const result = [];
    arr.forEach(item => {
        if (Array.isArray(item)) {
            result.push(...item);
        } else {
            result.push(item);
        }
    });
    return result;
}

function checkForCommentary(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return false;
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.commentary && verse.commentary.length > 0) {
                return true;
            }
        }
    }
    return false;
}

function processKeywords(text, verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return text;
    
    let keywords = [];
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords) {
                keywords = verse.keywords;
                break;
            }
        }
    }
    
    if (keywords.length === 0) return text;
    
    let processedText = text;
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${escapeRegex(keyword.word)})\\b`, 'gi');
        processedText = processedText.replace(regex, 
            `<span class="keyword" data-definition="${escapeHtml(keyword.definition)}">$1</span>`
        );
    });
    
    return processedText;
}

function handleTextClick(e) {
    if (e.target.classList.contains('keyword')) {
        e.stopPropagation();
        e.preventDefault();
        const definition = e.target.dataset.definition;
        const word = e.target.textContent;
        showKeywordDefinition(word, definition);
        return;
    }
    
    if (e.target.closest('.keyword-indicator')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            const keywords = getKeywordsForVerse(verseRef);
            showAllDefinitions(verseRef, keywords);
        }
        return;
    }
    
    if (e.target.closest('.commentary-indicator')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            const commentaries = getCommentariesForVerse(verseRef);
            showCommentary(verseRef, commentaries);
        }
        return;
    }
    
    if (e.target.closest('.comment-count-badge')) {
        e.stopPropagation();
        const verseContainer = e.target.closest('.verse-container');
        if (verseContainer) {
            const verseRef = verseContainer.dataset.ref;
            openCommentsPanel(verseRef, (ref) => {
                listenForComments(ref, displayComments);
            });
        }
        return;
    }

    if (e.target.classList.contains('verse-indicators')) {
        return;
    }

    const verseContainer = e.target.closest('.verse-container');
    if (verseContainer && !e.target.closest('.verse-indicators')) {
        const verseRef = verseContainer.dataset.ref;
        openCommentsPanel(verseRef, (ref) => {
            listenForComments(ref, displayComments);
        });
    }
}

function getCommentariesForVerse(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return [];
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.commentary) {
                return verse.commentary;
            }
        }
    }
    return [];
}

function getKeywordsForVerse(verseRef) {
    if (!state.commentaryData || !state.commentaryData.parshas) return [];
    
    for (const parsha of state.commentaryData.parshas) {
        if (parsha.verses) {
            const verse = parsha.verses.find(v => v.ref === verseRef);
            if (verse && verse.keywords) {
                return verse.keywords;
            }
        }
    }
    return [];
}

function showAllDefinitions(verseRef, keywords) {
    if (!keywords || keywords.length === 0) return;
    
    const infoContent = document.getElementById('info-content');
    let html = `<h4 class="text-lg font-bold mb-4 text-blue-900 border-b-2 border-blue-200 pb-2">Definitions for ${escapeHtml(verseRef)}</h4>`;
    
    keywords.forEach(keyword => {
        html += `
            <div class="definition-container mb-4">
                <div class="definition-word">${escapeHtml(keyword.word)}</div>
                <div class="definition-text">${formatText(keyword.definition)}</div>
            </div>
        `;
    });
    
    infoContent.innerHTML = html;
    showInfoPanel();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatText(text) {
    if (!text) return '';

    const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    const headerPatterns = [
        /Parsha Summary:/g,
        /Significance &amp; Takeaway:/g,
        /Name Meaning:/g,
        /Significance:/g,
        /Context:/g,
        /The takeaway:/gi
    ];
    const labelReplacements = [
        { regex: /<strong>Name Meaning:<\/strong>/g, replacement: '<span class="sig-label sig-label-name">Name Meaning</span>' },
        { regex: /<strong>Context:<\/strong>/g, replacement: '<span class="sig-label sig-label-context">Context</span>' },
        { regex: /<strong>Parsha Summary:<\/strong>/g, replacement: '<span class="sig-label sig-label-summary">Parsha Summary</span>' },
        { regex: /<strong>Significance:<\/strong>/g, replacement: '<span class="sig-label sig-label-core">Significance</span>' },
        { regex: /<strong>The takeaway:<\/strong>/gi, replacement: '<span class="sig-label sig-label-takeaway">The takeaway</span>' }
    ];

    const sectionHtml = blocks.map(block => {
        let escaped = escapeHtml(block);

        headerPatterns.forEach(pattern => {
            escaped = escaped.replace(pattern, match => `<strong>${match}</strong>`);
        });

        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

        labelReplacements.forEach(({ regex, replacement }) => {
            escaped = escaped.replace(regex, replacement);
        });

        const labelMatch = escaped.match(/^(<span class="sig-label [^>]+>.*?<\/span>)/);
        let label = '';
        if (labelMatch) {
            label = labelMatch[1];
            escaped = escaped.slice(label.length).trim();
        }

        escaped = escaped.replace(/\n/g, '<br>');

        return `
            <section class="sig-section">
                ${label ? `<div class="sig-section-label">${label}</div>` : ''}
                <div class="sig-section-text">${escaped}</div>
            </section>
        `;
    });

    return sectionHtml.join('');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openBookmarksPanel(defaultTab = 'verses') {
    const userId = getCurrentUserId();
    if (!userId) {
        showError('Please sign in to view bookmarks');
        return;
    }

    const safeDefault = defaultTab === 'quotes' ? 'quotes' : 'verses';

    const renderVerseBookmarks = (bookmarks = []) => {
        if (!bookmarks || bookmarks.length === 0) {
            return `
                <div class="text-center py-8">
                    <p class="text-gray-500">No verse bookmarks yet.</p>
                    <p class="text-sm text-gray-400 mt-2">Click the bookmark icon on any verse to save it.</p>
                </div>
            `;
        }

        let html = '<div class="bookmarks-list">';
        bookmarks.forEach((bookmark) => {
            const verseRef = bookmark.verseRef;
            const escapedRef = escapeHtml(verseRef);
            const verseText = getVerseTextSnippet(verseRef) || bookmark.verseText || '';
            const displayText = verseText
                ? escapeHtml(verseText)
                : 'Verse text will load when opened.';
            const count = Math.max(verseBookmarkCounts[verseRef] || 0, 1);
            const countLabel = count === 1 ? 'Saved by 1 reader' : `Saved by ${count} readers`;
            let savedDateLabel = 'Date unavailable';
            if (bookmark.timestamp && typeof bookmark.timestamp.toDate === 'function') {
                savedDateLabel = bookmark.timestamp.toDate().toLocaleDateString();
            }

            html += `
                <button type="button" class="bookmark-item" data-verse-ref="${escapedRef}" onclick="loadVerseFromBookmark('${escapedRef}')">
                    <div class="bookmark-item-header">
                        <span class="bookmark-item-ref">${escapedRef}</span>
                        <span class="bookmark-item-count">${escapeHtml(countLabel)}</span>
                    </div>
                    <div class="bookmark-item-text">${displayText}</div>
                    <div class="bookmark-item-meta">
                        <span class="bookmark-item-date">Saved ${escapeHtml(savedDateLabel)}</span>
                    </div>
                </button>
            `;
        });
        html += '</div>';
        return html;
    };

    const renderQuoteBookmarks = (bookmarks = []) => {
        if (!bookmarks || bookmarks.length === 0) {
            return `
                <div class="text-center py-8">
                    <p class="text-gray-500">No saved quotes yet.</p>
                    <p class="text-sm text-gray-400 mt-2">Tap the bookmark icon on today's quote to save it.</p>
                </div>
            `;
        }

        let html = '<div class="bookmarks-list quote-bookmarks-list">';
        bookmarks.forEach((bookmark) => {
            const quoteId = bookmark.quoteId != null ? String(bookmark.quoteId) : '';
            const savedDateLabel = bookmark.savedOn
                ? escapeHtml(bookmark.savedOn)
                : (bookmark.timestamp && typeof bookmark.timestamp.toDate === 'function'
                    ? bookmark.timestamp.toDate().toLocaleDateString()
                    : 'Saved');
            const reflectionSnippet = bookmark.reflection
                ? escapeHtml(
                    bookmark.reflection.length > 220
                        ? `${bookmark.reflection.slice(0, 220)}…`
                        : bookmark.reflection
                )
                : '';

            html += `
                <article class="quote-bookmark-item" data-quote-id="${quoteId}">
                    <div class="quote-bookmark-top">
                        <div class="quote-bookmark-source">
                            ${bookmark.source ? escapeHtml(bookmark.source) : 'Daily Inspiration'}
                            ${savedDateLabel ? ` • ${savedDateLabel}` : ''}
                        </div>
                        <button type="button" class="quote-remove-btn" data-quote-remove="true" data-quote-id="${quoteId}" title="Remove from saved quotes">
                            <span aria-hidden="true">&times;</span>
                            <span class="sr-only">Remove quote</span>
                        </button>
                    </div>
                    <div class="quote-bookmark-translation">"${escapeHtml(bookmark.translation || 'Teaching')}"</div>
                    ${bookmark.hebrew ? `<div class="quote-bookmark-hebrew">${escapeHtml(bookmark.hebrew)}</div>` : ''}
                    ${reflectionSnippet ? `<div class="quote-bookmark-reflection">${reflectionSnippet}</div>` : ''}
                </article>
            `;
        });
        html += '</div>';
        return html;
    };

    try {
        const [verseBookmarks, quoteBookmarks] = await Promise.all([
            refreshBookmarkedVerses({ returnList: true }),
            refreshBookmarkedQuotes({ returnList: true })
        ]);

        const html = `
            <div class="bookmark-tabs" role="tablist" aria-label="Bookmarks">
                <button type="button" class="bookmark-tab ${safeDefault === 'verses' ? 'active' : ''}" data-tab="verses" role="tab" aria-selected="${safeDefault === 'verses'}">Verses</button>
                <button type="button" class="bookmark-tab ${safeDefault === 'quotes' ? 'active' : ''}" data-tab="quotes" role="tab" aria-selected="${safeDefault === 'quotes'}">
                    Quotes ${quoteBookmarks && quoteBookmarks.length ? `<span class="bookmark-tab-pill">${quoteBookmarks.length}</span>` : ''}
                </button>
            </div>
            <div class="bookmark-panels">
                <div class="bookmark-panel ${safeDefault === 'verses' ? 'active' : ''}" data-panel="verses" role="tabpanel">
                    ${renderVerseBookmarks(verseBookmarks || [])}
                </div>
                <div class="bookmark-panel ${safeDefault === 'quotes' ? 'active' : ''}" data-panel="quotes" role="tabpanel">
                    ${renderQuoteBookmarks(quoteBookmarks || [])}
                </div>
            </div>
        `;

        const infoContent = document.getElementById('info-content');
        infoContent.classList.add('info-content-bookmarks');
        infoContent.innerHTML = html;

        setupBookmarkTabs(safeDefault);

        infoContent.querySelectorAll('[data-quote-remove]').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const quoteId = btn.getAttribute('data-quote-id');
                await removeQuoteBookmarkFromPanel(quoteId);
            });
        });

        showInfoPanel();
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        showError('Failed to load bookmarks');
    }
}

function setupBookmarkTabs(defaultTab = 'verses') {
    const infoContent = document.getElementById('info-content');
    if (!infoContent) {
        return;
    }

    const tabs = infoContent.querySelectorAll('.bookmark-tab');
    const panels = infoContent.querySelectorAll('.bookmark-panel');

    const activate = (tabName) => {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            activate(tab.dataset.tab);
        });
    });

    activate(defaultTab);
}

async function removeQuoteBookmarkFromPanel(quoteId) {
    const userId = getCurrentUserId();
    if (!userId || !quoteId) {
        return;
    }

    try {
        await removeDailyQuoteBookmark(String(quoteId), userId);
        bookmarkedQuoteIds.delete(String(quoteId));
        await refreshBookmarkedQuotes();
        updateDailyQuoteBookmarkButtonState();
        await openBookmarksPanel('quotes');
    } catch (error) {
        console.error('Error removing quote bookmark:', error);
        showError('Failed to remove quote bookmark');
    }
}

// Make this available globally for onclick
window.loadVerseFromBookmark = async function(verseRef) {
    if (!verseRef) {
        return;
    }

    hideInfoPanel();

    const parsha = findParshaForVerse(verseRef);

    if (!parsha) {
        showError('Unable to locate that verse. Please select the book manually.');
        return;
    }

    const parshaIndex = state.allParshas.indexOf(parsha);
    const needsLoad = state.currentParshaRef !== parsha.reference;

    setState({
        currentParshaIndex: parshaIndex,
        currentParshaRef: parsha.reference
    });

    document.querySelectorAll('select#parsha-selector').forEach((s) => {
        s.value = parsha.reference;
    });

    if (needsLoad) {
        await loadParsha(parsha.reference);
    }

    updateNavigationButtons();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            highlightVerseAndScroll(verseRef);
        });
    });
};

// ========================================
// PRESENCE TRACKING FUNCTIONS
// ========================================

function timestampToMillis(timestamp) {
    if (!timestamp) {
        return null;
    }

    try {
        if (typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
        }

        if (typeof timestamp.toDate === 'function') {
            const dateValue = timestamp.toDate();
            return dateValue instanceof Date ? dateValue.getTime() : null;
        }

        if (timestamp instanceof Date) {
            return timestamp.getTime();
        }

        if (typeof timestamp === 'number') {
            return Number.isFinite(timestamp) ? timestamp : null;
        }

        if (typeof timestamp === 'string') {
            const parsed = Date.parse(timestamp);
            return Number.isNaN(parsed) ? null : parsed;
        }
    } catch (error) {
        console.warn('Unable to convert timestamp to millis:', error, timestamp);
    }

    return null;
}

function pickMostRecentTimestamp(existing, candidate) {
    const existingMs = timestampToMillis(existing);
    const candidateMs = timestampToMillis(candidate);

    if (candidateMs !== null && (existingMs === null || candidateMs > existingMs)) {
        return candidate;
    }

    if (existingMs !== null) {
        return existing;
    }

    return candidateMs !== null ? candidate : null;
}

function normalizePresenceUser(user) {
    if (!user) {
        return null;
    }

    const rawEmails = [];
    if (Array.isArray(user.emails)) {
        rawEmails.push(...user.emails);
    }
    if (user.email) {
        rawEmails.push(user.email);
    }

    const normalizedEmails = [];
    const seenEmails = new Set();

    rawEmails.forEach((value) => {
        if (typeof value !== 'string') {
            return;
        }
        const trimmed = value.trim().toLowerCase();
        if (!trimmed || seenEmails.has(trimmed)) {
            return;
        }
        seenEmails.add(trimmed);
        normalizedEmails.push(trimmed);
    });

    const primaryEmail = normalizedEmails[0] || null;
    const username = user.username || (primaryEmail ? getDisplayNameFromEmail(primaryEmail) : null);
    const authIds = Array.isArray(user.authUserIds)
        ? Array.from(new Set(user.authUserIds.filter((value) => typeof value === 'string')))
        : [];
    const canonicalUserId = user.canonicalUserId || user.userId || (authIds.length > 0 ? authIds[0] : null);

    return {
        docId: user.docId || null,
        userId: canonicalUserId,
        canonicalUserId,
        authUserIds: authIds,
        email: primaryEmail,
        emails: normalizedEmails,
        username: username || 'Friend',
        lastLogin: user.lastLogin || null,
        lastSeen: user.lastSeen || null,
        isAlias: Boolean(user.isAlias)
    };
}

function preparePresenceCandidates(users = []) {
    if (!Array.isArray(users)) {
        return [];
    }

    const currentUserId = getCurrentUserId();
    let currentUserEmail = null;
    try {
        currentUserEmail = getCurrentUserEmail ? getCurrentUserEmail() : null;
    } catch {
        currentUserEmail = null;
    }
    const currentEmails = new Set();
    if (typeof currentUserEmail === 'string' && currentUserEmail.trim()) {
        currentEmails.add(currentUserEmail.trim().toLowerCase());
    }

    if (currentUserProfile && Array.isArray(currentUserProfile.emails)) {
        currentUserProfile.emails.forEach((value) => {
            if (typeof value !== 'string') {
                return;
            }
            const normalized = value.trim().toLowerCase();
            if (normalized) {
                currentEmails.add(normalized);
            }
        });
    }

    return users
        .map(normalizePresenceUser)
        .filter((user) => {
            if (!user) {
                return false;
            }
            if (user.isAlias) {
                return false;
            }
            if (currentUserId && user.userId && user.userId === currentUserId) {
                return false;
            }
            if (currentUserId && Array.isArray(user.authUserIds) && user.authUserIds.includes(currentUserId)) {
                return false;
            }
            if (currentEmails.size > 0) {
                const userEmails = Array.isArray(user.emails) && user.emails.length > 0
                    ? user.emails
                    : (user.email ? [user.email.toLowerCase()] : []);
                const overlaps = userEmails.some((email) => {
                    if (typeof email !== 'string') {
                        return false;
                    }
                    return currentEmails.has(email.toLowerCase());
                });
                if (overlaps) {
                    return false;
                }
            }
            return true;
        });
}

function combinePresenceSources(onlineUsers = [], recentUsers = []) {
    const presenceMap = new Map();

    [...onlineUsers, ...recentUsers].forEach((user) => {
        if (!user) {
            return;
        }
        const primaryEmail = Array.isArray(user.emails) && user.emails.length > 0
            ? user.emails[0]
            : (typeof user.email === 'string' ? user.email : null);
        const canonicalKey = user.canonicalUserId || user.userId || primaryEmail;
        const key = canonicalKey || primaryEmail;
        if (!key) {
            return;
        }

        const existing = presenceMap.get(key);
        if (!existing) {
            const emails = Array.isArray(user.emails) ? [...user.emails] : (primaryEmail ? [primaryEmail] : []);
            const authIds = Array.isArray(user.authUserIds)
                ? user.authUserIds.filter((value) => typeof value === 'string' && value.trim())
                : [];
            if (user.userId && typeof user.userId === 'string') {
                authIds.push(user.userId);
            }
            if (user.canonicalUserId && typeof user.canonicalUserId === 'string') {
                authIds.push(user.canonicalUserId);
            }
            const uniqueAuthIds = Array.from(new Set(authIds));
            presenceMap.set(key, {
                ...user,
                emails,
                authUserIds: uniqueAuthIds,
                canonicalUserId: user.canonicalUserId || user.userId
            });
            return;
        }

        const merged = {
            ...existing,
            ...user,
            lastLogin: pickMostRecentTimestamp(existing.lastLogin, user.lastLogin),
            lastSeen: pickMostRecentTimestamp(existing.lastSeen, user.lastSeen)
        };

        const mergedEmailsSet = new Set();
        if (Array.isArray(existing.emails)) {
            existing.emails.forEach((emailValue) => {
                if (typeof emailValue === 'string') {
                    mergedEmailsSet.add(emailValue);
                }
            });
        }
        if (Array.isArray(user.emails)) {
            user.emails.forEach((emailValue) => {
                if (typeof emailValue === 'string') {
                    mergedEmailsSet.add(emailValue);
                }
            });
        }
        if (typeof existing.email === 'string') {
            mergedEmailsSet.add(existing.email);
        }
        if (typeof user.email === 'string') {
            mergedEmailsSet.add(user.email);
        }

        const mergedEmails = Array.from(mergedEmailsSet);

        let resolvedEmail = user.email || existing.email || mergedEmails[0] || null;
        if (resolvedEmail) {
            resolvedEmail = resolvedEmail.trim().toLowerCase();
        }

        if (resolvedEmail) {
            mergedEmails.sort((a, b) => {
                if (a === resolvedEmail) {
                    return -1;
                }
                if (b === resolvedEmail) {
                    return 1;
                }
                return a.localeCompare(b);
            });
        } else {
            mergedEmails.sort();
        }

        merged.emails = mergedEmails;
        merged.email = resolvedEmail || null;
        merged.userId = user.canonicalUserId || user.userId || existing.userId;
        merged.canonicalUserId = user.canonicalUserId || existing.canonicalUserId || merged.userId;

        const mergedAuthIdsSet = new Set();
        if (Array.isArray(existing.authUserIds)) {
            existing.authUserIds.forEach((id) => {
                if (typeof id === 'string' && id.trim()) {
                    mergedAuthIdsSet.add(id);
                }
            });
        }
        if (Array.isArray(user.authUserIds)) {
            user.authUserIds.forEach((id) => {
                if (typeof id === 'string' && id.trim()) {
                    mergedAuthIdsSet.add(id);
                }
            });
        }
        if (typeof existing.userId === 'string') {
            mergedAuthIdsSet.add(existing.userId);
        }
        if (typeof user.userId === 'string') {
            mergedAuthIdsSet.add(user.userId);
        }
        if (merged.canonicalUserId) {
            mergedAuthIdsSet.add(merged.canonicalUserId);
        }
        const mergedAuthIds = Array.from(mergedAuthIdsSet);
        if (merged.canonicalUserId) {
            mergedAuthIds.sort((a, b) => {
                if (a === merged.canonicalUserId) {
                    return -1;
                }
                if (b === merged.canonicalUserId) {
                    return 1;
                }
                return a.localeCompare(b);
            });
        } else {
            mergedAuthIds.sort();
        }
        merged.authUserIds = mergedAuthIds;
        merged.isAlias = Boolean(existing.isAlias && user.isAlias);
        const candidateUsername = user.username || existing.username;
        const fallbackUsername = merged.email ? getDisplayNameFromEmail(merged.email) : candidateUsername;
        const sanitizedUsername = candidateUsername && typeof candidateUsername === 'string'
            ? candidateUsername.trim()
            : '';
        if (!sanitizedUsername || sanitizedUsername.includes('@') || sanitizedUsername.toLowerCase() === 'friend') {
            merged.username = fallbackUsername || sanitizedUsername || 'Friend';
        } else {
            merged.username = sanitizedUsername;
        }

        presenceMap.set(key, merged);
    });

    const now = Date.now();

    const combined = Array.from(presenceMap.values()).filter((user) => {
        const referenceTimestamp = user.lastLogin || user.lastSeen;
        const millis = timestampToMillis(referenceTimestamp);
        if (millis === null) {
            return false;
        }
        return (now - millis) <= FRIEND_PRESENCE_WINDOW_MS;
    }).sort((a, b) => {
        const aLogin = timestampToMillis(a.lastLogin);
        const aSeen = timestampToMillis(a.lastSeen);
        const bLogin = timestampToMillis(b.lastLogin);
        const bSeen = timestampToMillis(b.lastSeen);
        const aRecent = Math.max(aLogin ?? -Infinity, aSeen ?? -Infinity);
        const bRecent = Math.max(bLogin ?? -Infinity, bSeen ?? -Infinity);
        return bRecent - aRecent;
    });

    return combined.slice(0, 10);
}

function updateFriendPresenceView() {
    const combined = combinePresenceSources(trackedOnlineFriends, trackedRecentFriendLogins);
    if (combined.length === 0) {
        hideOnlineUsers();
        return;
    }
    displayOnlineUsers(combined);
}

function clearFriendPresence() {
    trackedOnlineFriends = [];
    trackedRecentFriendLogins = [];
    hideOnlineUsers();
}

// Start tracking user presence (updates every 30 seconds)
function startPresenceTracking(userId) {
    lastUserId = userId;

    // Clear existing interval if any
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
    }

    // Update presence immediately
    updateUserPresence(userId).catch(error => console.error('Error updating presence:', error));

    // Then update every 30 seconds
    presenceIntervalId = setInterval(() => {
        if (getCurrentUserId() === userId) {
            updateUserPresence(userId).catch(error => console.error('Error updating presence:', error));
        }
    }, PRESENCE_UPDATE_INTERVAL);

    // Set up listener for online users
    listenForOnlineUsers((onlineUsers) => {
        trackedOnlineFriends = preparePresenceCandidates(onlineUsers);
        updateFriendPresenceView();
    });

    // Also fetch and display users from last 3 weeks
    startFriendLoginsPolling();
}

// Start polling for friend logins in last 3 weeks
function startFriendLoginsPolling() {
    stopFriendLoginsPolling();
    refreshFriendLogins();
    friendLoginsRefreshIntervalId = setInterval(() => {
        refreshFriendLogins();
    }, FRIEND_LOGINS_REFRESH_INTERVAL);
}

// Stop polling for friend logins
function stopFriendLoginsPolling() {
    if (friendLoginsRefreshIntervalId) {
        clearInterval(friendLoginsRefreshIntervalId);
        friendLoginsRefreshIntervalId = null;
    }
    trackedRecentFriendLogins = [];
    updateFriendPresenceView();
}

// Refresh and display friends who logged in within last 3 weeks (up to 10)
async function refreshFriendLogins() {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
        return;
    }

    try {
        const users = await getUsersWithinThreeWeeks(10);
        if (!Array.isArray(users) || users.length === 0) {
            trackedRecentFriendLogins = [];
            updateFriendPresenceView();
            return;
        }

        const friendsList = preparePresenceCandidates(users);
        trackedRecentFriendLogins = friendsList;
        updateFriendPresenceView();
    } catch (error) {
        console.error('Error loading friends from last 3 weeks:', error);
        trackedRecentFriendLogins = [];
        updateFriendPresenceView();
    }
}

function updateCurrentUserStatusDisplay(userProfile, fallbackEmail) {
    const defaultName = getSavedUsername();
    const profileEmails = Array.isArray(userProfile?.emails) ? userProfile.emails : [];
    const primaryProfileEmail = profileEmails.length > 0
        ? profileEmails[0]
        : (typeof userProfile?.email === 'string' ? userProfile.email : null);
    const normalizedFallbackEmail = typeof fallbackEmail === 'string' && fallbackEmail.trim()
        ? fallbackEmail.trim().toLowerCase()
        : null;
    const fallbackName = defaultName !== 'Anonymous'
        ? defaultName
        : (primaryProfileEmail
            ? getDisplayNameFromEmail(primaryProfileEmail)
            : (normalizedFallbackEmail ? getDisplayNameFromEmail(normalizedFallbackEmail) : 'Friend'));
    let displayName = userProfile?.username;
    if (!displayName || (typeof displayName === 'string' && displayName.includes('@'))) {
        if (primaryProfileEmail) {
            displayName = getDisplayNameFromEmail(primaryProfileEmail);
        } else {
            displayName = fallbackName;
        }
    }
    displayName = displayName || fallbackName;
    const loginTime = userProfile?.lastLogin || userProfile?.lastSeen || new Date();

    displayLastLogin(displayName, loginTime);
}

async function refreshCurrentUserProfile() {
    const userId = getCurrentUserId();
    if (!userId) {
        return;
    }

    try {
        const profile = await getUserInfo(userId);
        if (profile) {
            currentUserProfile = profile;
            updateCurrentUserStatusDisplay(profile, getCurrentUserEmail());
        }
    } catch (error) {
        console.error('Error refreshing current user profile:', error);
    }
}

// Stop tracking user presence
function stopPresenceTracking() {
    if (presenceIntervalId) {
        clearInterval(presenceIntervalId);
        presenceIntervalId = null;
    }

    stopListeningForOnlineUsers();
    stopFriendLoginsPolling();
    clearFriendPresence();
    hideLastLogin();
}

// Handle user going offline when page is closed or navigated away
async function handleUserOffline() {
    const userId = lastUserId || getCurrentUserId();
    if (userId) {
        try {
            await markUserOffline(userId);
            console.log('[Presence] User marked offline on page unload');
        } catch (error) {
            console.error('[Presence] Error marking user offline:', error);
        }
    }
}

// Handle visibility change (tab switching) - update presence when tab becomes visible
function handleVisibilityChange() {
    const userId = getCurrentUserId();
    if (!userId) return;

    if (document.hidden) {
        console.log('[Presence] Tab hidden');
    } else {
        // Tab is visible again - update presence immediately
        console.log('[Presence] Tab visible - updating presence');
        updateUserPresence(userId).catch(error =>
            console.error('[Presence] Error updating presence on visibility:', error)
        );
    }
}

// Set up page lifecycle event handlers for presence tracking
window.addEventListener('beforeunload', handleUserOffline);
window.addEventListener('pagehide', handleUserOffline);
document.addEventListener('visibilitychange', handleVisibilityChange);

document.addEventListener('DOMContentLoaded', init);
