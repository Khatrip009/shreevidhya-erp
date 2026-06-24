// src/components/JitsiMeeting.jsx
import React, { useEffect, useRef } from 'react';

const JitsiMeeting = ({ roomName, displayName, onMeetingEnd, onParticipantJoined }) => {
  const containerRef = useRef(null);
  const originalConsole = useRef({ warn: console.warn, error: console.error });

  useEffect(() => {
    // Filter Jitsi's console warnings/errors to reduce noise
    const shouldSuppress = (message) => {
      const suppressPatterns = [
        'gum.not_found',
        'Requested device not found',
        'Failed to create local tracks',
        'Audio track creation failed',
        'Video track creation failed',
        'NotFoundError'
      ];
      return suppressPatterns.some(pattern => message.includes(pattern));
    };

    const suppressedWarn = (...args) => {
      if (args.some(arg => typeof arg === 'string' && shouldSuppress(arg))) {
        return; // suppress
      }
      originalConsole.current.warn(...args);
    };

    const suppressedError = (...args) => {
      if (args.some(arg => typeof arg === 'string' && shouldSuppress(arg))) {
        return; // suppress
      }
      originalConsole.current.error(...args);
    };

    // Apply suppression
    console.warn = suppressedWarn;
    console.error = suppressedError;

    // Load Jitsi external API script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      const domain = 'meet.jit.si';
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName,
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          disableAudioLevels: false,
          preferH264: true,
          disableSimulcast: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat',
            'recording', 'etherpad', 'sharedvideo', 'shareaudio',
            'settings', 'raisehand', 'videoquality', 'tileview'
          ],
        },
      };

      try {
        const api = new JitsiMeetExternalAPI(domain, options);

        api.addEventListener('videoConferenceJoined', () => {
          console.log('Joined conference');
        });

        api.addEventListener('participantJoined', (event) => {
          const { displayName: participantName } = event;
          if (onParticipantJoined) onParticipantJoined(participantName);
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (onMeetingEnd) onMeetingEnd();
          api.dispose();
        });

        window.jitsiApi = api;
      } catch (error) {
        console.warn('Jitsi initialization error:', error);
        if (onMeetingEnd) onMeetingEnd();
      }
    };

    document.head.appendChild(script);

    return () => {
      // Restore original console methods
      console.warn = originalConsole.current.warn;
      console.error = originalConsole.current.error;

      if (window.jitsiApi) {
        window.jitsiApi.dispose();
        delete window.jitsiApi;
      }
    };
  }, [roomName, displayName, onMeetingEnd, onParticipantJoined]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default JitsiMeeting;