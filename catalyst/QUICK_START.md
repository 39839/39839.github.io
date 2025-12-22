# Quick Start Guide - The Catalyst Magazine

## 🎯 What's Been Done

Your website now has:
- ✅ Google Tag Manager installed on all pages
- ✅ EmailJS integration for all forms
- ✅ Security features (rate limiting, input validation, XSS protection)
- ✅ Newsletter subscription functionality
- ✅ Article proposal submission
- ✅ Team application form

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Create EmailJS Templates (15 minutes)

1. Go to https://dashboard.emailjs.com/
2. Log in with your account
3. Click **"Email Templates"** → **"Create New Template"**
4. Create 3 templates:

#### Template 1: Newsletter
- **Template ID:** `template_newsletter`
- **Subject:** `Welcome to The Catalyst Magazine Newsletter!`
- **Body:** Copy from `EMAILJS_SETUP.md` → Section "Newsletter Subscription Template"

#### Template 2: Proposal
- **Template ID:** `template_proposal`
- **Subject:** `New Article Proposal: {{project_title}}`
- **Body:** Copy from `EMAILJS_SETUP.md` → Section "Article Proposal Template"

#### Template 3: Team
- **Template ID:** `template_team`
- **Subject:** `New Team Application: {{position}} - {{first_name}} {{last_name}}`
- **Body:** Copy from `EMAILJS_SETUP.md` → Section "Team Application Template"

### Step 2: Update Template IDs (2 minutes)

1. Open `/js/emailjs-config.js`
2. Find the `templates` object (around line 7)
3. Replace the template IDs with your actual ones:

```javascript
templates: {
    newsletter: 'template_newsletter',  // Your actual template ID from EmailJS
    proposal: 'template_proposal',      // Your actual template ID from EmailJS
    team: 'template_team'               // Your actual template ID from EmailJS
}
```

### Step 3: Test Everything (5 minutes)

1. Open your website locally or deploy to GitHub Pages
2. Test each form:
   - Newsletter subscription (try from homepage)
   - Article proposal (go to Collaborate page)
   - Team application (go to Collaborate page)
3. Check your email inbox for test submissions
4. ✅ Done!

---

## 📧 Email Configuration

Your forms will send emails **TO** the email address configured in your EmailJS service settings.

**To change where emails are sent:**
1. Go to EmailJS Dashboard
2. Click **"Email Services"**
3. Select your service (`service_dkz1pxc`)
4. Update the recipient email address
5. Save

---

## 📊 Google Tag Manager Setup

**Already Installed:** GTM is now on all your pages with container `GTM-TV2SBHW5`

**What's being tracked:**
- Page views
- Form submissions (success/failure)
- Form types (newsletter/proposal/team)

**To view analytics:**
1. Go to https://tagmanager.google.com/
2. Select container `GTM-TV2SBHW5`
3. Configure triggers and tags as needed
4. Publish your container

---

## 🔍 Testing Your Forms

### Test Newsletter Form:
1. Go to homepage
2. Scroll to "Join the Changemakers" section
3. Enter email: `test@example.com`
4. Click "Subscribe"
5. ✅ You should see: "Thank you for subscribing! Check your email for confirmation."

### Test Proposal Form:
1. Go to Collaborate page
2. Fill out "Submit an Article or Opinion" form
3. Click "Send Proposal"
4. ✅ You should see: "Thank you for your submission! We will review it and get back to you soon."

### Test Team Form:
1. Go to Collaborate page
2. Scroll to "Join Our Team" section
3. Fill out the application
4. Click "Apply Now"
5. ✅ You should see: "Thank you for your interest! We will review your application and be in touch soon."

---

## ⚠️ Common Issues & Solutions

### Issue: "Something went wrong. Please try again."
**Solutions:**
- Check browser console (F12) for errors
- Verify template IDs in `/js/emailjs-config.js` match EmailJS dashboard
- Ensure EmailJS service is active
- Check internet connection

### Issue: "Too many submissions. Please try again in X minutes."
**This is normal!** Rate limiting protects against spam.
**Solution:** Wait or clear localStorage:
```javascript
// In browser console:
localStorage.removeItem('catalyst_form_submissions')
```

### Issue: Emails not arriving
**Solutions:**
- Check EmailJS dashboard for quota (200/month on free plan)
- Verify recipient email in EmailJS service settings
- Check spam folder
- Test templates in EmailJS dashboard

### Issue: GTM not tracking
**Solutions:**
- Use Google Tag Assistant browser extension
- Check GTM container is published
- Verify container ID is `GTM-TV2SBHW5`
- Clear browser cache

---

## 📱 Mobile Testing

All forms are mobile-responsive. Test on:
- iPhone/iOS Safari
- Android Chrome
- iPad/Tablet views

---

## 🎨 Customization Options

### Change Rate Limiting:
Edit `/js/emailjs-config.js`:
```javascript
const RATE_LIMIT = {
    maxSubmissions: 3,      // Change to allow more submissions
    timeWindow: 3600000     // Change time window (in milliseconds)
};
```

### Change Email Templates:
1. Edit templates in EmailJS dashboard
2. No code changes needed!

### Add More Forms:
1. Create new template in EmailJS
2. Add template ID to `emailjs-config.js`
3. Create handler function (see existing examples)
4. Add form to HTML

---

## 📚 Documentation Files

- **`EMAILJS_SETUP.md`** - Detailed EmailJS template setup guide
- **`SECURITY_IMPLEMENTATION.md`** - Complete security documentation
- **`QUICK_START.md`** - This file!

---

## 🆘 Need Help?

### Step-by-step guides:
1. EmailJS Setup → See `EMAILJS_SETUP.md`
2. Security Details → See `SECURITY_IMPLEMENTATION.md`
3. Quick fixes → This file

### External Resources:
- EmailJS Docs: https://www.emailjs.com/docs/
- GTM Help: https://support.google.com/tagmanager

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Created all 3 EmailJS templates
- [ ] Updated template IDs in `emailjs-config.js`
- [ ] Tested newsletter form
- [ ] Tested proposal form
- [ ] Tested team application form
- [ ] Verified emails are received
- [ ] Tested on mobile devices
- [ ] GTM container is published
- [ ] Checked browser console for errors

**Ready to deploy?**
```bash
git add .
git commit -m "Add EmailJS and GTM integration"
git push origin main
```

Your site will update on GitHub Pages automatically! 🎉

---

## 🎉 You're All Set!

Your website now has:
- Professional form handling
- Email notifications
- Security protection
- Analytics tracking
- Mobile-friendly forms
- User-friendly error handling

**Happy publishing!** 🚀

---

**Last Updated:** December 2025
