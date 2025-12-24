/**
 * MMCWall - Admin Panel
 * User-friendly interface for managing digital signage
 */

// ================================
// Configuration
// ================================

// Default built-in categories (can be deleted by user)
const DEFAULT_CATEGORIES = {
    info: { label: 'Information', color: '#3b82f6', isDefault: true },
    news: { label: 'News', color: '#10b981', isDefault: true },
    alert: { label: 'Alert', color: '#f59e0b', isDefault: true },
    health: { label: 'Health Tip', color: '#8b5cf6', isDefault: true },
    welcome: { label: 'Welcome', color: '#14b8a6', isDefault: true }
};

// Dynamic TYPE_CONFIG - will be populated from Firebase
let TYPE_CONFIG = { ...DEFAULT_CATEGORIES };

const DEFAULT_DISPLAY_SETTINGS = {
    heroText: 'Welcome to Montgomery Medical Clinic',
    textSize: 22,
    bubbleSpeed: 1,
    bubbleSize: 1,
    bgStart: '#d6ebff',
    bgEnd: '#f3fbff',
    gradientAnimated: 'false',
    cardsOnScreen: 1,
    slideColor: '#f6fbff',
    backgroundVideo: '',
    displayMode: 'light'
};

// Available background videos (loaded dynamically from movies/videos.json)
let AVAILABLE_VIDEOS = [];

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
const cardsOnScreenInput = document.getElementById('cards-on-screen');
const bgStartInput = document.getElementById('bg-start');
const bgEndInput = document.getElementById('bg-end');
const slideColorInput = document.getElementById('slide-color');
const textSizeValue = document.getElementById('text-size-value');
const bubbleSpeedValue = document.getElementById('bubble-speed-value');
const bubbleSizeValue = document.getElementById('bubble-size-value');
const cardsOnScreenValue = document.getElementById('cards-on-screen-value');
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
                                    class="btn btn-small btn-secondary"
                                    onclick="openEditAnnouncementModal('${doc.id}')"
                                    title="Edit announcement"
                                >
                                    Edit
                                </button>
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

    // Get plain text (for validation/character count) and formatted HTML
    const plainText = announcementText.textContent.trim();
    const formattedText = announcementText.innerHTML.trim();
    const typeRadio = document.querySelector('input[name="announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const active = announcementActive.checked;

    if (!plainText) {
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
            text: plainText,
            formattedText: sanitizeHtml(formattedText),
            type: type,
            active: active,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser ? currentUser.email : 'unknown'
        });

        // Reset form
        announcementText.innerHTML = '';
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

// Sanitize HTML to only allow safe formatting tags
function sanitizeHtml(html) {
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'span', 'br'];
    const allowedAttributes = ['style'];

    const temp = document.createElement('div');
    temp.innerHTML = html;

    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            if (!allowedTags.includes(tagName)) {
                // Replace disallowed tag with its text content
                const text = document.createTextNode(node.textContent);
                node.parentNode.replaceChild(text, node);
                return;
            }
            // Remove disallowed attributes
            Array.from(node.attributes).forEach(attr => {
                if (!allowedAttributes.includes(attr.name.toLowerCase())) {
                    node.removeAttribute(attr.name);
                }
            });
            // Clean children
            Array.from(node.childNodes).forEach(cleanNode);
        }
    }

    Array.from(temp.childNodes).forEach(cleanNode);
    return temp.innerHTML;
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
// Edit Announcement Modal
// ================================

async function openEditAnnouncementModal(announcementId) {
    const modal = document.getElementById('edit-announcement-modal');
    const editText = document.getElementById('edit-announcement-text');
    const editActive = document.getElementById('edit-announcement-active');
    const editIdInput = document.getElementById('edit-announcement-id');
    const editCharCurrent = document.getElementById('edit-char-current');

    if (!modal || !editText) return;

    try {
        // Fetch the announcement data from Firebase
        const doc = await announcementsRef.doc(announcementId).get();
        if (!doc.exists) {
            showToast('Announcement not found', 'error');
            return;
        }

        const data = doc.data();

        // Populate the form with existing data
        editIdInput.value = announcementId;
        editText.innerHTML = data.formattedText || escapeHtml(data.text);
        editActive.checked = data.active;
        editCharCurrent.textContent = editText.textContent.length;

        // Render category selector for edit modal
        renderEditCategorySelector(data.type);

        // Update preview
        updateEditPreview();

        // Show modal
        modal.style.display = 'flex';
        editText.focus();
    } catch (error) {
        console.error('Error loading announcement:', error);
        showToast('Error loading announcement', 'error');
    }
}

function closeEditAnnouncementModal() {
    const modal = document.getElementById('edit-announcement-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderEditCategorySelector(selectedType) {
    const typeSelector = document.getElementById('edit-type-selector');
    if (!typeSelector) return;

    let html = '';
    for (const [key, config] of Object.entries(TYPE_CONFIG)) {
        html += `
            <label class="type-option">
                <input type="radio" name="edit-announcement-type" value="${key}" ${key === selectedType ? 'checked' : ''}>
                <span class="type-card">
                    <span class="type-color" style="background-color: ${config.color}"></span>
                    <span class="type-name">${config.label}</span>
                </span>
            </label>
        `;
    }

    typeSelector.innerHTML = html;

    // Add change listeners for preview
    document.querySelectorAll('input[name="edit-announcement-type"]').forEach(radio => {
        radio.addEventListener('change', updateEditPreview);
    });
}

function updateEditPreview() {
    const editText = document.getElementById('edit-announcement-text');
    const editBubblePreview = document.getElementById('edit-bubble-preview');
    if (!editText || !editBubblePreview) return;

    const formattedText = editText.innerHTML.trim();
    const plainText = editText.textContent.trim();
    const typeRadio = document.querySelector('input[name="edit-announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const typeConfig = TYPE_CONFIG[type] || TYPE_CONFIG.info;

    // Update preview bubble
    editBubblePreview.className = `bubble-preview type-${type}`;
    const previewTextEl = editBubblePreview.querySelector('.bubble-preview-text');
    if (plainText) {
        previewTextEl.innerHTML = formattedText;
    } else {
        previewTextEl.textContent = 'Your message will appear here...';
    }
    editBubblePreview.querySelector('.bubble-preview-label').textContent = typeConfig.label;
}

function updateEditCharCount() {
    const editText = document.getElementById('edit-announcement-text');
    const editCharCurrent = document.getElementById('edit-char-current');
    if (editText && editCharCurrent) {
        editCharCurrent.textContent = editText.textContent.length;
    }
}

async function saveEditAnnouncement(e) {
    e.preventDefault();

    const editText = document.getElementById('edit-announcement-text');
    const editActive = document.getElementById('edit-announcement-active');
    const editIdInput = document.getElementById('edit-announcement-id');
    const saveBtn = document.getElementById('save-edit-btn');

    const announcementId = editIdInput.value;
    const plainText = editText.textContent.trim();
    const formattedText = editText.innerHTML.trim();
    const typeRadio = document.querySelector('input[name="edit-announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const active = editActive.checked;

    if (!plainText) {
        showToast('Please enter a message', 'error');
        return;
    }

    if (!announcementId) {
        showToast('Invalid announcement', 'error');
        return;
    }

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
        await announcementsRef.doc(announcementId).update({
            text: plainText,
            formattedText: sanitizeHtml(formattedText),
            type: type,
            active: active,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser ? currentUser.email : 'unknown'
        });

        closeEditAnnouncementModal();
        showToast('Announcement updated successfully', 'success');
    } catch (error) {
        console.error('Error updating announcement:', error);
        showToast('Error updating announcement', 'error');
    } finally {
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
    }
}

function initEditAnnouncementModal() {
    const modal = document.getElementById('edit-announcement-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const form = document.getElementById('edit-announcement-form');
    const editText = document.getElementById('edit-announcement-text');

    if (closeBtn) closeBtn.addEventListener('click', closeEditAnnouncementModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditAnnouncementModal);
    if (form) form.addEventListener('submit', saveEditAnnouncement);

    // Character count and preview updates
    if (editText) {
        editText.addEventListener('input', () => {
            updateEditCharCount();
            updateEditPreview();
        });

        // Handle paste to strip unwanted formatting
        editText.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    // Format buttons for edit modal
    const editFormatBtns = document.querySelectorAll('.edit-format-btn');
    editFormatBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            document.execCommand(command, false, null);
        });
    });

    // Font family select for edit modal
    const editFontSelect = document.getElementById('edit-font-family-select');
    if (editFontSelect) {
        editFontSelect.addEventListener('change', () => {
            const editText = document.getElementById('edit-announcement-text');
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && editText.contains(selection.anchorNode)) {
                document.execCommand('fontName', false, editFontSelect.value);
            }
        });
    }

    // Text color picker for edit modal
    const editColorPicker = document.getElementById('edit-text-color-picker');
    if (editColorPicker) {
        editColorPicker.addEventListener('input', () => {
            const editText = document.getElementById('edit-announcement-text');
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && editText.contains(selection.anchorNode)) {
                document.execCommand('foreColor', false, editColorPicker.value);
            }
        });
    }

    // Close modal on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEditAnnouncementModal();
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeEditAnnouncementModal();
        }
    });
}

window.openEditAnnouncementModal = openEditAnnouncementModal;

// ================================
// Category Management
// ================================

function loadCategories() {
    // Check if categoriesRef exists (from firebase-config.js)
    if (typeof categoriesRef === 'undefined') {
        // Use default categories if Firebase not available
        TYPE_CONFIG = { ...DEFAULT_CATEGORIES };
        renderCategorySelector();
        return;
    }

    categoriesRef.onSnapshot(
        (doc) => {
            if (doc.exists && doc.data().categories) {
                TYPE_CONFIG = doc.data().categories;
            } else {
                // Initialize with defaults if no categories exist
                TYPE_CONFIG = { ...DEFAULT_CATEGORIES };
                saveCategoriesToFirebase();
            }
            renderCategorySelector();
        },
        (error) => {
            console.error('Error loading categories:', error);
            TYPE_CONFIG = { ...DEFAULT_CATEGORIES };
            renderCategorySelector();
        }
    );
}

function renderCategorySelector() {
    const typeSelector = document.getElementById('type-selector');
    if (!typeSelector) return;

    let html = '';
    let firstKey = null;

    for (const [key, config] of Object.entries(TYPE_CONFIG)) {
        if (!firstKey) firstKey = key;

        const isCustom = !config.isDefault;
        const deleteBtn = isCustom ? `
            <button type="button" class="delete-category" onclick="event.preventDefault(); event.stopPropagation(); deleteCategory('${key}')" title="Delete category">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        ` : '';

        html += `
            <label class="type-option">
                <input type="radio" name="announcement-type" value="${key}" ${key === firstKey ? 'checked' : ''}>
                <span class="type-card ${isCustom ? 'custom-category' : ''}">
                    <span class="type-color" style="background-color: ${config.color}"></span>
                    <span class="type-name">${config.label}</span>
                    ${deleteBtn}
                </span>
            </label>
        `;
    }

    typeSelector.innerHTML = html;

    // Add change listeners for preview
    document.querySelectorAll('input[name="announcement-type"]').forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });
}

function openCategoryModal(editId = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const editIdInput = document.getElementById('category-edit-id');
    const saveBtn = document.getElementById('save-category-btn');

    if (editId && TYPE_CONFIG[editId]) {
        // Edit mode
        title.textContent = 'Edit Category';
        nameInput.value = TYPE_CONFIG[editId].label;
        colorInput.value = TYPE_CONFIG[editId].color;
        editIdInput.value = editId;
        saveBtn.textContent = 'Save Changes';
    } else {
        // Create mode
        title.textContent = 'Create Custom Category';
        nameInput.value = '';
        colorInput.value = '#3b82f6';
        editIdInput.value = '';
        saveBtn.textContent = 'Create Category';
    }

    updateCategoryPreview();
    modal.style.display = 'flex';
    nameInput.focus();
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    modal.style.display = 'none';
}

function updateCategoryPreview() {
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const previewPill = document.getElementById('category-preview-pill');

    const name = nameInput.value.trim() || 'NEW CATEGORY';
    const color = colorInput.value;

    previewPill.textContent = name.toUpperCase();
    previewPill.style.background = hexToRgba(color, 0.15);
    previewPill.style.color = color;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function saveCategory(e) {
    e.preventDefault();

    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const editIdInput = document.getElementById('category-edit-id');

    const name = nameInput.value.trim();
    const color = colorInput.value;
    const editId = editIdInput.value;

    if (!name) {
        showToast('Please enter a category name', 'error');
        return;
    }

    // Generate a unique key from the name
    const key = editId || name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check for duplicate names (excluding current edit)
    for (const [existingKey, config] of Object.entries(TYPE_CONFIG)) {
        if (existingKey !== editId && config.label.toLowerCase() === name.toLowerCase()) {
            showToast('A category with this name already exists', 'error');
            return;
        }
    }

    // Update TYPE_CONFIG
    if (editId && editId !== key) {
        // Key changed, remove old entry
        delete TYPE_CONFIG[editId];
    }

    TYPE_CONFIG[key] = {
        label: name,
        color: color,
        isDefault: false
    };

    await saveCategoriesToFirebase();
    closeCategoryModal();
    renderCategorySelector();
    showToast(editId ? 'Category updated' : 'Category created', 'success');
}

async function deleteCategory(key) {
    if (!confirm(`Delete the "${TYPE_CONFIG[key]?.label}" category?`)) {
        return;
    }

    delete TYPE_CONFIG[key];
    await saveCategoriesToFirebase();
    renderCategorySelector();
    showToast('Category deleted', 'success');
}

async function saveCategoriesToFirebase() {
    if (typeof categoriesRef === 'undefined') return;

    try {
        await categoriesRef.set({ categories: TYPE_CONFIG });
    } catch (error) {
        console.error('Error saving categories:', error);
        showToast('Error saving categories', 'error');
    }
}

function initCategoryModal() {
    const addBtn = document.getElementById('add-category-btn');
    const closeBtn = document.getElementById('close-category-modal');
    const cancelBtn = document.getElementById('cancel-category-btn');
    const form = document.getElementById('category-form');
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const modal = document.getElementById('category-modal');

    if (addBtn) addBtn.addEventListener('click', () => openCategoryModal());
    if (closeBtn) closeBtn.addEventListener('click', closeCategoryModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCategoryModal);
    if (form) form.addEventListener('submit', saveCategory);

    // Update preview on input
    if (nameInput) nameInput.addEventListener('input', updateCategoryPreview);
    if (colorInput) colorInput.addEventListener('input', updateCategoryPreview);

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            if (colorInput) {
                colorInput.value = color;
                updateCategoryPreview();
            }
            // Update active state
            document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Close modal on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCategoryModal();
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeCategoryModal();
        }
    });
}

window.deleteCategory = deleteCategory;

// ================================
// Preview
// ================================

function updatePreview() {
    const formattedText = announcementText.innerHTML.trim();
    const plainText = announcementText.textContent.trim();
    const typeRadio = document.querySelector('input[name="announcement-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'info';
    const typeConfig = TYPE_CONFIG[type];

    // Update preview bubble with formatted text
    bubblePreview.className = `bubble-preview type-${type}`;
    const previewTextEl = bubblePreview.querySelector('.bubble-preview-text');
    if (plainText) {
        previewTextEl.innerHTML = formattedText;
    } else {
        previewTextEl.textContent = 'Your message will appear here...';
    }
    bubblePreview.querySelector('.bubble-preview-label').textContent = typeConfig.label;

    // Update full display preview with current settings
    updateFullDisplayPreview();
}

function updateFullDisplayPreview() {
    const fullPreview = document.getElementById('full-display-preview');
    if (!fullPreview) return;

    const previewBg = fullPreview.querySelector('.preview-background');
    const previewClock = fullPreview.querySelector('.preview-clock');

    // Get current display settings
    const bgStart = bgStartInput ? bgStartInput.value : DEFAULT_DISPLAY_SETTINGS.bgStart;
    const bgEnd = bgEndInput ? bgEndInput.value : DEFAULT_DISPLAY_SETTINGS.bgEnd;
    const cardColor = slideColorInput ? slideColorInput.value : DEFAULT_DISPLAY_SETTINGS.slideColor;
    const animatedGradient = gradientAnimatedInput ? gradientAnimatedInput.value : 'false';

    // Update background gradient
    if (previewBg) {
        // Remove any animated gradient classes
        fullPreview.classList.remove('gradient-aurora', 'gradient-ocean', 'gradient-sunset',
            'gradient-aquarium', 'gradient-beach', 'gradient-rain', 'gradient-northern', 'gradient-cosmic', 'gradient-rainbow');

        if (animatedGradient && animatedGradient !== 'false') {
            fullPreview.classList.add(`gradient-${animatedGradient}`);
            previewBg.style.background = '';
        } else {
            previewBg.style.background = `linear-gradient(135deg, ${bgStart}, ${bgEnd})`;
        }
    }

    // Update card color
    if (bubblePreview) {
        bubblePreview.style.background = `linear-gradient(145deg, ${cardColor}, ${adjustColor(cardColor, -5)})`;
    }

    // Update clock with current time
    if (previewClock) {
        const now = new Date();
        previewClock.textContent = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}

// Helper to slightly darken/lighten a color
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function initPreview() {
    announcementText.addEventListener('input', updatePreview);

    document.querySelectorAll('input[name="announcement-type"]').forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });

    // Also update preview when display settings change
    if (bgStartInput) bgStartInput.addEventListener('input', updateFullDisplayPreview);
    if (bgEndInput) bgEndInput.addEventListener('input', updateFullDisplayPreview);
    if (slideColorInput) slideColorInput.addEventListener('input', updateFullDisplayPreview);
    if (gradientAnimatedInput) gradientAnimatedInput.addEventListener('change', updateFullDisplayPreview);

    // Update clock every minute
    setInterval(() => {
        const previewClock = document.querySelector('.preview-clock');
        if (previewClock) {
            const now = new Date();
            previewClock.textContent = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    }, 60000);

    // Initial update
    setTimeout(updateFullDisplayPreview, 500);
}

// ================================
// Rich Text Formatting Toolbar
// ================================

function initFormattingToolbar() {
    const formatBtns = document.querySelectorAll('.format-btn');
    const fontSelect = document.getElementById('font-family-select');
    const colorPicker = document.getElementById('text-color-picker');

    // Format buttons (bold, italic, underline)
    formatBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent losing focus on the editor
            const command = btn.dataset.command;
            document.execCommand(command, false, null);
            updateFormatButtonStates();
        });
    });

    // Font family select
    if (fontSelect) {
        fontSelect.addEventListener('change', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && announcementText.contains(selection.anchorNode)) {
                document.execCommand('fontName', false, fontSelect.value);
            }
        });
    }

    // Text color picker
    if (colorPicker) {
        colorPicker.addEventListener('input', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && announcementText.contains(selection.anchorNode)) {
                document.execCommand('foreColor', false, colorPicker.value);
            }
        });
    }

    // Update button states when selection changes
    announcementText.addEventListener('keyup', updateFormatButtonStates);
    announcementText.addEventListener('mouseup', updateFormatButtonStates);
    announcementText.addEventListener('focus', updateFormatButtonStates);

    // Handle paste to strip unwanted formatting
    announcementText.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
}

function updateFormatButtonStates() {
    document.querySelectorAll('.format-btn').forEach(btn => {
        const command = btn.dataset.command;
        if (document.queryCommandState(command)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
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
    cardsOnScreenInput.value = settings.cardsOnScreen || DEFAULT_DISPLAY_SETTINGS.cardsOnScreen;
    bgStartInput.value = settings.bgStart || DEFAULT_DISPLAY_SETTINGS.bgStart;
    bgEndInput.value = settings.bgEnd || DEFAULT_DISPLAY_SETTINGS.bgEnd;
    slideColorInput.value = settings.slideColor || DEFAULT_DISPLAY_SETTINGS.slideColor;

    // Load animated gradient setting
    if (gradientAnimatedInput) {
        gradientAnimatedInput.value = settings.gradientAnimated || 'false';
    }

    // Load background video setting
    setSelectedVideo(settings.backgroundVideo || '');

    // Load display mode setting
    setDisplayMode(settings.displayMode || 'light');

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
    cardsOnScreenValue.textContent = `${cardsOnScreenInput.value}`;
}

function updateDisplayPreview() {
    const bgStart = bgStartInput.value;
    const bgEnd = bgEndInput.value;
    const headerText = heroTextInput.value;
    const animated = gradientAnimatedInput ? gradientAnimatedInput.value : 'false';
    const cardColor = slideColorInput ? slideColorInput.value : DEFAULT_DISPLAY_SETTINGS.slideColor;
    const gradientClasses = ['gradient-aurora', 'gradient-ocean', 'gradient-sunset', 'gradient-aquarium', 'gradient-beach', 'gradient-rain'];

    // Remove all animated gradient classes
    displayPreview.classList.remove(...gradientClasses);

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

    // Tint preview bubbles
    displayPreview.querySelectorAll('.preview-bubble').forEach(bubble => {
        bubble.style.background = cardColor;
    });
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
        gradientAnimated: gradientAnimatedInput ? gradientAnimatedInput.value : 'false',
        cardsOnScreen: Number(cardsOnScreenInput.value),
        slideColor: slideColorInput.value,
        backgroundVideo: selectedVideo || '',
        displayMode: selectedDisplayMode || 'light'
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
    [textSizeInput, bubbleSpeedInput, bubbleSizeInput, cardsOnScreenInput].forEach(input => {
        input.addEventListener('input', () => {
            updateSliderLabels();
            updateDisplayPreview();
        });
    });

    [bgStartInput, bgEndInput, heroTextInput, slideColorInput].forEach(input => {
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

    // Initialize video selector (async - loads from JSON)
    initVideoSelector().then(() => {
        // Re-apply video selection after videos are loaded
        if (selectedVideo) {
            setSelectedVideo(selectedVideo);
        }
    });

    // Initialize display mode selector
    initDisplayMode();
}

// ================================
// Background Video Management
// ================================

let selectedVideo = '';

async function initVideoSelector() {
    // Load videos from JSON file
    await loadVideosFromJson();

    renderVideoOptions();

    // Add change listeners for video selection
    document.querySelectorAll('input[name="background-video"]').forEach(radio => {
        radio.addEventListener('change', handleVideoSelection);
    });
}

async function loadVideosFromJson() {
    try {
        const response = await fetch('movies/videos.json?' + Date.now()); // Cache bust
        if (response.ok) {
            const videos = await response.json();
            AVAILABLE_VIDEOS = videos.map(v => ({
                id: v.id,
                name: v.name,
                youtubeId: v.youtubeId,
                thumbnail: v.description || v.thumbnail || ''
            }));
            console.log('Loaded videos from JSON:', AVAILABLE_VIDEOS);
        } else {
            console.warn('Could not load videos.json, using empty list');
            AVAILABLE_VIDEOS = [];
        }
    } catch (error) {
        console.error('Error loading videos.json:', error);
        AVAILABLE_VIDEOS = [];
    }
}

function renderVideoOptions() {
    const videoOptionsContainer = document.getElementById('video-options');
    if (!videoOptionsContainer) return;

    let html = '';
    AVAILABLE_VIDEOS.forEach(video => {
        html += `
            <label class="video-option">
                <input type="radio" name="background-video" value="${video.youtubeId}">
                <span class="video-card">
                    <span class="video-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </span>
                    <span class="video-name">${video.name}</span>
                    <span class="video-desc">${video.thumbnail}</span>
                </span>
            </label>
        `;
    });

    videoOptionsContainer.innerHTML = html;

    // Re-add change listeners after rendering
    document.querySelectorAll('input[name="background-video"]').forEach(radio => {
        radio.addEventListener('change', handleVideoSelection);
    });
}

function handleVideoSelection(e) {
    selectedVideo = e.target.value;
    updateVideoPreview(selectedVideo);
    updateDisplayPreview();
}

function updateVideoPreview(youtubeId) {
    const previewContainer = document.getElementById('video-preview-container');
    const previewIframe = document.getElementById('admin-video-preview');

    if (!previewContainer || !previewIframe) return;

    if (youtubeId) {
        // Use YouTube embed for preview
        previewIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0`;
        previewContainer.classList.remove('hidden');
    } else {
        previewIframe.src = '';
        previewContainer.classList.add('hidden');
    }
}

function setSelectedVideo(videoFile) {
    selectedVideo = videoFile || '';

    // Update radio buttons
    const radios = document.querySelectorAll('input[name="background-video"]');
    radios.forEach(radio => {
        radio.checked = radio.value === selectedVideo;
    });

    updateVideoPreview(selectedVideo);
}

// ================================
// Display Mode Management
// ================================

let selectedDisplayMode = 'light';

function initDisplayMode() {
    // Add change listeners for display mode selection
    document.querySelectorAll('input[name="display-mode"]').forEach(radio => {
        radio.addEventListener('change', handleDisplayModeChange);
    });
}

function handleDisplayModeChange(e) {
    selectedDisplayMode = e.target.value;
    updateDisplayPreview();
}

function setDisplayMode(mode) {
    selectedDisplayMode = mode || 'light';

    // Update radio buttons
    const radios = document.querySelectorAll('input[name="display-mode"]');
    radios.forEach(radio => {
        radio.checked = radio.value === selectedDisplayMode;
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
    const count = announcementText.textContent.length;
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
    initFormattingToolbar();
    initCategoryModal();
    initEditAnnouncementModal();
    loadCategories();
    initDisplaySettings();
    initMusicSettings();
    initAuth();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
