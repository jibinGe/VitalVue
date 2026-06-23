import React, { useEffect, useRef, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import apiClient from '@/config/apiClient'

const API_BASE_URL = 'https://vitalvue-api.genesysailabs.com'
const QR_TTL = 120 // seconds – matches backend ex=120

export default function QRLoginPanel({ onSuccess }) {
  const canvasRef = useRef(null)
  const eventSourceRef = useRef(null)
  const timerRef = useRef(null)
  const refreshTimerRef = useRef(null)

  const [qrToken, setQrToken] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QR_TTL)
  const [phase, setPhase] = useState('loading') // loading | ready | scanned | error
  const [dots, setDots] = useState('.')

  // --- Animated "loading dots" ---
  useEffect(() => {
    if (phase !== 'loading') return
    const id = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => clearInterval(id)
  }, [phase])

  // --- Core: generate token → render QR → open SSE stream ---
  const startSession = useCallback(async () => {
    // Tear down any previous session cleanly
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    clearInterval(timerRef.current)
    clearTimeout(refreshTimerRef.current)

    setPhase('loading')
    setTimeLeft(QR_TTL)

    try {
      // Step 1: Request a fresh qr_token from the backend
      const res = await apiClient.post('/api/v1/auth/generate')
      const token = res.data.qr_token
      setQrToken(token)

      // Step 2: Encode the token as a QR code on the canvas
      // The QR payload is the token string itself – the mobile app reads this
      // and calls POST /api/v1/auth/qr/authorize with it.
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, token, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        })
      }

      setPhase('ready')

      // Step 3: Open SSE stream to listen for login_success event
      const sseUrl = `${API_BASE_URL}/api/v1/auth/stream/${token}`
      const es = new EventSource(sseUrl)
      eventSourceRef.current = es

      es.addEventListener('login_success', (event) => {
        setPhase('scanned')
        es.close()
        clearInterval(timerRef.current)
        try {
          const payload = JSON.parse(event.data)
          onSuccess(payload)
        } catch {
          setPhase('error')
        }
      })

      es.onerror = () => {
        // SSE connection dropped (token expired on backend, or network issue)
        es.close()
        // Don't auto-refresh here – the countdown will handle that
      }

      // Step 4: Count down the TTL and auto-refresh when it expires
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            // Regenerate after a short pause
            refreshTimerRef.current = setTimeout(startSession, 400)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (err) {
      console.error('[QR] Session init failed', err)
      setPhase('error')
    }
  }, [onSuccess])

  // Start on mount
  useEffect(() => {
    startSession()
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
      clearInterval(timerRef.current)
      clearTimeout(refreshTimerRef.current)
    }
  }, [startSession])

  // --- Progress arc math ---
  const radius = 22
  const circ = 2 * Math.PI * radius
  const progress = timeLeft / QR_TTL
  const dashOffset = circ * (1 - progress)
  const isExpiring = timeLeft <= 20

  return (
    <div className="qr-panel">
      {/* Header */}
      <div className="qr-panel__header">
        <div className="qr-panel__icon-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
          </svg>
        </div>
        <div>
          <p className="qr-panel__label">Scan to sign in</p>
          <p className="qr-panel__sublabel">Use the VitalVue mobile app</p>
        </div>
      </div>

      {/* QR + Overlay states */}
      <div className="qr-panel__canvas-wrap">
        {/* The canvas is always rendered; QRCode.toCanvas writes into it */}
        <canvas
          ref={canvasRef}
          className="qr-panel__canvas"
          style={{ opacity: phase === 'ready' ? 1 : 0.08 }}
        />

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="qr-panel__overlay">
            <div className="qr-panel__spinner" />
            <span className="qr-panel__overlay-text">Generating{dots}</span>
          </div>
        )}

        {/* Scanned overlay */}
        {phase === 'scanned' && (
          <div className="qr-panel__overlay qr-panel__overlay--success">
            <div className="qr-panel__success-ring">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span className="qr-panel__overlay-text" style={{ color: '#4ade80' }}>Authenticated!</span>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && (
          <div className="qr-panel__overlay">
            <button className="qr-panel__retry-btn" onClick={startSession}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Retry
            </button>
          </div>
        )}

        {/* Circular countdown — only when ready */}
        {phase === 'ready' && (
          <div className="qr-panel__timer-ring">
            <svg width="56" height="56" viewBox="0 0 56 56">
              {/* Track */}
              <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
              {/* Progress */}
              <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke={isExpiring ? '#f87171' : 'rgba(204,161,102,0.8)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <span className="qr-panel__timer-num" style={{ color: isExpiring ? '#f87171' : 'rgba(255,255,255,0.7)' }}>
              {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="qr-panel__footer">
        {phase === 'ready' && 'Open the app → tap Scan QR'}
        {phase === 'loading' && 'Preparing secure code…'}
        {phase === 'scanned' && 'Logging you in…'}
        {phase === 'error' && 'Could not load QR. Tap retry.'}
      </p>

      <style>{`
        .qr-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 20px 16px 16px;
          background: linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(204,161,102,0.18);
          border-radius: 20px;
          width: 100%;
          position: relative;
          backdrop-filter: blur(8px);
        }

        .qr-panel__header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .qr-panel__icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(204,161,102,0.12);
          border: 1px solid rgba(204,161,102,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCA166;
          flex-shrink: 0;
        }

        .qr-panel__label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          margin: 0;
          line-height: 1.2;
        }

        .qr-panel__sublabel {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          line-height: 1.3;
        }

        .qr-panel__canvas-wrap {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 0 0 6px rgba(204,161,102,0.12), 0 0 0 1px rgba(204,161,102,0.3);
          flex-shrink: 0;
        }

        .qr-panel__canvas {
          display: block;
          width: 200px !important;
          height: 200px !important;
          border-radius: 14px;
          transition: opacity 0.4s ease;
        }

        .qr-panel__overlay {
          position: absolute;
          inset: 0;
          background: rgba(30, 30, 32, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 14px;
        }

        .qr-panel__overlay--success {
          background: rgba(20, 40, 20, 0.88);
        }

        .qr-panel__spinner {
          width: 32px;
          height: 32px;
          border: 2.5px solid rgba(204,161,102,0.2);
          border-top-color: #CCA166;
          border-radius: 50%;
          animation: qr-spin 0.75s linear infinite;
        }

        @keyframes qr-spin {
          to { transform: rotate(360deg); }
        }

        .qr-panel__overlay-text {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.02em;
        }

        .qr-panel__success-ring {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(74,222,128,0.1);
          border: 2px solid rgba(74,222,128,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: qr-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes qr-pop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        .qr-panel__retry-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(204,161,102,0.15);
          border: 1px solid rgba(204,161,102,0.35);
          border-radius: 10px;
          color: #CCA166;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .qr-panel__retry-btn:hover {
          background: rgba(204,161,102,0.25);
        }

        .qr-panel__timer-ring {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .qr-panel__timer-num {
          position: absolute;
          font-size: 11px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .qr-panel__footer {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-align: center;
          margin: 0;
          letter-spacing: 0.01em;
          min-height: 16px;
        }
      `}</style>
    </div>
  )
}
