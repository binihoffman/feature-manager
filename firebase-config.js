// Firebase Configuration
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyC_j1letAU-MK5Rco7ggJkMQKbBB7whpj8",
    authDomain: "feature-manager-8f4cd.firebaseapp.com",
    projectId: "feature-manager-8f4cd",
    storageBucket: "feature-manager-8f4cd.firebasestorage.app",
    messagingSenderId: "198846271881",
    appId: "1:198846271881:web:12d0488a5aece7e06b5158"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    }); 