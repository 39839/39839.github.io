# MMCWall - Digital Signage for Medical Offices

A soothing, floating-bubble display system for medical office waiting rooms.

## Quick Setup

### 1. Create Admin User

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`mmcwall`)
3. Click **Authentication** in the left sidebar
4. Click **Users** tab → **Add User**
5. Enter an email and password for your admin account
6. This email/password will be used to log into the admin panel

### 2. Set Firestore Security Rules

In Firebase Console → Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /announcements/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /displaySettings/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish** to save.

### 3. Create Firestore Index (if needed)

If you see an index error in the browser console, click the link to create it automatically.

### 4. Background Music (Optional)

Place an MP3 file named `lofi-beat.mp3` in the project folder, or the YouTube player will provide music.

### 5. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mmcwall.git
git push -u origin main
```

Enable GitHub Pages in repository Settings → Pages.

## Usage

| Page | URL | Purpose |
|------|-----|---------|
| **Display** | `index.html` | Show on TV in waiting room (no login needed) |
| **Admin** | `admin.html` | Staff login to manage announcements |

### Admin Panel Features

- **Sign in** with Firebase email/password
- **Forgot Password** - sends reset email
- **Add/Edit/Delete** announcements
- **Customize** display colors, speed, and text size

## Files

| File | Description |
|------|-------------|
| `index.html` | Public display view with floating bubbles |
| `admin.html` | Admin panel with authentication |
| `style.css` | All styling for both views |
| `app.js` | Display logic and bubble physics |
| `admin.js` | Admin panel logic with Firebase Auth |
| `firebase-config.js` | Firebase configuration |
| `GITIGNORE/` | Sensitive files (not uploaded to GitHub) |

## Announcement Types

| Type | Color | Use For |
|------|-------|---------|
| Info | Blue | General information |
| News | Green | Updates and news |
| Alert | Orange | Important alerts |
| Health | Purple | Health tips |
| Welcome | Teal | Welcome messages |

## Security

- **Authentication**: Firebase Email/Password authentication
- **Authorization**: Only authenticated users can modify data
- **Public Display**: Anyone can view (no login required for TV display)
- **GITIGNORE folder**: Contains sensitive files, excluded from git

## Troubleshooting

**Can't log into admin panel?**
- Make sure you created a user in Firebase Console → Authentication → Users
- Check that Email/Password sign-in is enabled in Authentication → Sign-in method
- Try the "Forgot Password" link to reset

**Bubbles not appearing?**
- Check browser console for errors
- Verify Firestore rules are published
- Ensure the index is created (click link in console error)

**Can't save announcements?**
- You must be logged in
- Check that Firestore rules allow authenticated writes
- Check browser console for permission errors

**Music not playing?**
- Browsers block autoplay - click the speaker button to unmute
- YouTube embed may be blocked in some networks
