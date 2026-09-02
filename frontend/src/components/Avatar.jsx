import { useState, useEffect } from 'react';

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

export default function Avatar({ src, name = '?', className, style, fontSize = 13 }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const grad = GRADIENTS[hashStr(name) % GRADIENTS.length];

  const resolvedSrc = src?.startsWith('http')
    ? src
    : (src ? `http://localhost:5004/api/storage/file?key=${encodeURIComponent(src)}` : null);

  if (resolvedSrc && !error) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        className={className}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          objectFit: 'cover',
          userSelect: 'none',
          flexShrink: 0,
          ...style,
        }}
        onError={(e) => {
          if (!e.currentTarget.dataset.retried && src) {
            e.currentTarget.dataset.retried = 'true';
            const key = src.includes('avatars/') ? src.substring(src.indexOf('avatars/')) : src;
            e.currentTarget.src = `http://localhost:5004/api/storage/file?key=${encodeURIComponent(key)}`;
            return;
          }
          setError(true);
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
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
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
