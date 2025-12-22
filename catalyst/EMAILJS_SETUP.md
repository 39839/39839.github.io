# EmailJS Setup Guide for The Catalyst Magazine

This guide will help you set up the three email templates required for your website forms.

## Prerequisites

- EmailJS account (https://www.emailjs.com/)
- Service ID: `service_dkz1pxc`
- Public Key: `KCO8WUmL9pFFnr8ND`

## Creating Email Templates

You need to create **3 email templates** in your EmailJS dashboard. Follow these steps:

### 1. Newsletter Subscription Template

**Template Name:** Newsletter Subscription
**Suggested Template ID:** `template_newsletter`

**Email Subject:**
```
Welcome to The Catalyst Magazine Newsletter!
```

**Email Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #1976D2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to The Catalyst!</h1>
        </div>
        <div class="content">
            <p>Hi there!</p>

            <p>Thank you for subscribing to The Catalyst Magazine newsletter. You're now part of our community of science enthusiasts, innovators, and changemakers!</p>

            <p>You'll receive:</p>
            <ul>
                <li>Latest STEM articles and features</li>
                <li>Exclusive interviews with leading scientists</li>
                <li>D.C. area research spotlights</li>
                <li>Brain teasers and challenges</li>
            </ul>

            <p>Email submitted: <strong>{{to_email}}</strong></p>

            <div style="text-align: center;">
                <a href="https://catalyst-magazine.com" class="button">Visit Our Website</a>
            </div>

            <p>Stay curious!</p>
            <p><strong>The Catalyst Magazine Team</strong><br>
            Washington D.C.'s Student-Run STEM Magazine</p>
        </div>
        <div class="footer">
            <p>Submission Time: {{submission_time}}</p>
            <p>You're receiving this email because you subscribed at catalyst-magazine.com</p>
        </div>
    </div>
</body>
</html>
```

**Template Variables to use:**
- `{{to_email}}` - The subscriber's email
- `{{submission_time}}` - Timestamp of submission
- `{{from_name}}` - Your magazine name
- `{{reply_to}}` - Reply email address

---

### 2. Article Proposal Template

**Template Name:** Article Proposal Submission
**Suggested Template ID:** `template_proposal`

**Email Subject:**
```
New Article Proposal: {{project_title}}
```

**Email Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #0D47A1; }
        .value { padding: 10px; background: white; border-left: 3px solid #1976D2; margin-top: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 New Article Proposal</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Name:</div>
                <div class="value">{{first_name}} {{last_name}}</div>
            </div>

            <div class="field">
                <div class="label">Email:</div>
                <div class="value">{{email}}</div>
            </div>

            <div class="field">
                <div class="label">Proposal Type:</div>
                <div class="value">{{proposal_type}}</div>
            </div>

            <div class="field">
                <div class="label">Project Title:</div>
                <div class="value">{{project_title}}</div>
            </div>

            <div class="field">
                <div class="label">Description:</div>
                <div class="value">{{description}}</div>
            </div>

            <div class="field">
                <div class="label">Link to Draft/Materials:</div>
                <div class="value">{{link}}</div>
            </div>
        </div>
        <div class="footer">
            <p><strong>Submission Details</strong></p>
            <p>Form Type: {{form_type}}</p>
            <p>Submitted: {{submission_time}}</p>
            <p>User Agent: {{user_agent}}</p>
        </div>
    </div>
</body>
</html>
```

**Template Variables:**
- `{{first_name}}` - Applicant's first name
- `{{last_name}}` - Applicant's last name
- `{{email}}` - Applicant's email
- `{{proposal_type}}` - Type of article (Feature, Profile, etc.)
- `{{project_title}}` - Title of the proposal
- `{{description}}` - Proposal description
- `{{link}}` - Link to draft or materials
- `{{form_type}}` - Form identifier
- `{{submission_time}}` - Timestamp
- `{{user_agent}}` - Browser info (for security)
- `{{reply_to}}` - Reply email

---

### 3. Team Application Template

**Template Name:** Team Application
**Suggested Template ID:** `template_team`

**Email Subject:**
```
New Team Application: {{position}} - {{first_name}} {{last_name}}
```

**Email Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #0D47A1; }
        .value { padding: 10px; background: white; border-left: 3px solid #1976D2; margin-top: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .highlight { background: #E3F2FD; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👥 New Team Application</h1>
        </div>
        <div class="content">
            <div class="highlight">
                <strong>Position Applied For: {{position}}</strong>
            </div>

            <div class="field">
                <div class="label">Name:</div>
                <div class="value">{{first_name}} {{last_name}}</div>
            </div>

            <div class="field">
                <div class="label">Email:</div>
                <div class="value">{{email}}</div>
            </div>

            <div class="field">
                <div class="label">Phone:</div>
                <div class="value">{{phone}}</div>
            </div>

            <div class="field">
                <div class="label">CV/LinkedIn:</div>
                <div class="value">{{cv_link}}</div>
            </div>

            <div class="field">
                <div class="label">Portfolio:</div>
                <div class="value">{{portfolio_link}}</div>
            </div>
        </div>
        <div class="footer">
            <p><strong>Application Details</strong></p>
            <p>Form Type: {{form_type}}</p>
            <p>Submitted: {{submission_time}}</p>
            <p>User Agent: {{user_agent}}</p>
        </div>
    </div>
</body>
</html>
```

**Template Variables:**
- `{{first_name}}` - Applicant's first name
- `{{last_name}}` - Applicant's last name
- `{{email}}` - Applicant's email
- `{{phone}}` - Phone number
- `{{position}}` - Position applied for
- `{{cv_link}}` - Link to CV/LinkedIn
- `{{portfolio_link}}` - Link to portfolio
- `{{form_type}}` - Form identifier
- `{{submission_time}}` - Timestamp
- `{{user_agent}}` - Browser info
- `{{reply_to}}` - Reply email

---

## Step-by-Step Setup Instructions

### Step 1: Log into EmailJS Dashboard
1. Go to https://dashboard.emailjs.com/
2. Log in with your account

### Step 2: Create Templates
1. Click on **"Email Templates"** in the sidebar
2. Click **"Create New Template"**
3. For each template:
   - Copy the template name and subject from above
   - Paste the HTML body into the template editor
   - Set the Template ID (e.g., `template_newsletter`)
   - Click **"Save"**

### Step 3: Update Template IDs in Code

After creating the templates, update the template IDs in `/js/emailjs-config.js`:

```javascript
templates: {
    newsletter: 'YOUR_NEWSLETTER_TEMPLATE_ID',  // Replace with actual ID
    proposal: 'YOUR_PROPOSAL_TEMPLATE_ID',      // Replace with actual ID
    team: 'YOUR_TEAM_TEMPLATE_ID'               // Replace with actual ID
}
```

### Step 4: Configure Email Service
1. In EmailJS dashboard, go to **"Email Services"**
2. Make sure your service `service_dkz1pxc` is configured
3. Set the destination email where you want to receive submissions

### Step 5: Test Your Forms
1. Test each form on your website:
   - Newsletter subscription (on homepage, about page, collaborate page)
   - Article proposal (on collaborate page)
   - Team application (on collaborate page)
2. Check that emails arrive correctly
3. Verify all variables are populated

---

## Security Features Implemented

✅ **Rate Limiting:** Users can only submit 3 forms per hour
✅ **Input Sanitization:** All user input is sanitized to prevent XSS attacks
✅ **Email Validation:** Proper email format validation
✅ **URL Validation:** Validates URLs in optional fields
✅ **CSRF Protection:** Client-side validation and verification
✅ **Analytics Tracking:** All submissions tracked via Google Tag Manager

---

## Troubleshooting

### Forms not sending?
1. Check browser console for errors
2. Verify template IDs match in `emailjs-config.js`
3. Ensure EmailJS public key is correct
4. Check EmailJS dashboard for quota limits

### Rate limiting issues?
1. Clear localStorage: `localStorage.removeItem('catalyst_form_submissions')`
2. Adjust limits in `emailjs-config.js`

### Template variables not showing?
1. Ensure variable names match exactly (case-sensitive)
2. Check template preview in EmailJS dashboard
3. Verify all required fields are being sent

---

## Support

For EmailJS support: https://www.emailjs.com/docs/
For website issues: Contact your development team

---

**Last Updated:** December 2025
**Version:** 1.0
