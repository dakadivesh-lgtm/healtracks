import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import NotificationToast from './components/NotificationToast';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import HistoryPage from './pages/HistoryPage';
import RecordsPage from './pages/RecordsPage';
import HelpPage from './pages/HelpPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import SymptomsPage from './pages/SymptomsPage';
import ResultPage from './pages/ResultPage';

import { authService } from './services/authService';
import { getToken } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Persistent route restoration across browser refreshes
  const getInitialRoute = () => {
    try {
      const saved = localStorage.getItem('woundwise_active_route');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { page: parsed.page || 'dashboard', params: parsed.params || {} };
      }
    } catch (e) {
      // Fallback
    }
    return { page: 'dashboard', params: {} };
  };

  const initialRoute = getInitialRoute();
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [pageParams, setPageParams] = useState(initialRoute.params);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Check existing session on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const data = await authService.getMe();
        if (data?.user) {
          setCurrentUser(data.user);
          if (data.preferences?.dark_mode) {
            document.body.classList.add('dark-theme');
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for 401 unauthorized event
    const handleUnauthorized = () => {
      setCurrentUser(null);
      showNotification('Your session has expired. Please sign in again.', 'info');
    };
    window.addEventListener('woundwise:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('woundwise:unauthorized', handleUnauthorized);
  }, []);

  const showNotification = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Ignored
    }
    setCurrentUser(null);
    navigateTo('dashboard');
    showNotification('You have been signed out safely.', 'info');
  };

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    try {
      localStorage.setItem('woundwise_active_route', JSON.stringify({ page, params }));
    } catch (e) {
      // Ignored
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: 32,
            height: 32,
            border: '3px solid #EBF3FC',
            borderTopColor: '#4A90D9',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 12
          }} />
          <p>Initialising WoundWise...</p>
        </div>
      </div>
    );
  }

  // Landing page — accessible whether signed in or not
  if (currentPage === 'landing') {
    return (
      <>
        <LandingPage
          user={currentUser}
          onNavigate={navigateTo}
          onStartCheck={() => navigateTo(currentUser ? 'upload' : 'login')}
        />
        <NotificationToast
          toasts={toasts}
          onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        />
      </>
    );
  }

  // Not signed in: show authentication view
  if (!currentUser) {
    return (
      <>
        <AuthPage
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            navigateTo('dashboard');
          }}
          onShowNotification={showNotification}
          onGoLanding={() => navigateTo('landing')}
        />
        <NotificationToast
          toasts={toasts}
          onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        />
      </>
    );
  }

  // Page title mapping
  const pageTitles = {
    dashboard:  'Dashboard',
    upload:     'Upload Wound',
    symptoms:   'Symptom Check',
    result:     'Wound Health Result',
    history:    'History Tracker',
    records:    'My Records',
    help:       'Help & Support',
    settings:   'Settings',
    landing:    'Overview'
  };

  // Pages that render WITHOUT the sidebar/topbar shell (full-screen)
  const fullscreenPages = ['symptoms', 'result'];
  if (fullscreenPages.includes(currentPage)) {
    return (
      <>
        {currentPage === 'symptoms' && (
          <SymptomsPage
            assessmentPayload={pageParams}
            onNavigate={navigateTo}
            onComplete={(resultPayload) => navigateTo('result', resultPayload)}
          />
        )}
        {currentPage === 'result' && (
          <div className="app-shell" style={{ display: 'block', minHeight: '100vh', background: 'var(--bg)', padding: '0' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
              <button
                onClick={() => navigateTo('dashboard')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--blue)', fontWeight: 600, fontSize: '13.5px',
                  marginBottom: 20, padding: '4px 0'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Dashboard
              </button>
              <ResultPage
                resultData={pageParams}
                onNavigate={navigateTo}
                onShowNotification={showNotification}
              />
            </div>
          </div>
        )}
        <NotificationToast
          toasts={toasts}
          onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        />
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={navigateTo}
        user={currentUser}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <main className="main-content" id="main-content">
        <TopBar
          title={pageTitles[currentPage] || 'Dashboard'}
          user={currentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onShowNotification={showNotification}
        />

        {/* Dynamic Screen Routing */}
        {currentPage === 'dashboard' && (
          <DashboardPage
            user={currentUser}
            onNavigate={navigateTo}
            onShowNotification={showNotification}
          />
        )}

        {currentPage === 'upload' && (
          <UploadPage
            onNavigate={navigateTo}
            onShowNotification={showNotification}
            initialWoundId={pageParams?.initialWoundId}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            onNavigate={navigateTo}
            onShowNotification={showNotification}
            targetWoundId={pageParams?.woundId}
          />
        )}

        {currentPage === 'records' && (
          <RecordsPage
            onNavigate={navigateTo}
            onShowNotification={showNotification}
          />
        )}

        {currentPage === 'help' && (
          <HelpPage
            user={currentUser}
            onShowNotification={showNotification}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage
            user={currentUser}
            onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
            onShowNotification={showNotification}
          />
        )}
      </main>

      {/* Notifications */}
      <NotificationToast
        toasts={toasts}
        onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
}
