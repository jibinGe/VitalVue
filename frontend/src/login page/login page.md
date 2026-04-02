# VitalVue Login Page Specification

## Overview
- Location: `frontend/src/login page`
- React component: `LoginPage.jsx`
- Styles: `LoginPage.css`
- Route: `frontend/src/App.jsx` handles path `/loginpage`

## Visual theme
- Tone: dark, high-contrast, glassmorphism, professional.
- Base palette:
  - background: `radial-gradient(circle at 20% 20%, #283048 0%, #0f0f15 45%)`
  - card: transparent glass darker gradient (`rgba(24, 27, 35, .78)` → `rgba(20, 23, 31, .58)`)
  - text: white (`#fff`), muted: `#d3d6de`
  - accent button: gradient `linear-gradient(91.27deg, #b3884d 0%, #cca166 49%, #b2884d 99%)`

### CSS variables in `:root`
- `--bg-dark: #0f0f15`
- `--card: rgba(37, 37, 39, 0.95)`
- `--muted: #d3d6de`
- `--text: #fff`
- `--accent: linear-gradient(91.27deg, #b3884d 0%, #cca166 49%, #b2884d 99%)`

## Layout details
- Full-screen wrapper: `.loginpage-wrapper`
  - `position: fixed; inset: 0; width: 100vw; min-height: 100vh; display: flex; justify-content: flex-end; align-items: center; padding-right: 50px; overflow: auto;`
- Card container: `.loginpage-card`
  - `position: absolute; top: 50%; left: 75%; transform: translate(-50%, -50%);` (right-half centered)
  - `max-width: 360px; width: min(360px, calc(100vw - 30px));` (responsive)
  - `padding: 28px 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 18px;`
  - `backdrop-filter: blur(20px) saturate(140%);` (glass)
  - `background: linear-gradient(163deg, rgba(24,27,35,.78), rgba(26,30,38,.62), rgba(20,23,31,.58));`
  - border + box-shadow for depth
- Inner glass glow overlay: `.loginpage-card::before` and `::after` for sheen + inner-edge highlight
- Form vertical stack via `.loginpage-form { display: flex; flex-direction: column; gap: 16px; }`

## Typography
- Brand title: `.brand-text h1`
  - `font-family: 'Lufga', sans-serif; font-weight: 500; font-size: 20px; letter-spacing: 1px;`
- Card title: `.loginpage-title-group h2`
  - `font-size: 22px; font-weight: 500;` with `letter-spacing: 0.5px`
- Supporting text: `.loginpage-title-group p` 12px, muted color, centered
- Labels: `.field-group label` 12px, color #e2e4e9

## Form controls
- Input style: `.field-group input`
  - `height: 40px; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: #fff;`
- Checkbox row: `.info-row` with `justify-content: space-between; align-items: center;`
- Link: `.help-link` color `#80b5ff; text-decoration: underline;`
- Submit button: `.submit-button`
  - `height: 52px; width: 100%; border-radius: 16px; background: var(--accent); color: #fff; font-size: 16px; display: inline-flex; align-items: center; justify-content: center;`

## HTML structure (`LoginPage.jsx`)
```jsx
return (
  <div className="loginpage-wrapper">
    <div className="loginpage-bg" />
    <div className="loginpage-card">
      <div className="loginpage-brand-row">
        <div className="brand-icon">VV</div>
        <div className="brand-text"><h1>VitalVue</h1></div>
      </div>
      <div className="loginpage-title-group">
        <h2>Secure Staff Authentication</h2>
        <p>Provide your verified credentials to log in securely.</p>
      </div>
      <form className="loginpage-form" onSubmit={handleSubmit}>
        <div className="field-group"><label>Full Name</label><input type="text" value={name} onChange={...}/></div>
        <div className="field-group"><label>Employee ID</label><input type="text" value={id} onChange={...}/></div>
        <div className="field-group"><label>Phone Number</label><input type="text" value={phone} onChange={...}/></div>
        <div className="info-row">
          <label className="checkbox-label"><input type="checkbox" /> Stay logged in</label>
          <a href="#" className="help-link">Contact Support</a>
        </div>
        <button type="submit" className="submit-button">
          Generate OTP <span className="arrow">→</span>
        </button>
      </form>
    </div>
  </div>
)
```

## Routing
`App.jsx` uses location pathname guard:
```jsx
const route = window.location.pathname.replace('/', '');
return route === 'loginpage' ? <LoginPage /> : <DefaultHome />;
```

## Behaviors
- No CSS layout changes required when adding glass visual effects.
- Button click can dispatch / generate OTP (not implemented in UI-only phase).
- `loginpage-bg` is optional background image overlay with `opacity: 0.12`.

## Notes
- Keep all IDs and label text exactly as the design spec.
- No new elements should be added for glass effect; use only pseudo-elements and filter properties.
- This document is the single source for visual specs and component organization for `login page`.
