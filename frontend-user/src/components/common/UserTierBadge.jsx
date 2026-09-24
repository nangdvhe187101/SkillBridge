import React, { useState } from 'react';
import SkillBridgeBadgeIcon from './SkillBridgeBadges';

// Cấu hình metadata cho từng bậc hạng
export const TIER_CONFIG = {
  // Sinh viên / Freelancer
  FREE_STUDENT: {
    level: 0,
    role: 'student',
    planCode: 'FREE',
    title: 'Thành viên Tiêu chuẩn',
    shortLabel: 'Tiêu chuẩn',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#64748b',
    bg: 'rgba(148, 163, 184, 0.1)',
    levelBg: '#64748b',
    levelColor: '#ffffff',
    perks: ['Ứng tuyển các dự án tiêu chuẩn', 'Tạo tối đa 3 CV kỹ năng', 'Phí hoa hồng sàn 10%'],
  },
  STU_STARTER: {
    level: 1,
    role: 'student',
    planCode: 'STU_STARTER',
    title: 'Student Starter',
    shortLabel: 'Starter',
    badgeName: 'Icon Mầm Xanh Khởi Nghiệp',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.12)',
    glow: '0 0 10px rgba(16, 185, 129, 0.25)',
    levelBg: '#059669',
    levelColor: '#ffffff',
    perks: ['Phí sàn giảm còn 8% (Tiết kiệm 20%)', 'Icon Mầm Xanh độc quyền bên cạnh tên', 'Ưu tiên hiển thị trước Nhà tuyển dụng'],
  },
  STU_PRO: {
    level: 2,
    role: 'student',
    planCode: 'STU_PRO',
    title: 'Freelance Pro',
    shortLabel: 'Pro',
    badgeName: 'Icon Khiên Sao Pro',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    color: '#4f46e5',
    bg: 'rgba(99, 102, 241, 0.12)',
    glow: '0 0 12px rgba(99, 102, 241, 0.3)',
    levelBg: '#4f46e5',
    levelColor: '#ffffff',
    perks: ['Phí sàn chỉ còn 5% (Tiết kiệm 50%)', 'Icon Khiên Sao Pro bảo chứng năng lực', 'Ghim nổi bật trong danh sách Top ứng viên', 'Không giới hạn số lượng CV'],
  },
  STU_MASTER: {
    level: 3,
    role: 'student',
    planCode: 'STU_MASTER',
    title: 'Master Talent',
    shortLabel: 'Master',
    badgeName: 'Icon Kim Cương Cyber Prism',
    border: '1px solid rgba(236, 72, 153, 0.55)',
    color: '#db2777',
    bg: 'rgba(236, 72, 153, 0.12)',
    glow: '0 0 14px rgba(236, 72, 153, 0.35)',
    levelBg: '#db2777',
    levelColor: '#ffffff',
    perks: ['Phí sàn tối thiểu chỉ 3%', 'Icon Kim Cương Đa Diện Cyber phát sáng', 'Bảo lãnh hợp đồng dự án nghìn đô VIP', 'Ưu tiên kết nối dự án chất lượng cao'],
  },

  // Nhà tuyển dụng / Doanh nghiệp
  FREE_EMPLOYER: {
    level: 0,
    role: 'employer',
    planCode: 'FREE',
    title: 'Doanh nghiệp Tiêu chuẩn',
    shortLabel: 'Tiêu chuẩn',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#64748b',
    bg: 'rgba(148, 163, 184, 0.1)',
    levelBg: '#64748b',
    levelColor: '#ffffff',
    perks: ['Đăng tin tuyển dụng tiêu chuẩn', 'Duyệt và tiếp nhận hồ sơ cơ bản'],
  },
  EMP_STARTER: {
    level: 1,
    role: 'employer',
    planCode: 'EMP_STARTER',
    title: 'Employer Starter',
    shortLabel: 'Starter',
    badgeName: 'Icon Tia Sét Lam Tốc Độ',
    border: '1px solid rgba(2, 132, 199, 0.5)',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    glow: '0 0 10px rgba(2, 132, 199, 0.25)',
    levelBg: '#0284c7',
    levelColor: '#ffffff',
    perks: ['Icon Tia Sét Xác Minh độc quyền', 'Đẩy tin tuyển dụng tiếp cận sinh viên gấp đôi', 'Bộ lọc hồ sơ sinh viên cơ bản'],
  },
  EMP_GROWTH: {
    level: 2,
    role: 'employer',
    planCode: 'EMP_GROWTH',
    title: 'Employer Growth',
    shortLabel: 'Growth',
    badgeName: 'Icon Tháp Tăng Trưởng Lục Giác',
    border: '1px solid rgba(147, 51, 234, 0.5)',
    color: '#7e22ce',
    bg: 'rgba(147, 51, 234, 0.12)',
    glow: '0 0 12px rgba(147, 51, 234, 0.3)',
    levelBg: '#7e22ce',
    levelColor: '#ffffff',
    perks: ['Icon Lục Giác Tăng Trưởng độc quyền', 'Mở khóa bộ lọc tài năng hàng đầu', 'Gấp 3x lượt tiếp cận ứng viên xuất sắc', 'Gợi ý ứng viên bằng AI'],
  },
  EMP_VIP: {
    level: 3,
    role: 'employer',
    planCode: 'EMP_VIP',
    title: 'VIP Business Suite',
    shortLabel: 'VIP',
    badgeName: 'Icon Vương Miện Hoàng Gia Vàng',
    border: '1px solid rgba(217, 119, 6, 0.55)',
    color: '#b45309',
    bg: 'rgba(245, 158, 11, 0.14)',
    glow: '0 0 14px rgba(245, 158, 11, 0.35)',
    levelBg: '#d97706',
    levelColor: '#ffffff',
    perks: ['Icon Vương Miện Vàng Hoàng Gia danh giá', 'Tin tuyển dụng ghim đầu trang có viền vàng', 'Bảo chứng Đối Tác Vàng uy tín tuyệt đối', 'Chuyên viên tài khoản hỗ trợ 1-1 riêng biệt'],
  },
};

/**
 * Component UserTierBadge hiển thị icon huy hiệu tự thiết kế kèm tên hạng
 */
export default function UserTierBadge({
  planCode = 'FREE',
  userRole = 'student',
  variant = 'pill', // 'pill' | 'avatar-crest' | 'icon-only'
  size = 'md',      // 'sm' | 'md' | 'lg'
  expiresAt = null,
  showPopover = true,
  onManageClick = null,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Chuẩn hóa plan key
  const normalizedCode = (planCode || '').toUpperCase();
  let key = normalizedCode;

  if (!normalizedCode || normalizedCode === 'FREE') {
    key = userRole === 'employer' ? 'FREE_EMPLOYER' : 'FREE_STUDENT';
  }

  const cfg = TIER_CONFIG[key] || (userRole === 'employer' ? TIER_CONFIG.FREE_EMPLOYER : TIER_CONFIG.FREE_STUDENT);

  // Kích thước icon tương ứng
  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 24,
  };
  const iconSize = iconSizes[size] || 18;

  // 1. Dạng Icon Đơn (Gắn cạnh username trong bảng, bình luận, chat)
  if (variant === 'icon-only') {
    return (
      <span
        title={`${cfg.title} (Cấp ${cfg.level})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          cursor: 'pointer',
          filter: cfg.glow ? `drop-shadow(${cfg.glow})` : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <SkillBridgeBadgeIcon planCode={cfg.planCode} size={iconSize} />
      </span>
    );
  }

  // 2. Dạng Avatar Crest (Gắn góc Avatar 16-20px)
  if (variant === 'avatar-crest') {
    return (
      <div
        title={`${cfg.title} (Cấp ${cfg.level})`}
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: size === 'sm' ? 18 : 22,
          height: size === 'sm' ? 18 : 22,
          borderRadius: '50%',
          background: 'var(--surface, #ffffff)',
          boxShadow: cfg.glow || '0 2px 5px rgba(0,0,0,0.2)',
          border: '1.5px solid var(--surface, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 4,
          transition: 'transform 0.15s ease',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <SkillBridgeBadgeIcon planCode={cfg.planCode} size={size === 'sm' ? 13 : 15} />
      </div>
    );
  }

  // 3. Dạng Pill Badge UI tinh gọn (Icon + Nhãn + Level Tag)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => showPopover && setIsOpen(true)}
      onMouseLeave={() => showPopover && setIsOpen(false)}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Hạng tài khoản: ${cfg.title}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: size === 'sm' ? '2px 7px' : '3px 9px',
          borderRadius: 999,
          background: cfg.bg,
          border: cfg.border,
          boxShadow: cfg.glow,
          color: cfg.color,
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        <SkillBridgeBadgeIcon planCode={cfg.planCode} size={iconSize} />
        <span>{cfg.shortLabel}</span>
        {cfg.level > 0 && (
          <span
            style={{
              fontSize: 9.5,
              padding: '1px 5px',
              borderRadius: 4,
              background: cfg.levelBg,
              color: cfg.levelColor,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '0.02em',
            }}
          >
            Lvl {cfg.level}
          </span>
        )}
      </div>

      {/* Popover giải thích đặc quyền khi hover */}
      {showPopover && isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 270,
            background: 'var(--surface, #ffffff)',
            borderRadius: 12,
            padding: 14,
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            zIndex: 70,
            animation: 'fadeIn 0.15s ease-out',
            color: 'var(--ink, #1e293b)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <SkillBridgeBadgeIcon planCode={cfg.planCode} size={26} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>{cfg.title}</div>
              <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.badgeName || 'Tài khoản tiêu chuẩn'}</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-soft, #64748b)', marginBottom: 10 }}>
            {expiresAt ? `Hạn dùng: ${new Date(expiresAt).toLocaleDateString('vi-VN')}` : 'Chưa kích hoạt gói'}
          </div>

          <div style={{ borderTop: '1px solid var(--border, #f1f5f9)', paddingTop: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink, #334155)', marginBottom: 4 }}>Đặc quyền:</div>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: 'var(--ink-soft, #64748b)', lineHeight: 1.5 }}>
              {cfg.perks.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          {onManageClick && (
            <button
              type="button"
              onClick={onManageClick}
              style={{
                width: '100%',
                padding: '6px 0',
                borderRadius: 6,
                border: 'none',
                background: cfg.levelBg || cfg.color,
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cfg.level === 3 ? 'Quản lý gói' : 'Nâng cấp hạng'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
