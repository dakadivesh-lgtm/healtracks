import React, { useState } from 'react';
import { authService } from '../services/authService';

export default function AuthPage({ onAuthSuccess, onShowNotification }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        const res = await authService.register({ name, email, password, phone });
        onAuthSuccess(res.user);
        onShowNotification(`Welcome to WoundWise, ${res.user.name}!`, 'success');
      } else {
        const res = await authService.login(email, password);
        onAuthSuccess(res.user);
        onShowNotification(`Signed in successfully as ${res.user.name}`, 'success');
      }
    } catch (err) {
      onShowNotification(err.message || 'Authentication failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setEmail('divesh@woundwise.local');
    setPassword('woundwise123');
    setLoading(true);

    try {
      const res = await authService.login('divesh@woundwise.local', 'woundwise123');
      onAuthSuccess(res.user);
      onShowNotification(`Signed in to demo account: ${res.user.name}`, 'success');
    } catch (err) {
      onShowNotification(err.message || 'Demo sign in failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%',
        maxWidth: '440px',
        padding: '36px 32px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4A90D9" opacity="0.18"/>
              <path d="M12 6v6l4 2" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12h6M12 9v6" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            WoundWise
          </span>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
          {isRegister ? 'Create Patient Account' : 'Sign in to WoundWise'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
          {isRegister ? 'Start tracking your healing journey securely' : 'Access your private wound records and timeline'}
        </p>

        {/* Tab switch */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 20
        }}>
          <button 
            type="button"
            className="btn-outline" 
            style={{
              background: !isRegister ? 'var(--card-bg)' : 'transparent',
              border: !isRegister ? '1px solid var(--border)' : 'none',
              fontWeight: !isRegister ? 600 : 500,
              color: !isRegister ? 'var(--blue)' : 'var(--text-secondary)',
              boxShadow: !isRegister ? 'var(--shadow-sm)' : 'none'
            }}
            onClick={() => setIsRegister(false)}
          >
            Sign In
          </button>
          <button 
            type="button"
            className="btn-outline" 
            style={{
              background: isRegister ? 'var(--card-bg)' : 'transparent',
              border: isRegister ? '1px solid var(--border)' : 'none',
              fontWeight: isRegister ? 600 : 500,
              color: isRegister ? 'var(--blue)' : 'var(--text-secondary)',
              boxShadow: isRegister ? 'var(--shadow-sm)' : 'none'
            }}
            onClick={() => setIsRegister(true)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Divesh Reddy"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="patient@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="+1 (555) 123-4567"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Sign In */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ position: 'relative', margin: '16px 0', borderTop: '1px solid var(--border-soft)' }}>
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--card-bg)',
              padding: '0 10px',
              fontSize: '11.5px',
              color: 'var(--text-muted)'
            }}>
              Quick Access
            </span>
          </div>

          <button 
            type="button" 
            className="btn-outline" 
            style={{ width: '100%', fontSize: '13px' }}
            onClick={handleDemoSignIn}
            disabled={loading}
          >
            👤 Sign in as Demo Patient (Divesh Reddy)
          </button>
        </div>
      </div>
    </div>
  );
}
