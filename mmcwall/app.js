/**
 * MMCWall - Display View Logic
 * Elegant, slow-floating bubbles with smooth physics
 */

// ================================
// Configuration
// ================================
const CONFIG = {
    // Physics settings - elegant, screensaver-style drift
    baseSpeed: 0.12,          // Core movement speed
    speedVariation: 0.05,     // Small random variation
    bounceEnergy: 0.995,      // Keeps momentum on bounce
    padding: 48,              // Padding from screen edges

    // Easing for smooth movement
    easing: 0.035,            // Smooth easing factor

    // Subtle drift/floating effect
    driftAmplitude: 0.55,     // How much bubbles drift side-to-side
    driftSpeed: 0.0006,       // How fast the drift oscillates
    flowStrength: 0.018,      // Additional swirl
    flowSpeed: 0.00035,       // Flow field speed

    // Bubble settings
    minSeparation: 100,       // Minimum distance between bubbles
    collisionPush: 0.05,      // Gentle push when bubbles get close

    // Fade in animation
    fadeInDuration: 1600,     // ms for bubble fade in

    // Type labels
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
let bubbles = [];
let animationId = null;
let time = 0;
let isMuted = false;
let useYouTube = true; // Toggle between YouTube and MP3
let usingDummyData = false;

// Display styling/settings
const DEFAULT_DISPLAY_SETTINGS = {
    heroText: 'Welcome to Montgomery Medical Clinic',
    textSize: 22,
    bubbleSpeed: 1,
    bubbleSize: 1,
    bgStart: '#d6ebff',
    bgEnd: '#f3fbff'
};
let displaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
let settingsUnsubscribe = null;

// ================================
// DOM Elements
// ================================
const bubblesContainer = document.getElementById('bubbles-container');
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
// Bubble Class - Elegant Floating Motion
// ================================
class Bubble {
    constructor(data) {
        this.id = data.id;
        this.text = data.text;
        this.type = data.type || 'info';
        this.birthTime = Date.now();

        // Unique offset for drift animation (each bubble drifts differently)
        this.driftOffset = Math.random() * Math.PI * 2;
        this.driftOffsetY = Math.random() * Math.PI * 2;
        this.flowOffset = Math.random() * Math.PI * 2;

        // Create DOM element
        this.element = this.createElement();
        bubblesContainer.appendChild(this.element);

        // Wait for element to render, then initialize position
        requestAnimationFrame(() => {
            this.width = this.element.offsetWidth;
            this.height = this.element.offsetHeight;

            // Random starting position (within bounds)
            this.x = this.getRandomX();
            this.y = this.getRandomY();

            // Target position for smooth interpolation
            this.targetX = this.x;
            this.targetY = this.y;

            // Very slow random velocity
            const speed = CONFIG.baseSpeed + (Math.random() * CONFIG.speedVariation);
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            // Apply initial position
            this.updatePosition();

            // Fade in animation
            this.element.style.opacity = '0';
            const initialScale = (displaySettings.bubbleSize || 1) * 0.92;
            this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${initialScale})`;

            requestAnimationFrame(() => {
                this.element.style.transition = `opacity ${CONFIG.fadeInDuration}ms ease, transform ${CONFIG.fadeInDuration}ms ease`;
                this.element.style.opacity = '1';
                this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${displaySettings.bubbleSize || 1})`;

                // Remove transition after fade in for smooth animation
                setTimeout(() => {
                    this.element.style.transition = 'none';
                }, CONFIG.fadeInDuration);
            });
        });
    }

    createElement() {
        const bubble = document.createElement('div');
        bubble.className = `bubble type-${this.type}`;
        bubble.innerHTML = `
            <p class="bubble-text">${this.escapeHtml(this.text)}</p>
            <span class="bubble-type-label">${CONFIG.typeLabels[this.type] || this.type}</span>
        `;
        return bubble;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    get scale() {
        return displaySettings.bubbleSize || 1;
    }

    get scaledWidth() {
        return this.width * this.scale;
    }

    get scaledHeight() {
        return this.height * this.scale;
    }

    getRandomX() {
        const maxX = window.innerWidth - this.scaledWidth - CONFIG.padding;
        return CONFIG.padding + Math.random() * (maxX - CONFIG.padding);
    }

    getRandomY() {
        const maxY = window.innerHeight - this.scaledHeight - CONFIG.padding;
        return CONFIG.padding + Math.random() * (maxY - CONFIG.padding);
    }

    update(globalTime) {
        const speedMultiplier = displaySettings.bubbleSpeed || 1;
        const driftScale = 0.55 + speedMultiplier * 0.45;

        // Add gentle sinusoidal drift for organic floating feel
        const driftX = Math.sin(globalTime * CONFIG.driftSpeed + this.driftOffset) * CONFIG.driftAmplitude * driftScale;
        const driftY = Math.cos(globalTime * CONFIG.driftSpeed * 0.7 + this.driftOffsetY) * CONFIG.driftAmplitude * driftScale;

        // Flow field for graceful screensaver arcs
        const flowAngle = Math.sin(globalTime * CONFIG.flowSpeed + this.flowOffset) * 1.2 + Math.cos(globalTime * CONFIG.flowSpeed * 0.6 + this.flowOffset);
        const flowStrength = CONFIG.flowStrength * (0.7 + speedMultiplier * 0.6);
        this.vx += Math.cos(flowAngle) * flowStrength;
        this.vy += Math.sin(flowAngle) * flowStrength;

        // Update target position with velocity + drift
        this.targetX += (this.vx + driftX) * speedMultiplier;
        this.targetY += (this.vy + driftY) * speedMultiplier;

        // Smooth interpolation towards target (easing)
        this.x += (this.targetX - this.x) * CONFIG.easing;
        this.y += (this.targetY - this.y) * CONFIG.easing;

        // Bounce off edges (very gently)
        const maxX = window.innerWidth - this.scaledWidth - CONFIG.padding;
        const maxY = window.innerHeight - this.scaledHeight - CONFIG.padding;

        // Left/Right bounds
        if (this.targetX <= CONFIG.padding) {
            this.targetX = CONFIG.padding;
            this.vx = Math.abs(this.vx) * CONFIG.bounceEnergy;
        } else if (this.targetX >= maxX) {
            this.targetX = maxX;
            this.vx = -Math.abs(this.vx) * CONFIG.bounceEnergy;
        }

        // Top/Bottom bounds
        if (this.targetY <= CONFIG.padding) {
            this.targetY = CONFIG.padding;
            this.vy = Math.abs(this.vy) * CONFIG.bounceEnergy;
        } else if (this.targetY >= maxY) {
            this.targetY = maxY;
            this.vy = -Math.abs(this.vy) * CONFIG.bounceEnergy;
        }

        // Maintain minimum speed (very slow)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = CONFIG.baseSpeed * 8 * speedMultiplier;
        if (currentSpeed > maxSpeed) {
            const trim = maxSpeed / currentSpeed;
            this.vx *= trim;
            this.vy *= trim;
        }

        const minSpeed = CONFIG.baseSpeed * 0.45 * speedMultiplier;
        if (currentSpeed < minSpeed) {
            const boost = minSpeed / (currentSpeed || 0.01);
            this.vx *= boost;
            this.vy *= boost;
        }

        this.updatePosition();
    }

    updatePosition() {
        // Use translate3d for GPU acceleration
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
    }

    // Check and handle collision with another bubble (very gentle)
    handleCollision(other) {
        const dx = (this.x + this.scaledWidth / 2) - (other.x + other.scaledWidth / 2);
        const dy = (this.y + this.scaledHeight / 2) - (other.y + other.scaledHeight / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = (this.scaledWidth + other.scaledWidth) / 2 + CONFIG.minSeparation;

        if (distance < minDist && distance > 0) {
            // Very gentle push apart
            const pushX = (dx / distance) * CONFIG.collisionPush;
            const pushY = (dy / distance) * CONFIG.collisionPush;

            this.vx += pushX;
            this.vy += pushY;
            other.vx -= pushX;
            other.vy -= pushY;
        }
    }

    destroy() {
        // Fade out before removing
        this.element.style.transition = 'opacity 500ms ease, transform 500ms ease';
        this.element.style.opacity = '0';
        const fadeScale = (displaySettings.bubbleSize || 1) * 0.92;
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${fadeScale})`;

        setTimeout(() => {
            this.element.remove();
        }, 500);
    }
}

// ================================
// Animation Loop
// ================================
function animate() {
    time++;

    // Update all bubbles with global time for synchronized drift
    bubbles.forEach(bubble => bubble.update(time));

    // Handle collisions between bubbles (gentle push apart)
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            bubbles[i].handleCollision(bubbles[j]);
        }
    }

    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (!animationId) {
        animate();
    }
}

function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
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
    // Set initial state
    bgMusic.volume = 0.3;
    updateMuteUI();

    muteToggle.addEventListener('click', toggleMute);

    // Check if YouTube iframe loaded properly
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
        // Toggle YouTube by replacing src with muted/unmuted version
        const currentSrc = youtubePlayer.src;
        if (isMuted) {
            youtubePlayer.src = currentSrc.replace('mute=0', 'mute=1').replace('&mute=1', '&mute=1');
            if (!currentSrc.includes('mute=')) {
                youtubePlayer.src = currentSrc + '&mute=1';
            }
        } else {
            youtubePlayer.src = currentSrc.replace('mute=1', 'mute=0');
        }
    } else {
        // Use MP3 fallback
        if (isMuted) {
            bgMusic.pause();
        } else {
            bgMusic.play().catch(err => {
                console.log('Audio playback failed:', err);
            });
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
    root.setProperty('--bubble-text-size', `${displaySettings.textSize}px`);
    root.setProperty('--bubble-scale', displaySettings.bubbleSize);

    if (displayTitle) {
        if (displaySettings.heroText) {
            displayTitle.textContent = displaySettings.heroText;
            displayTitle.classList.remove('hidden');
        } else {
            displayTitle.classList.add('hidden');
        }
    }

    refreshBubbleLayout();
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
            console.error('Display settings listener error:', error);
            applyDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
        }
    );
}

// ================================
// Music Settings (YouTube link from admin)
// ================================
function initMusicSettingsListener() {
    if (typeof musicSettingsRef === 'undefined') {
        console.warn('Music settings ref not available. Using default YouTube link.');
        return;
    }

    musicSettingsRef.onSnapshot(
        (doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data.youtubeId && youtubePlayer) {
                    updateYoutubePlayer(data.youtubeId);
                }
            }
        },
        (error) => {
            console.error('Music settings listener error:', error);
        }
    );
}

function updateYoutubePlayer(videoId) {
    if (!youtubePlayer) return;

    // Build the YouTube embed URL with autoplay and loop settings
    const muteParam = isMuted ? '1' : '0';
    const newSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muteParam}&loop=1&playlist=${videoId}&controls=0`;

    // Only update if the video ID is different
    if (!youtubePlayer.src.includes(videoId)) {
        youtubePlayer.src = newSrc;
    }
}

// ================================
// Firebase Integration
// ================================
function initFirestore() {
    // Check if Firebase is initialized
    if (typeof announcementsRef === 'undefined') {
        console.error('Firebase not initialized. Check firebase-config.js');
        showDummyData();
        return;
    }

    // Listen for real-time updates
    announcementsRef
        .where('active', '==', true)
        .orderBy('timestamp', 'desc')
        .onSnapshot(
            (snapshot) => {
                hideLoading();

                if (snapshot.empty) {
                    if (!usingDummyData && bubbles.length === 0) {
                        showDummyData();
                    }
                    return;
                }

                // If we were showing placeholder bubbles, clear them once real data arrives
                if (usingDummyData) {
                    clearDummyBubbles();
                }

                // Track changes
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        addBubble(change.doc.id, change.doc.data());
                    } else if (change.type === 'removed') {
                        removeBubble(change.doc.id);
                    } else if (change.type === 'modified') {
                        // Remove and re-add to update content
                        removeBubble(change.doc.id);
                        if (change.doc.data().active) {
                            addBubble(change.doc.id, change.doc.data());
                        }
                    }
                });

                // Start animation if we have bubbles
                if (bubbles.length > 0) {
                    startAnimation();
                }
            },
            (error) => {
                console.error('Firestore error:', error);
                // Show dummy data on error
                showDummyData();
            }
        );
}

function addBubble(id, data) {
    // Check if bubble already exists
    if (bubbles.find(b => b.id === id)) {
        return;
    }

    const bubble = new Bubble({
        id,
        text: data.text,
        type: data.type || 'info'
    });

    bubbles.push(bubble);
}

function removeBubble(id) {
    const index = bubbles.findIndex(b => b.id === id);
    if (index !== -1) {
        bubbles[index].destroy();
        bubbles.splice(index, 1);
    }
}

// ================================
// Dummy Data (for testing)
// ================================
function showDummyData() {
    usingDummyData = true;
    hideLoading();

    console.log('Using dummy data for testing');

    const dummyAnnouncements = [
        {
            id: 'dummy-1',
            text: 'Welcome to Montgomery Medical Clinic! Please have a seat and we will be with you shortly.',
            type: 'welcome'
        },
        {
            id: 'dummy-2',
            text: 'Flu shots are now available. Ask our staff for more information.',
            type: 'health'
        },
        {
            id: 'dummy-3',
            text: 'Please wear a mask in all common areas for everyone\'s safety.',
            type: 'alert'
        },
        {
            id: 'dummy-4',
            text: 'New extended hours: Now open Saturdays 9 AM - 2 PM!',
            type: 'news'
        },
        {
            id: 'dummy-5',
            text: 'Remember to drink plenty of water and stay hydrated.',
            type: 'info'
        }
    ];

    // Stagger the bubble creation for a nice entrance effect
    dummyAnnouncements.forEach((data, index) => {
        setTimeout(() => {
            const bubble = new Bubble(data);
            bubbles.push(bubble);

            if (index === 0) {
                startAnimation();
            }
        }, index * 300);
    });
}

function clearDummyBubbles() {
    usingDummyData = false;
    const dummyIds = bubbles.filter(b => b.id.startsWith('dummy-')).map(b => b.id);
    dummyIds.forEach(removeBubble);
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

function refreshBubbleLayout() {
    bubbles.forEach(bubble => {
        bubble.width = bubble.element.offsetWidth;
        bubble.height = bubble.element.offsetHeight;

        const maxX = window.innerWidth - bubble.scaledWidth - CONFIG.padding;
        const maxY = window.innerHeight - bubble.scaledHeight - CONFIG.padding;

        bubble.targetX = Math.min(Math.max(bubble.targetX, CONFIG.padding), maxX);
        bubble.targetY = Math.min(Math.max(bubble.targetY, CONFIG.padding), maxY);
        bubble.x = Math.min(Math.max(bubble.x, CONFIG.padding), maxX);
        bubble.y = Math.min(Math.max(bubble.y, CONFIG.padding), maxY);

        bubble.updatePosition();
    });
}

// Handle window resize
function handleResize() {
    refreshBubbleLayout();
}

// ================================
// Initialization
// ================================
function init() {
    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize audio
    initAudio();

    // Listen to admin-controlled display settings
    initDisplaySettingsListener();

    // Listen to music settings (YouTube link from admin)
    initMusicSettingsListener();

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Initialize Firestore listener
    // Small delay to ensure Firebase is loaded
    setTimeout(() => {
        try {
            initFirestore();
        } catch (e) {
            console.error('Error initializing Firestore:', e);
            showDummyData();
        }
    }, 100);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
