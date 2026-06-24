import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QRLoginPanel from '@/components/auth/QRLoginPanel'
import { authService } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '@/components/logo'

/**
 * TV Login — standalone fullscreen QR-only login route (/tv-login).
 * No OTP form, no shared layout wrapper.
 * On QR scan success the user is sent directly to /tv.
 */
export default function TvLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/tv', { replace: true })
    }
  }, [navigate])

  const handleQRSuccess = (payload) => {
    const { token, staff } = authService.handleQRLoginSuccess(payload)
    login(staff, token)
    navigate('/tv', { replace: true })
  }

  return (
    <div className="tv-login-root">
      {/* Animated background orbs */}
      <div className="tv-login-orb tv-login-orb--1" />
      <div className="tv-login-orb tv-login-orb--2" />
      <div className="tv-login-orb tv-login-orb--3" />

      {/* Grid overlay */}
      <div className="tv-login-grid" />

      {/* Content */}
      <div className="tv-login-center">
        {/* Branding */}
        <div className="tv-login-brand">
          <div className="tv-login-brand__logo">
            <Logo />
          </div>
          <div className="tv-login-brand__text">
            <span className="tv-login-brand__name">VitalVue</span>
            <span className="tv-login-brand__badge">TV DISPLAY</span>
          </div>
        </div>

        {/* Headline */}
        <div className="tv-login-headline">
          <h1 className="tv-login-headline__title">Sign in to Display</h1>
          <p className="tv-login-headline__sub">
            Scan the QR code with the VitalVue mobile app to authenticate this screen
          </p>
        </div>

        {/* QR Panel — reusing the existing component */}
        <div className="tv-login-qr-wrap">
          <QRLoginPanel onSuccess={handleQRSuccess} />
        </div>

        {/* Footer */}
        <p className="tv-login-footer">
          For staff use only &nbsp;·&nbsp; VitalVue Health Systems
        </p>
      </div>

      <style>{`
        /* ── Root ── */
        .tv-login-root {
          position: fixed;
          inset: 0;
          background: #0f0f10;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ── Background orbs ── */
        .tv-login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          will-change: transform;
        }
        .tv-login-orb--1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(204,161,102,0.18) 0%, transparent 70%);
          top: -180px;
          right: -180px;
          animation: tv-orb-drift 14s ease-in-out infinite alternate;
        }
        .tv-login-orb--2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(120,80,200,0.12) 0%, transparent 70%);
          bottom: -140px;
          left: -140px;
          animation: tv-orb-drift 18s ease-in-out infinite alternate-reverse;
        }
        .tv-login-orb--3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(204,161,102,0.08) 0%, transparent 70%);
          bottom: 20%;
          right: 15%;
          animation: tv-orb-drift 22s ease-in-out infinite alternate;
        }
        @keyframes tv-orb-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }

        /* ── Grid overlay ── */
        .tv-login-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(204,161,102,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(204,161,102,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* ── Center card ── */
        .tv-login-center {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          padding: 52px 48px 44px;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(204,161,102,0.2);
          border-radius: 32px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 40px 80px rgba(0,0,0,0.55),
            0 0 60px rgba(204,161,102,0.06);
          width: 420px;
          max-width: calc(100vw - 48px);
          animation: tv-card-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes tv-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* ── Branding ── */
        .tv-login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .tv-login-brand__logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .tv-login-brand__text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .tv-login-brand__name {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .tv-login-brand__badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          background: rgba(204,161,102,0.14);
          border: 1px solid rgba(204,161,102,0.28);
          border-radius: 6px;
          font-size: 9px;
          font-weight: 600;
          color: #CCA166;
          letter-spacing: 0.1em;
          width: max-content;
        }

        /* ── Headline ── */
        .tv-login-headline {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tv-login-headline__title {
          font-size: 26px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0;
        }
        .tv-login-headline__sub {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          line-height: 1.5;
          margin: 0;
        }

        /* ── QR wrap — give the panel full width ── */
        .tv-login-qr-wrap {
          width: 100%;
        }

        /* ── Footer ── */
        .tv-login-footer {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.03em;
          text-align: center;
          margin: 0;
        }

        /* ── TV / large-screen layout tweak ── */
        @media (min-width: 1280px) {
          .tv-login-center {
            width: 460px;
            padding: 60px 56px 52px;
          }
          .tv-login-headline__title { font-size: 30px; }
        }
      `}</style>
    </div>
  )
}
