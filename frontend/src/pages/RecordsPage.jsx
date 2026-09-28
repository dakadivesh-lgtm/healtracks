import React, { useState, useEffect } from 'react';
import { recordService } from '../services/recordService';

export default function RecordsPage({ onNavigate, onShowNotification }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadRecords();
  }, [searchQuery, statusFilter]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await recordService.getRecords({
        search: searchQuery,
        status: statusFilter
      });
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load records:', err);
      if (onShowNotification) {
        onShowNotification('Failed to load wound medical records.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (recordId) => {
    window.open(recordService.getDownloadReportUrl(recordId), '_blank');
    if (onShowNotification) {
      onShowNotification('Downloading clinical log report...', 'info');
    }
  };

  const handleDownloadImage = (filename) => {
    window.open(recordService.getDownloadImageUrl(filename), '_blank');
    if (onShowNotification) {
      onShowNotification('Downloading wound image file...', 'info');
    }
  };

  return (
    <section className="page-body">
      <div className="greeting-block">
        <h2 className="greeting-title">My Records</h2>
        <p className="greeting-sub">Access and download your complete wound documentation and assessment reports.</p>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="records-toolbar">
        <div className="search-input-wrap">
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by wound name, location, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select 
            className="form-select" 
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Wounds</option>
            <option value="active">Active</option>
            <option value="healing">Healing</option>
            <option value="resolved">Resolved</option>
          </select>

          <button 
            className="btn-primary"
            onClick={() => onNavigate('upload')}
          >
            + New Upload
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading your records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="no-tests-card" style={{ marginTop: 20 }}>
          <h3 className="no-tests-title">No Records Found</h3>
          <p className="no-tests-desc">
            {searchQuery ? 'No wound entries match your search criteria.' : 'You have not uploaded any wound photos yet.'}
          </p>
          <button className="btn-primary" onClick={() => onNavigate('upload')}>
            Upload Wound Image
          </button>
        </div>
      ) : (
        /* Records Table Card */
        <div className="records-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Wound & Site</th>
                  <th>Type</th>
                  <th>Date Recorded</th>
                  <th>Notes</th>
                  <th>Assessment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const dateStr = new Date(record.entry_date || record.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={record.id}>
                      <td>
                        <img 
                          src={recordService.getImageUrl(record.image_filename)} 
                          alt={record.wound_title} 
                          className="table-thumb" 
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{record.wound_title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          📍 {record.wound_location}
                        </div>
                      </td>
                      <td>
                        <span className="wound-badge wound-badge--neutral">
                          {record.is_followup ? 'Follow-up' : 'Baseline'}
                        </span>
                      </td>
                      <td>{dateStr}</td>
                      <td>
                        <div style={{
                          maxWidth: 220,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '12px'
                        }}>
                          {record.notes || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          background: 'var(--blue-light)',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {record.assessment_summary || 'Analysis not configured'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            className="btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', color: '#153C2E', background: 'var(--green-light)', borderColor: '#A7F3D0' }}
                            title="View Wound Health Result"
                            onClick={() => onNavigate('result', {
                              woundId: record.wound_id,
                              woundTitle: record.wound_title,
                              imageFilename: record.image_filename,
                              entryDate: record.entry_date || record.created_at,
                              notes: record.notes,
                              assessmentSummary: record.assessment_summary
                            })}
                          >
                            👁️ Result
                          </button>
                          <button 
                            className="btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px' }}
                            title="Download saved image"
                            onClick={() => handleDownloadImage(record.image_filename)}
                          >
                            📷 Image
                          </button>
                          <button 
                            className="btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', color: 'var(--blue)' }}
                            title="Download clinical summary report"
                            onClick={() => handleDownloadReport(record.id)}
                          >
                            📄 Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
