# Simple EmailJS Template Setup

## Quick Fix for Your Templates

Your forms are now sending standard EmailJS parameters. Here's how to update your 2 templates:

---

## Template 1: Welcome (`template_4846tjj`) - Newsletter

### In EmailJS Dashboard:

**Email Subject:**
```
Welcome to The Catalyst Magazine!
```

**Email Body:**
```
Hello {{to_name}}!

{{message}}

Your email: {{user_email}}
Subscribed: {{submission_time}}

Best regards,
{{from_name}}
```

### These variables are available:
- `{{to_name}}` - "Subscriber"
- `{{to_email}}` - The subscriber's email
- `{{from_name}}` - "The Catalyst Magazine"
- `{{message}}` - Welcome message
- `{{user_email}}` - Subscriber's email
- `{{submission_time}}` - When they subscribed

---

## Template 2: Contact Us (`template_q0kbidi`) - Proposals & Team

### In EmailJS Dashboard:

**Email Subject:**
```
New Submission from {{from_name}}
```

**Email Body:**
```
To: {{to_name}}

From: {{from_name}}
Email: {{from_email}}

{{message}}

---
Submitted: {{submission_time}}
Reply to: {{reply_to}}
```

### These variables are available:
- `{{to_name}}` - "The Catalyst Team"
- `{{from_name}}` - Person's full name
- `{{from_email}}` - Person's email
- `{{message}}` - Formatted message with all details
- `{{reply_to}}` - Email to reply to
- `{{user_email}}` - Person's email
- `{{submission_time}}` - When submitted

**PLUS** individual fields:
- `{{first_name}}`, `{{last_name}}`
- `{{proposal_type}}`, `{{project_title}}`, `{{description}}`, `{{link}}`
- `{{phone}}`, `{{position}}`, `{{cv_link}}`, `{{portfolio_link}}`

---

## That's It!

The `{{message}}` field contains all the information formatted nicely, so you can use just that if you want to keep it simple.

Or you can use individual fields like `{{first_name}}` and `{{project_title}}` if you want more control over the email layout.

---

## Test After Updating

1. Save your templates in EmailJS dashboard
2. Go to your website
3. Test newsletter subscription
4. Test proposal form
5. Test team application

All should work now! ✅
