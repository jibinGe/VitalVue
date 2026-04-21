import React from 'react';
import './DashboardHeroBar.css';

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 16L21 21" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 17H9" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 8C18 6.14348 17.2625 4.36301 15.9497 3.05025C14.637 1.7375 12.8565 1 11 1C9.14348 1 7.36301 1.7375 6.05025 3.05025C4.7375 4.36301 4 6.14348 4 8C4 15 1 17 1 17H21C21 17 18 15 18 8Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.2" />
      <path d="M19.4 15A7.94 7.94 0 0 0 20 12A7.94 7.94 0 0 0 19.4 9L21 7.5L18.5 3.5L16.4 4.2A8 8 0 0 0 13 2H11A8 8 0 0 0 7.6 4.2L5.5 3.5L3 7.5L4.6 9A7.94 7.94 0 0 0 4 12A7.94 7.94 0 0 0 4.6 15L3 16.5L5.5 20.5L7.6 19.8A8 8 0 0 0 11 22H13A8 8 0 0 0 16.4 19.8L18.5 20.5L21 16.5L19.4 15Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Divider() {
  return <span className="dashboard-hero-bar__divider" aria-hidden="true" />;
}

export default function DashboardHeroBar() {
  return (
    <header className="dashboard-hero-bar">
      <div className="dashboard-hero-bar__inner">
        <div className="dashboard-hero-bar__search-shell" role="search" aria-label="Patient search and ward selector">
          <button className="dashboard-hero-bar__ward" type="button" aria-label="Select ward">
            <span className="dashboard-hero-bar__ward-label">ICU Ward</span>
            <span className="dashboard-hero-bar__ward-caret" aria-hidden="true" />
          </button>

          <Divider />

          <div className="dashboard-hero-bar__search">
            <span className="dashboard-hero-bar__search-icon">
              <SearchIcon />
            </span>
            <span className="dashboard-hero-bar__search-text">Search patient or ID...</span>
          </div>
        </div>

        <div className="dashboard-hero-bar__actions">
          <div className="dashboard-hero-bar__icon-group" aria-label="Alerts and settings">
            <button className="dashboard-hero-bar__icon-button" type="button" aria-label="Notifications">
              <BellIcon />
              <span className="dashboard-hero-bar__badge" aria-hidden="true" />
            </button>

            <button className="dashboard-hero-bar__icon-button" type="button" aria-label="Settings">
              <SettingsIcon />
            </button>
          </div>

          <Divider />

          <div className="dashboard-hero-bar__profile">
            <div className="dashboard-hero-bar__profile-copy">
              <span className="dashboard-hero-bar__welcome">Welcome</span>
              <span className="dashboard-hero-bar__name">DR. Andrew</span>
            </div>
            <img
              className="dashboard-hero-bar__avatar"
              src="https://placehold.co/48x48"
              alt="Dr. Andrew profile"
            />
          </div>
        </div>
      </div>
    </header>
  );
}