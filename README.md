# ICE Sighting Tracker - README

A privacy-focused, real-time web application for tracking and visualizing ICE activity in the Seattle Metro area.

## Features

- 🗺️ **Real-time Map**: Full-screen Mapbox visualization with custom Seattle styling
- 📍 **Custom Markers**: White dots with pulsing red danger zones (500m radius)
- 🔴 **Recency Decay**: Visual opacity fades as sightings age (0-4 hours)
- 📱 **Mobile-First**: Responsive glassmorphic UI with Apple-style design
- 🔒 **Privacy-Focused**: No user authentication or profile data collected
- ⚡ **Real-time Updates**: Firebase Firestore for instant data synchronization

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Get from [Mapbox](https://www.mapbox.com/)
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Get from [Firebase Console](https://console.firebase.google.com/)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Firebase Firestore Rules

Set up the following security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sightings/{document} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main application page
│   └── globals.css      # Global styles with glassmorphism
├── components/
│   ├── Map/
│   │   └── MapView.tsx  # Mapbox integration
│   ├── Sidebar/
│   │   └── SightingsSidebar.tsx
│   ├── Report/
│   │   ├── ReportButton.tsx
│   │   └── ReportSheet.tsx
│   ├── Details/
│   │   └── SightingDetailSheet.tsx
│   └── UI/
│       └── GlassmorphicCard.tsx
└── lib/
    ├── firebase.ts      # Firebase configuration
    ├── mapbox.ts        # Mapbox configuration
    ├── types.ts         # TypeScript interfaces
    └── utils.ts         # Utility functions
```

## Usage

### Reporting a Sighting

1. Click the "Report Sighting" button at the bottom of the screen
2. Allow location access when prompted
3. Fill out the form with vehicle, personnel, and behavior details
4. Submit the report

### Viewing Sightings

- **Map Markers**: Click on pulsing red markers to view details
- **Sidebar**: View recent sightings list; click to center map on a specific sighting
- Sightings automatically expire after 4 hours for safety and accuracy

## Technologies

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Mapbox GL** - Interactive maps
- **Firebase Firestore** - Real-time database
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting

## Privacy & Security

- No user authentication required
- No personal information collected or stored
- Reports only contain location, timestamp, and sighting details
- Designed for community safety and mutual aid

## License

MIT
