const GRADIENTS = [
  'linear-gradient(135deg, var(--primary), var(--coral))',
  'linear-gradient(135deg, var(--coral), #FFB199)',
  'linear-gradient(135deg, var(--sky), var(--primary))',
  'linear-gradient(135deg, var(--primary-dark), var(--sky))',
  'linear-gradient(135deg, #FF9A5C, var(--coral))',
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({ name = '?', className, style, fontSize = 13 }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const grad = GRADIENTS[hashStr(name) % GRADIENTS.length];
  return (
    <div
      className={className}
      style={{
        ...style,
        background: grad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize,
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
}
