import React from 'react';

/**
 * ============================================================================
 * BỘ ICON HUY HIỆU TỰ THIẾT KẾ ĐỘC QUYỀN (CUSTOM VECTOR BADGE ICONS)
 * Chuẩn Iconographic UI (viewBox: 0 0 24 24) — Sắc nét ở mọi kích cỡ (16px, 20px, 24px, 32px)
 * Phong cách Modern Vector Glyph kết hợp duotone gradients và viền kim loại tinh gọn.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. SINH VIÊN TIER 1 (Gói Student Starter - 29.000đ): ICON MẦM KHỞI NGHIỆP
// ----------------------------------------------------------------------------
export function StarterSproutIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Vòng huy hiệu tròn viền kép */}
      <circle cx="12" cy="12" r="10" stroke={`url(#${id}-grad)`} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="8" fill={`url(#${id}-grad)`} fillOpacity="0.18" />
      {/* Cành mầm vươn lên cách điệu */}
      <path d="M12 17v-6" stroke={`url(#${id}-grad)`} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 14c-2.5 0-4.5-1.5-4.5-4.2 2.5 0 4.5 1.5 4.5 4.2z" fill={`url(#${id}-grad)`} />
      <path d="M12 11c2.8 0 4.8-1.8 4.8-5-2.8 0-4.8 1.8-4.8 5z" fill={`url(#${id}-grad)`} />
      <circle cx="16.5" cy="6" r="1" fill="#a7f3d0" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 2. SINH VIÊN TIER 2 (Gói Freelance Pro - 49.000đ): ICON KHIÊN SAO PRO
// ----------------------------------------------------------------------------
export function ProShieldStarIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="0.6" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* Tấm khiên Aegis vát góc cạnh */}
      <path
        d="M12 2.5L20 6v6.2c0 5-3.4 9.6-8 10.8-4.6-1.2-8-5.8-8-10.8V6l8-3.5z"
        fill={`url(#${id}-grad)`}
        fillOpacity="0.22"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Đường viền lõi trong */}
      <path
        d="M12 5L17.5 7.5v4.5c0 3.6-2.3 6.8-5.5 7.8-3.2-1-5.5-4.2-5.5-7.8V7.5L12 5z"
        stroke="#a5b4fc"
        strokeWidth="1"
        strokeOpacity="0.6"
        strokeLinejoin="round"
      />
      {/* Ngôi sao 4 cánh phát sáng ở tâm */}
      <path
        d="M12 7.8L13.3 11l3.2 1.2-3.2 1.3L12 16.8l-1.3-3.3-3.2-1.3 3.2-1.2L12 7.8z"
        fill="#ffffff"
      />
      <circle cx="12" cy="12.2" r="1.2" fill="#6366f1" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 3. SINH VIÊN TIER 3 (Gói Master Talent - 99.000đ): ICON KIM CƯƠNG CYBER PRISM
// ----------------------------------------------------------------------------
export function MasterDiamondIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f472b6" />
          <stop offset="0.4" stopColor="#c084fc" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Thân kim cương đa diện */}
      <path
        d="M6 4h12l4.5 5.5L12 21 1.5 9.5 6 4z"
        fill={`url(#${id}-grad)`}
        fillOpacity="0.25"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Các mặt cắt quang học sắc cạnh */}
      <path d="M1.5 9.5h21" stroke={`url(#${id}-grad)`} strokeWidth="1.4" />
      <path d="M6 4l3.5 5.5L12 21l2.5-11.5L18 4" stroke={`url(#${id}-grad)`} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.5 9.5L12 4l2.5 5.5" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Điểm sáng hội tụ ở chóp kim cương */}
      <circle cx="12" cy="4" r="1.2" fill="#ffffff" />
      <circle cx="12" cy="9.5" r="1.5" fill="#ffffff" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 4. DOANH NGHIỆP TIER 1 (Gói Employer Starter - 49.000đ): ICON TIA SÉT XANH LAM
// ----------------------------------------------------------------------------
export function StarterBoltIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.8" stopColor="#0284c7" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* Khung ngũ giác vát sắc nét */}
      <polygon
        points="12,2.5 21,7.5 18,19.5 6,19.5 3,7.5"
        fill={`url(#${id}-grad)`}
        fillOpacity="0.2"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Tia sét năng lượng cao ở trung tâm */}
      <polygon
        points="13,5 7,12.5 12,12.5 10.5,19 17,11.5 12,11.5 13,5"
        fill={`url(#${id}-grad)`}
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 5. DOANH NGHIỆP TIER 2 (Gói Employer Growth - 89.000đ): ICON THÁP TĂNG TRƯỞNG LỤC GIÁC
// ----------------------------------------------------------------------------
export function GrowthHexIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" />
          <stop offset="0.6" stopColor="#9333ea" />
          <stop offset="1" stopColor="#6b21a8" />
        </linearGradient>
      </defs>
      {/* Khung lục giác tổ ong */}
      <polygon
        points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2"
        fill={`url(#${id}-grad)`}
        fillOpacity="0.22"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* 3 Cột tăng trưởng vươn cao */}
      <rect x="6.5" y="13" width="2.8" height="4.5" rx="0.8" fill={`url(#${id}-grad)`} />
      <rect x="10.6" y="10" width="2.8" height="7.5" rx="0.8" fill={`url(#${id}-grad)`} />
      <rect x="14.7" y="6.8" width="2.8" height="10.7" rx="0.8" fill={`url(#${id}-grad)`} />
      {/* Mũi tên tăng trưởng quang học */}
      <path
        d="M7 11.5L11 8l3 2.5L18 5m0 0h-3.2m3.2 0v3.2"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 6. DOANH NGHIỆP TIER 3 (Gói VIP Business Suite - 149.000đ): ICON VƯƠNG MIỆN VÀNG HOÀNG GIA
// ----------------------------------------------------------------------------
export function VipCrownIcon({ size = 20, className = '' }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef08a" />
          <stop offset="0.3" stopColor="#f59e0b" />
          <stop offset="0.7" stopColor="#d97706" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Vòng hào quang nhẹ bao quanh */}
      <circle cx="12" cy="12" r="10" stroke={`url(#${id}-gold)`} strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
      {/* Vương miện hoàng gia 5 đỉnh */}
      <path
        d="M3.5 17h17l-1.8-9-3.7 4.2L12 5.5l-3 6.7L5.3 8 3.5 17z"
        fill={`url(#${id}-gold)`}
        fillOpacity="0.35"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Vành đế vương miện */}
      <rect x="4" y="16.8" width="16" height="2.4" rx="1" fill={`url(#${id}-gold)`} />
      {/* 5 viên ngọc đỉnh tháp */}
      <circle cx="3.5" cy="8" r="1.3" fill="#ffffff" stroke="#d97706" strokeWidth="0.8" />
      <circle cx="9" cy="12.2" r="1" fill="#fef08a" />
      <circle cx="12" cy="5.5" r="1.6" fill="#ffffff" stroke="#b45309" strokeWidth="1" />
      <circle cx="15" cy="12.2" r="1" fill="#fef08a" />
      <circle cx="20.5" cy="8" r="1.3" fill="#ffffff" stroke="#d97706" strokeWidth="0.8" />
      {/* Viên ruby đỏ thắm giác cắt ở trung tâm đế */}
      <polygon points="12,13 13.5,14.5 12,16 10.5,14.5" fill="#ef4444" stroke="#fecaca" strokeWidth="0.6" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 7. THÀNH VIÊN TIÊU CHUẨN (FREE - 0đ): ICON LA BÀN TỐI GIẢN
// ----------------------------------------------------------------------------
export function StandardCompassIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
      <polygon points="14.5,9.5 10.5,11 9.5,14.5 13.5,13" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.2" fill="#f8fafc" />
    </svg>
  );
}

/**
 * Dispatcher chọn Icon theo PlanCode
 */
export default function SkillBridgeBadgeIcon({ planCode = 'FREE', size = 20, className = '' }) {
  const code = (planCode || '').toUpperCase();

  switch (code) {
    case 'STU_STARTER':
      return <StarterSproutIcon size={size} className={className} />;
    case 'STU_PRO':
      return <ProShieldStarIcon size={size} className={className} />;
    case 'STU_MASTER':
      return <MasterDiamondIcon size={size} className={className} />;
    case 'EMP_STARTER':
      return <StarterBoltIcon size={size} className={className} />;
    case 'EMP_GROWTH':
      return <GrowthHexIcon size={size} className={className} />;
    case 'EMP_VIP':
      return <VipCrownIcon size={size} className={className} />;
    default:
      return <StandardCompassIcon size={size} className={className} />;
  }
}
