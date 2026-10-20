import React from 'react';

export default function HoneypotInput({ value, onChange, name = "companyWebsite" }) {
  return (
    <div
      aria-hidden="true"
      style={{
        opacity: 0,
        position: 'absolute',
        top: 0,
        left: '-9999px',
        height: 0,
        width: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <label htmlFor={name}>Leave this field empty</label>
      <input
        type="text"
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        tabIndex="-1"
        autoComplete="off"
      />
    </div>
  );
}
