// ============================================
// EMAILJS CONFIGURATION & SECURITY
// ============================================

// EmailJS Configuration
const EMAILJS_CONFIG = {
    serviceId: 'service_dkz1pxc',
    publicKey: 'KCO8WUmL9pFFnr8ND',
    // Template IDs from EmailJS dashboard
    templates: {
        newsletter: 'template_4846tjj',   // Welcome template
        proposal: 'template_q0kbidi',     // Contact Us template (for proposals)
        team: 'template_q0kbidi'          // Contact Us template (for team applications)
    }
};

// Rate limiting configuration (client-side protection)
const RATE_LIMIT = {
    maxSubmissions: 3,
    timeWindow: 3600000, // 1 hour in milliseconds
    storageKey: 'catalyst_form_submissions'
};

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Sanitize user input to prevent XSS attacks
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
    if (!url) return true; // Optional field
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check rate limiting
 */
function checkRateLimit() {
    try {
        const submissions = JSON.parse(localStorage.getItem(RATE_LIMIT.storageKey) || '[]');
        const now = Date.now();

        // Filter out old submissions outside the time window
        const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT.timeWindow);

        // Update storage with filtered submissions
        localStorage.setItem(RATE_LIMIT.storageKey, JSON.stringify(recentSubmissions));

        // Check if limit exceeded
        if (recentSubmissions.length >= RATE_LIMIT.maxSubmissions) {
            const oldestSubmission = Math.min(...recentSubmissions);
            const timeUntilReset = Math.ceil((RATE_LIMIT.timeWindow - (now - oldestSubmission)) / 60000);
            throw new Error(`Too many submissions. Please try again in ${timeUntilReset} minutes.`);
        }

        // Record this submission
        recentSubmissions.push(now);
        localStorage.setItem(RATE_LIMIT.storageKey, JSON.stringify(recentSubmissions));

        return true;
    } catch (error) {
        if (error.message.includes('Too many submissions')) {
            throw error;
        }
        // If localStorage is unavailable, allow submission but log warning
        console.warn('Rate limiting unavailable:', error);
        return true;
    }
}

/**
 * Validate form data
 */
function validateFormData(formData, requiredFields) {
    const errors = [];

    for (const field of requiredFields) {
        const value = formData[field];

        if (!value || value.trim() === '') {
            errors.push(`${field} is required`);
            continue;
        }

        // Email validation
        if (field.toLowerCase().includes('email')) {
            if (!isValidEmail(value)) {
                errors.push(`Invalid email address`);
            }
        }

        // URL validation
        if (field.toLowerCase().includes('url') || field.toLowerCase().includes('link')) {
            if (!isValidUrl(value)) {
                errors.push(`Invalid URL format`);
            }
        }

        // Length validation
        if (value.length > 5000) {
            errors.push(`${field} is too long (max 5000 characters)`);
        }
    }

    return errors;
}

// ============================================
// EMAILJS HELPER FUNCTIONS
// ============================================

/**
 * Initialize EmailJS
 */
function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS library not loaded');
        return false;
    }

    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        return true;
    } catch (error) {
        console.error('EmailJS initialization failed:', error);
        return false;
    }
}

/**
 * Send email via EmailJS with security checks
 */
async function sendSecureEmail(templateId, templateParams, formType) {
    try {
        // Check rate limiting
        checkRateLimit();

        // Sanitize all template parameters
        const sanitizedParams = {};
        for (const [key, value] of Object.entries(templateParams)) {
            sanitizedParams[key] = typeof value === 'string' ? sanitizeInput(value) : value;
        }

        // Add metadata
        sanitizedParams.form_type = formType;
        sanitizedParams.submission_time = new Date().toISOString();
        sanitizedParams.user_agent = navigator.userAgent;

        // Send email
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            templateId,
            sanitizedParams
        );

        // Track with Google Analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_submission', {
                'event_category': 'engagement',
                'event_label': formType,
                'value': 1
            });
        }

        // Track with GTM if available
        if (typeof window.dataLayer !== 'undefined') {
            window.dataLayer.push({
                'event': 'formSubmission',
                'formType': formType,
                'formStatus': 'success'
            });
        }

        return { success: true, response };
    } catch (error) {
        // Track error with GTM if available
        if (typeof window.dataLayer !== 'undefined') {
            window.dataLayer.push({
                'event': 'formSubmission',
                'formType': formType,
                'formStatus': 'error',
                'errorMessage': error.message
            });
        }

        throw error;
    }
}

/**
 * Handle newsletter subscription - sends TWO emails:
 * 1. Welcome email to the subscriber
 * 2. Notification to you about the new subscriber
 */
async function handleNewsletterSubmit(email) {
    // Validate email
    if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
    }

    try {
        // Email 1: Send welcome email TO the subscriber using "Welcome" template
        const welcomeParams = {
            to_name: 'Subscriber',
            to_email: email,
            from_name: 'The Catalyst Magazine',
            message: `Thank you for subscribing to The Catalyst Magazine!\n\nYou'll receive updates about our latest STEM articles, exclusive interviews with scientists, D.C. area research spotlights, and brain teasers.\n\nWelcome to our community of changemakers!`,
            reply_to: 'noreply@catalyst-magazine.com',
            user_email: email,
            subscriber_email: email
        };

        await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.newsletter,
            welcomeParams
        );

        // Email 2: Send notification TO YOU about the new subscriber using "Contact Us" template
        const notificationParams = {
            to_name: 'The Catalyst Team',
            from_name: 'Newsletter System',
            from_email: email,
            message: `🎉 New Newsletter Subscriber!\n\nEmail: ${email}\nSubscribed: ${new Date().toLocaleString()}\n\nPlease add this email to your subscriber list.`,
            reply_to: email,
            user_email: email,
            subscriber_email: email,
            form_type: 'newsletter_notification',
            submission_time: new Date().toISOString()
        };

        await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.proposal, // Using Contact Us template for notification to you
            notificationParams
        );

        // Track with analytics
        if (typeof window.dataLayer !== 'undefined') {
            window.dataLayer.push({
                'event': 'formSubmission',
                'formType': 'newsletter',
                'formStatus': 'success'
            });
        }

        return { success: true };
    } catch (error) {
        // Track error
        if (typeof window.dataLayer !== 'undefined') {
            window.dataLayer.push({
                'event': 'formSubmission',
                'formType': 'newsletter',
                'formStatus': 'error',
                'errorMessage': error.message
            });
        }
        throw error;
    }
}

/**
 * Handle proposal submission
 */
async function handleProposalSubmit(formData) {
    const requiredFields = ['firstName', 'lastName', 'email', 'proposalType', 'title', 'description'];
    const errors = validateFormData(formData, requiredFields);

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    const message = `
New Article Proposal Submission

Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Proposal Type: ${formData.proposalType}
Project Title: ${formData.title}

Description:
${formData.description}

Link to Draft/Materials: ${formData.link || 'Not provided'}
    `.trim();

    const templateParams = {
        to_name: 'The Catalyst Team',
        from_name: `${formData.firstName} ${formData.lastName}`,
        from_email: formData.email,
        message: message,
        reply_to: formData.email,
        user_email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        proposal_type: formData.proposalType,
        project_title: formData.title,
        description: formData.description,
        link: formData.link || 'Not provided'
    };

    return await sendSecureEmail(
        EMAILJS_CONFIG.templates.proposal,
        templateParams,
        'proposal'
    );
}

/**
 * Handle team application
 */
async function handleTeamSubmit(formData) {
    const requiredFields = ['firstName', 'lastName', 'email', 'position'];
    const errors = validateFormData(formData, requiredFields);

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    const message = `
New Team Application

Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone || 'Not provided'}
Position Applied For: ${formData.position}

CV/LinkedIn: ${formData.cvLink || 'Not provided'}
Portfolio: ${formData.portfolioLink || 'Not provided'}
    `.trim();

    const templateParams = {
        to_name: 'The Catalyst Team',
        from_name: `${formData.firstName} ${formData.lastName}`,
        from_email: formData.email,
        message: message,
        reply_to: formData.email,
        user_email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || 'Not provided',
        position: formData.position,
        cv_link: formData.cvLink || 'Not provided',
        portfolio_link: formData.portfolioLink || 'Not provided'
    };

    return await sendSecureEmail(
        EMAILJS_CONFIG.templates.team,
        templateParams,
        'team'
    );
}

// ============================================
// FORM UI HELPERS
// ============================================

/**
 * Show loading state on button
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <svg style="animation: spin 1s linear infinite; width: 20px; height: 20px; display: inline-block;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
        `;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Submit';
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    showNotification(message, 'error');
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

// Add CSS for spinning animation
if (!document.getElementById('emailjs-styles')) {
    const style = document.createElement('style');
    style.id = 'emailjs-styles';
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize EmailJS when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmailJS);
} else {
    initEmailJS();
}
