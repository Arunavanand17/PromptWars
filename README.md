# MedAlert — Emergency Medical Resource Finder

## Overview
During medical emergencies, patients and their families face critical challenges in locating available ICU beds, ventilators, and essential life-saving equipment. 

MedAlert is a centralized, real-time platform designed to solve this crisis. It empowers hospitals across a city to broadcast their resource availability simultaneously, giving the public and medical centers instant access to critical data. 

With MedAlert, frantic searches are replaced by clear, actionable, and real-time mapping of life-saving equipment—reducing treatment delays and preventing tragic outcomes.

## Key Features
- **Real-Time Resource Tracking**: View live updates of ICU beds, ventilators, oxygen cylinders, and general beds.
- **Interactive City Map**: Colour-coded markers immediately indicate which hospitals are available, limited, or full.
- **Smart Analytics**: City-wide resource monitoring for administrators to track capacity trends.
- **Hospital Admin Panel**: Secure portal for hospital staff to broadcast resource availability in real-time.
- **Emergency Tools**: Instant access to emergency hotlines, quick-call buttons, and one-click directions.
- **Fully Accessible**: Designed with WCAG standards in mind, including keyboard navigation, focus management, and screen-reader support.

## Technical Details
- **Frontend**: React 19 + Vite
- **Mapping**: Leaflet + React-Leaflet (Carto basemaps)
- **Charts**: Recharts
- **Styling**: Vanilla CSS (Responsive, Dark-mode native, Glassmorphism aesthetics)
- **Testing**: Vitest + React Testing Library (70 unit and component tests)

## Getting Started
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Run the test suite: `npm test`
4. Build for production: `npm run build`
