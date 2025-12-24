/**
 * MMCWall - Display View Logic (Slideshow Edition)
 * Calm, glassy slideshow that cycles announcements smoothly
 */

// ================================
// Configuration
// ================================
const CONFIG = {
    baseSlideDuration: 14000,   // ms before advancing (adjusted by admin speed)
    transitionDuration: 1400,   // fade/slide animation duration
    defaultYouTubeId: 'jfKfPfyJRdk', // fallback lofi stream
    typeIcons: {
        info: '',
        news: '',
        alert: '',
        health: '',
        welcome: ''
    },
    typeLabels: {
        info: 'Information',
        news: 'News',
        alert: 'Alert',
        health: 'Health Tip',
        welcome: 'Welcome'
    }
};

// Default categories with colors
const DEFAULT_CATEGORIES = {
    info: { label: 'Information', color: '#3b82f6' },
    news: { label: 'News', color: '#10b981' },
    alert: { label: 'Alert', color: '#f59e0b' },
    health: { label: 'Health Tip', color: '#8b5cf6' },
    welcome: { label: 'Welcome', color: '#14b8a6' }
};

// Dynamic categories loaded from Firebase
let categories = { ...DEFAULT_CATEGORIES };
let categoriesUnsubscribe = null;

// ================================
// State
// ================================
let slidesData = [];
let activeIndex = 0;
let slideTimer = null;
let isMuted = true; // Start muted (browsers require this for autoplay)
let useYouTube = true; // Toggle between YouTube and MP3
let usingDummyData = false;
let beachCycleTimer = null;
const BEACH_PHASES = ['beach-day', 'beach-sunset', 'beach-night'];

// Display styling/settings
const DEFAULT_DISPLAY_SETTINGS = {
    heroText: 'Welcome to Montgomery Medical Clinic',
    textSize: 22,
    bubbleSpeed: 1, // reused as slide speed multiplier
    bubbleSize: 1,  // reused as slide scale
    bgStart: '#d6ebff',
    bgEnd: '#f3fbff',
    gradientAnimated: 'false',
    cardsOnScreen: 1,
    slideColor: '#f6fbff',
    backgroundVideo: '',
    displayMode: 'light'
};
let displaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
let settingsUnsubscribe = null;
let musicUnsubscribe = null;
const FALLBACK_SLIDE = {
    id: 'default-welcome',
    text: 'Welcome to MMC',
    type: 'welcome',
    timestamp: new Date()
};

// ================================
// DOM Elements
// ================================
const slideshowContainer = document.getElementById('slideshow');
const clockElement = document.getElementById('clock');
const loadingElement = document.getElementById('loading');
const bgMusic = document.getElementById('bg-music');
const muteToggle = document.getElementById('mute-toggle');
const soundOnIcon = document.getElementById('sound-on-icon');
const soundOffIcon = document.getElementById('sound-off-icon');
const youtubePlayer = document.getElementById('youtube-player');
const youtubeContainer = document.getElementById('youtube-player-container');
const displayTitle = document.getElementById('display-title');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const bodyEl = document.body;
const videoBgContainer = document.getElementById('video-bg-container');
const backgroundVideoIframe = document.getElementById('background-video-iframe');
let controlsHideTimeout = null;
let cursorHideTimeout = null;

function getCardsOnScreen() {
    const n = Number(displaySettings.cardsOnScreen || 1);
    return Math.min(3, Math.max(1, Math.round(n)));
}

// ================================
// Clock
// ================================
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
}

// ================================
// Audio Controls (YouTube + MP3 fallback)
// ================================
function initAudio() {
    bgMusic.volume = 0.3;
    updateMuteUI();

    muteToggle.addEventListener('click', toggleMute);

    if (youtubePlayer) {
        youtubePlayer.addEventListener('error', () => {
            console.log('YouTube player error, falling back to MP3');
            useYouTube = false;
            youtubeContainer.style.display = 'none';
        });
    }
}

function toggleMute() {
    isMuted = !isMuted;

    if (useYouTube && youtubePlayer) {
        const currentSrc = youtubePlayer.src;
        if (isMuted) {
            youtubePlayer.src = currentSrc.includes('mute=')
                ? currentSrc.replace('mute=0', 'mute=1')
                : `${currentSrc}&mute=1`;
        } else {
            youtubePlayer.src = currentSrc.replace('mute=1', 'mute=0');
        }
    } else {
        if (isMuted) {
            bgMusic.pause();
        } else {
            bgMusic.play().catch(err => console.log('Audio playback failed:', err));
        }
    }

    updateMuteUI();
}

function updateMuteUI() {
    if (isMuted) {
        soundOnIcon.classList.add('hidden');
        soundOffIcon.classList.remove('hidden');
    } else {
        soundOnIcon.classList.remove('hidden');
        soundOffIcon.classList.add('hidden');
    }
}

// ================================
// Fullscreen Controls
// ================================
function initFullscreen() {
    if (!fullscreenToggle) return;

    fullscreenToggle.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);

    // Hide controls until mouse moves
    document.addEventListener('mousemove', handleMouseMoveForControls);
    scheduleHideControls();
    scheduleHideCursor();
}

function toggleFullscreen() {
    if (isFullscreen()) {
        exitFullscreen();
    } else {
        requestFullscreen(document.documentElement);
    }
}

function isFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement;
}

function requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}

function syncFullscreenState() {
    const active = Boolean(isFullscreen());
    fullscreenToggle.classList.toggle('active', active);
    fullscreenToggle.setAttribute('aria-label', active ? 'Exit fullscreen (Esc)' : 'Enter fullscreen');
    fullscreenToggle.querySelector('.fs-label').textContent = active ? 'Exit' : 'Fullscreen';
    fullscreenToggle.querySelector('.fs-icon').textContent = active ? '⤡' : '⤢';
    // Reset control visibility on state change
    scheduleHideControls();
}

function handleMouseMoveForControls() {
    showControls();
    scheduleHideControls();
    showCursor();
}

function showControls() {
    bodyEl.classList.add('controls-visible');
}

function scheduleHideControls() {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(() => {
        bodyEl.classList.remove('controls-visible');
    }, 1800);
}

function showCursor() {
    bodyEl.classList.remove('hide-cursor');
    scheduleHideCursor();
}

function scheduleHideCursor() {
    clearTimeout(cursorHideTimeout);
    cursorHideTimeout = setTimeout(() => {
        bodyEl.classList.add('hide-cursor');
    }, 2000);
}

// ================================
// Display settings (admin controlled)
// ================================
function applyDisplaySettings(newSettings) {
    displaySettings = { ...DEFAULT_DISPLAY_SETTINGS, ...newSettings };

    const root = document.documentElement.style;
    root.setProperty('--bg1', displaySettings.bgStart);
    root.setProperty('--bg2', displaySettings.bgEnd);
    root.setProperty('--slide-text-size', `${displaySettings.textSize}px`);
    root.setProperty('--slide-scale', displaySettings.bubbleSize);
    root.setProperty('--slide-surface', displaySettings.slideColor || DEFAULT_DISPLAY_SETTINGS.slideColor);

    // Handle animated gradients
    const animatedGradient = displaySettings.gradientAnimated;
    const body = document.body;
    const ambientBg = document.querySelector('.ambient-bg');
    const gradientClasses = ['gradient-aurora', 'gradient-ocean', 'gradient-sunset', 'gradient-aquarium', 'gradient-beach', 'gradient-rain'];

    // Remove all animated gradient classes
    body.classList.remove(...gradientClasses);
    if (ambientBg) ambientBg.classList.remove(...gradientClasses);

    if (animatedGradient && animatedGradient !== 'false') {
        // Apply animated gradient class
        body.classList.add(`gradient-${animatedGradient}`);
        if (ambientBg) {
            ambientBg.classList.add(`gradient-${animatedGradient}`);
        }
    }

    if (animatedGradient === 'beach') {
        startBeachCycle();
    } else {
        stopBeachCycle();
    }

    // Layout helper for multiple cards
    body.classList.toggle('layout-2', getCardsOnScreen() === 2);
    body.classList.toggle('layout-3', getCardsOnScreen() === 3);

    // Re-apply layout to visible slides so spacing updates immediately
    if (slideshowContainer && slideshowContainer.children.length > 0) {
        showSlide(activeIndex || 0);
    }

    if (displayTitle) {
        if (displaySettings.heroText) {
            displayTitle.textContent = displaySettings.heroText;
            displayTitle.classList.remove('hidden');
        } else {
            displayTitle.classList.add('hidden');
        }
    }

    // Handle background video
    applyBackgroundVideo(displaySettings.backgroundVideo);

    // Handle display mode (light/dark text)
    applyDisplayMode(displaySettings.displayMode);
}

// ================================
// Display Mode (Light/Dark Text)
// ================================
function applyDisplayMode(mode) {
    const body = document.body;

    // Remove existing mode classes
    body.classList.remove('display-mode-light', 'display-mode-dark');

    // Apply the selected mode
    if (mode === 'dark') {
        body.classList.add('display-mode-dark');
    } else {
        body.classList.add('display-mode-light');
    }

    console.log('Display mode set to:', mode);
}

// ================================
// Background Video (YouTube)
// ================================
let currentVideoId = '';

function applyBackgroundVideo(videoId) {
    if (!videoBgContainer || !backgroundVideoIframe) return;

    const ambientBg = document.querySelector('.ambient-bg');

    if (videoId && videoId.trim() !== '') {
        // Show YouTube video background
        if (currentVideoId !== videoId) {
            currentVideoId = videoId;
            // YouTube embed URL with autoplay, loop, mute, no controls, high quality
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&vq=hd1080&hd=1&origin=${window.location.origin}`;
            backgroundVideoIframe.src = embedUrl;
        }

        videoBgContainer.classList.remove('hidden');

        // Add glass effect class to body for enhanced UI elements
        document.body.classList.add('video-bg-active');

        // Hide the gradient background when video is playing
        if (ambientBg) {
            ambientBg.style.opacity = '0';
        }

        console.log('Background video enabled (YouTube):', videoId);
    } else {
        // Hide video background
        videoBgContainer.classList.add('hidden');
        backgroundVideoIframe.src = '';
        currentVideoId = '';

        // Remove glass effect class from body
        document.body.classList.remove('video-bg-active');

        // Show the gradient background
        if (ambientBg) {
            ambientBg.style.opacity = '1';
        }

        console.log('Background video disabled, using gradient theme');
    }
}

function getBeachPhase() {
    const hour = new Date().getHours();
    if (hour >= 19) return 'beach-night';
    if (hour >= 18) return 'beach-sunset';
    return 'beach-day';
}

function applyBeachPhase(phase) {
    const body = document.body;
    BEACH_PHASES.forEach(p => body.classList.remove(p));
    body.classList.add(phase);
}

function startBeachCycle() {
    applyBeachPhase(getBeachPhase());
    clearInterval(beachCycleTimer);
    beachCycleTimer = setInterval(() => {
        applyBeachPhase(getBeachPhase());
    }, 60000);
}

function stopBeachCycle() {
    clearInterval(beachCycleTimer);
    beachCycleTimer = null;
    const body = document.body;
    BEACH_PHASES.forEach(p => body.classList.remove(p));
}

function initDisplaySettingsListener() {
    applyDisplaySettings(DEFAULT_DISPLAY_SETTINGS);

    if (typeof displaySettingsRef === 'undefined') {
        console.warn('Firebase not initialized. Using default display settings.');
        return;
    }

    settingsUnsubscribe = displaySettingsRef.onSnapshot(
        (doc) => {
            const data = doc.exists ? doc.data() : {};
            applyDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...data });
        },
        (error) => {
            if (error.code === 'permission-denied') {
                console.warn('Display settings listener skipped (permission denied). Using defaults.');
            } else {
                console.error('Display settings listener error:', error);
            }
            applyDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
        }
    );
}

// ================================
// Music Settings (YouTube link from admin)
// ================================
let currentMusicSettings = { loop: true };

function initMusicSettingsListener() {
    if (typeof musicSettingsRef === 'undefined') {
        console.warn('Music settings ref not available. Using default YouTube link.');
        updateYoutubePlayer(CONFIG.defaultYouTubeId, true);
        return;
    }

    musicUnsubscribe = musicSettingsRef.onSnapshot(
        (doc) => {
            if (doc.exists) {
                const data = doc.data();
                currentMusicSettings = {
                    loop: data.loop !== false,
                    youtubeId: extractYoutubeId(data.youtubeUrl) || data.youtubeId || CONFIG.defaultYouTubeId
                };
                console.log('Music settings loaded:', currentMusicSettings);
                updateYoutubePlayer(currentMusicSettings.youtubeId, currentMusicSettings.loop);
            } else {
                console.log('No music settings found, using defaults');
                updateYoutubePlayer(CONFIG.defaultYouTubeId, true);
            }
        },
        (error) => {
            if (error.code === 'permission-denied') {
                console.warn('Music settings listener skipped (permission denied). Using default YouTube link.');
            } else {
                console.error('Music settings listener error:', error);
            }
            updateYoutubePlayer(CONFIG.defaultYouTubeId, true);
        }
    );
}

function updateYoutubePlayer(videoId, loop = true) {
    if (!youtubePlayer) return;

    const muteParam = isMuted ? '1' : '0';
    const loopParam = loop ? `loop=1&playlist=${videoId}` : 'loop=0';
    const newSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&mute=${muteParam}&${loopParam}&modestbranding=1&rel=0&playsinline=1`;

    // Only update if the source is different (to avoid restarting the video)
    if (youtubePlayer.src !== newSrc) {
        console.log('Updating YouTube player with:', videoId, 'loop:', loop);
        youtubePlayer.src = newSrc;
    }
}

function extractYoutubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ================================
// Categories (custom colors from admin)
// ================================
function loadCategories() {
    if (typeof categoriesRef === 'undefined') {
        console.warn('Categories ref not available. Using default categories.');
        categories = { ...DEFAULT_CATEGORIES };
        return;
    }

    categoriesUnsubscribe = categoriesRef.onSnapshot(
        (doc) => {
            if (doc.exists && doc.data().categories) {
                categories = doc.data().categories;
                console.log('Custom categories loaded:', categories);
            } else {
                categories = { ...DEFAULT_CATEGORIES };
                console.log('No custom categories found, using defaults');
            }
            // Re-render slides to apply new category colors
            if (slidesData.length > 0) {
                renderSlides();
            }
        },
        (error) => {
            if (error.code === 'permission-denied') {
                console.warn('Categories listener skipped (permission denied). Using defaults.');
            } else {
                console.error('Categories listener error:', error);
            }
            categories = { ...DEFAULT_CATEGORIES };
        }
    );
}

// ================================
// Slideshow logic
// ================================
function createSlideElement(item) {
    const slide = document.createElement('article');
    slide.className = 'slide';

    // Use formatted text if available, otherwise escape plain text
    const displayText = item.formattedText
        ? sanitizeDisplayHtml(item.formattedText)
        : escapeHtml(item.text);

    // Get category info (from dynamic categories or fallback to CONFIG)
    const category = categories[item.type] || { label: CONFIG.typeLabels[item.type] || 'Update', color: '#3b82f6' };
    const categoryLabel = category.label || CONFIG.typeLabels[item.type] || 'Update';
    const categoryColor = category.color || '#3b82f6';

    // Create pill with custom color styling
    const pillStyle = `background: ${hexToRgba(categoryColor, 0.12)}; color: ${categoryColor}; border-left: 3px solid ${categoryColor};`;

    slide.innerHTML = `
        <div class="slide-meta">
            <span class="slide-pill" style="${pillStyle}">${categoryLabel}</span>
        </div>
        <div class="slide-text">${displayText}</div>
    `;
    return slide;
}

// Helper to convert hex to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Sanitize HTML for safe display - only allow formatting tags
function sanitizeDisplayHtml(html) {
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'span', 'br', 'font'];
    const allowedAttributes = ['style', 'color', 'face'];

    const temp = document.createElement('div');
    temp.innerHTML = html;

    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            if (!allowedTags.includes(tagName)) {
                // Return text content for disallowed tags
                const fragment = document.createDocumentFragment();
                Array.from(node.childNodes).forEach(child => {
                    const cleaned = cleanNode(child);
                    if (cleaned) fragment.appendChild(cleaned);
                });
                return fragment;
            }

            // Create clean element with only allowed attributes
            const cleanEl = document.createElement(tagName);
            Array.from(node.attributes).forEach(attr => {
                if (allowedAttributes.includes(attr.name.toLowerCase())) {
                    cleanEl.setAttribute(attr.name, attr.value);
                }
            });

            // Clean children
            Array.from(node.childNodes).forEach(child => {
                const cleaned = cleanNode(child);
                if (cleaned) cleanEl.appendChild(cleaned);
            });

            return cleanEl;
        }
        return null;
    }

    const result = document.createElement('div');
    Array.from(temp.childNodes).forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) result.appendChild(cleaned);
    });

    return result.innerHTML;
}

function renderSlides() {
    slideshowContainer.innerHTML = '';

    // Ensure we always have at least one slide
    if (!slidesData || slidesData.length === 0) {
        slidesData = [FALLBACK_SLIDE];
    }

    slidesData.forEach((item, idx) => {
        const slideEl = createSlideElement(item);
        if (idx === 0) {
            slideEl.classList.add('active');
        }
        slideshowContainer.appendChild(slideEl);
    });
    activeIndex = 0;
    showSlide(0);
}

function showSlide(index) {
    const slides = slideshowContainer.querySelectorAll('.slide');
    if (!slides.length) return;

    slides.forEach(slide => slide.classList.remove('active', 'previous', 'secondary', 'tertiary'));
    const previous = slides[activeIndex];
    if (previous) previous.classList.add('previous');

    const visibleCount = getCardsOnScreen();
    for (let i = 0; i < Math.min(visibleCount, slides.length); i++) {
        const idx = (index + i) % slides.length;
        const current = slides[idx];
        if (!current) continue;
        current.classList.add('active');
        if (i === 1) current.classList.add('secondary');
        if (i === 2) current.classList.add('tertiary');
    }

    activeIndex = index;
    hideLoading();
    scheduleNextSlide();
}

function scheduleNextSlide() {
    const slides = slideshowContainer.querySelectorAll('.slide');
    clearTimeout(slideTimer);
    if (slides.length <= 1) return;

    const duration = getSlideDuration();
    slideTimer = setTimeout(() => {
        const nextIndex = (activeIndex + 1) % slides.length;
        showSlide(nextIndex);
    }, duration);
}

function getSlideDuration() {
    const speed = displaySettings.bubbleSpeed || 1;
    const duration = CONFIG.baseSlideDuration / speed;
    return Math.max(7000, duration);
}

function updateSlidesFromData(data) {
    // Always ensure we have at least one slide to display
    if (!data || !Array.isArray(data) || data.length === 0) {
        slidesData = [FALLBACK_SLIDE];
        usingDummyData = true;
    } else {
        slidesData = data;
        usingDummyData = false;
    }
    renderSlides();
}

// ================================
// Firebase Integration
// ================================
function initFirestore() {
    if (typeof announcementsRef === 'undefined') {
        console.error('Firebase not initialized. Check firebase-config.js');
        showDummyData();
        return;
    }

    announcementsRef
        .orderBy('timestamp', 'desc')
        .onSnapshot(
            (snapshot) => {
                const data = snapshot.docs.map(doc => {
                    const item = doc.data();
                    return {
                        id: doc.id,
                        text: item.text,
                        formattedText: item.formattedText || null,
                        type: item.type || 'info',
                        active: item.active !== false,
                        timestamp: item.timestamp?.toDate?.() || new Date()
                    };
                });

                const activeData = data.filter(item => item.active);

                updateSlidesFromData(activeData);
            },
            (error) => {
                console.error('Firestore error:', error);
                showDummyData();
            }
        );
}

// ================================
// Dummy Data (for testing)
// ================================
function showDummyData() {
    usingDummyData = true;
    hideLoading();

    const now = new Date();
    const dummyAnnouncements = [
        {
            id: 'dummy-1',
            text: 'Welcome to Montgomery Medical Clinic! Please have a seat and we will be with you shortly.',
            type: 'welcome',
            timestamp: now
        },
        {
            id: 'dummy-2',
            text: 'Flu shots are now available. Ask our staff for more information.',
            type: 'health',
            timestamp: now
        },
        {
            id: 'dummy-3',
            text: 'Please wear a mask in all common areas for everyone\'s safety.',
            type: 'alert',
            timestamp: now
        },
        {
            id: 'dummy-4',
            text: 'New extended hours: Now open Saturdays 9 AM - 2 PM!',
            type: 'news',
            timestamp: now
        },
        {
            id: 'dummy-5',
            text: 'Remember to drink plenty of water and stay hydrated.',
            type: 'info',
            timestamp: now
        }
    ];

    updateSlidesFromData(dummyAnnouncements);
}

// ================================
// Utilities
// ================================
function hideLoading() {
    loadingElement.style.opacity = '0';
    setTimeout(() => {
        loadingElement.classList.add('hidden');
    }, 500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(date) {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// ================================
// Initialization
// ================================
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    // Set default display mode immediately (will be overridden by Firebase settings)
    applyDisplayMode('light');

    // IMMEDIATELY show fallback content so screen is never empty
    updateSlidesFromData([]);
    hideLoading();

    initAudio();
    initDisplaySettingsListener();
    initMusicSettingsListener();
    loadCategories();
    initFullscreen();

    // Small delay to ensure Firebase is loaded, then fetch real data
    setTimeout(() => {
        try {
            initFirestore();
        } catch (e) {
            console.error('Error initializing Firestore:', e);
            showDummyData();
        }
    }, 0);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
