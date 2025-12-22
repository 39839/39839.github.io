# Fix "Recipients address is empty" Error

## The Problem

EmailJS error 422: "The recipients address is empty" means your EmailJS service doesn't know where to send the emails.

---

## Quick Fix (2 minutes)

### Step 1: Set Up Email Service in EmailJS

1. Go to **https://dashboard.emailjs.com/admin**
2. Click on **"Email Services"** in the left sidebar
3. Find your service `service_dkz1pxc`
4. Click on it to edit

### Step 2: Configure the Recipient Email

You need to tell EmailJS where to send form submissions. There are two ways:

#### Option A: Set Default Recipient in Service (Recommended)
1. In your service settings, look for **"Email Template Default Settings"** or **"Default Parameters"**
2. Add a default recipient email (your email where you want to receive submissions)
3. Save the service

#### Option B: Configure in Each Template
1. Go to **"Email Templates"** → Select **"Welcome"** (`template_4846tjj`)
2. Look for the **"To Email"** field in template settings
3. Add your email address where you want to receive notifications
4. Click **"Save"**
5. Repeat for **"Contact Us"** template (`template_q0kbidi`)

---

## Update Your Templates

Make sure your EmailJS templates use these variables:

### Welcome Template (`template_4846tjj`)

**To Email:** (Set this to YOUR email address in template settings)

**Email Subject:**
```
New Newsletter Subscription
```

**Email Body:**
```
New newsletter subscriber!

From: {{from_name}}
Email: {{subscriber_email}}

{{message}}

Reply to: {{reply_to}}
Submitted: {{submission_time}}
```

### Contact Us Template (`template_q0kbidi`)

**To Email:** (Set this to YOUR email address in template settings)

**Email Subject:**
```
New Contact from {{from_name}}
```

**Email Body:**
```
To: {{to_name}}

From: {{from_name}}
Email: {{user_email}}

{{message}}

---
Reply to: {{reply_to}}
Submitted: {{submission_time}}
```

---

## Test After Setup

1. Save all template changes
2. Refresh your website
3. Try subscribing with a test email
4. You should receive an email at the address you configured!

---

## Alternative: Use Auto-Reply Template

If you want to send an email TO the subscriber (instead of TO yourself), you can use EmailJS's auto-reply feature:

1. In template settings, set **"To Email"** to `{{user_email}}` or `{{subscriber_email}}`
2. This will send the welcome email directly to the subscriber
3. But you won't get notified - consider setting up a second template or using CC/BCC

---

## Still Having Issues?

### Check These:
- ✅ EmailJS service is active (not suspended)
- ✅ You have remaining quota (free plan = 200 emails/month)
- ✅ Template IDs match in code: `template_4846tjj` and `template_q0kbidi`
- ✅ Templates are saved (click Save button!)
- ✅ Recipient email is set in service or template settings

### Debug:
Open browser console (F12) and look for the full error message. It will tell you exactly what's missing.

---

## Quick Summary

**The issue:** EmailJS doesn't know where to send the emails.

**The fix:**
1. Go to EmailJS dashboard
2. Set recipient email in service settings OR in each template
3. Save changes
4. Test the form

That's it! 🚀
