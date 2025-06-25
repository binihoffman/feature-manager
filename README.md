# Feature Manager - Collaborative Version

A real-time collaborative feature management dashboard for teams.

## Features

- **Real-time Collaboration**: Multiple team members can edit simultaneously
- **Kanban Board**: Features organized by status in columns
- **Live User Count**: See who's currently active
- **Connection Status**: Real-time connection indicators
- **Offline Support**: Works even when temporarily disconnected

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "feature-manager")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your team
5. Click "Done"

### 3. Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "feature-manager-web")
6. Copy the configuration object

### 4. Update the Configuration

1. Open `firebase-config.js` in this project
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC_j1letAU-MK5Rco7ggJkMQKbBB7whpj8",
    authDomain: "feature-manager-8f4cd.firebaseapp.com",
    projectId: "feature-manager-8f4cd",
    storageBucket: "feature-manager-8f4cd.firebasestorage.app",
    messagingSenderId: "198846271881",
    appId: "1:198846271881:web:12d0488a5aece7e06b5158"
};
```

### 5. Set Up Security Rules (Optional but Recommended)

In Firebase Console > Firestore Database > Rules, replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: These rules allow anyone to read/write. For production, implement proper authentication.

### 6. Share with Your Team

1. Host the files on a web server (GitHub Pages, Netlify, Vercel, etc.)
2. Share the URL with your team members
3. Everyone will see the same data in real-time!

## Usage

- **Add Features**: Click "Add New Feature" to create new items
- **Edit Features**: Click the edit icon on any feature card
- **Move Features**: Change the status to move features between columns
- **Real-time Updates**: Changes appear instantly for all team members
- **Connection Status**: Green dot = connected, red dot = disconnected

## File Structure

- `index.html` - Main application
- `script.js` - Application logic with Firebase integration
- `styles.css` - Styling and layout
- `firebase-config.js` - Firebase configuration (update with your credentials)
- `README.md` - This file

## Troubleshooting

- **Connection Issues**: Check your internet connection and Firebase configuration
- **Data Not Syncing**: Ensure Firestore is enabled and rules allow read/write
- **Multiple Users Not Showing**: Check that all users have the correct Firebase config

## Cost

Firebase Firestore has a generous free tier:
- 1GB storage
- 50,000 reads/day
- 20,000 writes/day
- Perfect for small to medium teams

## Support

For Firebase-specific issues, check the [Firebase Documentation](https://firebase.google.com/docs). 