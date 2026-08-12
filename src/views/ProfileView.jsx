import { useState, useMemo } from 'react';
import { authService } from '../services/authService';

export default function ProfileView({ currentUser, activeRouteHandler }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial State parsing from localStorage (under 'erp_current_user')
  const [personalInfo, setPersonalInfo] = useState({
    fullNameBangla: currentUser?.personalInfo?.fullNameBangla || '',
    gender: currentUser?.personalInfo?.gender || 'Male',
    dateOfBirth: currentUser?.personalInfo?.dateOfBirth || '',
    nid: currentUser?.personalInfo?.nid || '',
    passportNumber: currentUser?.personalInfo?.passportNumber || '',
    bloodGroup: currentUser?.personalInfo?.bloodGroup || 'O+',
    maritalStatus: currentUser?.personalInfo?.maritalStatus || 'Single',
  });

  const [contactInfo, setContactInfo] = useState({
    personalMobile: currentUser?.contactInfo?.personalMobile || '',
    whatsApp: currentUser?.contactInfo?.whatsApp || '',
    linkedIn: currentUser?.contactInfo?.linkedIn || '',
    facebook: currentUser?.contactInfo?.facebook || '',
  });

  const [addressInfo, setAddressInfo] = useState({
    presentStreet: currentUser?.addressInfo?.presentStreet || '',
    presentCity: currentUser?.addressInfo?.presentCity || '',
    presentZip: currentUser?.addressInfo?.presentZip || '',
    permanentStreet: currentUser?.addressInfo?.permanentStreet || '',
    permanentCity: currentUser?.addressInfo?.permanentCity || '',
    permanentZip: currentUser?.addressInfo?.permanentZip || '',
  });

  const [bankInfo, setBankInfo] = useState({
    bankName: currentUser?.bankInfo?.bankName || '',
    branchName: currentUser?.bankInfo?.branchName || '',
    routingNumber: currentUser?.bankInfo?.routingNumber || '',
    accountName: currentUser?.bankInfo?.accountName || '',
    accountNumber: currentUser?.bankInfo?.accountNumber || '',
    bkash: currentUser?.bankInfo?.bkash || '',
    nagad: currentUser?.bankInfo?.nagad || '',
  });

  const [securityInfo, setSecurityInfo] = useState({
    displayName: currentUser?.displayName || '',
    username: currentUser?.username || currentUser?.email?.split('@')[0] || '',
  });

  // Extract all permissions dynamically using the authService helper
  const permissionsMatrix = useMemo(() => {
    return authService.getModuleAccess(currentUser);
  }, [currentUser]);

  // Handle Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!securityInfo.displayName.trim()) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    try {
      const updatedUser = {
        ...currentUser,
        displayName: securityInfo.displayName.trim(),
        username: securityInfo.username.trim(),
        personalInfo,
        contactInfo,
        addressInfo,
        bankInfo,
      };

      // Save updated user to localStorage
      localStorage.setItem('erp_current_user', JSON.stringify(updatedUser));
      
      // Dispatch custom mock auth event to notify App.jsx components to refresh
      window.dispatchEvent(new CustomEvent('mock_auth_change', { detail: updatedUser }));

      setSuccessMsg('Profile details updated successfully!');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Failed to save profile. ' + err.message);
    }
  };

  const initials = (currentUser?.displayName || 'U').charAt(0).toUpperCase();
  const avatarColor = currentUser?.avatarColor || '#3b82f6';

  // Calculate completeness progress
  const completeness = useMemo(() => {
    let filled = 0;
    let total = 12;

    if (currentUser?.displayName) filled++;
    if (personalInfo.fullNameBangla) filled++;
    if (personalInfo.dateOfBirth) filled++;
    if (personalInfo.nid) filled++;
    if (contactInfo.personalMobile) filled++;
    if (contactInfo.whatsApp) filled++;
    if (addressInfo.presentStreet) filled++;
    if (addressInfo.permanentStreet) filled++;
    if (bankInfo.bankName) filled++;
    if (bankInfo.accountNumber) filled++;
    if (bankInfo.bkash || bankInfo.nagad) filled++;
    if (securityInfo.username) filled++;

    return Math.round((filled / total) * 100);
  }, [currentUser, personalInfo, contactInfo, addressInfo, bankInfo, securityInfo]);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── HEADER BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e1b4b 30%, #311062 100%)',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', right: '-10%', top: '-25%', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 70%)', pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>My HRIS Profile</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>
              Corporate Particulars, Personal Details, Financial Accounts & Privileges
            </p>
          </div>
        </div>

        <button 
          onClick={() => activeRouteHandler('dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '0.5rem 1rem',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: '0.9rem 1.25rem', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontWeight: 600, color: '#15803d', animation: 'fadeInDown 0.3s' }}>{successMsg}</div>
      )}
      {errorMsg && (
        <div style={{ padding: '0.9rem 1.25rem', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600, color: '#b91c1c', animation: 'fadeInDown 0.3s' }}>{errorMsg}</div>
      )}

      {/* ── PROFILE WORKSPACE LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Navigation Tabs & Completion Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Completion Bar Card */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Completeness</span>
              <span style={{ color: 'var(--primary-color)' }}>{completeness}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', width: `${completeness}%` }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
              Fill in your Bangla Name, Date of Birth, NID, Mobile, Addresses & Bank info to complete.
            </span>
          </div>

          {/* Navigation Sidebar Card */}
          <div className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { id: 'overview', label: '👤 Overview' },
              { id: 'personal', label: '📋 Personal Info' },
              { id: 'contact', label: '📞 Contact Details' },
              { id: 'address', label: '🏠 Addresses' },
              { id: 'bank', label: '🏦 Bank Accounts' },
              { id: 'privileges', label: '🛡️ Privileges Matrix' },
              { id: 'security', label: '🔐 Login & Security' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  textAlign: 'left',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Right Side: Tab Form Editor Panel */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>👤 Employee Profile Summary</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                  <div style={{
                    width: 70, height: 70, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${avatarColor}, #4f46e5)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 900, fontSize: '1.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>{initials}</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{securityInfo.displayName}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Role: <strong style={{ textTransform: 'uppercase', color: 'var(--primary-color)' }}>{currentUser?.role}</strong> • Status: <span style={{ color: '#10b981', fontWeight: 700 }}>● Active Status</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Unique User ID</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{currentUser?.uid}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Official Email</span>
                    <strong>{currentUser?.email || 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bangla Name</span>
                    <strong>{personalInfo.fullNameBangla || 'Not Configured'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Personal Contact</span>
                    <strong>{contactInfo.personalMobile || 'Not Configured'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Registered Branch</span>
                    <strong>HQ Location (Branch {currentUser?.branchId || '1'})</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Activity</span>
                    <strong>Today, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* PERSONAL INFO PANEL */}
            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📋 Personal Particulars</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name (Bangla)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="যেমন: মোঃ আল আমিন"
                      value={personalInfo.fullNameBangla} 
                      onChange={e => setPersonalInfo({...personalInfo, fullNameBangla: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={personalInfo.dateOfBirth} 
                      onChange={e => setPersonalInfo({...personalInfo, dateOfBirth: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select 
                      className="form-control" 
                      value={personalInfo.gender} 
                      onChange={e => setPersonalInfo({...personalInfo, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select 
                      className="form-control" 
                      value={personalInfo.bloodGroup} 
                      onChange={e => setPersonalInfo({...personalInfo, bloodGroup: e.target.value})}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">National ID (NID)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 5928102948"
                      value={personalInfo.nid} 
                      onChange={e => setPersonalInfo({...personalInfo, nid: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Passport Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. BD0948201"
                      value={personalInfo.passportNumber} 
                      onChange={e => setPersonalInfo({...personalInfo, passportNumber: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marital Status</label>
                    <select 
                      className="form-control" 
                      value={personalInfo.maritalStatus} 
                      onChange={e => setPersonalInfo({...personalInfo, maritalStatus: e.target.value})}
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT DETAILS PANEL */}
            {activeTab === 'contact' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📞 Contact details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Personal Mobile Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="+880 17XX-XXXXXX"
                      value={contactInfo.personalMobile} 
                      onChange={e => setContactInfo({...contactInfo, personalMobile: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp Contact Link</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="+880 17XX-XXXXXX"
                      value={contactInfo.whatsApp} 
                      onChange={e => setContactInfo({...contactInfo, whatsApp: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn Profile URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="linkedin.com/in/username"
                      value={contactInfo.linkedIn} 
                      onChange={e => setContactInfo({...contactInfo, linkedIn: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facebook Profile URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="facebook.com/username"
                      value={contactInfo.facebook} 
                      onChange={e => setContactInfo({...contactInfo, facebook: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ADDRESS DETAILS PANEL */}
            {activeTab === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🏠 Address Particulars</h3>
                
                <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--primary-color)' }}>Present Address</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Street / Village / Area</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="House 24, Road 8, Block C"
                      value={addressInfo.presentStreet} 
                      onChange={e => setAddressInfo({...addressInfo, presentStreet: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City / State</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Dhaka"
                      value={addressInfo.presentCity} 
                      onChange={e => setAddressInfo({...addressInfo, presentCity: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Post Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="1213"
                      value={addressInfo.presentZip} 
                      onChange={e => setAddressInfo({...addressInfo, presentZip: e.target.value})} 
                    />
                  </div>
                </div>

                <h4 style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--primary-color)' }}>Permanent Address</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Street / Village / Area</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Vill: Charpara, PO: Sadar"
                      value={addressInfo.permanentStreet} 
                      onChange={e => setAddressInfo({...addressInfo, permanentStreet: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City / State</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Mymensingh"
                      value={addressInfo.permanentCity} 
                      onChange={e => setAddressInfo({...addressInfo, permanentCity: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Post Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="2200"
                      value={addressInfo.permanentZip} 
                      onChange={e => setAddressInfo({...addressInfo, permanentZip: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BANK DETAILS PANEL */}
            {activeTab === 'bank' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🏦 Bank Accounts & Wallets</h3>
                
                <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--primary-color)' }}>Corporate Salary Account</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Eastern Bank PLC"
                      value={bankInfo.bankName} 
                      onChange={e => setBankInfo({...bankInfo, bankName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Banani Branch"
                      value={bankInfo.branchName} 
                      onChange={e => setBankInfo({...bankInfo, branchName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Routing Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 095262481"
                      value={bankInfo.routingNumber} 
                      onChange={e => setBankInfo({...bankInfo, routingNumber: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Name (Must match NID)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Ekramul Islam"
                      value={bankInfo.accountName} 
                      onChange={e => setBankInfo({...bankInfo, accountName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Bank Account Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 102948201948"
                      value={bankInfo.accountNumber} 
                      onChange={e => setBankInfo({...bankInfo, accountNumber: e.target.value})} 
                    />
                  </div>
                </div>

                <h4 style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--primary-color)' }}>Mobile Wallets</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">bKash Personal Wallet</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="017XXXXXXXX"
                      value={bankInfo.bkash} 
                      onChange={e => setBankInfo({...bankInfo, bkash: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nagad Personal Wallet</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="017XXXXXXXX"
                      value={bankInfo.nagad} 
                      onChange={e => setBankInfo({...bankInfo, nagad: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & LOGINS PANEL */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🔐 Login & Credentials</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={securityInfo.displayName} 
                      onChange={e => setSecurityInfo({...securityInfo, displayName: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Username</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={securityInfo.username} 
                      onChange={e => setSecurityInfo({...securityInfo, username: e.target.value})} 
                      required 
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      💡 For credentials updates (such as changing your registration email or password), please consult the System Administrator.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVILEGES MATRIX PANEL */}
            {activeTab === 'privileges' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🛡️ Active System Privileges</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Below is a live diagnostic overview of your access permissions per module. These parameters are enforced directly by the database system.
                </p>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700 }}>Module</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Read</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Write</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Delete</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(permissionsMatrix).map(([modName, modPerms]) => (
                        <tr key={modName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{modName}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {modPerms.read ? <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>✕</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {modPerms.write ? <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>✕</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {modPerms.delete ? <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>✕</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {modPerms.approve ? <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>✕</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ACTION BAR (Save Changes) */}
            {activeTab !== 'privileges' && (
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 2rem', fontWeight: 700 }}>Save Profile Changes</button>
                <button 
                  type="button" 
                  onClick={() => {
                    // Reset fields
                    setPersonalInfo({
                      fullNameBangla: currentUser?.personalInfo?.fullNameBangla || '',
                      gender: currentUser?.personalInfo?.gender || 'Male',
                      dateOfBirth: currentUser?.personalInfo?.dateOfBirth || '',
                      nid: currentUser?.personalInfo?.nid || '',
                      passportNumber: currentUser?.personalInfo?.passportNumber || '',
                      bloodGroup: currentUser?.personalInfo?.bloodGroup || 'O+',
                      maritalStatus: currentUser?.personalInfo?.maritalStatus || 'Single',
                    });
                    setContactInfo({
                      personalMobile: currentUser?.contactInfo?.personalMobile || '',
                      whatsApp: currentUser?.contactInfo?.whatsApp || '',
                      linkedIn: currentUser?.contactInfo?.linkedIn || '',
                      facebook: currentUser?.contactInfo?.facebook || '',
                    });
                    setAddressInfo({
                      presentStreet: currentUser?.addressInfo?.presentStreet || '',
                      presentCity: currentUser?.addressInfo?.presentCity || '',
                      presentZip: currentUser?.addressInfo?.presentZip || '',
                      permanentStreet: currentUser?.addressInfo?.permanentStreet || '',
                      permanentCity: currentUser?.addressInfo?.permanentCity || '',
                      permanentZip: currentUser?.addressInfo?.permanentZip || '',
                    });
                    setBankInfo({
                      bankName: currentUser?.bankInfo?.bankName || '',
                      branchName: currentUser?.bankInfo?.branchName || '',
                      routingNumber: currentUser?.bankInfo?.routingNumber || '',
                      accountName: currentUser?.bankInfo?.accountName || '',
                      accountNumber: currentUser?.bankInfo?.accountNumber || '',
                      bkash: currentUser?.bankInfo?.bkash || '',
                      nagad: currentUser?.bankInfo?.nagad || '',
                    });
                    setSecurityInfo({
                      displayName: currentUser?.displayName || '',
                      username: currentUser?.username || currentUser?.email?.split('@')[0] || '',
                    });
                    setSuccessMsg('Form reset to saved profile.');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  }} 
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.5rem' }}
                >
                  Reset Form
                </button>
              </div>
            )}

          </form>
        </div>

      </div>

    </div>
  );
}
