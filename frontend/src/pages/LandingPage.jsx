import React from 'react';

export default function LandingPage({ onStartCheck, onNavigate, user }) {
  return (
    <div className="homepage-body" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Floating Navbar */}
      <nav className="hp-nav">
        <div className="hp-nav-container">
          <div className="hp-brand" style={{ cursor: 'pointer' }} onClick={() => onNavigate(user ? 'dashboard' : 'landing')}>
            <svg className="hp-logo-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#22A99A" opacity="0.18"/>
              <path d="M12 6v6l4 2" stroke="#22A99A" strokeWidth="2"/>
              <path d="M9 12h6M12 9v6" stroke="#22A99A" strokeWidth="2"/>
            </svg>
            <div className="hp-brand-text">
              <span className="hp-brand-name">WoundWise</span>
              <span className="hp-brand-sub">WOUND CARE COMPANION</span>
            </div>
          </div>
          
          <div className="hp-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#safety">Safety & Privacy</a>
            {user ? (
              <span style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--blue)' }} onClick={() => onNavigate('dashboard')}>
                Dashboard
              </span>
            ) : null}
          </div>

          <div className="hp-nav-actions">
            {user ? (
              <button className="hp-btn-primary" onClick={() => onNavigate('upload')}>
                Start Wound Check
              </button>
            ) : (
              <button className="hp-btn-primary" onClick={onStartCheck}>
                Sign In / Start Check
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hp-hero">
        <div className="hp-hero-bg" style={{ backgroundImage: "url('/hero-bg.jpg')" }}></div>
        <div className="hp-hero-content">
          <div className="hp-hero-text">
            <h1 className="hp-hero-title">
              Track your wound.<br />
              <span className="hp-text-accent">Follow your progress.</span>
            </h1>
            <p className="hp-hero-desc">
              Record wound photos and symptoms, compare changes over time, and review warning signs that may need medical attention.
            </p>
            
            <div className="hp-hero-actions">
              <button className="hp-btn-primary hp-btn-lg" onClick={() => onNavigate(user ? 'upload' : 'login')}>
                Start Wound Check ➔
              </button>
              <a href="#how-it-works" className="hp-btn-secondary hp-btn-lg" style={{ textDecoration: 'none', textAlign: 'center' }}>
                How It Works
              </a>
            </div>
            
            <p className="hp-hero-note">
              A wound-monitoring platform. It provides documented tracking and does not replace professional medical diagnosis or clinical care.
            </p>
          </div>
        </div>
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className="hp-section hp-bg-light">
        <div className="hp-container">
          <h2 className="hp-section-title">How It Works</h2>
          <div className="hp-grid-3">
            <div className="hp-card">
              <div className="hp-card-icon">1</div>
              <h3 className="hp-card-title">Start a check</h3>
              <p className="hp-card-text">Follow the guided camera alignment and symptom review workflow to securely capture your wound's current state.</p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">2</div>
              <h3 className="hp-card-title">Review your record</h3>
              <p className="hp-card-text">Inspect detailed redness analysis, focus verification, and medical safety flags recorded during your assessment.</p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">3</div>
              <h3 className="hp-card-title">Follow your progress</h3>
              <p className="hp-card-text">Compare saved photos side-by-side and review symptom timelines to track your unique healing journey over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="hp-section">
        <div className="hp-container">
          <h2 className="hp-section-title">Features</h2>
          <div className="hp-grid-2">
            <div className="hp-feature-row">
              <svg className="hp-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span className="hp-feature-text">Guided photo capture & quality check</span>
            </div>
            <div className="hp-feature-row">
              <svg className="hp-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span className="hp-feature-text">Side-by-side progression compare</span>
            </div>
            <div className="hp-feature-row">
              <svg className="hp-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span className="hp-feature-text">Warning signs & infection safety review</span>
            </div>
            <div className="hp-feature-row">
              <svg className="hp-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span className="hp-feature-text">Downloadable clinical report logs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Privacy Section */}
      <section id="safety" className="hp-section hp-bg-light">
        <div className="hp-container" style={{ maxWidth: 840, textAlign: 'center' }}>
          <h2 className="hp-section-title">Safety &amp; Privacy First</h2>
          <div className="hp-text-content">
            <p>
              Your medical photos and records are stored securely on private authenticated servers with strict role isolation. Only you can view or download your wound data.
            </p>
            <p>
              <strong>Clinical Guardrail:</strong> WoundWise provides objective documentation and visual measurement tools. It does not fabricate automated diagnoses or replace in-person physician care.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-footer-content">
          <div className="hp-footer-logo">
            <span className="hp-brand-name" style={{ fontSize: 18, fontWeight: 700 }}>WoundWise</span>
          </div>
          <p>© 2026 WoundWise Health Track Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
