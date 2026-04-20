# VitalVue Frontend

React + Vite frontend for the VitalVue healthcare dashboard.

## Overview

The app currently supports a small route-based setup without a router library:

- `/` shows the starter landing screen from the Vite template.
- `/loginpage` shows the login page.
- `/nursedashboard` shows the nurse dashboard with patient cards.

The dashboard UI is built with plain React components and CSS modules/files in `src/nurse dashboard/`.

## Tech Stack

- React 19
- Vite 8
- Plain CSS
- Tailwind CSS package is present, but the current app styling is handled with custom CSS

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run build` creates a production build.
- `npm run preview` previews the production build locally.
- `npm run lint` runs ESLint.

## Project Structure

- `src/App.jsx` handles the simple pathname-based view switching.
- `src/login page/` contains the login page components and styles.
- `src/nurse dashboard/` contains the nurse dashboard, patient card, and related styles.
- `src/index.css` defines global app-wide styles.
- `src/App.css` contains the remaining starter styles and layout shell styles.

## Notes

- The app uses `window.location.pathname` and the browser `popstate` event for navigation.
- If you add more pages, keep the current route checks consistent or replace them with a router.
- Folder names with spaces are intentional in the current codebase, so import paths must match exactly.
