# EmailJS Recipient Setup - Step by Step

## Why You're Getting the Error

EmailJS needs to know **WHERE** to send the emails. Right now it doesn't have a recipient configured.

---

## Solution: Configure Recipient in Templates

### For Newsletter Subscriptions

1. **Go to EmailJS Dashboard:** https://dashboard.emailjs.com/admin/templates
2. **Click on "Welcome" template** (`template_4846tjj`)
3. **Look for "Settings" or "Send To" section**
4. **Set "To Email" to your email address** (e.g., `your-email@gmail.com`)
   - This is where you'll receive notifications of new subscribers
5. **Update the template body to show subscriber info:**

```html
New Newsletter Subscription!

Subscriber Email: {{subscriber_email}}

{{message}}

---
Reply to subscriber: {{reply_to}}
Submitted: {{submission_time}}
```

6. **Click "Save"**

---

### For Proposals & Team Applications

1. **Go to EmailJS Dashboard:** https://dashboard.emailjs.com/admin/templates
2. **Click on "Contact Us" template** (`template_q0kbidi`)
3. **Set "To Email" to your email address** (e.g., `your-email@gmail.com`)
4. **Update the template body:**

```html
New Submission from {{from_name}}

Email: {{user_email}}

---
{{message}}
---

Reply to: {{reply_to}}
Submitted: {{submission_time}}
Form Type: {{form_type}}
```

5. **Click "Save"**

---

## Important Template Settings

When editing each template, make sure you set:

### In Template Settings Panel:

**To Email:** `your-email@example.com` ← YOUR EMAIL HERE
- This is where form submissions will be sent

**From Name:** `The Catalyst Magazine Forms`
- This is what appears in the "From" field

**Reply To:** `{{reply_to}}`
- This makes it easy to reply to the person who submitted

---

## Visual Guide

```
EmailJS Dashboard
├── Email Services (configure default settings)
└── Email Templates
    ├── Welcome (template_4846tjj)
    │   └── Settings
    │       ├── To Email: [YOUR-EMAIL]  ← SET THIS!
    │       ├── From Name: The Catalyst
    │       └── Reply To: {{reply_to}}
    │
    └── Contact Us (template_q0kbidi)
        └── Settings
            ├── To Email: [YOUR-EMAIL]  ← SET THIS!
            ├── From Name: The Catalyst
            └── Reply To: {{reply_to}}
```

---

## Alternative: Send Welcome Email to Subscriber

If you want to send a welcome email TO the subscriber (instead of receiving a notification):

**Newsletter Template Settings:**
- **To Email:** `{{subscriber_email}}` or `{{user_email}}`
- This sends the email directly to the person who subscribed

**Template Body Example:**
```html
Hello!

Thank you for subscribing to The Catalyst Magazine newsletter!

You subscribed with: {{subscriber_email}}

You'll receive updates about:
- Latest STEM articles and features
- Exclusive interviews with scientists
- D.C. area research spotlights
- Brain teasers and challenges

Best regards,
The Catalyst Team

---
Subscribed: {{submission_time}}
```

---

## What Each Variable Does

### Available Variables:

- `{{from_name}}` - Name of the person submitting
- `{{user_email}}` or `{{subscriber_email}}` - Their email
- `{{message}}` - Formatted message with all form details
- `{{reply_to}}` - Email to reply to
- `{{submission_time}}` - When they submitted
- `{{form_type}}` - Type of form (newsletter/proposal/team)

### Custom Variables (Proposals/Team):
- `{{first_name}}`, `{{last_name}}`
- `{{proposal_type}}`, `{{project_title}}`, `{{description}}`, `{{link}}`
- `{{phone}}`, `{{position}}`, `{{cv_link}}`, `{{portfolio_link}}`

---

## Testing

After setting up:

1. **Save both templates**
2. **Wait 30 seconds** (EmailJS cache)
3. **Refresh your website**
4. **Test the newsletter form**
5. **Check your inbox** at the email you configured

You should receive an email! ✅

---

## Troubleshooting

### Still getting 422 error?
- Make sure you clicked **"Save"** on the template
- Refresh the EmailJS dashboard
- Wait 30 seconds for cache to clear
- Clear browser cache

### Not receiving emails?
- Check spam folder
- Verify email address is correct in template settings
- Check EmailJS quota (Dashboard → Account)
- Make sure service is active

### Template variables showing as {{variable}}?
- Variable names are case-sensitive
- Make sure they match exactly
- Refresh and save again

---

## Quick Checklist

Before testing, verify:

- [ ] Opened EmailJS Dashboard
- [ ] Went to Email Templates
- [ ] Edited "Welcome" template
- [ ] Set "To Email" to your email address
- [ ] Saved the template
- [ ] Edited "Contact Us" template
- [ ] Set "To Email" to your email address
- [ ] Saved the template
- [ ] Waited 30 seconds
- [ ] Tested on website

---

That's it! Your forms should work now. 🎉

The key is setting the **"To Email"** field in each template's settings to YOUR email address.
