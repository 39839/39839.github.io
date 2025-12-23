/**
 * Firebase Configuration for MMCWall
 * Montgomery Medical Clinic Digital Signage
 */

const firebaseConfig = {
    apiKey: "AIzaSyACDr4jEKW7eWE0r_1BQGRR_jLfAN9PIe8",
    authDomain: "mmcwall.firebaseapp.com",
    projectId: "mmcwall",
    storageBucket: "mmcwall.firebasestorage.app",
    messagingSenderId: "460106436372",
    appId: "1:460106436372:web:95d6183bac654b31a3fc01"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = firebase.auth();

// Initialize Firestore
const db = firebase.firestore();

// Reference to the announcements collection
const announcementsRef = db.collection('announcements');

// Reference to display styling/behavior settings
const displaySettingsRef = db.collection('displaySettings').doc('main');

// Reference to music settings (current YouTube link)
const musicSettingsRef = db.collection('settings').doc('music');

// Reference to music history collection
const musicHistoryRef = db.collection('musicHistory');

// Export for use in other modules
window.auth = auth;
window.db = db;
window.announcementsRef = announcementsRef;
window.displaySettingsRef = displaySettingsRef;
window.musicSettingsRef = musicSettingsRef;
window.musicHistoryRef = musicHistoryRef;
