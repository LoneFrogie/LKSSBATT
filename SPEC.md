# Time & Location Tracker App - Specification

## Project Overview
- **Name:** StaffClock
- **Type:** Web Application (React + Vite)
- **Core Functionality:** Time and location tracking for foreign staff with Excel export
- **Target Users:** Scott (admin) + foreign staff members

## Tech Stack
- **Frontend:** React 18 + Vite
- **Auth:** Firebase Google OAuth
- **Database:** Firebase Firestore (free tier)
- **Excel Export:** xlsx library
- **Deployment:** GitHub Pages

## UI/UX Specification

### Layout Structure
- **Header:** Logo + User info + Logout button
- **Main Content:** Card-based layout
- **Pages:** Login, Dashboard (Staff), Admin Panel

### Visual Design
- **Color Palette:**
  - Primary: #Blue)
  - Secondary: #64748b (Sl2563eb (ate)
  - Success: #22c55e (Green)
  - Danger: #ef4444 (Red)
  - Background: #f8fafc
  - Card: #ffffff
- **Typography:** System fonts, 16px base
- **Spacing:** 8px base unit (0.5rem, 1rem, 1.5rem, etc.)

### Components
1. **Login Page** - Google sign-in button
2. **Staff Dashboard:**
   - Current status card (Clocked In/Out)
   - Clock In/Out button (large, prominent)
   - Today's attendance card
   - History table (last 7 days)
3. **Admin Panel:**
   - Staff list with attendance
   - Date range filter
   - Export to .xlsx button

## Functionality Specification

### Authentication
- Google OAuth via Firebase
- Email-segregated data access
- Admin: scottchue@gmail.com (configurable)

### Core Features

1. **Clock In:**
   - Capture current timestamp
   - Capture location (lat/lng + city/area via reverse geocode)
   - Store in Firestore

2. **Clock Out:**
   - Capture current timestamp
   - Capture location (lat/lng + city/area)
   - Update existing record

3. **Location Capture:**
   - Browser Geolocation API
   - OpenStreetMap Nominatim for reverse geocoding
   - Store: latitude, longitude, city, area

4. **Excel Export (Admin only):**
   - Columns: Name, Email, Date, Time In, Time Out, Location In, Location Out
   - Filter by date range
   - .xlsx format with proper formatting

### Data Model

```
users/{uid}
  - email: string
  - name: string
  - photoURL: string
  - role: "admin" | "staff"
  - createdAt: timestamp

attendance/{id}
  - userId: string
  - email: string
  - name: string
  - date: string (YYYY-MM-DD)
  - timeIn: timestamp | null
  - timeOut: timestamp | null
  - locationIn: { lat, lng, city, area } | null
  - locationOut: { lat, lng, city, area } | null
  - createdAt: timestamp
```

## Acceptance Criteria
- [ ] Users can sign in with Google
- [ ] Staff can clock in/out with location
- [ ] Location shows city and area name
- [ ] Users see their own history
- [ ] Admin can see all staff records
- [ ] Admin can export to .xlsx
- [ ] Works on mobile (responsive)
- [ ] Deployed to GitHub Pages
