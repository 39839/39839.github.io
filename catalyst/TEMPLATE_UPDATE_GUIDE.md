# EmailJS Template Update Guide

## Your Current Templates

You have 2 templates in EmailJS:
1. **Welcome** (`template_4846tjj`) - For newsletter subscriptions
2. **Contact Us** (`template_q0kbidi`) - For proposals and team applications

---

## Template 1: Welcome (Newsletter) - `template_4846tjj`

### Variables Being Sent:
- `{{to_email}}` - The subscriber's email address
- `{{from_name}}` - "The Catalyst Magazine"
- `{{reply_to}}` - Subscriber's email (for replies)
- `{{submission_time}}` - When they subscribed
- `{{form_type}}` - "newsletter"
- `{{user_agent}}` - Browser information

### Update Your Template:

Go to your EmailJS dashboard and edit the **Welcome** template to include these variables:

**Example Email Body:**
```html
Hello!

Thank you for subscribing to The Catalyst Magazine newsletter!

Email: {{to_email}}
Subscribed: {{submission_time}}

You'll now receive updates about:
- Latest STEM articles and features
- Exclusive interviews with scientists
- D.C. area research spotlights
- Brain teasers and challenges

Stay curious!
The Catalyst Magazine Team
```

---

## Template 2: Contact Us (Proposals & Team) - `template_q0kbidi`

This template receives both proposal submissions AND team applications. You can differentiate them using `{{form_type}}`.

### Variables Being Sent:

**For Proposals:**
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{email}}` - Email address
- `{{proposal_type}}` - Type (Feature, Profile, Interview, Op-Ed, Editorial)
- `{{project_title}}` - Title of the article
- `{{description}}` - Description of the proposal
- `{{link}}` - Link to draft/materials (or "Not provided")
- `{{reply_to}}` - Email to reply to
- `{{form_type}}` - "proposal"
- `{{submission_time}}` - Timestamp
- `{{user_agent}}` - Browser info

**For Team Applications:**
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{email}}` - Email address
- `{{phone}}` - Phone number (or "Not provided")
- `{{position}}` - Position (Writer, Editor, Design, Operations, Campus Ambassador)
- `{{cv_link}}` - Link to CV/LinkedIn (or "Not provided")
- `{{portfolio_link}}` - Link to portfolio (or "Not provided")
- `{{reply_to}}` - Email to reply to
- `{{form_type}}` - "team"
- `{{submission_time}}` - Timestamp
- `{{user_agent}}` - Browser info

### Update Your Template:

Edit the **Contact Us** template in EmailJS dashboard:

**Example Email Body:**
```html
<h2>New {{form_type}} Submission</h2>

<h3>Contact Information:</h3>
<p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Phone:</strong> {{phone}}</p>

<h3>Proposal Details:</h3>
<p><strong>Type:</strong> {{proposal_type}}</p>
<p><strong>Position:</strong> {{position}}</p>
<p><strong>Title:</strong> {{project_title}}</p>
<p><strong>Description:</strong> {{description}}</p>

<h3>Links:</h3>
<p><strong>Draft/Materials:</strong> {{link}}</p>
<p><strong>CV/LinkedIn:</strong> {{cv_link}}</p>
<p><strong>Portfolio:</strong> {{portfolio_link}}</p>

<hr>
<p><small>Form Type: {{form_type}}</small></p>
<p><small>Submitted: {{submission_time}}</small></p>
<p><small>Reply to: {{reply_to}}</small></p>
```

**Note:** Some variables will be empty depending on the form type:
- Proposals won't have `{{phone}}`, `{{position}}`, `{{cv_link}}`, `{{portfolio_link}}`
- Team applications won't have `{{proposal_type}}`, `{{project_title}}`, `{{description}}`, `{{link}}`

---

## Quick Setup Steps:

1. **Go to EmailJS Dashboard:** https://dashboard.emailjs.com/admin/templates
2. **Edit "Welcome" template** (`template_4846tjj`):
   - Update the email body to use `{{to_email}}` and other newsletter variables
   - Save the template
3. **Edit "Contact Us" template** (`template_q0kbidi`):
   - Update the email body to include all the variables listed above
   - The template will work for both proposals and team applications
   - Save the template

---

## Testing Your Forms:

After updating the templates, test each form:

### Test Newsletter:
1. Go to your homepage
2. Scroll to newsletter section
3. Enter: `test@example.com`
4. Submit
5. Check your inbox for the Welcome email

### Test Proposal:
1. Go to Collaborate page
2. Fill out "Submit an Article or Opinion" form
3. Submit
4. Check your inbox for the Contact Us email with proposal details

### Test Team Application:
1. Go to Collaborate page
2. Scroll to "Join Our Team"
3. Fill out the form
4. Submit
5. Check your inbox for the Contact Us email with team application details

---

## Troubleshooting:

### Variables showing as {{variable_name}}?
- Make sure you saved the template after editing
- Check that variable names match exactly (case-sensitive)
- Refresh the EmailJS dashboard

### Not receiving emails?
- Check your EmailJS quota (200/month on free plan)
- Verify the recipient email in your EmailJS service settings
- Check spam folder
- Make sure templates are saved and active

### Forms showing errors?
- Open browser console (F12) to see detailed error messages
- Verify template IDs in `/js/emailjs-config.js` match your dashboard
- Check that EmailJS library is loading (look for network errors)

---

## Current Configuration:

✅ **Service ID:** `service_dkz1pxc`
✅ **Public Key:** `KCO8WUmL9pFFnr8ND`
✅ **Newsletter Template:** `template_4846tjj` (Welcome)
✅ **Proposal Template:** `template_q0kbidi` (Contact Us)
✅ **Team Template:** `template_q0kbidi` (Contact Us)

All forms are now configured and ready to use once you update your templates!

---

**Last Updated:** December 2025
