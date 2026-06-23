import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Logo from '@/components/logo'
import { Link } from 'react-router-dom'
import { Angle, Contact } from '../../utilities/icons'
import InputInsideLabel from '@/components/ui/input-inside-label'
import { authService } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import QRLoginPanel from '@/components/auth/QRLoginPanel'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard/home'
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    employeeId: '',
    staySignedIn: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate(from, { replace: true })
    }
  }, [navigate, from])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    setError('')
  }

  const handleCheckboxChange = (e) => {
    setFormData(prev => ({
      ...prev,
      staySignedIn: e.target.checked,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await authService.login(
        formData.employeeId,
        formData.staySignedIn
      )

      if (result.success) {
        navigate('/verify', { state: { from } })
      } else {
        setError(result.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Called by QRLoginPanel when SSE delivers login_success
  const handleQRSuccess = (payload) => {
    const { token, staff } = authService.handleQRLoginSuccess(payload)
    login(staff, token)
    navigate(from, { replace: true })
  }

  return (
    <div className='login-split'>
      {/* ── Left: Standard OTP form ── */}
      <div className='login-split__form'>
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Logo />
          <div className="flex flex-col gap-y-1">
            <h4 className='text-2xl text-white'>VitalVue</h4>
            <span className='inline-flex items-center rounded-full px-2 w-max min-h-5 justify-center bg-white/16 uppercase backdrop-blur-[50px] text-[10px] font-normal text-white pt-px'>system</span>
          </div>
        </div>

        <div className="flex flex-col gap-y-1.5 mb-4 md:mb-6">
          <h4 className='text-2xl lg:text-[32px] leading-none'>Secure Staff Authentication</h4>
          <p className='text-[#D3D6DE] text-base'>Provide your verified credentials to log in securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
          <InputInsideLabel
            label="Employee ID"
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
            right_icon={<Contact />}
            required
          />

          <div className="flex flex-col gap-y-4">
            <label htmlFor='agree' className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className='hidden'
                id='agree'
                checked={formData.staySignedIn}
                onChange={handleCheckboxChange}
              />
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.1971 0H5.8129C2.17108 0 0 2.17 0 5.81V14.18C0 17.83 2.17108 20 5.8129 20H14.1871C17.8289 20 20 17.83 20 14.19V5.81C20.01 2.17 17.8389 0 14.1971 0ZM14.007 10.75H6.00299C5.59279 10.75 5.25262 10.41 5.25262 10C5.25262 9.59 5.59279 9.25 6.00299 9.25H14.007C14.4172 9.25 14.7574 9.59 14.7574 10C14.7574 10.41 14.4172 10.75 14.007 10.75Z" fill="white" />
              </svg>
              <span className='text-sm font-normal text-white'>Stay signed in on this device</span>
            </label>
            <Link to='/contact-support' className='text-sm font-normal text-[#80B5FF] underline hover:no-underline'>Need help? Contact Support</Link>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              {error}
            </div>
          )}
        </form>

        <div className="mt-6 md:mt-8 w-full">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className='btn btn-gradient hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed w-full text-white min-h-16 rounded-2xl lg:rounded-[20px] group'
          >
            {isLoading ? 'Generating OTP...' : 'Generate OTP'}
            {!isLoading && <Angle className='size-6 transition-all duration-300 group-hover:translate-x-2' />}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className='login-split__divider'>
        <div className='login-split__divider-line' />
        <span className='login-split__divider-text'>or</span>
        <div className='login-split__divider-line' />
      </div>

      {/* ── Right: QR Login Panel ── */}
      <div className='login-split__qr'>
        <QRLoginPanel onSuccess={handleQRSuccess} />
      </div>

      <style>{`
        .login-split {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 0;
        }

        .login-split__form {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        /* Horizontal divider (mobile) */
        .login-split__divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }

        .login-split__divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }

        .login-split__divider-text {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .login-split__qr {
          width: 100%;
        }

        /* Tablet+: side-by-side layout */
        @media (min-width: 640px) {
          .login-split {
            flex-direction: row;
            align-items: flex-start;
            gap: 0;
          }

          .login-split__form {
            flex: 1;
            min-width: 0;
          }

          /* Vertical divider */
          .login-split__divider {
            flex-direction: column;
            margin: 0 20px;
            align-self: stretch;
          }

          .login-split__divider-line {
            flex: 1;
            width: 1px;
            height: auto;
          }

          .login-split__qr {
            width: 240px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
          }
        }

        @media (min-width: 768px) {
          .login-split__qr {
            width: 256px;
          }

          .login-split__divider {
            margin: 0 24px;
          }
        }
      `}</style>
    </div>
  )
}
