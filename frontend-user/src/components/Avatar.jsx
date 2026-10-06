import { useState, useEffect } from 'react';
import { resolveAvatarUrl } from '../utils/avatarHelper';

const GRADIENTS = [
  'linear-gradient(135deg, var(--primary, #6366f1), var(--coral, #f43f5e))',
  'linear-gradient(135deg, var(--coral, #f43f5e), #FFB199)',
  'linear-gradient(135deg, var(--sky, #0ea5e9), var(--primary, #6366f1))',
  'linear-gradient(135deg, var(--primary-dark, #4338ca), var(--sky, #0ea5e9))',
  'linear-gradient(135deg, #FF9A5C, var(--coral, #f43f5e))',
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({ src, name = '?', className, style, fontSize = 13, size }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const safeName = typeof name === 'string' && name.trim() ? name.trim() : '?';
  const initial = safeName.charAt(0).toUpperCase() || '?';
  const grad = GRADIENTS[hashStr(safeName) % GRADIENTS.length];
  const resolvedSrc = resolveAvatarUrl(src);

  let defaultSize = className ? {} : { width: 24, height: 24, borderRadius: '50%' };
  if (size === 'sm') defaultSize = { width: 28, height: 28, borderRadius: '50%' };
  if (size === 'md') defaultSize = { width: 38, height: 38, borderRadius: '50%' };
  if (size === 'lg') defaultSize = { width: 56, height: 56, borderRadius: '50%' };
  if (size === 'xl') defaultSize = { width: 88, height: 88, borderRadius: '22px' };

  if (resolvedSrc && !error) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        className={className}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        style={{
          objectFit: 'cover',
          userSelect: 'none',
          flexShrink: 0,
          ...defaultSize,
          ...style,
        }}
        onError={() => {
          setError(true);
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        background: grad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize,
        userSelect: 'none',
        flexShrink: 0,
        ...defaultSize,
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
