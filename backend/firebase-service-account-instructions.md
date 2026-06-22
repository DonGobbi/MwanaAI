# Firebase Service Account Setup Instructions

To use Firebase Admin SDK securely, you need to generate a service account key:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mwanaai-2ad50`
3. Go to Project Settings (gear icon) > Service accounts
4. Click "Generate new private key"
5. Save the downloaded JSON file as `firebase-service-account-key.json` in this directory
6. Make sure this file is added to your `.gitignore` to keep it secure

**IMPORTANT**: Never commit this file to version control or share it publicly!
