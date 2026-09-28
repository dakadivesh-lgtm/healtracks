import React, { useState, useRef, useEffect } from 'react';
import { helpService } from '../services/helpService';

const STARTER_QUESTIONS = [
  'Can I drink coffee?',
  'Can I eat chicken?',
  'What foods help healing?',
  'Can I take a shower?',
  'Can I exercise?',
  'What should I avoid?'
];

export default function HelpPage({ user, onShowNotification }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async (textToSend) => {
    const questionText = typeof textToSend === 'string' ? textToSend : inputMessage;
    if (!questionText || !questionText.trim() || isThinking) return;

    const userMsgText = questionText.trim();
    setInputMessage('');

    // Append User Message to session chat
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await helpService.askQuestion(userMsgText, messages);

      if (res && res.success && res.answer) {
        const assistantMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: res.answer,
          hasUrgentSymptoms: Boolean(res.hasUrgentSymptoms),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const fallbackText = res?.message || "The help assistant is temporarily unavailable.";
        const assistantMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: fallbackText,
          hasUrgentSymptoms: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Help chat error:', err);
      const errorMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: "Sorry, I couldn't answer that right now. Please try again.",
        hasUrgentSymptoms: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reuse Government Hospital Locator
  const handleFindHospital = () => {
    if (isLocating) return;
    setIsLocating(true);

    const fallbackUrl = 'https://www.google.com/maps/search/government+hospital+near+me';

    if (!navigator || !navigator.geolocation) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const lat = encodeURIComponent(position.coords.latitude);
          const lng = encodeURIComponent(position.coords.longitude);
          const mapsUrl = `https://www.google.com/maps/search/government+hospital/@${lat},${lng},14z`;
          window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        } catch (e) {
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  };

  return (
    <section className="page-body" style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Header */}
      <div className="greeting-block" style={{ marginBottom: 20 }}>
        <h2 className="greeting-title">Help & Support</h2>
        <p className="greeting-sub">Ask general questions about wound care, food, activity, and recovery.</p>
      </div>

      {/* Main Chat Container */}
      <div className="form-card" style={{ marginTop: 0, padding: '20px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Quick Suggestion Chips (when no messages exist or above chat) */}
        {messages.length === 0 && (
          <div style={{ marginBottom: 24, padding: '16px', background: '#F8FAF9', borderRadius: '14px', border: '1px solid #E2E8E3' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span>
              <span>Quick Question Suggestions</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STARTER_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="starter-chip-btn"
                  onClick={() => handleSendMessage(q)}
                  disabled={isThinking}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '30px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '32px', marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Start a recovery conversation</div>
              <div style={{ fontSize: '12.5px', marginTop: 4, maxWidth: '420px', margin: '4px auto 0' }}>
                Select a question suggestion above or type your own general question below.
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Sender Tag */}
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: 4, paddingLeft: 2, paddingRight: 2 }}>
                  {msg.sender === 'user' ? 'You' : 'WoundWise'}
                </div>

                {/* Message Content Bubble */}
                <div 
                  style={{
                    maxWidth: '85%',
                    padding: '14px 16px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.sender === 'user' ? '#153C2E' : '#F8FAF9',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#0F172A',
                    border: msg.sender === 'user' ? 'none' : '1px solid #E2E8E3',
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  {msg.text}
                </div>

                {/* Urgent Warning Card & Hospital Locator if warning symptoms detected */}
                {msg.sender === 'assistant' && msg.hasUrgentSymptoms && (
                  <div style={{ marginTop: 12, maxWidth: '85%', width: '100%' }}>
                    {/* Warning card */}
                    <div style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginBottom: 10
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚠️</span>
                        <span>These symptoms may need medical attention.</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: 2 }}>
                        Please consult a healthcare professional promptly for evaluation.
                      </div>
                    </div>

                    {/* Government Hospital Locator CTA */}
                    <button 
                      type="button"
                      className="hospital-locator-card-btn"
                      onClick={handleFindHospital}
                      disabled={isLocating}
                      aria-label="Find a nearby government hospital"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '22px', flexShrink: 0 }} aria-hidden="true">🏥</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#065F46' }}>
                            {isLocating ? 'Finding nearby hospitals...' : 'Find a nearby government hospital'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#047857', marginTop: 2, lineHeight: 1.3 }}>
                            Get directions to a public health facility near you.
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '18px', color: '#047857', fontWeight: 600, marginLeft: 12, flexShrink: 0 }} aria-hidden="true">
                        {isLocating ? (
                          <span className="spinner-icon" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⌛</span>
                        ) : (
                          '→'
                        )}
                      </div>
                    </button>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: 4, paddingLeft: 2 }}>
                      If symptoms become severe or rapidly worsen, seek emergency medical care.
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isThinking && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                WoundWise
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: '#F8FAF9',
                border: '1px solid #E2E8E3',
                fontSize: '13px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span className="spinner-icon" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⌛</span>
                <span>WoundWise is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips when conversation has messages (compact row above input) */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
            {STARTER_QUESTIONS.slice(0, 4).map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="starter-chip-btn-sm"
                onClick={() => handleSendMessage(q)}
                disabled={isThinking}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="form-textarea"
            placeholder="Ask a general recovery question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            rows={2}
            style={{
              flex: 1,
              minHeight: '48px',
              maxHeight: '120px',
              borderRadius: '12px',
              padding: '10px 14px',
              resize: 'none',
              fontSize: '13.5px',
              lineHeight: '1.4'
            }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isThinking}
            style={{
              height: '48px',
              padding: '0 20px',
              borderRadius: '12px',
              background: '#153C2E',
              color: '#FFFFFF',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              flexShrink: 0
            }}
          >
            <span>Send</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </section>
  );
}
