import React, { useState } from 'react'
import apiClient from '../config/apiClient'

// Public account + data deletion request page (Google Play data-deletion requirement).
// No auth. Standalone route /delete-account — reachable without installing the app.

const GOLD = '#CCA166'
const BG = '#1A1A1C'
const CARD = '#232326'
const BORDER = '#3A3A3E'
const TEXT = '#EDEDED'
const MUTED = '#9A9A9F'
const SUPPORT_EMAIL = 'support@genesysailabs.com'

const label = { display: 'block', color: MUTED, fontSize: 13, marginBottom: 6, marginTop: 16 }
const input = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
  background: '#1C1C1F', border: `1px solid ${BORDER}`, color: TEXT, fontSize: 15, outline: 'none',
}

export default function DeleteAccount() {
  const [form, setForm] = useState({ identifier: '', contact_email: '', reason: '' })
  const [state, setState] = useState({ loading: false, error: '', done: null })

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.identifier.trim()) {
      setState((s) => ({ ...s, error: 'Please enter your login ID or email.' }))
      return
    }
    setState({ loading: true, error: '', done: null })
    try {
      const { data } = await apiClient.post('/api/v1/account/deletion-request', {
        identifier: form.identifier.trim(),
        contact_email: form.contact_email.trim() || null,
        reason: form.reason.trim() || null,
      })
      setState({ loading: false, error: '', done: data })
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not submit your request. Please try again or email us.'
      setState({ loading: false, error: typeof msg === 'string' ? msg : 'Submission failed.', done: null })
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, display: 'flex',
      justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ color: GOLD, fontSize: 26, margin: '8px 0 4px' }}>Delete Your VitalVue Account</h1>
        <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
          Use this form to request deletion of your VitalVue account and associated data. You do not
          need the app installed to submit a request.
        </p>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginTop: 20 }}>
          <h2 style={{ fontSize: 15, color: TEXT, margin: '0 0 8px' }}>What gets deleted</h2>
          <ul style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
            <li>Your account profile (name, login ID, contact details)</li>
            <li>Recorded vital-sign history (heart rate, SpO₂, temperature, etc.)</li>
            <li>Device pairings and uploaded data files</li>
          </ul>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
            Requests are processed within <strong style={{ color: TEXT }}>30 days</strong>. Some records may be
            retained where required by law or for legitimate medical/audit obligations; these are kept only as
            long as required and then deleted.
          </p>
        </div>

        {state.done ? (
          <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: 14, padding: 24, marginTop: 20 }}>
            <h2 style={{ color: GOLD, fontSize: 18, margin: '0 0 8px' }}>Request received</h2>
            <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>{state.done.message}</p>
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
              Reference: <strong style={{ color: TEXT }}>{state.done.reference_id}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginTop: 20 }}>
            <label style={label}>Login ID or email <span style={{ color: GOLD }}>*</span></label>
            <input style={input} value={form.identifier} onChange={onChange('identifier')}
              placeholder="e.g. PAT-135 or you@example.com" autoCapitalize="none" />

            <label style={label}>Contact email (so we can confirm)</label>
            <input style={input} type="email" value={form.contact_email} onChange={onChange('contact_email')}
              placeholder="you@example.com" autoCapitalize="none" />

            <label style={label}>Reason (optional)</label>
            <textarea style={{ ...input, minHeight: 88, resize: 'vertical' }} value={form.reason}
              onChange={onChange('reason')} placeholder="Anything you'd like us to know" />

            {state.error && (
              <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 14, marginBottom: 0 }}>{state.error}</p>
            )}

            <button type="submit" disabled={state.loading}
              style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 10, border: 'none',
                background: state.loading ? '#7A6340' : GOLD, color: '#1A1A1C', fontSize: 15, fontWeight: 600,
                cursor: state.loading ? 'default' : 'pointer' }}>
              {state.loading ? 'Submitting…' : 'Request account deletion'}
            </button>
          </form>
        )}

        <p style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.6, marginTop: 18, textAlign: 'center' }}>
          Prefer email? Contact <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: GOLD }}>{SUPPORT_EMAIL}</a> with
          your login ID and the subject “Account deletion”.
        </p>
      </div>
    </div>
  )
}
