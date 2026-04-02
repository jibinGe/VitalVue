import './LoginPage.css'

function LoginPage() {
  return (
    <div className="loginpage-wrapper">
      <div className="loginpage-bg" />
      <div className="loginpage-card">
        <div className="loginpage-brand-row">
          <div className="brand-icon">VV</div>
          <div className="brand-text">
            <h1>VitalVue</h1>
          </div>
        </div>

        <div className="loginpage-title-group">
          <h2>Secure Staff Authentication</h2>
          <p>Provide your verified credentials to log in securely.</p>
        </div>

        <form className="loginpage-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field-group">
            <label>Employee ID</label>
            <input type="text" placeholder="" value="" />
          </div>

          <div className="or-separator">or</div>

          <div className="field-group">
            <label>Phone Number</label>
            <input type="text" placeholder="" value="" />
          </div>

          <div className="info-row">
            <label className="checkbox-label">
              <input type="checkbox" /> Stay logged in
            </label>
            <a href="#" className="help-link">Contact Support</a>
          </div>

          <button type="submit" className="submit-button">
            Generate OTP
            <span className="arrow">→</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
