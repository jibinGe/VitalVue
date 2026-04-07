import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/logo'
import { Link } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'


export default function Verify() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const length = 6;
  const inputsRef = useRef([]);
  const [otp, setOtp] = useState(Array(length).fill(""));
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [seconds, setSeconds] = useState(25)
  const [isResending, setIsResending] = useState(false)


  useEffect(() => {
    const storedPhone = localStorage.getItem('phoneNumber')
    if (storedPhone) {
      setPhoneNumber(storedPhone)
    } else {
      navigate('/login')
    }
  }, [navigate])


  const handleChange = (e, index) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('')

    if (index < length - 1) {
      inputsRef.current[index + 1].focus();
    } else {
      const otpCode = newOtp.join('')
      if (otpCode.length === length) {
        handleVerify(otpCode)
      }
    }
  };


  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        inputsRef.current[index - 1].focus();
      }
    }
  };


  const handleVerify = async (otpCode = null) => {
    const code = otpCode || otp.join('')

    if (code.length !== length) {
      setError('Please enter the complete OTP')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await authService.verifyOtp(code)

      if (result.success && result.data) {
        login(result.data.staff, result.data.token, result.data.refreshToken)
        navigate('/dashboard/home')
      } else {
        setError(result.message || 'Invalid OTP. Please try again.')
        setOtp(Array(length).fill(""))
        inputsRef.current[0]?.focus()
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.')
      setOtp(Array(length).fill(""))
      inputsRef.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }


  const handleResendOtp = async () => {
    if (seconds > 0) return

    setIsResending(true)
    setError('')

    try {
      const result = await authService.resendOtp()

      if (result.success) {
        setSeconds(25)
        setOtp(Array(length).fill(""))
        inputsRef.current[0]?.focus()
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while resending OTP.')
    } finally {
      setIsResending(false)
    }
  }


  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  return (
    <div className='flex flex-col my-auto h-full'>
      <div className="flex items-center justify-center gap-4 mb-6 md:mb-8">
        <Logo />
        <div className="flex flex-col gap-y-1">
          <h4 className='text-2xl text-white'>VitalVue</h4>
          <span className='inline-flex items-center rounded-full px-2 w-max min-h-5 justify-center bg-white/16 uppercase backdrop-blur-[50px] text-[10px] font-normal text-white pt-px'>system</span>
        </div>
      </div>
      <div className="flex flex-col gap-y-1.5 mb-4 md:mb-6 text-center">
        <h4 className='text-2xl lg:text-[32px] leading-none'>Verify OTP</h4>
        <p className='text-[#D3D6DE] text-base max-w-85 mx-auto'>Verification code successfully sent to your registered mobile number.</p>
      </div>
      <div className="grid grid-cols-6 gap-6 mb-6 md:mb-8">
        {Array.from({ length }).map((_, index) => (
          <input
            ref={(el) => (inputsRef.current[index] = el)}
            key={index}
            value={otp[index]}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            type="text"
            inputMode="numeric"   // 👈 numeric keypad on tablet/mobile
            pattern="[0-9]*"      // 👈 iOS Safari numeric hint
            maxLength="1"
            disabled={isLoading}
            className={`w-full aspect-square text-center text-2xl md:text-[32px] font-normal rounded-2xl bg-white/12 backdrop-blur-[50px] border ${otp[index] ? 'border-white/16' : 'border-white/5'} focus:border-[#66A6FF] outline-none text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        ))}
      </div>
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
          {error}
        </div>
      )}
      <div className="flex flex-col items-center gap-y-2">
        <p className='text-base md:text-lg leading-none text-white'>
          OTP sent to: {phoneNumber ? phoneNumber : '...'}
        </p>
        <Link to='/contact-support' className='text-sm font-normal text-[#80B5FF] underline'>Wrong number? Change number</Link>
      </div>
      <div className="mt-6 md:mt-8 w-full flex flex-col gap-y-4 md:gap-y-6">
        <button
          onClick={() => handleVerify()}
          disabled={isLoading || otp.join('').length !== length}
          className='btn btn-gradient hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed w-full text-white min-h-16 rounded-2xl lg:rounded-[20px] group'
        >
          {isLoading ? 'Verifying...' : 'Verify & Log In'}
        </button>
        <button
          onClick={handleResendOtp}
          disabled={seconds !== 0 || isResending || isLoading}
          className={`btn border-none bg-transparent hover:opacity-80 w-full text-[#B6BEC9] hover:text-white min-h-16 rounded-2xl lg:rounded-[20px] group disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isResending ? 'Resending...' : seconds === 0 ? 'Resend OTP' : `Resend in ${seconds}s`}
        </button>
      </div>
    </div>
  )
}
