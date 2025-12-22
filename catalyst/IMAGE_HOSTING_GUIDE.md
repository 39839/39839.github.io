# Image Hosting Guide for Email Template

## Quick Method: Use Your GitHub Pages Site

Since your website is already on GitHub Pages, you can use the same URLs!

---

## Your Image URLs

Your images are already in your repo, so you can use these URLs directly:

```
https://YOUR-USERNAME.github.io/CatalystMagazine/NewsletterHeader1.png
https://YOUR-USERNAME.github.io/CatalystMagazine/NewGlassLogo.png
https://YOUR-USERNAME.github.io/CatalystMagazine/3DLogo2.jpg
```

**Replace `YOUR-USERNAME` with your actual GitHub username.**

For example, if your username is `johndoe`, your URLs would be:
```
https://johndoe.github.io/CatalystMagazine/NewsletterHeader1.png
https://johndoe.github.io/CatalystMagazine/NewGlassLogo.png
https://johndoe.github.io/CatalystMagazine/3DLogo2.jpg
```

---

## How to Find Your GitHub Username

1. Go to GitHub.com
2. Click your profile picture (top right)
3. Your username is shown there

Or check your repository URL:
- If your repo is at `https://github.com/johndoe/CatalystMagazine`
- Then your username is `johndoe`
- And your site is at `https://johndoe.github.io/CatalystMagazine`

---

## Update the Email Template

In the email template HTML, replace these 3 image URLs:

### 1. Header Image (Line ~17)
```html
<!-- BEFORE -->
<img src="https://raw.githubusercontent.com/yourusername/repo/main/NewsletterHeader1.png"

<!-- AFTER (replace YOUR-USERNAME) -->
<img src="https://YOUR-USERNAME.github.io/CatalystMagazine/NewsletterHeader1.png"
```

### 2. Logo Image (Line ~40)
```html
<!-- BEFORE -->
<img src="https://raw.githubusercontent.com/yourusername/repo/main/NewGlassLogo.png"

<!-- AFTER (replace YOUR-USERNAME) -->
<img src="https://YOUR-USERNAME.github.io/CatalystMagazine/NewGlassLogo.png"
```

### 3. Bottom Image (Line ~148)
```html
<!-- BEFORE -->
<img src="https://raw.githubusercontent.com/yourusername/repo/main/3DLogo2.jpg"

<!-- AFTER (replace YOUR-USERNAME) -->
<img src="https://YOUR-USERNAME.github.io/CatalystMagazine/3DLogo2.jpg"
```

---

## Alternative: Use Raw GitHub URLs

If your GitHub Pages site isn't set up yet, use raw GitHub URLs:

```
https://raw.githubusercontent.com/YOUR-USERNAME/CatalystMagazine/main/NewsletterHeader1.png
https://raw.githubusercontent.com/YOUR-USERNAME/CatalystMagazine/main/NewGlassLogo.png
https://raw.githubusercontent.com/YOUR-USERNAME/CatalystMagazine/main/3DLogo2.jpg
```

These work immediately without needing GitHub Pages enabled.

---

## Test Your Image URLs

Before adding to email template, test that images load:

1. Open a new browser tab
2. Paste your image URL
3. Press Enter
4. You should see the image display

If you see "404" or "Not Found":
- Check your GitHub username is correct
- Verify the image file names match exactly (case-sensitive!)
- Make sure images are pushed to GitHub

---

## Quick Setup Checklist

- [ ] Find your GitHub username
- [ ] Create image URLs using the format above
- [ ] Test each URL in browser (should show the image)
- [ ] Copy the HTML from [BEAUTIFUL_WELCOME_EMAIL.md](BEAUTIFUL_WELCOME_EMAIL.md)
- [ ] Replace the 3 image URLs with your actual URLs
- [ ] Paste into EmailJS "Welcome" template
- [ ] Save template
- [ ] Test by subscribing on your website

---

## Need Help Finding Your Username?

Check your git remote URL:

```bash
cd /Users/yairben-dor/XCode/CatalystMagazine
git remote -v
```

You'll see something like:
```
origin  https://github.com/YOUR-USERNAME/CatalystMagazine.git
```

The `YOUR-USERNAME` part is what you need!

---

That's it! Once you replace the image URLs with your actual GitHub URLs, the email template will display beautifully. 🎨
