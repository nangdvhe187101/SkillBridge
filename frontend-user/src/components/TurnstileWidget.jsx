import React, { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

export default function TurnstileWidget({ onVerify, onError, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // Giữ callback mới nhất trong ref để widget không bị render lại mỗi khi parent re-render
  const callbacksRef = useRef({ onVerify, onError, onExpire });
  callbacksRef.current = { onVerify, onError, onExpire };

  useEffect(() => {
    if (!SITE_KEY) {
      callbacksRef.current.onVerify?.('dev-bypass-token');
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'auto',
          size: 'flexible',
          callback: (token) => {
            callbacksRef.current.onVerify?.(token);
          },
          'error-callback': () => {
            callbacksRef.current.onError?.();
          },
          'expired-callback': () => {
            callbacksRef.current.onExpire?.();
          },
        });
      } catch (err) {
        console.warn('[Turnstile] Render error:', err);
      }
    };

    if (!window.turnstile) {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', renderWidget);
      }
    } else {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div className="flex justify-center my-3 min-h-[50px]">
      <div ref={containerRef} />
    </div>
  );
}
