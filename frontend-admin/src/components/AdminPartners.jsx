import { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import { getSystemSettings, updateSystemSettings } from '../api/adminApi';
import Icon from './Icon';

function fmtVND(amount) {
  if (amount === undefined || amount === null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

export default function AdminPartners() {
  const { showToast } = useToast();
  const { partners: initialPartners, campaigns: initialCampaigns } = useAdmin();

  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'campaigns' | 'partners' | 'referrals'
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings State (loaded from /admin/settings API)
  const [settingsForm, setSettingsForm] = useState({
    cpcClickPrice: 2500,
    referralProgramEnabled: true,
    referralRewardType: 'trial_days', // 'trial_days' | 'free_commission_count'
    referralRewardValue: 3,
    referralRewardTarget: 'both',
  });

  // Campaigns State
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('sb_admin_campaigns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialCampaigns && initialCampaigns.length > 0 ? initialCampaigns : [
      { id: 'c1', company: 'CareerViet Technology', title: 'Tuyển dụng Thực tập sinh IT & Marketing 2026', bannerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80', budget: 5000000, spent: 3125000, clicks: 1250, status: 'active', targetUrl: 'https://careerviet.vn' },
      { id: 'c2', company: 'TopCV Ecosystem', title: 'Khóa đào tạo Kỹ năng phỏng vấn chuyên nghiệp', bannerUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80', budget: 3000000, spent: 2980000, clicks: 1192, status: 'active', targetUrl: 'https://topcv.vn' },
      { id: 'c3', company: 'GlowUp Cosmetics', title: 'Tuyển CTV Review Mỹ phẩm Sinh viên Part-time', bannerUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', budget: 1500000, spent: 0, clicks: 0, status: 'pending', targetUrl: 'https://glowup.vn' },
    ];
  });

  // Partners State
  const [partners, setPartners] = useState(() => {
    const saved = localStorage.getItem('sb_admin_partners');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialPartners && initialPartners.length > 0 ? initialPartners : [
      { id: 'p1', name: 'Đại học Bách Khoa Hà Nội (HUST)', category: 'Hợp tác tuyển dụng sinh viên', commissionRate: 5, status: 'approved' },
      { id: 'p2', name: 'Đại học Kinh tế Quốc dân (NEU)', category: 'Ngày hội việc làm sinh viên', commissionRate: 5, status: 'approved' },
      { id: 'p3', name: 'FPT Software Academy', category: 'Trung tâm đào tạo công nghệ', commissionRate: 8, status: 'approved' },
      { id: 'p4', name: 'EduPath Consulting', category: 'Du học & Hướng nghiệp sinh viên', commissionRate: 10, status: 'pending' },
    ];
  });

  // Buddy Referrals (1-1) Mock Data
  const [referrals, setReferrals] = useState(() => {
    const saved = localStorage.getItem('sb_admin_referrals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'ref_1', referrerName: 'Nguyễn Văn Nam', referrerRole: 'student', refereeName: 'Trần Minh Đức', refereeRole: 'student', code: 'NAMVN88', status: 'rewarded', rewardDesc: '3 ngày Talent Pro', date: '08/10/2026' },
      { id: 'ref_2', referrerName: 'Hoàng Thị Mai', referrerRole: 'student', refereeName: 'Lê Thu Trang', refereeRole: 'student', code: 'MAIHT99', status: 'verified', rewardDesc: 'Đang mở khóa', date: '08/10/2026' },
      { id: 'ref_3', referrerName: 'Công ty Công Nghệ Alpha', referrerRole: 'employer', refereeName: 'Cty TNHH Giải Pháp Beta', refereeRole: 'employer', code: 'ALPHA2026', status: 'pending', rewardDesc: 'Chờ đăng tin đầu', date: '07/10/2026' },
    ];
  });

  // Modal States
  const [previewAd, setPreviewAd] = useState(null);
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', category: '', commissionRate: 5 });

  // Load Settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getSystemSettings();
      if (res) {
        setSettingsForm({
          cpcClickPrice: res.cpcClickPrice || 2500,
          referralProgramEnabled: res.referralProgramEnabled !== false,
          referralRewardType: res.referralRewardType || 'trial_days',
          referralRewardValue: res.referralRewardValue || 3,
          referralRewardTarget: res.referralRewardTarget || 'both',
        });
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải cấu hình hệ thống.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const payload = {
        cpcClickPrice: Number(settingsForm.cpcClickPrice),
        referralProgramEnabled: settingsForm.referralProgramEnabled,
        referralRewardType: settingsForm.referralRewardType,
        referralRewardValue: Number(settingsForm.referralRewardValue),
        referralRewardTarget: settingsForm.referralRewardTarget,
      };
      await updateSystemSettings(payload);
      showToast('Đã lưu cấu hình Đơn giá CPC & Chương trình Giới thiệu thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể lưu cấu hình hệ thống.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle or approve campaign
  const handleToggleCampaign = (id) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      });
      localStorage.setItem('sb_admin_campaigns', JSON.stringify(next));
      return next;
    });
    showToast('Đã cập nhật trạng thái chiến dịch.', 'success');
  };

  const handleApproveCampaign = (id) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c));
      localStorage.setItem('sb_admin_campaigns', JSON.stringify(next));
      return next;
    });
    setPreviewAd(null);
    showToast('Đã phê duyệt chiến dịch quảng cáo hiển thị trên sàn!', 'success');
  };

  const handleRejectCampaign = (id) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c));
      localStorage.setItem('sb_admin_campaigns', JSON.stringify(next));
      return next;
    });
    setPreviewAd(null);
    showToast('Đã từ chối chiến dịch quảng cáo.', 'info');
  };

  // Partners action
  const handleApprovePartner = (id) => {
    setPartners((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p));
      localStorage.setItem('sb_admin_partners', JSON.stringify(next));
      return next;
    });
    showToast('Đã phê duyệt đối tác affiliate thành công.', 'success');
  };

  const handleAddPartner = (e) => {
    e.preventDefault();
    if (!newPartner.name.trim()) return;
    const item = {
      id: 'p_' + Date.now(),
      name: newPartner.name.trim(),
      category: newPartner.category.trim() || 'Hợp tác đào tạo & việc làm',
      commissionRate: Number(newPartner.commissionRate) || 5,
      status: 'approved',
    };
    const next = [item, ...partners];
    setPartners(next);
    localStorage.setItem('sb_admin_partners', JSON.stringify(next));
    setIsAddPartnerOpen(false);
    setNewPartner({ name: '', category: '', commissionRate: 5 });
    showToast(`Đã thêm đối tác ${item.name} thành công!`, 'success');
  };

  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);

  return (
    <section className="adm-section active" style={{ paddingBottom: 40 }}>
      {/* Top Header */}
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
            Quản Lý Đối Tác, Quảng Cáo CPC & Giới Thiệu
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-soft)' }}>
            Toàn quyền quản trị đơn giá CPC, công tắc bật/tắt giới thiệu bạn bè 1-1, duyệt banner và mạng lưới đối tác.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={fetchSettings}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <Icon name="refresh" width="14" height="14" className={loading ? 'adm-spinner' : ''} /> Đồng bộ dữ liệu
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Đơn Giá CPC Sàn</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0ea5e9', marginTop: 4 }}>
            {fmtVND(settingsForm.cpcClickPrice)}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}> / click</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>Do Admin toàn quyền điều chỉnh</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Giới Thiệu Bạn Bè (1-1)</span>
          <div style={{ fontSize: 22, fontWeight: 800, color: settingsForm.referralProgramEnabled ? '#10b981' : '#ef4444', marginTop: 4 }}>
            {settingsForm.referralProgramEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
            {settingsForm.referralProgramEnabled ? `Tặng ${settingsForm.referralRewardValue} ${settingsForm.referralRewardType === 'trial_days' ? 'ngày Pro' : 'lần miễn phí hoa hồng'}` : 'Đã ẩn toàn bộ ngoài web'}
          </span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Doanh Thu CPC Đã Thu</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
            {fmtVND(totalSpent)}
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>Tổng {totalClicks.toLocaleString('vi-VN')} click hợp lệ</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Đối Tác Hoạt Động</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', marginTop: 4 }}>
            {partners.filter(p => p.status === 'approved').length} / {partners.length}
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>Trường ĐH & Đối tác tuyển dụng</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'inline-flex', gap: 8, marginBottom: 20, background: 'var(--surface-2, rgba(0,0,0,0.04))', padding: 5, borderRadius: 14, border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'settings' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--primary)' : 'var(--ink-soft)',
            boxShadow: activeTab === 'settings' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          ⚙️ Cấu Hình Đơn Giá CPC & Giới Thiệu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'campaigns' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'campaigns' ? 'var(--primary)' : 'var(--ink-soft)',
            boxShadow: activeTab === 'campaigns' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          📢 Chiến Dịch CPC Doanh Nghiệp ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('referrals')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'referrals' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'referrals' ? 'var(--primary)' : 'var(--ink-soft)',
            boxShadow: activeTab === 'referrals' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          🤝 Đôi Bạn Đồng Hành 1-1 ({referrals.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'partners' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'partners' ? 'var(--primary)' : 'var(--ink-soft)',
            boxShadow: activeTab === 'partners' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          🏢 Mạng Lưới Đối Tác ({partners.length})
        </button>
      </div>

      {/* TAB 1: SETTINGS FORM */}
      {activeTab === 'settings' && (
        <div className="adm-card" style={{ maxWidth: 880 }}>
          <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 20 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Cấu Hình Trọng Yếu Của Hệ Thống (CPC & Referral)</h4>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Các thay đổi lưu tại đây sẽ lập tức có hiệu lực tới cơ chế trừ tiền ví và hiển thị trên giao diện người dùng.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings}>
            {/* Module 1: CPC Price */}
            <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.02))', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <h5 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                  1. Đơn Giá Mỗi Lượt Click Hợp Lệ (Cost Per Click - CPC)
                </h5>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
                Số tiền mà Nhà Tuyển Dụng sẽ bị trừ tự động từ ví cho mỗi lượt sinh viên click vào banner hợp lệ (đã bảo vệ chống click ảo 24h).
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: 220 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Đơn giá 1 click (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    required
                    value={settingsForm.cpcClickPrice}
                    onChange={(e) => setSettingsForm({ ...settingsForm, cpcClickPrice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--primary)',
                      background: 'var(--surface)',
                    }}
                  />
                </div>
                <div style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0ea5e9' }}>
                    = {fmtVND(settingsForm.cpcClickPrice)} / lượt click
                  </span>
                </div>
              </div>
            </div>

            {/* Module 2: 1-1 Referral Program */}
            <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.02))', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🎁</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                      2. Chương Trình Mời Bạn Đồng Hành 1 - 1 (Buddy Referral)
                    </h5>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Mỗi người dùng chỉ được mời duy nhất 01 bạn thân (mã dùng 1 lần)
                    </span>
                  </div>
                </div>

                {/* Main Toggle Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', padding: '6px 14px', borderRadius: 20, border: '1.5px solid var(--border)' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: settingsForm.referralProgramEnabled ? '#10b981' : '#ef4444' }}>
                    {settingsForm.referralProgramEnabled ? 'ĐANG BẬT TRÊN WEB' : 'ĐÃ TẮT & ẨN HOÀN TOÀN'}
                  </span>
                  <label className="switch" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={settingsForm.referralProgramEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, referralProgramEnabled: e.target.checked })}
                    />
                    <span className="switch-track" />
                  </label>
                </div>
              </div>

              {settingsForm.referralProgramEnabled ? (
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 16, marginTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Hình thức phần thưởng (Reward Type)
                      </label>
                      <select
                        value={settingsForm.referralRewardType}
                        onChange={(e) => setSettingsForm({ ...settingsForm, referralRewardType: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1.5px solid var(--border)',
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                      >
                        <option value="trial_days">⏱️ Tặng ngày dùng thử Gói Talent VIP/Pro</option>
                        <option value="free_commission_count">🏷️ Miễn 100% hoa hồng sàn hợp đồng đầu</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Giá trị quà tặng (Value)
                      </label>
                      <select
                        value={settingsForm.referralRewardValue}
                        onChange={(e) => setSettingsForm({ ...settingsForm, referralRewardValue: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1.5px solid var(--border)',
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                      >
                        {settingsForm.referralRewardType === 'trial_days' ? (
                          <>
                            <option value={1}>Tặng 1 ngày trải nghiệm VIP</option>
                            <option value={2}>Tặng 2 ngày trải nghiệm VIP</option>
                            <option value={3}>Tặng 3 ngày trải nghiệm VIP (Khuyên dùng)</option>
                          </>
                        ) : (
                          <>
                            <option value={1}>Miễn phí hoa hồng 1 hợp đồng đầu tiên</option>
                            <option value={3}>Miễn phí hoa hồng 3 hợp đồng đầu tiên</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Đối tượng áp dụng
                      </label>
                      <select
                        value={settingsForm.referralRewardTarget}
                        onChange={(e) => setSettingsForm({ ...settingsForm, referralRewardTarget: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1.5px solid var(--border)',
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                      >
                        <option value="both">Cả Sinh viên & Nhà tuyển dụng</option>
                        <option value="student">Chỉ dành riêng cho Sinh viên</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, color: '#0ea5e9', fontWeight: 600 }}>
                    💡 Khi bạn bè nhập mã và hoàn tất xác minh thẻ sinh viên, cả người mời và bạn bè sẽ tự động được nhận phần thưởng này cùng lúc.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, marginTop: 10, fontSize: 12.5, color: '#dc2626' }}>
                  🚫 Tính năng đang TẮT: Ô nhập mã tại trang Đăng ký và Menu "Mời bạn đồng hành" trong Dashboard sinh viên/NTD đã được ẩn hoàn toàn trên giao diện người dùng.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingSettings}
                style={{ padding: '11px 24px', fontSize: 14, fontWeight: 800, borderRadius: 10 }}
              >
                <Icon name="check" width="16" height="16" /> {savingSettings ? 'Đang lưu cài đặt...' : 'Lưu Thay Đổi Cấu Hình'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Chiến Dịch Quảng Cáo CPC Doanh Nghiệp</h4>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Đơn giá hiện tại: <b>{fmtVND(settingsForm.cpcClickPrice)}/click</b>. Tiền trừ trực tiếp từ ví doanh nghiệp khi có lượt click hợp lệ.
              </p>
            </div>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Doanh nghiệp / Chiến dịch</th>
                  <th>Ngân sách</th>
                  <th>Đã dùng</th>
                  <th>Số click</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.company}</b>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{c.title}</div>
                    </td>
                    <td><b>{fmtVND(c.budget)}</b></td>
                    <td style={{ color: '#e11d48', fontWeight: 700 }}>{fmtVND(c.spent)}</td>
                    <td>
                      <b>{c.clicks.toLocaleString('vi-VN')}</b>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>lượt click thật</div>
                    </td>
                    <td>
                      <span className={'chip ' + (c.status === 'active' ? 'chip-lime' : c.status === 'pending' ? 'chip-yellow' : '')}>
                        {c.status === 'active' ? 'Đang chạy' : c.status === 'pending' ? 'Chờ duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setPreviewAd(c)}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          👁️ Xem Banner
                        </button>

                        {c.status === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApproveCampaign(c.id)}
                            style={{ padding: '4px 10px', fontSize: 12 }}
                          >
                            Duyệt chạy
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleToggleCampaign(c.id)}
                            style={{ padding: '4px 10px', fontSize: 12 }}
                          >
                            {c.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BUDDY REFERRALS (1-1) */}
      {activeTab === 'referrals' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Nhật Ký Mời Bạn Đồng Hành 1-1</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              Theo dõi các cặp đôi bạn bè đã kết nối mã mời trên hệ thống. Mỗi tài khoản chỉ mời tối đa 1 người.
            </p>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Người gửi lời mời</th>
                  <th>Bạn bè được mời</th>
                  <th>Mã mời (1 lần)</th>
                  <th>Ngày kết nối</th>
                  <th>Trạng thái</th>
                  <th>Phần thưởng đã cấp</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.referrerName}</b>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Role: {r.referrerRole === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'}</div>
                    </td>
                    <td>
                      <b>{r.refereeName}</b>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Role: {r.refereeRole === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng'}</div>
                    </td>
                    <td>
                      <code style={{ background: 'var(--surface-2, #f1f5f9)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {r.code}
                      </code>
                    </td>
                    <td>{r.date}</td>
                    <td>
                      <span className={'chip ' + (r.status === 'rewarded' ? 'chip-lime' : r.status === 'verified' ? 'chip-blue' : '')}>
                        {r.status === 'rewarded' ? 'Đã nhận thưởng' : r.status === 'verified' ? 'Đã xác minh' : 'Chờ xác minh'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0ea5e9' }}>
                        🎁 {r.rewardDesc}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PARTNERS */}
      {activeTab === 'partners' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Mạng Lưới Đối Tác Ngoại Sàn</h4>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                Hợp tác với các Trường Đại học và Doanh nghiệp đào tạo nhân sự cho sinh viên.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsAddPartnerOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
            >
              <Icon name="plus" width="14" height="14" /> Thêm Đối Tác
            </button>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Tên đối tác</th>
                  <th>Lĩnh vực / Mục đích</th>
                  <th>Chiết khấu hoa hồng</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td style={{ color: 'var(--ink-soft)' }}>{p.category}</td>
                    <td><b>{p.commissionRate}%</b></td>
                    <td>
                      <span className={'chip ' + (p.status === 'approved' ? 'chip-lime' : '')}>
                        {p.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status !== 'approved' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprovePartner(p.id)}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          Duyệt đối tác
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW AD BANNER */}
      {previewAd && (
        <div className="modal-backdrop" onClick={() => setPreviewAd(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, borderRadius: 16, padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Xem Trước Mẫu Banner Quảng Cáo</h3>
              <button type="button" className="modal-close" onClick={() => setPreviewAd(null)}>
                <Icon name="x" width="16" height="16" />
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              {previewAd.bannerUrl && (
                <img
                  src={previewAd.bannerUrl}
                  alt={previewAd.title}
                  style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                />
              )}
              <div style={{ padding: 16, background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="chip chip-lime" style={{ fontSize: 10.5 }}>Được tài trợ</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>· {previewAd.company}</span>
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{previewAd.title}</h4>
                <div style={{ fontSize: 12.5, color: '#0ea5e9', wordBreak: 'break-all' }}>
                  🔗 Đích đến: {previewAd.targetUrl || 'Chưa gắn liên kết'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--surface-2, rgba(0,0,0,0.02))', padding: 12, borderRadius: 10, marginBottom: 18, fontSize: 12.5 }}>
              <div>Ngân sách: <b>{fmtVND(previewAd.budget)}</b></div>
              <div>Đã chi: <b>{fmtVND(previewAd.spent)}</b></div>
              <div>Lượt click: <b>{previewAd.clicks}</b></div>
              <div>Trạng thái: <b>{previewAd.status}</b></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {previewAd.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleRejectCampaign(previewAd.id)}
                    style={{ color: '#ef4444' }}
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleApproveCampaign(previewAd.id)}
                  >
                    Phê duyệt hiển thị
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-outline" onClick={() => setPreviewAd(null)}>
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PARTNER */}
      {isAddPartnerOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddPartnerOpen(false)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, borderRadius: 16, padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Thêm Đối Tác Hợp Tác Mới</h3>
              <button type="button" className="modal-close" onClick={() => setIsAddPartnerOpen(false)}>
                <Icon name="x" width="16" height="16" />
              </button>
            </div>

            <form onSubmit={handleAddPartner}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  Tên tổ chức / Đối tác <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trường Đại học Ngoại Thương (FTU)"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  Lĩnh vực / Mục đích hợp tác
                </label>
                <input
                  type="text"
                  placeholder="VD: Cầu nối thực tập sinh ngành Kinh tế"
                  value={newPartner.category}
                  onChange={(e) => setNewPartner({ ...newPartner, category: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  Tỷ lệ hoa hồng đối tác (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newPartner.commissionRate}
                  onChange={(e) => setNewPartner({ ...newPartner, commissionRate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddPartnerOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Thêm đối tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
