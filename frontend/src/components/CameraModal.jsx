import React, { useState, useRef, useEffect } from 'react';

export default function CameraModal({ isOpen, onClose, onPhotoCaptured, onSelectFile }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [errorMsg, setErrorMsg] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setErrorMsg('Camera access is not permitted or unavailable. Please browse files to upload.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `wound_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onPhotoCaptured(file, canvas.toDataURL('image/jpeg', 0.85));
        onClose();
      }
    }, 'image/jpeg', 0.85);
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" role="dialog" aria-modal="true" aria-label="Wound Camera">
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 600 }}>
        <button 
          className="btn-outline" 
          style={{ background: '#FFFFFF', color: '#000000' }}
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      <div className="camera-feed-container">
        {errorMsg ? (
          <div style={{ color: '#FFFFFF', padding: 24, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ marginBottom: 16 }}>{errorMsg}</p>
            <button className="btn-primary" onClick={() => { onClose(); if (onSelectFile) onSelectFile(); }}>
              Choose File from Device
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="video-element"
            />
            <div className="camera-guide-box">
              <span className="camera-guide-text">Position wound inside guide</span>
            </div>

            <div className="camera-controls-bottom">
              <button 
                type="button"
                className="btn-outline" 
                style={{ background: 'rgba(255,255,255,0.85)', padding: '8px 12px', fontSize: '12px' }}
                onClick={switchCamera}
              >
                🔄 Switch
              </button>

              <button 
                type="button"
                className="shutter-btn" 
                onClick={takePhoto}
                aria-label="Capture Wound Photo"
              >
                <div className="shutter-inner"></div>
              </button>

              <div style={{ width: 60 }}></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
