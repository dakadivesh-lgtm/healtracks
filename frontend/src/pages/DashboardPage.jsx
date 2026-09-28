import React, { useState, useEffect } from 'react';
import EmptyState from '../components/EmptyState';
import QuickActionsGrid from '../components/QuickActionsGrid';
import WoundCard from '../components/WoundCard';
import { woundService } from '../services/woundService';

export default function DashboardPage({ user, onNavigate, onShowNotification }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    let tod = 'morning';
    if (hour >= 12 && hour < 17) tod = 'afternoon';
    else if (hour >= 17) tod = 'evening';
    return `Good ${tod}, ${user?.name?.split(' ')[0] || 'there'} 👋`;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await woundService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
      if (onShowNotification) {
        onShowNotification('Failed to load dashboard data.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalWounds  = dashboardData?.totalWounds  || 0;
  const totalEntries = dashboardData?.totalEntries || 0;
  const urgentCount  = dashboardData?.urgentCount  || 0;

  const statCards = [
    {
      label:  'Active Wounds',
      value:  totalWounds,
      icon:   '🩹',
      color:  'var(--blue)',
      bg:     'var(--blue-light)',
      action: () => onNavigate('history')
    },
    {
      label:  'Total Photo Entries',
      value:  totalEntries,
      icon:   '📷',
      color:  'var(--teal)',
      bg:     'var(--teal-light)',
      action: () => onNavigate('records')
    },
    {
      label:  'Warnings Reported',
      value:  urgentCount,
      icon:   '⚠️',
      color:  urgentCount > 0 ? '#E53E3E' : 'var(--green)',
      bg:     urgentCount > 0 ? '#FFF5F5' : 'var(--green-light)',
      action: () => onNavigate('records')
    },
    {
      label:  'New Upload',
      value:  '+',
      icon:   '📤',
      color:  'var(--purple)',
      bg:     'var(--purple-light)',
      action: () => onNavigate('upload')
    }
  ];

  return (
    <section className="page-body">
      {/* Greeting Header */}
      <div className="greeting-block">
        <h2 className="greeting-title">{getGreeting()}</h2>
        <p className="greeting-sub">Your wound healing journey is important. Stay consistent, stay healthy.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--blue-light)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 8 }}></div>
          <p>Loading your clinical dashboard...</p>
        </div>
      ) : (
        <>
          {!dashboardData?.hasRecords ? (
            /* Empty State Card */
            <EmptyState onUploadClick={() => onNavigate('upload')} />
          ) : (
            /* Populated State Card - Truthful Assessment Summary */
            <div className="no-tests-wrapper">
              <div className="no-tests-card" role="status" aria-label="Assessment Summary">
                <div className="no-tests-icon" aria-hidden="true" style={{ background: 'var(--teal-light)' }}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="var(--teal-light)"/>
                    <path d="M12 7v5l3 3" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="no-tests-title">Assessment Summary</h3>
                <p className="no-tests-desc">
                  You have {totalEntries} wound assessment{totalEntries === 1 ? '' : 's'} on record.<br />
                  Keep tracking your progress for optimal healing.
                </p>
                <button 
                  className="btn-primary" 
                  onClick={() => onNavigate('history')}
                  style={{ background: 'var(--teal)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="12 7 12 12 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  View History Tracker
                </button>
              </div>
            </div>
          )}

          {/* 2×2 Quick Action Grid connecting all cards */}
          <div style={{ marginTop: 20 }}>
            <QuickActionsGrid onNavigate={onNavigate} />
          </div>
        </>
      )}
    </section>
  );
}
