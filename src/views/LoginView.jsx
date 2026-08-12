import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

// Generate floating particle positions (seeded, no randomness on re-render)
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: ((i * 47) % 97),
  y: ((i * 31 + 13) % 93),
  size: (i % 3) + 1.5,
  delay: (i * 0.35) % 4,
  duration: 7 + (i % 5),
}));

const FEATURES = ['Inventory', 'Purchasing', 'Sales', 'Accounting', 'Ledgers', 'Financials'];

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState('');
  const [animIn, setAnimIn]     = useState(false);

  // States for onboarding account request
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqMobile, setReqMobile] = useState('');
  const [reqCode, setReqCode] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');
  const [reqError, setReqError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 60);

    // Remember original body/html values to restore on unmount
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;
    const originalBodyZoom = document.body.style.zoom;

    // Apply login theme overrides (revert zoom to 1.0 on login screen)
    document.documentElement.style.backgroundColor = '#0B0F1A';
    document.body.style.backgroundColor = '#0B0F1A';
    document.body.style.zoom = '1';

    return () => {
      clearTimeout(t);
      // Restore original values on transition/unmount
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
      document.body.style.zoom = originalBodyZoom;
    };
  }, []);

  useEffect(() => {
    const logoutReason = localStorage.getItem('erp_logout_reason');
    if (logoutReason) {
      setError(logoutReason);
      localStorage.removeItem('erp_logout_reason');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      // Open the request modal since login failed
      setReqEmail(email); // autofill the email entered
      setReqName('');
      setReqCode('');
      setReqPassword('');
      setReqMobile('');
      setReqSuccessMsg('');
      setReqError('');
      setShowRequestModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setReqLoading(true);
    setReqError('');
    setReqSuccessMsg('');

    const payload = {
      employeeCode: reqCode,
      email: reqEmail,
      password: reqPassword,
      mobileNumber: reqMobile,
    };

    try {
      // 1. Try MySQL backend — self-register endpoint verifies employee & creates credentials instantly
      const res = await fetch('/api/user-id-requests/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setReqSuccessMsg(`Success! Your account has been verified and registered${data.displayName ? ` for ${data.displayName}` : ''}. You can now log in.`);
        setTimeout(() => {
          setShowRequestModal(false);
        }, 3000);
        return;
      }

      // Server returned a meaningful validation error — show it directly
      if (res.status === 400 || res.status === 404) {
        setReqError(data.error || 'Registration failed. Please check your details.');
        setReqLoading(false);
        return;
      }

      throw new Error(data.error || 'Server error. Falling back to offline mode.');
    } catch (err) {
      console.warn('[LoginView] MySQL self-register failed, falling back to LocalStorage:', err.message);

      // 2. LocalStorage offline fallback
      try {
        const storedUsersStr = localStorage.getItem('erp_users') || '[]';
        const storedUsers = JSON.parse(storedUsersStr);
        const emailLower = reqEmail.trim().toLowerCase();
        const codeUpper = reqCode.trim().toUpperCase();
        const normalizedCode = codeUpper.startsWith('ERP-00') ? codeUpper.replace('ERP-00', 'ERP-05') : codeUpper;

        // Verify against HRMS employees mock list in localStorage
        const storedEmployeesStr = localStorage.getItem('erp_employees_v8');
        let matchedEmp = null;
        if (storedEmployeesStr) {
          const storedEmployees = JSON.parse(storedEmployeesStr);
          matchedEmp = storedEmployees.find(emp =>
            (emp.employeeCode?.toUpperCase() === codeUpper || emp.employeeCode?.toUpperCase() === normalizedCode) &&
            emp.status?.toLowerCase() === 'active' &&
            (emp.emailAddress?.trim().toLowerCase() === emailLower || emp.personalEmailAddress?.trim().toLowerCase() === emailLower)
          );
        }

        if (!matchedEmp) {
          setReqError('No active employee found matching this Employee Code and Email. Please contact HR or ensure the server is running.');
          setReqLoading(false);
          return;
        }

        const stdCode = matchedEmp.employeeCode.toUpperCase();

        // Check for duplicate credentials
        if (storedUsers.some(u => u.email?.trim().toLowerCase() === emailLower || u.uid?.toUpperCase() === stdCode || u.uid?.toUpperCase() === codeUpper)) {
          setReqError('An account with this email/employee code is already registered.');
          setReqLoading(false);
          return;
        }

        // Register new user locally
        const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUser = {
          uid: stdCode,
          displayName: matchedEmp.fullNameEnglish,
          email: emailLower,
          password: reqPassword,
          role: 'employee',
          branchId: 'br-1',
          status: 'active',
          avatarColor: randomColor,
          mustChangePassword: false,
          permissions: { hr: ['read'] }
        };

        storedUsers.push(newUser);
        localStorage.setItem('erp_users', JSON.stringify(storedUsers));

        // Sync with HRMS credentials
        const storedCreds = localStorage.getItem('erp_user_creds') || '[]';
        const creds = JSON.parse(storedCreds);
        if (!creds.some(c => c.employeeCode === stdCode)) {
          creds.push({
            username: emailLower.split('@')[0],
            fullName: matchedEmp.fullNameEnglish,
            email: emailLower,
            employeeCode: stdCode,
            password: reqPassword,
            mustChangePassword: false
          });
          localStorage.setItem('erp_user_creds', JSON.stringify(creds));
        }

        // Add to requests list as Approved
        const requestsStr = localStorage.getItem('erp_user_id_requests') || '[]';
        const requests = JSON.parse(requestsStr);
        requests.push({
          id: `req-${Date.now()}`,
          fullName: matchedEmp.fullNameEnglish,
          email: emailLower,
          mobileNumber: reqMobile.trim() || matchedEmp.mobileNumber || '',
          status: 'Approved',
          taggedEmployeeCode: stdCode,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('erp_user_id_requests', JSON.stringify(requests));

        setReqSuccessMsg('Success! Your account has been registered (offline mode). You can now sign in.');
        setTimeout(() => {
          setShowRequestModal(false);
        }, 3000);
      } catch (lsErr) {
        setReqError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setReqLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const user = await authService.loginWithGoogle();
      onLoginSuccess(user);
    } catch (err) {
      // user closed the popup — don't treat as a hard error
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // silent
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('origin_mismatch'))) {
        setError(`Google Sign-In is blocked on this port. Please open the app at http://localhost:3000 — the app has been reconfigured. Restart the dev server to apply.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled for this project. Please use email/password login.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please use email/password instead.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };



  return (
    <div className="login-root" style={styles.root}>

      {/* ───── LEFT PANEL ───── */}
      <div className="login-left" style={styles.left}>
        {/* Ambient glows */}
        <div style={styles.glowTL} />
        <div style={styles.glowBR} />

        <div style={{ ...styles.formWrap, opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>

          {/* Brand */}
          <div style={styles.brand}>
            <div>
              <div style={styles.brandName}>ACCOUNTICA</div>
              <div style={{ ...styles.brandSub, color: '#6366F1' }}>ERP Platform</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={styles.heading}>Welcome back 👋</h1>
            <p style={styles.subheading}>Sign in to your ACCOUNTICA account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

            {/* Email */}
            <div>
              <label style={styles.label}>EMAIL</label>
              <div style={{ position: 'relative' }}>
                <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email" required
                  id="login-email"
                  className="login-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@erpforu.com"
                  style={styles.input}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={styles.label}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type={showPw ? 'text' : 'password'} required
                  id="login-password"
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: '3rem' }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={styles.eyeBtn} tabIndex={-1}>
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>



            {/* Sign In button */}
            <button
              type="submit"
              id="sign-in-btn"
              className="signin-button"
              disabled={loading}
              style={styles.signInBtn}
            >
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {loading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Signing in...
                  </>
                ) : <>Sign in →</>}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Google Sign-In */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={styles.googleBtn}
          >
            {googleLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.3 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.9-2.2 5.4-4.7 7l7.3 5.7C43.4 37 46.5 31.2 46.5 24.5z"/>
                <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6L2.6 13.3C.9 16.7 0 20.3 0 24s.9 7.3 2.6 10.7l7.9-6.1z"/>
                <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.6 2.2-7.9 2.2-6.3 0-11.6-3.7-13.5-9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
              </svg>
            )}
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>



        </div>
      </div>

      {/* ───── RIGHT PANEL ───── */}
      <div className="login-right" style={styles.right}>

        {/* Floating particles */}
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: 'rgba(129,140,248,0.45)',
            animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '25%', left: '25%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Concentric rings */}
        {[680, 510, 360, 220].map((sz, i) => {
          const isClockwise = i % 2 === 0;
          const duration = 40 + i * 20; // 40s, 60s, 80s, 100s
          return (
            <div key={sz} style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: sz, height: sz,
              borderRadius: '50%',
              border: `1px dashed rgba(129,140,248,${0.06 + i * 0.03})`,
              animation: `${isClockwise ? 'spinClockwise' : 'spinCounterClockwise'} ${duration}s linear infinite`,
              pointerEvents: 'none',
            }} />
          );
        })}

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 2.5rem' }}>

          {/* Logo orb */}
          <div style={{ ...styles.logoOrb, opacity: animIn ? 1 : 0, transform: animIn ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)', transition: 'opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s' }}>
            <div style={styles.logoGlow} />
            <div style={styles.logoIconWrap}>
              <img src="/logo.png" alt="ACCOUNTICA Logo" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Headline */}
          <div style={{ opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s' }}>
            <h2 style={styles.rightHeading}>
              Your Professional<br />
              <span style={styles.rightHeadingAccent}>ERP Portal</span>
            </h2>
            <p style={styles.rightSubText}>
              Manage inventory, purchases, sales, and complete double-entry accounting — all from one beautifully designed platform.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.7s ease 0.6s, transform 0.7s ease 0.6s' }}>
            {FEATURES.map(f => (
              <span key={f} className="feature-pill" style={styles.pill}>{f}</span>
            ))}
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '2.5rem' }}>
            <div style={{ width: 24, height: 6, borderRadius: 9999, background: '#6366F1' }} />
            <div style={{ width: 6,  height: 6, borderRadius: 9999, background: 'rgba(99,102,241,0.3)' }} />
            <div style={{ width: 6,  height: 6, borderRadius: 9999, background: 'rgba(99,102,241,0.3)' }} />
          </div>
        </div>
      </div>

      {/* User ID Request Modal */}
      {showRequestModal && (
        <div className="login-modal-overlay" style={modalStyles.overlay}>
          <div className="login-modal-content" style={modalStyles.content}>
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>🔑 Register Employee Account</h3>
              <button 
                type="button" 
                onClick={() => setShowRequestModal(false)}
                className="modal-close-btn"
                style={modalStyles.closeBtn}
              >
                &times;
              </button>
            </div>
            
            <p style={modalStyles.description}>
              Please enter your employee details below to verify your identity and instantly create your user login.
            </p>

            <form onSubmit={handleRequestSubmit} style={modalStyles.form}>
              {reqError && (
                <div style={modalStyles.errorBox}>
                  ⚠️ {reqError}
                </div>
              )}
              {reqSuccessMsg && (
                <div style={modalStyles.successBox}>
                  ✓ {reqSuccessMsg}
                </div>
              )}

              <div style={modalStyles.group}>
                <label style={modalStyles.label}>EMPLOYEE CODE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP-0503"
                  value={reqCode}
                  onChange={e => setReqCode(e.target.value)}
                  className="modal-input"
                  style={modalStyles.input}
                />
              </div>

              <div style={modalStyles.group}>
                <label style={modalStyles.label}>EMAIL ADDRESS *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. tutul.tr@gmail.com"
                  value={reqEmail}
                  onChange={e => setReqEmail(e.target.value)}
                  className="modal-input"
                  style={modalStyles.input}
                />
              </div>

              <div style={modalStyles.group}>
                <label style={modalStyles.label}>DESIRED PASSWORD *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={reqPassword}
                  onChange={e => setReqPassword(e.target.value)}
                  className="modal-input"
                  style={modalStyles.input}
                />
              </div>

              <div style={modalStyles.group}>
                <label style={modalStyles.label}>MOBILE NUMBER (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. +88017XXXXXXXX"
                  value={reqMobile}
                  onChange={e => setReqMobile(e.target.value)}
                  className="modal-input"
                  style={modalStyles.input}
                />
              </div>

              <div style={modalStyles.actions}>
                <button 
                  type="button" 
                  onClick={() => setShowRequestModal(false)}
                  style={modalStyles.cancelBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={reqLoading}
                  style={modalStyles.submitBtn}
                >
                  {reqLoading ? 'Verifying...' : 'Verify & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinClockwise {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes spinCounterClockwise {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to   { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes particleFloat {
          0%, 100% { opacity: 0.25; transform: translateY(0px); }
          50%       { opacity: 0.85; transform: translateY(-12px); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50%       { transform: scale(1.15); opacity: 0.95; }
        }
        #google-signin-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        #google-signin-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.2) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 12px rgba(255, 255, 255, 0.03);
          transform: translateY(-1.5px);
          cursor: pointer;
        }
        #google-signin-btn:active:not(:disabled) {
          transform: translateY(0.5px);
        }
        .login-input {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .login-input:hover:not(:focus) {
          border-color: rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.06) !important;
        }
        .login-input:focus {
          border-color: #6366F1 !important;
          background: rgba(99, 102, 241, 0.06) !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18) !important;
        }
        .signin-button {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .signin-button:hover:not(:disabled) {
          transform: translateY(-1.5px);
          background: linear-gradient(135deg, #4338CA 0%, #4F46E5 100%) !important;
          box-shadow: 0 10px 30px rgba(79, 70, 229, 0.45), 0 0 15px rgba(99, 102, 241, 0.2) !important;
        }
        .signin-button:active:not(:disabled) {
          transform: translateY(0.5px);
        }
        .feature-pill {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          cursor: default;
        }
        .feature-pill:hover {
          background: rgba(99, 102, 241, 0.22) !important;
          border-color: rgba(129, 140, 248, 0.45) !important;
          color: #fff !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }
        .modal-input {
          transition: all 0.25s ease !important;
        }
        .modal-input:hover:not(:focus) {
          border-color: rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.06) !important;
        }
        .modal-input:focus {
          border-color: #6366F1 !important;
          background: rgba(99, 102, 241, 0.06) !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18) !important;
        }
        .modal-close-btn {
          transition: color 0.2s, transform 0.2s !important;
        }
        .modal-close-btn:hover {
          color: #F3F4F6 !important;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}

/* ─── Inline Style Objects ─── */
const styles = {
  root: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    overflow: 'hidden',
    fontFamily: '"Inter", "Outfit", sans-serif',
    background: '#0B0F1A',
  },
  // LEFT
  left: {
    width: '100%',
    maxWidth: 480,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: '2.5rem 1.5rem',
    zIndex: 10,
    flex: '0 0 auto',
  },
  glowTL: {
    position: 'absolute', top: 0, left: 0,
    width: 520, height: 520, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,70,229,0.11) 0%, transparent 70%)',
    transform: 'translate(-30%,-30%)', pointerEvents: 'none',
  },
  glowBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
    transform: 'translate(30%,30%)', pointerEvents: 'none',
  },
  formWrap: {
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    zIndex: 10,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '2.2rem',
  },
  brandIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
    boxShadow: '0 0 16px rgba(99,102,241,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-lg)',
    flexShrink: 0,
  },
  brandName: {
    color: '#F8FAFC', fontWeight: 800, fontSize: 'var(--font-size-base)',
    letterSpacing: '-0.3px', lineHeight: 1,
  },
  brandSub: {
    color: '#818CF8', fontSize: 'var(--font-size-xs)', fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3,
  },
  heading: {
    fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: '#F8FAFC',
    margin: '0 0 0.3rem', letterSpacing: '-0.4px', lineHeight: 1.2,
  },
  subheading: {
    fontSize: 'var(--font-size-sm)', color: '#64748B', fontWeight: 500,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0.65rem 0.9rem',
    borderRadius: 10, marginBottom: '1rem',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#FCA5A5', fontSize: 'var(--font-size-xs)', fontWeight: 600,
  },
  googleBtn: {
    width: '100%',
    padding: '0.78rem',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#CBD5E1',
    fontWeight: 600,
    fontSize: 'var(--font-size-sm)',
    fontFamily: '"Inter", "Outfit", sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    transition: 'all 0.2s ease',
    marginBottom: '1.25rem',
    boxSizing: 'border-box',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  dividerLine: {
    flex: 1, height: 1, background: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.15em', color: '#334155',
  },
  label: {
    display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    color: '#475569', marginBottom: 6,
  },
  input: {
    width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem',
    paddingTop: '0.78rem', paddingBottom: '0.78rem',
    borderRadius: 12, fontSize: 'var(--font-size-sm)', fontWeight: 500,
    outline: 'none', border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)', color: '#F1F5F9',
    fontFamily: '"Inter", "Outfit", sans-serif',
    boxSizing: 'border-box', transition: 'all 0.2s ease',
  },
  inputIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    width: 15, height: 15, color: '#475569', pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0,
  },
  signInBtn: {
    width: '100%', padding: '0.82rem',
    borderRadius: 12, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    boxShadow: '0 8px 28px rgba(79,70,229,0.35)',
    color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)',
    fontFamily: '"Inter", "Outfit", sans-serif',
    transition: 'background 0.2s ease',
    marginTop: '0.4rem',
    position: 'relative', overflow: 'hidden',
  },
  initBtn: {
    marginTop: '0.75rem', width: '100%', padding: '0.7rem',
    borderRadius: 12, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#94A3B8', fontWeight: 600, fontSize: 'var(--font-size-xs)',
    fontFamily: '"Inter", "Outfit", sans-serif',
    transition: 'all 0.2s ease',
  },
  footerHint: {
    marginTop: '1.75rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    fontSize: 'var(--font-size-xs)', color: '#334155',
  },
  // RIGHT
  right: {
    flex: 1,
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1E1B4B 0%, #1a1035 40%, #0f0c2e 100%)',
  },
  logoOrb: {
    position: 'relative', width: 128, height: 128,
    marginBottom: '2rem', flexShrink: 0,
  },
  logoGlow: {
    position: 'absolute', inset: 0, borderRadius: '2rem',
    background: 'rgba(99,102,241,0.22)', filter: 'blur(24px)',
    animation: 'pulseGlow 6s ease-in-out infinite',
  },
  logoIconWrap: {
    position: 'relative', width: '100%', height: '100%',
    borderRadius: '2rem',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))',
    border: '1px solid rgba(129,140,248,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 40px rgba(99,102,241,0.3)',
    animation: 'particleFloat 5s ease-in-out infinite',
  },
  logoIconText: {
    fontSize: '3.5rem', fontWeight: 900, color: '#818CF8',
    lineHeight: 1, textShadow: '0 0 30px rgba(99,102,241,0.7)',
    fontFamily: '"Inter", sans-serif',
  },
  rightHeading: {
    fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: '#F8FAFC',
    lineHeight: 1.2, letterSpacing: '-0.5px',
    margin: '0 0 1rem',
  },
  rightHeadingAccent: {
    background: 'linear-gradient(90deg, #818CF8, #A78BFA)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  rightSubText: {
    fontSize: 'var(--font-size-sm)', color: '#64748B', lineHeight: 1.65,
    fontWeight: 500, maxWidth: 360, margin: '0 auto',
  },
  pill: {
    padding: '0.35rem 0.85rem',
    borderRadius: 9999,
    fontSize: 'var(--font-size-xs)', fontWeight: 700,
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(129,140,248,0.2)',
    color: '#A5B4FC',
  },
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(5, 8, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1.5rem',
  },
  content: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    padding: '2rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
    boxSizing: 'border-box',
    fontFamily: '"Inter", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    color: '#F9FAFB',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    fontSize: '1.75rem',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    transition: 'color 0.2s',
  },
  description: {
    color: '#9CA3AF',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1.5,
    margin: '0 0 1.5rem 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#6B7280',
  },
  input: {
    width: '100%',
    padding: '0.78rem 1rem',
    borderRadius: 12,
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    outline: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#F1F5F9',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    color: '#FCA5A5',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
  },
  successBox: {
    padding: '0.75rem 1rem',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    color: '#A7F3D0',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.78rem',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#9CA3AF',
    fontWeight: 600,
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    flex: 1.5,
    padding: '0.78rem',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.2s',
  },
};
