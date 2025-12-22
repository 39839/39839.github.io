// Mailchimp AJAX Newsletter Submission Handler
// Prevents page redirect and shows inline success/error messages

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mc-embedded-subscribe-form');

    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const responseDiv = document.getElementById('mce-response');
        const submitButton = form.querySelector('button[type="submit"]');
        const buttonText = submitButton.innerHTML;

        // Get form data
        const formData = new FormData(form);
        const email = formData.get('EMAIL');
        const firstName = formData.get('FNAME');
        const lastName = formData.get('LNAME');

        // Basic validation
        if (!email || !firstName || !lastName) {
            showResponse('Please fill in all fields.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showResponse('Please enter a valid email address.', 'error');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            Subscribing...
        `;

        // Convert form action URL for JSONP
        const url = form.action.replace('/post?', '/post-json?');
        const params = new URLSearchParams(formData);

        // Create script element for JSONP request
        const script = document.createElement('script');
        const callbackName = 'mailchimpCallback' + Date.now();

        // Define callback function
        window[callbackName] = function(data) {
            submitButton.disabled = false;
            submitButton.innerHTML = buttonText;

            if (data.result === 'success') {
                showResponse('Thank you for subscribing! Check your email for confirmation.', 'success');
                form.reset();

                // Hide success message after 5 seconds
                setTimeout(() => {
                    responseDiv.classList.remove('success');
                    responseDiv.style.display = 'none';
                }, 5000);
            } else {
                let errorMessage = data.msg || 'An error occurred. Please try again.';
                // Clean up Mailchimp's error messages
                errorMessage = errorMessage.replace(/0 - /g, '').replace(/<[^>]*>/g, '');
                showResponse(errorMessage, 'error');
            }

            // Cleanup
            document.head.removeChild(script);
            delete window[callbackName];
        };

        // Add callback parameter and make request
        script.src = url + '&' + params.toString() + '&c=' + callbackName;
        document.head.appendChild(script);
    });

    function showResponse(message, type) {
        const responseDiv = document.getElementById('mce-response');
        responseDiv.textContent = message;
        responseDiv.className = 'newsletter-response ' + type;
        responseDiv.style.display = 'block';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});

// Add spinning animation for loading state
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
