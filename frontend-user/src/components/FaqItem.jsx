import { useState } from 'react';
import Icon from './Icon';

export default function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={() => setOpen((o) => !o)}>
        {q}
        <Icon name="chevdown" style={open ? { transform: 'rotate(180deg)' } : undefined} />
      </button>
      <div className="faq-a" style={{ display: open ? 'block' : 'none' }}>
        <p>{a}</p>
      </div>
    </div>
  );
}
