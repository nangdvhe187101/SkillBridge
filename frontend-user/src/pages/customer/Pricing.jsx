import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

/* ==========================================================================
   BỘ ICON SVG THIẾT KẾ ĐỘC QUYỀN (CUSTOM DESIGNED SVG ICONS)
   ========================================================================== */

// Icon 1: Cơ bản / Tự do (La bàn định hướng thanh lịch)
function MinimalCompassIcon({ color = '#64748b' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="11" stroke={color} strokeWidth="2" strokeDasharray="2 2" opacity="0.4" />
      <circle cx="14" cy="14" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M17.5 10.5L13 13L10.5 17.5L15 15L17.5 10.5Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="14" cy="14" r="1.5" fill={color} />
    </svg>
  );
}

// Icon 2: Mầm xanh / Khởi nghiệp sinh viên
function SeedlingSparkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="seedGrad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path d="M6 22C6 17 10 13 15 13M15 13C17.5 13 22 11.5 22 6C16.5 6 15 10.5 15 13ZM15 13V22" stroke="url(#seedGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 17C12 17 9 15 8 12C11 12 14 13.5 15 17Z" fill="url(#seedGrad)" fillOpacity="0.3" stroke="url(#seedGrad)" strokeWidth="1.8" />
      <circle cx="21" cy="7" r="1.5" fill="#34d399" />
    </svg>
  );
}

// Icon 3: Tia sét bứt phá tốc độ (Speed Bolt)
function DynamicBoltIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="boltGrad" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M15.5 2.5L5.5 15H14L12.5 25.5L22.5 13H14L15.5 2.5Z" fill="url(#boltGrad)" fillOpacity="0.25" stroke="url(#boltGrad)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 6L8 14H13L12 21L18 13H13L14 6Z" fill="url(#boltGrad)" />
    </svg>
  );
}

// Icon 4: Khiên Ngôi sao Pro (Pro Badge Shield)
function ProShieldStarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="proGrad" x1="4" y1="3" x2="24" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path d="M14 3L23 7V13C23 18.5 19 23 14 25C9 23 5 18.5 5 13V7L14 3Z" fill="url(#proGrad)" fillOpacity="0.18" stroke="url(#proGrad)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 7.5L15.8 11.2L19.8 11.8L16.9 14.6L17.6 18.6L14 16.7L10.4 18.6L11.1 14.6L8.2 11.8L12.2 11.2L14 7.5Z" fill="url(#proGrad)" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// Icon 5: Tăng trưởng quy mô doanh nghiệp (Scale & Growth Chart)
function GrowthScaleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="growthGrad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect x="4" y="16" width="5" height="8" rx="1.5" fill="url(#growthGrad)" fillOpacity="0.3" stroke="url(#growthGrad)" strokeWidth="1.8" />
      <rect x="11.5" y="11" width="5" height="13" rx="1.5" fill="url(#growthGrad)" fillOpacity="0.5" stroke="url(#growthGrad)" strokeWidth="1.8" />
      <rect x="19" y="6" width="5" height="18" rx="1.5" fill="url(#growthGrad)" stroke="url(#growthGrad)" strokeWidth="1.8" />
      <path d="M5 11L12 5L17 9L23 3M23 3H18M23 3V8" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Icon 6: Kim cương 3D Neon Master (Cyber Diamond)
function CyberDiamondIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="diaGrad" x1="4" y1="5" x2="24" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f472b6" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d="M7 5H21L25 11L14 24L3 11L7 5Z" fill="url(#diaGrad)" fillOpacity="0.25" stroke="url(#diaGrad)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 5L14 24M21 5L14 24M3 11H25M7 5L11 11L14 5L17 11L21 5" stroke="url(#diaGrad)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="14" cy="5" r="1.5" fill="#fff" />
    </svg>
  );
}

// Icon 7: Vương miện Hoàng Gia Mạ Vàng (Luxury 3D Crown)
function LuxuryCrownIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldCrown" x1="4" y1="6" x2="24" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="0.7" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M4 21H24L22 10L17 15L14 7L11 15L6 10L4 21Z" fill="url(#goldCrown)" fillOpacity="0.3" stroke="url(#goldCrown)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="4" cy="9" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <circle cx="14" cy="6" r="2.2" fill="#fff" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="24" cy="9" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <rect x="5" y="21" width="18" height="3" rx="1.5" fill="url(#goldCrown)" />
      <circle cx="9" cy="22.5" r="0.8" fill="#fff" />
      <circle cx="14" cy="22.5" r="0.8" fill="#fff" />
      <circle cx="19" cy="22.5" r="0.8" fill="#fff" />
    </svg>
  );
}

// Dấu tick xanh súc tích
function CheckBulletIcon({ color = '#10b981' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.15" />
      <path d="M5 8.2L7 10.2L11.5 5.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ==========================================================================
   MAIN COMPONENT: PRICING
   ========================================================================== */

export const PLAN_RANKS = {
  FREE: 0,
  STU_STARTER: 1,
  STU_PRO: 2,
  STU_MASTER: 3,
  EMP_STARTER: 1,
  EMP_GROWTH: 2,
  EMP_VIP: 3,
};

export default function Pricing() {
  const { state, showToast, refreshWallet } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  const isLoggedIn = Boolean(state.currentUser);
  const userRole = state.currentUser?.roleCode || state.role;

  useEffect(() => {
    if (isLoggedIn && typeof refreshWallet === 'function') {
      refreshWallet();
    }
  }, [isLoggedIn, refreshWallet]);

  // Khóa tab theo vai trò khi đã login, cho phép khách chuyển tab khi chưa login
  const [guestTab, setGuestTab] = useState('student');
  const activeTab = isLoggedIn ? (userRole === 'employer' ? 'employer' : 'student') : guestTab;

  const currentPlanCode = state.activePlanCode;

  // Tính cấp bậc gói hiện tại (0: Chưa có gói / Miễn phí, 1: Starter, 2: Pro/Growth, 3: VIP/Master)
  const currentRank = useMemo(() => {
    if (!isLoggedIn) return 0;
    if (currentPlanCode && PLAN_RANKS[currentPlanCode] !== undefined) {
      return PLAN_RANKS[currentPlanCode];
    }
    if (state.vipBusiness) return 3;
    if (state.subscriptionPro) return 2;
    return 0;
  }, [isLoggedIn, currentPlanCode, state.vipBusiness, state.subscriptionPro]);

  const activePlanName = useMemo(() => {
    if (!isLoggedIn || currentRank === 0) return null;
    if (activeTab === 'employer') {
      if (currentPlanCode === 'EMP_VIP' || state.vipBusiness) return 'VIP Business';
      if (currentPlanCode === 'EMP_GROWTH') return 'Doanh Nghiệp Tiêu Chuẩn';
      if (currentPlanCode === 'EMP_STARTER') return 'Tuyển Dụng Nhanh';
    } else {
      if (currentPlanCode === 'STU_MASTER') return 'Master Talent (VIP)';
      if (currentPlanCode === 'STU_PRO' || state.subscriptionPro) return 'Freelance Pro';
      if (currentPlanCode === 'STU_STARTER') return 'Sinh Viên Tích Cực';
    }
    return currentRank === 3 ? 'Gói VIP' : 'Gói cao hơn';
  }, [isLoggedIn, currentRank, activeTab, currentPlanCode, state.vipBusiness, state.subscriptionPro]);

  const handleSelectPlan = (plan) => {
    if (!isLoggedIn) {
      navigate('/auth?tab=register');
      return;
    }

    const planRank = PLAN_RANKS[plan.code] ?? 0;

    // Chặn người dùng mua gói thấp hơn khi đang có gói cao hơn
    if (currentRank > 0 && planRank < currentRank) {
      if (typeof showToast === 'function') {
        showToast(`Bạn đang sử dụng ${activePlanName || 'gói cao hơn'}. Không thể mua gói thấp hơn khi gói hiện tại còn hạn sử dụng.`, 'warning');
      }
      return;
    }

    if (plan.code === 'FREE') {
      if (activeTab === 'employer') {
        navigate('/employer/post');
      } else {
        navigate('/jobs');
      }
      return;
    }

    openModal('planPurchase', {
      planCode: plan.code,
      planName: plan.name,
      price: plan.price,
      badge: plan.badge,
      features: plan.features,
      role: activeTab,
      isUpgrade: currentRank > 0 && planRank > currentRank,
    });
  };


  // DANH SÁCH GÓI SINH VIÊN: Tinh gọn, trọng tâm, kích thích quyết định
  const studentPlans = useMemo(() => [
    {
      code: 'FREE',
      name: 'Sinh Viên Cơ Bản',
      tagline: 'Khởi đầu không rủi ro',
      badge: 'Miễn phí',
      iconComponent: <MinimalCompassIcon color="#64748b" />,
      themeColor: '#64748b',
      themeBg: 'rgba(100, 116, 139, 0.08)',
      borderColor: 'var(--border)',
      cardBg: 'var(--surface)',
      btnStyle: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--border)' },
      price: 0,
      priceSub: 'Dành cho người mới',
      features: [
        <span>Phí sàn tiêu chuẩn: <strong>10%</strong></span>,
        <span><strong>5 đơn</strong> ứng tuyển / tuần</span>,
        <span>Hồ sơ <strong>1 bản CV</strong> cơ bản</span>,
        <span>Bảo vệ quỹ tương hỗ an toàn</span>,
        <span>Rút tiền tiêu chuẩn 24 – 48h</span>
      ],
      btnLabel: 'Bắt đầu miễn phí',
      isCurrent: !currentPlanCode || currentPlanCode === 'FREE',
    },
    {
      code: 'STU_STARTER',
      name: 'Sinh Viên Tích Cực',
      tagline: 'Gấp 3 cơ hội nhận việc',
      badge: 'Khởi đầu',
      iconComponent: <SeedlingSparkIcon />,
      themeColor: '#10b981',
      themeBg: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.45)',
      cardBg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, var(--surface) 100%)',
      glowShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
      btnStyle: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none' },
      price: 29000,
      priceSub: 'Chỉ 1.000đ / ngày',
      features: [
        <span>Phí sàn giảm còn <strong>8%</strong> (tiết kiệm ngay)</span>,
        <span><strong>15 đơn</strong> nộp hồ sơ / tuần</span>,
        <span>Quản lý <strong>3 CV</strong> chuyên ngành</span>,
        <span>Huy hiệu <strong>Tích Cực</strong></span>,
        <span>Rút tiền ưu tiên trong <strong>12h</strong></span>
      ],
      btnLabel: 'Kích hoạt Starter 29k',
      isCurrent: currentPlanCode === 'STU_STARTER',
    },
    {
      code: 'STU_PRO',
      name: 'Freelance Pro',
      tagline: 'Lựa chọn bứt phá thu nhập',
      badge: 'Phổ biến',
      popular: true,
      ribbonText: 'PHỔ BIẾN NHẤT',
      iconComponent: <ProShieldStarIcon />,
      themeColor: '#6366f1',
      themeBg: 'rgba(99, 102, 241, 0.14)',
      borderColor: '#6366f1',
      cardBg: 'linear-gradient(180deg, rgba(99, 102, 241, 0.07) 0%, var(--surface) 100%)',
      glowShadow: '0 12px 36px rgba(99, 102, 241, 0.2)',
      btnStyle: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none' },
      price: 49000,
      priceSub: 'Tiết kiệm 50% phí sàn',
      features: [
        <span>Phí sàn siêu ưu đãi <strong>chỉ 5%</strong></span>,
        <span><strong>Không giới hạn</strong> lượt nộp hồ sơ</span>,
        <span><strong>Ưu tiên Top 50%</strong> danh sách ứng viên</span>,
        <span>Huy hiệu <strong>PRO</strong></span>,
        <span>Rút tiền siêu tốc trong <strong>1 – 2h</strong></span>
      ],
      btnLabel: 'Kích hoạt Pro 49k',
      isCurrent: currentPlanCode === 'STU_PRO' || (state.subscriptionPro && !currentPlanCode),
    },
    {
      code: 'STU_MASTER',
      name: 'Master Talent',
      tagline: 'Thu nhập tối đa · Đặc quyền VIP',
      badge: 'VIP',
      ribbonText: 'GÓI VIP',
      iconComponent: <CyberDiamondIcon />,
      themeColor: '#d946ef',
      themeBg: 'rgba(217, 70, 239, 0.15)',
      borderColor: 'rgba(217, 70, 239, 0.65)',
      cardBg: 'linear-gradient(180deg, rgba(217, 70, 239, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%)',
      glowShadow: '0 14px 40px rgba(217, 70, 239, 0.2)',
      btnStyle: { background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)', color: '#fff', border: 'none' },
      price: 99000,
      priceSub: 'Thu hồi vốn sau 1 dự án',
      features: [
        <span>Phí sàn thấp nhất: <strong>Duy nhất 3%</strong></span>,
        <span><strong>Ghim đơn Top 1</strong> có viền sáng hút mắt</span>,
        <span>Huy hiệu <strong>VIP Talent</strong></span>,
        <span>Xem <strong>khoảng giá thầu & đối thủ</strong></span>,
        <span>Rút tiền tức thì <strong>24/7 (5 – 15 phút)</strong></span>
      ],
      btnLabel: 'Kích hoạt VIP 99k',
      isCurrent: currentPlanCode === 'STU_MASTER',
    },
  ], [currentPlanCode, state.subscriptionPro]);

  // DANH SÁCH GÓI NHÀ TUYỂN DỤNG: Trực diện hiệu quả tuyển dụng
  const employerPlans = useMemo(() => [
    {
      code: 'FREE',
      name: 'NTD Cơ Bản',
      tagline: 'Tuyển dụng an toàn 100%',
      badge: 'Miễn phí',
      iconComponent: <MinimalCompassIcon color="#64748b" />,
      themeColor: '#64748b',
      themeBg: 'rgba(100, 116, 139, 0.08)',
      borderColor: 'var(--border)',
      cardBg: 'var(--surface)',
      btnStyle: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--border)' },
      price: 0,
      priceSub: 'Cho nhu cầu tuyển việc lẻ',
      features: [
        <span><strong>01 tin tuyển dụng</strong> chạy đồng thời</span>,
        <span>Tối đa <strong>2 lần</strong> yêu cầu chỉnh sửa</span>,
        <span>Ký quỹ <strong>Escrow an toàn 100%</strong></span>,
        <span>Nghiệm thu <strong>0đ phí sàn</strong></span>,
        <span>Hỗ trợ tranh chấp cơ bản</span>
      ],
      btnLabel: 'Đăng việc miễn phí',
      isCurrent: !currentPlanCode || currentPlanCode === 'FREE',
    },
    {
      code: 'EMP_STARTER',
      name: 'Tuyển Dụng Nhanh',
      tagline: 'Tăng tốc chốt nhân sự',
      badge: 'Tuyển nhanh',
      iconComponent: <DynamicBoltIcon />,
      themeColor: '#0ea5e9',
      themeBg: 'rgba(14, 165, 233, 0.12)',
      borderColor: 'rgba(14, 165, 233, 0.45)',
      cardBg: 'linear-gradient(180deg, rgba(14, 165, 233, 0.04) 0%, var(--surface) 100%)',
      glowShadow: '0 8px 24px rgba(14, 165, 233, 0.12)',
      btnStyle: { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none' },
      price: 49000,
      priceSub: 'Dành cho Shop & Cá nhân',
      features: [
        <span>Tối đa <strong>3 tin tuyển dụng</strong> đồng thời</span>,
        <span>Tặng <strong>1 lượt Ghim tin Hot (48h)</strong></span>,
        <span>Huy hiệu <strong>Đã xác thực</strong></span>,
        <span>Tăng lên <strong>3 lần</strong> yêu cầu sửa bài</span>,
        <span>Báo ứng viên mới tức thì qua App</span>
      ],
      btnLabel: 'Kích hoạt Starter 49k',
      isCurrent: currentPlanCode === 'EMP_STARTER',
    },
    {
      code: 'EMP_GROWTH',
      name: 'Doanh Nghiệp Tiêu Chuẩn',
      tagline: 'Chủ động săn sinh viên giỏi',
      badge: 'Tăng trưởng',
      iconComponent: <GrowthScaleIcon />,
      themeColor: '#7c3aed',
      themeBg: 'rgba(124, 58, 237, 0.14)',
      borderColor: '#7c3aed',
      cardBg: 'linear-gradient(180deg, rgba(124, 58, 237, 0.06) 0%, var(--surface) 100%)',
      glowShadow: '0 12px 34px rgba(124, 58, 237, 0.18)',
      btnStyle: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none' },
      price: 89000,
      priceSub: 'Cho Startup & Agency',
      features: [
        <span>Tối đa <strong>7 tin tuyển dụng</strong> đồng thời</span>,
        <span>Tặng <strong>3 lượt Ghim tin nổi bật</strong></span>,
        <span>Mở khóa <strong>Danh bạ Sinh viên</strong></span>,
        <span>Tặng <strong>10 lượt mời làm việc</strong> trực tiếp</span>,
        <span>Sửa bài 4 lần · Hỗ trợ ưu tiên trong <strong>12h</strong></span>
      ],
      btnLabel: 'Kích hoạt Growth 89k',
      isCurrent: currentPlanCode === 'EMP_GROWTH',
    },
    {
      code: 'EMP_VIP',
      name: 'VIP Business Suite',
      tagline: 'Đặc quyền hút nhân tài số 1',
      badge: 'Khuyên dùng',
      popular: true,
      ribbonText: 'GÓI VIP',
      iconComponent: <LuxuryCrownIcon />,
      themeColor: '#f59e0b',
      themeBg: 'rgba(245, 158, 11, 0.18)',
      borderColor: '#f59e0b',
      cardBg: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.03) 100%)',
      glowShadow: '0 16px 42px rgba(245, 158, 11, 0.25)',
      btnStyle: { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none' },
      price: 149000,
      priceSub: 'Giải pháp tuyển dụng VIP',
      features: [
        <span>Đăng tin <strong>KHÔNG GIỚI HẠN</strong></span>,
        <span>Tặng <strong>5 Ghim Hot + nhãn "Tuyển Gấp"</strong></span>,
        <span>SV làm việc <strong>chỉ chịu 5% phí sàn</strong></span>,
        <span>Tặng <strong>25 lượt mời ứng viên VIP</strong></span>,
        <span>Huy hiệu <strong>VIP</strong></span>
      ],
      btnLabel: 'Kích hoạt VIP 149k',
      isCurrent: currentPlanCode === 'EMP_VIP' || (state.vipBusiness && !currentPlanCode),
    },
  ], [currentPlanCode, state.vipBusiness]);

  const currentPlans = activeTab === 'student' ? studentPlans : employerPlans;

  return (
    <div className="page active" style={{ paddingBottom: 60 }}>
      {/* Header Section */}
      <div className="pricing-hero wrap" style={{ textAlign: 'center', paddingBottom: 24 }}>
        <div
          className="sec-eyebrow"
          style={{
            textAlign: 'center',
            fontSize: 'clamp(15px, 2.2vw, 19px)',
            fontWeight: 800,
            letterSpacing: 2,
            marginBottom: 12
          }}
        >
          BẢNG GIÁ DỊCH VỤ SKILLBRIDGE
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 3.8vw, 40px)', marginBottom: 20, fontWeight: 800, letterSpacing: -0.5 }}>
          {isLoggedIn
            ? (activeTab === 'employer' ? 'Gói giải pháp Tuyển dụng & Doanh nghiệp' : 'Gói bứt phá Thu nhập dành cho Sinh viên')
            : 'Chọn gói nâng cấp lý tưởng cho bạn'}
        </h1>

        {/* Thanh Toggle chỉ hiển thị khi CHƯA ĐĂNG NHẬP */}
        {!isLoggedIn && (
          <div className="pricing-toggle" style={{ display: 'inline-flex', padding: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 999, marginBottom: 8 }}>
            <button
              type="button"
              className={activeTab === 'student' ? 'is-active' : ''}
              onClick={() => setGuestTab('student')}
              style={{ borderRadius: 999, padding: '8px 22px', fontSize: 13.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Dành cho Sinh viên ({studentPlans.length} gói)
            </button>
            <button
              type="button"
              className={activeTab === 'employer' ? 'is-active' : ''}
              onClick={() => setGuestTab('employer')}
              style={{ borderRadius: 999, padding: '8px 22px', fontSize: 13.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Dành cho Nhà tuyển dụng ({employerPlans.length} gói)
            </button>
          </div>
        )}
      </div>

      {/* Grid thẻ gói cước */}
      <div className="pricing-body wrap" style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            alignItems: 'stretch'
          }}
        >
          {currentPlans.map((plan) => {
            const planRank = PLAN_RANKS[plan.code] ?? 0;
            const isCurrent = currentRank > 0 ? (planRank === currentRank) : (plan.code === 'FREE');
            const isLower = currentRank > 0 && planRank < currentRank;
            const isUpgrade = currentRank > 0 && planRank > currentRank;

            return (
              <div
                key={plan.code}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 18,
                  position: 'relative',
                  background: plan.cardBg,
                  border: isCurrent
                    ? '2.5px solid #22c55e'
                    : isLower
                      ? '1.5px dashed var(--border)'
                      : `1.5px solid ${plan.borderColor}`,
                  boxShadow: isCurrent
                    ? '0 12px 32px rgba(34, 197, 94, 0.22)'
                    : isLower
                      ? 'none'
                      : (plan.glowShadow || '0 4px 16px rgba(0,0,0,0.04)'),
                  opacity: isLower ? 0.75 : 1,
                  padding: '24px 20px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
                }}
              >
                {/* Ribbon Tag cho gói đang kích hoạt / phổ biến / VIP */}
                {isCurrent ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 16,
                      background: 'linear-gradient(135deg, #16a34a, #059669)',
                      color: '#fff',
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 999,
                      letterSpacing: 0.5,
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>✓</span> ĐANG SỬ DỤNG
                  </div>
                ) : plan.ribbonText ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 16,
                      background: plan.code === 'EMP_VIP'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : (plan.code === 'STU_MASTER' ? 'linear-gradient(135deg, #ec4899, #06b6d4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'),
                      color: '#fff',
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 999,
                      letterSpacing: 0.5,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {plan.ribbonText}
                  </div>
                ) : null}

                <div>
                  {/* Header: Icon SVG tự tạo + Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: plan.themeBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 14px ${plan.themeBg}`
                      }}
                    >
                      {plan.iconComponent}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: isLower ? 'rgba(0,0,0,0.06)' : plan.themeBg,
                        color: isLower ? 'var(--ink-soft)' : plan.themeColor,
                        border: `1px solid ${isLower ? 'var(--border)' : plan.borderColor}`
                      }}
                    >
                      {isLower ? 'Bậc thấp hơn' : plan.badge}
                    </span>
                  </div>

                  {/* Tên gói & Tagline súc tích */}
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                    {plan.name}
                  </h3>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isLower ? 'var(--ink-soft)' : plan.themeColor, marginBottom: 14 }}>
                    {plan.tagline}
                  </div>

                  {/* Giá niêm yết */}
                  <div style={{ marginBottom: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: isLower ? 'var(--ink-soft)' : (plan.price > 0 ? plan.themeColor : 'var(--ink)'), letterSpacing: -0.5 }}>
                      {plan.price === 0 ? '0đ' : fmtVND(plan.price)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>/tháng</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 18 }}>
                    {plan.priceSub}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />

                  {/* Quyền lợi súc tích, trực diện */}
                  <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 22px', fontSize: 13 }}>
                    {plan.features.map((featNode, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10, lineHeight: 1.4 }}>
                        <CheckBulletIcon color={isLower ? 'var(--ink-soft)' : plan.themeColor} />
                        <span style={{ color: isLower ? 'var(--ink-soft)' : 'var(--ink)' }}>{featNode}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nút Call to Action */}
                <div>
                  <button
                    type="button"
                    className="btn btn-block"
                    style={{
                      ...(isCurrent
                        ? { background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1.5px solid #22c55e', cursor: 'default' }
                        : isLower
                          ? { background: 'rgba(0, 0, 0, 0.05)', color: 'var(--ink-soft)', border: '1.5px dashed var(--border)', cursor: 'not-allowed' }
                          : isUpgrade
                            ? { ...plan.btnStyle, boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)' }
                            : plan.btnStyle),
                      fontWeight: 800,
                      padding: '11px 16px',
                      borderRadius: 12,
                      fontSize: 13.5,
                    }}
                    disabled={isCurrent || isLower}
                    onClick={() => handleSelectPlan(plan)}
                    title={
                      isLower
                        ? `Bạn đang dùng ${activePlanName || 'gói cao hơn'}. Không thể đăng ký gói thấp hơn khi gói hiện tại còn hạn.`
                        : isCurrent
                          ? 'Gói đang kích hoạt trên tài khoản của bạn'
                          : ''
                    }
                  >
                    {isCurrent
                      ? '✓ Gói đang sử dụng'
                      : isLower
                        ? (plan.code === 'FREE' ? 'Gói mặc định' : `Đã có ở ${activePlanName || 'gói cao hơn'}`)
                        : isUpgrade
                          ? `⚡ Nâng cấp ${plan.name}`
                          : plan.btnLabel}
                  </button>

                  {/* Ghi chú trạng thái dưới nút */}
                  {isLower && (
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center', marginTop: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span>🔒 Đã bao gồm trong {activePlanName || 'gói cao hơn'}</span>
                    </div>
                  )}
                  {isUpgrade && (
                    <div style={{ fontSize: 11, color: plan.themeColor, textAlign: 'center', marginTop: 7, fontWeight: 700 }}>
                      ⚡ Nâng cấp đặc quyền tức thì
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

