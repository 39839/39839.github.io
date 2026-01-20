============================================================
GITIGNORE FOLDER - DO NOT UPLOAD TO GITHUB
============================================================

This folder contains sensitive files and configuration
that should NEVER be uploaded to a public repository.

The entire GITIGNORE/ folder is excluded from git via .gitignore

============================================================
CONTENTS:
============================================================

1. firestore-rules-recommended.txt
   - Copy these rules to your Firebase Console
   - Protects your database so only admins can write

2. (Place any service account keys here if needed)
   - Never commit private keys to git
   - If you download a service account key, store it here

============================================================
SETUP CHECKLIST:
============================================================

[ ] Create admin user in Firebase Console:
    Authentication > Users > Add User
    (Use a real email you can access for password reset)

[ ] Copy Firestore rules from firestore-rules-recommended.txt
    to Firebase Console > Firestore > Rules

[ ] Test login at admin.html with your admin email/password

[ ] Test "Forgot Password" functionality

============================================================
