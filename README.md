# StaffClock - Time & Location Tracker

A web-based time and location tracking app for staff with Excel export capabilities.

## Features

- ✅ Google OAuth authentication (email-segregated data)
- ✅ Clock In/Out with location capture (city + area)
- ✅ Staff dashboard with attendance history
- ✅ Admin panel to view all staff records
- ✅ Export to .xlsx with date range filter
- ✅ Mobile responsive

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., "staff-clock")
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Google" sign-in
   - Set your email as authorized
4. Enable **Firestore Database**:
   - Go to Firestore Database > Create database
   - Start in **Test mode** (or set proper rules)
5. Get Firebase Config:
   - Project Settings > General > Add web app (</>)
   - Copy the config object

### 2. Configure the App

Edit `src/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Add your admin email(s)
export const ADMIN_EMAILS = ["scottchue@gmail.com"];
```

### 3. Install & Run Locally

```bash
cd staff-clock
npm install
npm run dev
```

### 4. Deploy to GitHub Pages

1. Create a GitHub repository
2. Push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/staff-clock.git
   git push -u origin main
   ```
3. Update `vite.config.js` if needed (base path should match repo name)
4. Go to Repository Settings > Pages
5. Set Source to "Deploy from a branch"
6. Run `npm run deploy`
7. Select "gh-pages" branch

Or use Vercel/Netlify (recommended for easier setup):

1. Push to GitHub
2. Connect repo to Vercel/Netlify
3. It will auto-detect Vite and deploy

## Usage

1. **Staff**: Sign in with Google → Clock In/Out → View history
2. **Admin** (scottchue@gmail.com): Sign in → View all staff → Export to Excel

## Tech Stack

- React + Vite
- Firebase Auth (Google OAuth)
- Firebase Firestore
- xlsx library for Excel export
- OpenStreetMap Nominatim for reverse geocoding

## License

MIT
