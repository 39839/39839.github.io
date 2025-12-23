/**
 * MMCWall - Admin Panel
 * User-friendly interface for managing digital signage
 */

// ================================
// Configuration
// ================================

const TYPE_CONFIG = {
    info: { label: 'Information', color: '#3b82f6' },
    news: { label: 'News', color: '#10b981' },
    alert: { label: 'Alert', color: '#f59e0b' },
    health: { label: 'Health Tip', color: '#8b5cf6' },
    welcome: { label: 'Welcome', color: '#14b8a6' }
};

const DEFAULT_DISPLAY_SETTINGS = {
    heroText: 'Welcome to Montgomery Medical Clinic',
    textSize: 22,
    bubbleSpeed: 1,
    bubbleSize: 1,
    bgStart: '#d6ebff',
    bgEnd: '#f3fbff'
};

let currentUser = null;

// ================================
// DOM Elements
// ================================

// Login elements
const loginOverlay = document.getElementById('login-overlay');
const loginView = document.getElementById('login-view');
const forgotView = document.getElementById('forgot-view');
const loginForm = document.getElementById('login-form');
const forgotForm = document.getElementById('forgot-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const forgotEmailInput = document.getElementById('forgot-email-input');
const loginError = document.getElementById('login-error');
const forgotError = document.getElementById('forgot-error');
const forgotMessage = document.getElementById('forgot-message');
const loginBtn = document.getElementById('login-btn');
const loginBtnText = document.getElementById('login-btn-text');
const forgotBtn = document.getElementById('forgot-btn');
const forgotBtnText = document.getElementById('forgot-btn-text');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginLink = document.getElementById('back-to-login-link');

// Admin panel elements
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');
const sectionTitle = document.getElementById('section-title');

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

// Announcement elements
const announcementForm = document.getElementById('announcement-form');
const announcementText = document.getElementById('announcement-text');
const announcementActive = document.getElementById('announcement-active');
const charCurrent = document.getElementById('char-current');
const formBtnText = document.getElementById('form-btn-text');
const announcementsList = document.getElementById('announcements-list');
const bubblePreview = document.getElementById('bubble-preview');

// Display settings elements
const displaySettingsForm = document.getElementById('display-settings-form');
const heroTextInput = document.getElementById('hero-text');
const textSizeInput = document.getElementById('text-size');
const bubbleSpeedInput = document.getElementById('bubble-speed');
const bubbleSizeInput = document.getElementById('bubble-size');
const bgStartInput = document.getElementById('bg-start');
const bgEndInput = document.getElementById('bg-end');
const textSizeValue = document.getElementById('text-size-value');
const bubbleSpeedValue = document.getElementById('bubble-speed-value');
const bubbleSizeValue = document.getElementById('bubble-size-value');
const displayPreview = document.getElementById('display-preview');
const previewHeader = document.getElementById('preview-header');
const gradientAnimatedInput = document.getElementById('gradient-animated');
const gradientPresets = document.querySelectorAll('.gradient-preset');

// Music elements
const musicForm = document.getElementById('music-form');
const youtubeUrlInput = document.getElementById('youtube-url');
const youtubePreview = document.getElementById('youtube-preview');
const youtubePreviewFrame = document.getElementById('youtube-preview-frame');
const clearYoutubeBtn = document.getElementById('clear-youtube');
const musicBtnText = document.getElementById('music-btn-text');
const musicHistory = document.getElementById('music-history');
const suggestionItems = document.querySelectorAll('.suggestion-item');
const musicLoopInput = document.getElementById('music-loop');

// Toast container
const toastContainer = document.getElementById('toast-container');

// ================================
// Authentication
// ================================

function initAuth() {
    if (typeof auth === 'undefined') {
        console.error('Firebase Auth not initialized');
        showLoginError('Unable to connect. Please refresh the page.');
        return;
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            showAdminPanel();
        } else {
            currentUser = null;
            showLogin();
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showLoginError('Please enter both email and password');
        return;
    }

    loginBtn.disabled = true;
    loginBtnText.textContent = 'Signing in...';
    hideLoginError();

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(getAuthErrorMessage(error.code));
    } finally {
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Sign In';
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();

    const email = forgotEmailInput.value.trim();

    if (!email) {
        showForgotError('Please enter your email address');
        return;
    }

    forgotBtn.disabled = true;
    forgotBtnText.textContent = 'Sending...';
    hideForgotError();
    hideForgotMessage();

    try {
        await auth.sendPasswordResetEmail(email);
        showForgotMessage('Password reset email sent! Check your inbox.');
        forgotEmailInput.value = '';
    } catch (error) {
        console.error('Forgot password error:', error);
        showForgotError(getAuthErrorMessage(error.code));
    } finally {
        forgotBtn.disabled = false;
        forgotBtnText.textContent = 'Send Reset Link';
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error signing out', 'error');
    }
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Please enter a valid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again',
        'auth/network-request-failed': 'Network error. Check your internet connection'
    };
    return messages[errorCode] || 'Sign in failed. Please try again.';
}

// ================================
// UI State
// ================================

function showLogin() {
    loginOverlay.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    showLoginView();
}

function showLoginView() {
    loginView.classList.remove('hidden');
    forgotView.classList.add('hidden');
    hideLoginError();
    emailInput.focus();
}

function showForgotView() {
    loginView.classList.add('hidden');
    forgotView.classList.remove('hidden');
    hideForgotError();
    hideForgotMessage();
    forgotEmailInput.value = emailInput.value;
    forgotEmailInput.focus();
}

function showAdminPanel() {
    loginOverlay.classList.add('hidden');
    adminPanel.classList.remove('hidden');

    if (currentUser && userEmailDisplay) {
        userEmailDisplay.textContent = currentUser.email;
    }

    loadAnnouncements();
    loadDisplaySettings();
    loadMusicSettings();
    loadMusicHistory();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

function hideLoginError() {
    loginError.classList.add('hidden');
}

function showForgotError(message) {
    forgotError.textContent = message;
    forgotError.classList.remove('hidden');
}

function hideForgotError() {
    forgotError.classList.add('hidden');
}

function showForgotMessage(message) {
    forgotMessage.textContent = message;
    forgotMessage.classList.remove('hidden');
}

function hideForgotMessage() {
    forgotMessage.classList.add('hidden');
}

// ================================
// Navigation
// ================================

function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(sectionName) {
    // Update nav items
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });

    // Update sections
    contentSections.forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionName}`);
    });

    // Update title
    const titles = {
        announcements: 'Announcements',
        display: 'Display Settings',
        music: 'Background Music'
    };
    sectionTitle.textContent = titles[sectionName] || 'Admin Panel';
}

// ================================
// Announcements
// ================================

function loadAnnouncements() {
    if (typeof announcementsRef === 'undefined') {
        announcementsList.innerHTML = '<div class="empty-state"><p>Unable to load announcements</p></div>';
        return;
    }

    announcementsRef
        .orderBy('timestamp', 'desc')
        .onSnapshot(
            (snapshot) => {
                if (snapshot.empty) {
                    announcementsList.innerHTML = `
                        <div class="empty-state">
                            <p>No announcements yet</p>
                            <p class="empty-hint">Create your first announcement using the form above</p>
                        </div>
                    `;
                    return;
                }

                let html = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const typeConfig = TYPE_CONFIG[data.type] || TYPE_CONFIG.info;
                    const timestamp = data.timestamp?.toDate?.() || new Date();
                    const dateStr = formatDate(timestamp);

                    html += `
                        <div class="announcement-item ${data.active ? '' : 'inactive'}" data-id="${doc.id}">
                            <div class="announcement-color" style="background-color: ${typeConfig.color}"></div>
                            <div class="announcement-content">
                                <p class="announcement-text">${escapeHtml(data.text)}</p>
                                <div class="announcement-meta">
                                    <span class="meta-type">${typeConfig.label}</span>
                                    <span class="meta-divider">|</span>
                                    <span class="meta-date">${dateStr}</span>
                                    <span class="meta-divider">|</span>
                                    <span class="meta-status ${data.active ? 'status-active' : 'status-hidden'}">
                                        ${data.active ? 'Visible' : 'Hidden'}
                                    </span>
                                </div>
                            </div>
                            <div class="announcement-actions">
                                <button
                                    class="btn btn-small ${data.active ? 'btn-outline' : 'btn-primary'}"
                                    onclick="toggleActive('${doc.id}', ${!data.active})"
                                    title="${data.active ? 'Hide from display' : 'Show on display'}"
                                >
                                    ${data.active ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    class="btn btn-small btn-danger"
                                    onclick="deleteAnnouncement('${doc.id}')"
                                    title="Delete announcement"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                });

                announcementsList.innerHTML = html;
            },
            (error) => {
                console.error('Error loading announcements:', error);
                announcementsList.innerHTML = `
                    <div class="empty-state">
                        <p>Error loading announcements</p>
                        <p class="empty-hint">${error.message}</p>
                    </div>
                `;
            }
        );
}

async function addAnnouncement(e) {
    e.preventDefault();

    const text = announcementText.value.trim();
    const typeRadio = document.querySelector('input[name="announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const active = announcementActive.checked;

    if (!text) {
        showToast('Please enter a message', 'error');
        return;
    }

    if (typeof announcementsRef === 'undefined') {
        showToast('Unable to save. Please refresh the page.', 'error');
        return;
    }

    formBtnText.textContent = 'Adding...';
    announcementForm.querySelector('button[type="submit"]').disabled = true;

    try {
        await announcementsRef.add({
            text: text,
            type: type,
            active: active,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser ? currentUser.email : 'unknown'
        });

        // Reset form
        announcementText.value = '';
        document.querySelector('input[name="announcement-type"][value="info"]').checked = true;
        announcementActive.checked = true;
        charCurrent.textContent = '0';
        updatePreview();

        showToast('Announcement added successfully', 'success');
    } catch (error) {
        console.error('Error adding announcement:', error);
        showToast('Error adding announcement', 'error');
    } finally {
        formBtnText.textContent = 'Add Announcement';
        announcementForm.querySelector('button[type="submit"]').disabled = false;
    }
}

async function toggleActive(id, newState) {
    try {
        await announcementsRef.doc(id).update({ active: newState });
        showToast(newState ? 'Announcement is now visible' : 'Announcement hidden', 'success');
    } catch (error) {
        console.error('Error updating announcement:', error);
        showToast('Error updating announcement', 'error');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement? This cannot be undone.')) {
        return;
    }

    try {
        await announcementsRef.doc(id).delete();
        showToast('Announcement deleted', 'success');
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showToast('Error deleting announcement', 'error');
    }
}

window.toggleActive = toggleActive;
window.deleteAnnouncement = deleteAnnouncement;

// ================================
// Preview
// ================================

function updatePreview() {
    const text = announcementText.value.trim() || 'Your message will appear here...';
    const typeRadio = document.querySelector('input[name="announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const typeConfig = TYPE_CONFIG[type];

    // Update preview bubble
    bubblePreview.className = `bubble-preview type-${type}`;
    bubblePreview.querySelector('.bubble-preview-text').textContent = text;
    bubblePreview.querySelector('.bubble-preview-label').textContent = typeConfig.label;
}

function initPreview() {
    announcementText.addEventListener('input', updatePreview);

    document.querySelectorAll('input[name="announcement-type"]').forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });
}

// ================================
// Display Settings
// ================================

function loadDisplaySettings() {
    if (typeof displaySettingsRef === 'undefined') {
        applySettingsToForm(DEFAULT_DISPLAY_SETTINGS);
        return;
    }

    displaySettingsRef.get()
        .then(doc => {
            const data = doc.exists ? doc.data() : {};
            applySettingsToForm({ ...DEFAULT_DISPLAY_SETTINGS, ...data });
        })
        .catch(error => {
            console.error('Error loading display settings:', error);
            applySettingsToForm(DEFAULT_DISPLAY_SETTINGS);
        });
}

function applySettingsToForm(settings) {
    heroTextInput.value = settings.heroText || '';
    textSizeInput.value = settings.textSize || DEFAULT_DISPLAY_SETTINGS.textSize;
    bubbleSpeedInput.value = settings.bubbleSpeed || DEFAULT_DISPLAY_SETTINGS.bubbleSpeed;
    bubbleSizeInput.value = settings.bubbleSize || DEFAULT_DISPLAY_SETTINGS.bubbleSize;
    bgStartInput.value = settings.bgStart || DEFAULT_DISPLAY_SETTINGS.bgStart;
    bgEndInput.value = settings.bgEnd || DEFAULT_DISPLAY_SETTINGS.bgEnd;

    // Load animated gradient setting
    if (gradientAnimatedInput) {
        gradientAnimatedInput.value = settings.gradientAnimated || 'false';
    }

    // Highlight the matching preset
    updateSelectedPreset(settings.bgStart, settings.bgEnd, settings.gradientAnimated);

    updateSliderLabels();
    updateDisplayPreview();
}

function updateSelectedPreset(bgStart, bgEnd, animated) {
    gradientPresets.forEach(preset => {
        preset.classList.remove('selected');

        const presetAnimated = preset.dataset.animated;
        const presetStart = preset.dataset.start;
        const presetEnd = preset.dataset.end;

        if (animated && animated !== 'false' && presetAnimated === animated) {
            preset.classList.add('selected');
        } else if ((!animated || animated === 'false') &&
                   presetStart === bgStart && presetEnd === bgEnd) {
            preset.classList.add('selected');
        }
    });
}

function updateSliderLabels() {
    textSizeValue.textContent = `${textSizeInput.value}px`;
    bubbleSpeedValue.textContent = `${Number(bubbleSpeedInput.value).toFixed(1)}x`;
    bubbleSizeValue.textContent = `${Number(bubbleSizeInput.value).toFixed(1)}x`;
}

function updateDisplayPreview() {
    const bgStart = bgStartInput.value;
    const bgEnd = bgEndInput.value;
    const headerText = heroTextInput.value;
    const animated = gradientAnimatedInput ? gradientAnimatedInput.value : 'false';

    // Remove all animated gradient classes
    displayPreview.classList.remove('gradient-aurora', 'gradient-ocean', 'gradient-sunset');

    if (animated && animated !== 'false') {
        // Apply animated gradient class
        displayPreview.classList.add(`gradient-${animated}`);
        displayPreview.style.background = '';
    } else {
        // Apply static gradient
        displayPreview.style.background = `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)`;
    }

    if (headerText) {
        previewHeader.textContent = headerText;
        previewHeader.style.display = 'block';
    } else {
        previewHeader.style.display = 'none';
    }
}

async function saveDisplaySettings(e) {
    e.preventDefault();

    if (typeof displaySettingsRef === 'undefined') {
        showToast('Unable to save. Please refresh the page.', 'error');
        return;
    }

    const settings = {
        heroText: heroTextInput.value.trim(),
        textSize: Number(textSizeInput.value),
        bubbleSpeed: Number(bubbleSpeedInput.value),
        bubbleSize: Number(bubbleSizeInput.value),
        bgStart: bgStartInput.value,
        bgEnd: bgEndInput.value,
        gradientAnimated: gradientAnimatedInput ? gradientAnimatedInput.value : 'false'
    };

    const submitBtn = displaySettingsForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
        await displaySettingsRef.set(settings, { merge: true });
        showToast('Display settings saved', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function initDisplaySettings() {
    [textSizeInput, bubbleSpeedInput, bubbleSizeInput].forEach(input => {
        input.addEventListener('input', () => {
            updateSliderLabels();
            updateDisplayPreview();
        });
    });

    [bgStartInput, bgEndInput, heroTextInput].forEach(input => {
        input.addEventListener('input', updateDisplayPreview);
    });

    // When custom color is changed, clear animated selection
    [bgStartInput, bgEndInput].forEach(input => {
        input.addEventListener('input', () => {
            if (gradientAnimatedInput) {
                gradientAnimatedInput.value = 'false';
            }
            updateSelectedPreset(bgStartInput.value, bgEndInput.value, 'false');
        });
    });

    // Gradient preset click handlers
    gradientPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const animated = preset.dataset.animated;
            const start = preset.dataset.start;
            const end = preset.dataset.end;

            // Update hidden input for animated type
            if (gradientAnimatedInput) {
                gradientAnimatedInput.value = animated || 'false';
            }

            // If it's a static gradient, update color inputs
            if (animated === 'false' && start && end) {
                bgStartInput.value = start;
                bgEndInput.value = end;
            }

            // Update selection state
            gradientPresets.forEach(p => p.classList.remove('selected'));
            preset.classList.add('selected');

            // Update preview
            updateDisplayPreview();
        });
    });
}

// ================================
// Music Settings
// ================================

function loadMusicSettings() {
    if (typeof musicSettingsRef === 'undefined') return;

    musicSettingsRef.get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.youtubeUrl) {
                    youtubeUrlInput.value = data.youtubeUrl;
                    showYoutubePreview(data.youtubeUrl);
                }
                // Load loop setting (default to true if not set)
                if (musicLoopInput) {
                    musicLoopInput.checked = data.loop !== false;
                }
            }
        })
        .catch(error => {
            console.error('Error loading music settings:', error);
        });
}

function loadMusicHistory() {
    if (typeof musicHistoryRef === 'undefined') {
        return;
    }

    musicHistoryRef
        .orderBy('usedAt', 'desc')
        .limit(5)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                musicHistory.innerHTML = `
                    <div class="empty-state">
                        <p>No music history yet</p>
                        <p class="empty-hint">Your recently used YouTube links will appear here</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.usedAt?.toDate?.() || new Date();
                const dateStr = formatDate(date);

                html += `
                    <button type="button" class="history-item" data-url="${escapeHtml(data.url)}">
                        <div class="history-info">
                            <span class="history-title">${escapeHtml(data.title || 'YouTube Video')}</span>
                            <span class="history-date">Last used: ${dateStr}</span>
                        </div>
                        <span class="history-action">Use</span>
                    </button>
                `;
            });

            musicHistory.innerHTML = html;

            // Add click handlers
            musicHistory.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const url = item.dataset.url;
                    youtubeUrlInput.value = url;
                    showYoutubePreview(url);
                });
            });
        })
        .catch(error => {
            console.error('Error loading music history:', error);
        });
}

function extractYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;

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

function showYoutubePreview(url) {
    if (!url) {
        youtubePreview.classList.add('hidden');
        return;
    }

    const videoId = extractYoutubeId(url);
    if (videoId) {
        youtubePreviewFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
        youtubePreview.classList.remove('hidden');
    } else {
        youtubePreview.classList.add('hidden');
    }
}

function clearYoutubePreview() {
    youtubeUrlInput.value = '';
    youtubePreviewFrame.src = '';
    youtubePreview.classList.add('hidden');
}

async function saveMusicSettings(e) {
    e.preventDefault();

    const url = youtubeUrlInput.value.trim();
    const loop = musicLoopInput ? musicLoopInput.checked : true;

    if (url && !extractYoutubeId(url)) {
        showToast('Please enter a valid YouTube URL', 'error');
        return;
    }

    if (typeof musicSettingsRef === 'undefined') {
        showToast('Unable to save. Please refresh the page.', 'error');
        return;
    }

    musicBtnText.textContent = 'Saving...';
    musicForm.querySelector('button[type="submit"]').disabled = true;

    try {
        // Save current music setting with loop option
        const videoId = extractYoutubeId(url) || '';
        await musicSettingsRef.set({
            youtubeUrl: url,
            youtubeId: videoId,
            loop: loop,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add to history if URL is not empty
        if (url && typeof musicHistoryRef !== 'undefined') {
            // Check if this URL is already in history to avoid duplicates
            const existingQuery = await musicHistoryRef.where('url', '==', url).limit(1).get();
            if (existingQuery.empty) {
                await musicHistoryRef.add({
                    url: url,
                    title: 'YouTube Video',
                    usedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update existing entry's timestamp
                await existingQuery.docs[0].ref.update({
                    usedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            loadMusicHistory();
        }

        showToast(url ? 'Music setting saved successfully!' : 'Music cleared', 'success');
    } catch (error) {
        console.error('Error saving music settings:', error);
        showToast('Error saving music settings: ' + error.message, 'error');
    } finally {
        musicBtnText.textContent = 'Save Music Setting';
        musicForm.querySelector('button[type="submit"]').disabled = false;
    }
}

function initMusicSettings() {
    youtubeUrlInput.addEventListener('input', () => {
        const url = youtubeUrlInput.value.trim();
        if (url) {
            showYoutubePreview(url);
        } else {
            youtubePreview.classList.add('hidden');
        }
    });

    clearYoutubeBtn.addEventListener('click', clearYoutubePreview);

    // Suggested music click handlers
    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            youtubeUrlInput.value = url;
            showYoutubePreview(url);
        });
    });
}

// ================================
// Utilities
// ================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function updateCharCount() {
    const count = announcementText.value.length;
    charCurrent.textContent = count;
}

// ================================
// Toast Notifications
// ================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================
// Event Listeners
// ================================

function initEventListeners() {
    // Auth
    loginForm.addEventListener('submit', handleLogin);
    forgotForm.addEventListener('submit', handleForgotPassword);
    forgotPasswordLink.addEventListener('click', showForgotView);
    backToLoginLink.addEventListener('click', showLoginView);
    logoutBtn.addEventListener('click', handleLogout);

    // Announcements
    announcementForm.addEventListener('submit', addAnnouncement);
    announcementText.addEventListener('input', updateCharCount);

    // Display settings
    displaySettingsForm.addEventListener('submit', saveDisplaySettings);

    // Music
    musicForm.addEventListener('submit', saveMusicSettings);
}

// ================================
// Initialization
// ================================

function init() {
    initEventListeners();
    initNavigation();
    initPreview();
    initDisplaySettings();
    initMusicSettings();
    initAuth();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
