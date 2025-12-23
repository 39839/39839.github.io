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

// ================================
// State
// ================================
let slidesData = [];
let activeIndex = 0;
let slideTimer = null;
let isMuted = true; // Start muted (browsers require this for autoplay)
let useYouTube = true; // Toggle between YouTube and MP3
let usingDummyData = false;

// Display styling/settings
const DEFAULT_DISPLAY_SETTINGS = {
    heroText: 'Welcome to Montgomery Medical Clinic',
    textSize: 22,
    bubbleSpeed: 1, // reused as slide speed multiplier
    bubbleSize: 1,  // reused as slide scale
    bgStart: '#d6ebff',
    bgEnd: '#f3fbff'
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
// Display settings (admin controlled)
// ================================
function applyDisplaySettings(newSettings) {
    displaySettings = { ...DEFAULT_DISPLAY_SETTINGS, ...newSettings };

    const root = document.documentElement.style;
    root.setProperty('--bg1', displaySettings.bgStart);
    root.setProperty('--bg2', displaySettings.bgEnd);
    root.setProperty('--slide-text-size', `${displaySettings.textSize}px`);
    root.setProperty('--slide-scale', displaySettings.bubbleSize);

    // Handle animated gradients
    const animatedGradient = displaySettings.gradientAnimated;
    const body = document.body;
    const ambientBg = document.querySelector('.ambient-bg');

    // Remove all animated gradient classes
    body.classList.remove('gradient-aurora', 'gradient-ocean', 'gradient-sunset');
    if (ambientBg) {
        ambientBg.classList.remove('gradient-aurora', 'gradient-ocean', 'gradient-sunset');
    }

    if (animatedGradient && animatedGradient !== 'false') {
        // Apply animated gradient class
        body.classList.add(`gradient-${animatedGradient}`);
        if (ambientBg) {
            ambientBg.classList.add(`gradient-${animatedGradient}`);
        }
    }

    if (displayTitle) {
        if (displaySettings.heroText) {
            displayTitle.textContent = displaySettings.heroText;
            displayTitle.classList.remove('hidden');
        } else {
            displayTitle.classList.add('hidden');
        }
    }
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
// Slideshow logic
// ================================
function createSlideElement(item) {
    const slide = document.createElement('article');
    slide.className = 'slide';
    slide.innerHTML = `
        <div class="slide-meta">
            <span class="slide-pill">${CONFIG.typeLabels[item.type] || 'Update'}</span>
        </div>
        <div class="slide-text">${escapeHtml(item.text)}</div>
    `;
    return slide;
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

    slides.forEach(slide => slide.classList.remove('active', 'previous'));
    const previous = slides[activeIndex];
    if (previous) previous.classList.add('previous');

    const current = slides[index];
    if (current) current.classList.add('active');

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

    // IMMEDIATELY show fallback content so screen is never empty
    updateSlidesFromData([]);
    hideLoading();

    initAudio();
    initDisplaySettingsListener();
    initMusicSettingsListener();

    // Small delay to ensure Firebase is loaded, then fetch real data
    setTimeout(() => {
        try {
            initFirestore();
        } catch (e) {
            console.error('Error initializing Firestore:', e);
            showDummyData();
        }
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
