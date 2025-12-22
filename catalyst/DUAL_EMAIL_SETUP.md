# Dual Email Setup for Newsletter Subscriptions

## How It Works

When someone subscribes to your newsletter, the system now sends **TWO emails**:

1. **Welcome Email** → Sent TO the subscriber (using "Welcome" template)
2. **Notification Email** → Sent TO you (using "Contact Us" template)

---

## Template Setup

### Template 1: Welcome (`template_4846tjj`)
**Purpose:** Welcome email sent TO the subscriber

#### Settings:
- **To Email:** `{{to_email}}` or `{{user_email}}`
- **From Name:** `The Catalyst Magazine`
- **Reply To:** Leave blank or set to your email

#### Subject Line:
```
Welcome to The Catalyst Magazine!
```

#### Email Body:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
        .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; }
        .button { display: inline-block; padding: 12px 30px; background: #1976D2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to The Catalyst! 🎉</h1>
        </div>
        <div class="content">
            <p>Hi there!</p>

            <p>Thank you for subscribing to The Catalyst Magazine newsletter. You're now part of our community of science enthusiasts, innovators, and changemakers!</p>

            <p><strong>What you'll receive:</strong></p>
            <ul>
                <li>Latest STEM articles and features</li>
                <li>Exclusive interviews with leading scientists</li>
                <li>D.C. area research spotlights</li>
                <li>Brain teasers and challenges</li>
            </ul>

            <p>{{message}}</p>

            <div style="text-align: center;">
                <a href="https://catalyst-magazine.com" class="button">Visit Our Website</a>
            </div>

            <p>Stay curious!</p>
            <p><strong>The Catalyst Magazine Team</strong><br>
            Washington D.C.'s Student-Run STEM Magazine</p>
        </div>
        <div class="footer">
            <p>You're receiving this email because you subscribed at catalyst-magazine.com</p>
            <p>Email: {{subscriber_email}}</p>
        </div>
    </div>
</body>
</html>
```

---

### Template 2: Contact Us (`template_q0kbidi`)
**Purpose:** Used for BOTH subscriber notifications (to you) AND proposals/team applications

#### Settings:
- **To Email:** `your-email@example.com` ← **YOUR EMAIL ADDRESS**
- **From Name:** `The Catalyst Forms`
- **Reply To:** `{{reply_to}}`

#### Subject Line:
```
{{from_name}} - New Submission
```

#### Email Body:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .field { margin-bottom: 15px; padding: 15px; background: white; border-left: 4px solid #1976D2; }
        .label { font-weight: bold; color: #0D47A1; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{from_name}}</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">From:</div>
                <div>{{from_email}}</div>
            </div>

            <div class="field">
                <div class="label">Message:</div>
                <div style="white-space: pre-wrap;">{{message}}</div>
            </div>

            <!-- Additional fields for proposals/team (will be empty for newsletter) -->
            <div class="field" style="display: {{first_name}} ? 'block' : 'none';">
                <div class="label">Name:</div>
                <div>{{first_name}} {{last_name}}</div>
            </div>

            <div class="field" style="display: {{project_title}} ? 'block' : 'none';">
                <div class="label">Project Title:</div>
                <div>{{project_title}}</div>
            </div>

            <div class="field" style="display: {{position}} ? 'block' : 'none';">
                <div class="label">Position:</div>
                <div>{{position}}</div>
            </div>
        </div>
        <div class="footer">
            <p><strong>Submission Details</strong></p>
            <p>Form Type: {{form_type}}</p>
            <p>Submitted: {{submission_time}}</p>
            <p>Reply to: {{reply_to}}</p>
        </div>
    </div>
</body>
</html>
```

---

## Setup Steps (5 minutes)

### Step 1: Configure "Welcome" Template
1. Go to https://dashboard.emailjs.com/admin/templates
2. Click on **"Welcome"** template (`template_4846tjj`)
3. In template settings, set **"To Email"** to: `{{to_email}}`
4. Copy the HTML body above into the template editor
5. Set subject line to: `Welcome to The Catalyst Magazine!`
6. Click **"Save"**

### Step 2: Configure "Contact Us" Template
1. Click on **"Contact Us"** template (`template_q0kbidi`)
2. In template settings, set **"To Email"** to: **YOUR EMAIL ADDRESS** (e.g., `your-email@gmail.com`)
3. Copy the HTML body above into the template editor
4. Set subject line to: `{{from_name}} - New Submission`
5. Click **"Save"**

### Step 3: Test
1. Go to your website
2. Subscribe to the newsletter with a test email
3. Check BOTH inboxes:
   - **Subscriber's inbox** (test email) → Should receive welcome email
   - **Your inbox** → Should receive notification about new subscriber

---

## What Each Email Contains

### Email 1: Welcome Email (to subscriber)
- Beautiful branded welcome message
- List of what they'll receive
- Link to your website
- Subscriber feels valued and informed

### Email 2: Notification Email (to you)
- Subject: "Newsletter System - New Submission"
- Subscriber's email address
- Timestamp
- Action: Add to your subscriber list
- Reply-to is set to subscriber's email for easy contact

---

## Benefits of This Setup

✅ **Professional Experience:** Subscribers get an immediate, branded welcome email
✅ **You Stay Informed:** You receive every subscriber's email address
✅ **Easy Management:** One notification per subscriber to add to your list
✅ **Reply Ready:** Reply-to is set to subscriber's email if you want to reach out
✅ **Same Template:** Uses your existing "Contact Us" template for notifications

---

## Troubleshooting

### Only receiving one email?
- Check your EmailJS quota (free plan = 200 emails/month)
- Look for error messages in browser console
- Verify both templates are saved

### Welcome email not arriving to subscriber?
- Check spam folder
- Verify "Welcome" template has `{{to_email}}` in "To Email" setting
- Make sure template is saved

### Not receiving notification emails?
- Verify "Contact Us" template has YOUR email in "To Email" setting
- Check spam folder
- Confirm template is saved

### Variables showing as {{variable}}?
- Variable names are case-sensitive
- Make sure templates are saved
- Wait 30 seconds for EmailJS cache to clear

---

## Cost Note

Each newsletter subscription now uses **2 email credits** from your EmailJS quota:
- Free plan: 200 emails/month = 100 possible subscribers
- If you need more, consider upgrading or implementing a backend solution

---

That's it! Now both you and your subscribers will receive emails. 🎉
