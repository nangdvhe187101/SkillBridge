import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import {
  getAdminSubscriptionPlans,
  createAdminSubscriptionPlan,
  updateAdminSubscriptionPlan,
  toggleAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
} from '../api/adminApi';

function fmtVND(amount) {
  if (amount === undefined || amount === null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

const STANDARD_BADGES = [
  'Miễn phí',
  'Khởi đầu',
  'Tuyển nhanh',
  'Phổ biến',
  'Tăng trưởng',
  'Tiết kiệm',
  'Khuyên dùng',
  'VIP',
  'Chuyên nghiệp',
  'Doanh nghiệp',
];

const defaultCreateForm = {
  code: '',
  targetRole: 'employer',
  name: '',
  tagline: '',
  badgeText: '',
  price: 0,
  priceSub: 'tháng',
  commissionRatePercent: 8,
  tierRank: 1,
  maxActiveJobs: 5,
  maxWeeklyApplications: 20,
  maxCvFiles: 5,
  defaultRevisionLimit: 3,
  freeFeaturedPins: 1,
  freeDirectInvites: 5,
  features: [
    'Hỗ trợ đăng tin nhanh',
    'Tối đa 5 tin tuyển dụng mở cùng lúc',
    'Huy hiệu Đã xác thực'
  ],
  isPopular: false,
  isActive: true,
};

export default function AdminPlans() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('employer'); // 'employer' | 'student'
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCustomEditBadge, setIsCustomEditBadge] = useState(false);
  const [isCustomCreateBadge, setIsCustomCreateBadge] = useState(false);

  // Form edit state
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    badgeText: '',
    price: 0,
    priceSub: '',
    commissionRatePercent: 10,
    tierRank: 1,
    maxActiveJobs: '',
    maxWeeklyApplications: '',
    maxCvFiles: 5,
    defaultRevisionLimit: 2,
    freeFeaturedPins: 0,
    freeDirectInvites: 0,
    features: [],
    isPopular: false,
    isActive: true,
  });

  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [newCreateFeatureText, setNewCreateFeatureText] = useState('');

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await getAdminSubscriptionPlans();
      if (res && Array.isArray(res)) {
        setPlans(res);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách gói dịch vụ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = plans.filter((p) => p.targetRole === activeRole);

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    const badge = plan.badgeText || '';
    const isCustom = badge !== '' && !STANDARD_BADGES.includes(badge);
    setIsCustomEditBadge(isCustom);
    setForm({
      name: plan.name || '',
      tagline: plan.tagline || '',
      badgeText: badge,
      price: plan.price || 0,
      priceSub: plan.priceSub || '',
      commissionRatePercent: Number((plan.commissionRate * 100).toFixed(2)),
      maxActiveJobs: plan.maxActiveJobs !== null && plan.maxActiveJobs !== undefined ? plan.maxActiveJobs : '',
      maxWeeklyApplications: plan.maxWeeklyApplications !== null && plan.maxWeeklyApplications !== undefined ? plan.maxWeeklyApplications : '',
      maxCvFiles: plan.maxCvFiles || 5,
      defaultRevisionLimit: plan.defaultRevisionLimit || 2,
      freeFeaturedPins: plan.freeFeaturedPins || 0,
      freeDirectInvites: plan.freeDirectInvites || 0,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      isPopular: !!plan.isPopular,
      isActive: plan.isActive !== false,
    });
    setNewFeatureText('');
  };

  const handleCloseEdit = () => {
    setEditingPlan(null);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setForm((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()],
    }));
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const handleFeatureChange = (idx, value) => {
    setForm((prev) => {
      const next = [...prev.features];
      next[idx] = value;
      return { ...prev, features: next };
    });
  };

  const handleToggleActive = async (plan) => {
    try {
      const res = await toggleAdminSubscriptionPlan(plan.id);
      showToast(
        `Đã ${res.isActive ? 'kích hoạt' : 'tạm tắt'} gói ${plan.name} thành công.`,
        'success'
      );
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: res.isActive } : p))
      );
    } catch (err) {
      showToast(err.message || 'Không thể thay đổi trạng thái gói.', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        badgeText: form.badgeText.trim() || null,
        price: Number(form.price),
        priceSub: form.priceSub.trim() || null,
        commissionRate: Number((form.commissionRatePercent / 100).toFixed(4)),
        tierRank: Number(form.tierRank) || 1,
        maxActiveJobs: form.maxActiveJobs !== '' ? Number(form.maxActiveJobs) : null,
        maxWeeklyApplications: form.maxWeeklyApplications !== '' ? Number(form.maxWeeklyApplications) : null,
        maxCvFiles: Number(form.maxCvFiles) || 5,
        defaultRevisionLimit: Number(form.defaultRevisionLimit) || 2,
        freeFeaturedPins: Number(form.freeFeaturedPins) || 0,
        freeDirectInvites: Number(form.freeDirectInvites) || 0,
        features: form.features,
        isPopular: form.isPopular,
        isActive: form.isActive,
      };

      await updateAdminSubscriptionPlan(editingPlan.id, payload);
      showToast(`Đã lưu cấu hình gói ${payload.name} thành công!`, 'success');
      handleCloseEdit();
      loadPlans();
    } catch (err) {
      showToast(err.message || 'Không thể lưu gói dịch vụ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreate = (role) => {
    setIsCustomCreateBadge(false);
    setCreateForm({
      ...defaultCreateForm,
      targetRole: role || activeRole,
      code: role === 'student' ? 'STU_CUSTOM' : 'EMP_CUSTOM',
      name: role === 'student' ? 'Gói Sinh Viên Mới' : 'Gói Tuyển Dụng Mới',
      badgeText: '',
      features: role === 'student'
        ? ['Phí sàn ưu đãi', 'Tối đa 20 hồ sơ ứng tuyển/tuần', 'Huy hiệu chuyên nghiệp']
        : ['Hỗ trợ đăng tin nhanh', 'Tối đa 5 tin tuyển dụng mở cùng lúc', 'Tặng 1 lượt Ghim Hot'],
    });
    setNewCreateFeatureText('');
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
  };

  const handleAddCreateFeature = () => {
    if (!newCreateFeatureText.trim()) return;
    setCreateForm((prev) => ({
      ...prev,
      features: [...prev.features, newCreateFeatureText.trim()],
    }));
    setNewCreateFeatureText('');
  };

  const handleRemoveCreateFeature = (idx) => {
    setCreateForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateFeatureChange = (idx, value) => {
    setCreateForm((prev) => {
      const next = [...prev.features];
      next[idx] = value;
      return { ...prev, features: next };
    });
  };

  const handleCreateSave = async (e) => {
    e.preventDefault();
    if (!createForm.code.trim()) {
      showToast('Vui lòng nhập mã gói (Code).', 'warning');
      return;
    }
    if (!createForm.name.trim()) {
      showToast('Vui lòng nhập tên gói dịch vụ.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        code: createForm.code.trim().toUpperCase(),
        targetRole: createForm.targetRole,
        name: createForm.name.trim(),
        tagline: createForm.tagline.trim() || null,
        badgeText: createForm.badgeText.trim() || null,
        price: Number(createForm.price),
        priceSub: createForm.priceSub.trim() || null,
        commissionRate: Number((createForm.commissionRatePercent / 100).toFixed(4)),
        tierRank: Number(createForm.tierRank) || 1,
        maxActiveJobs: createForm.maxActiveJobs !== '' ? Number(createForm.maxActiveJobs) : null,
        maxWeeklyApplications: createForm.maxWeeklyApplications !== '' ? Number(createForm.maxWeeklyApplications) : null,
        maxCvFiles: Number(createForm.maxCvFiles) || 5,
        defaultRevisionLimit: Number(createForm.defaultRevisionLimit) || 2,
        freeFeaturedPins: Number(createForm.freeFeaturedPins) || 0,
        freeDirectInvites: Number(createForm.freeDirectInvites) || 0,
        features: createForm.features,
        isPopular: createForm.isPopular,
        isActive: createForm.isActive,
      };

      await createAdminSubscriptionPlan(payload);
      showToast(`Đã tạo mới thành công gói "${payload.name}"!`, 'success');
      handleCloseCreate();
      loadPlans();
    } catch (err) {
      showToast(err.message || 'Không thể tạo mới gói dịch vụ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (plan.code === 'FREE_STUDENT' || plan.code === 'FREE_EMPLOYER') {
      showToast('Không thể xóa gói miễn phí mặc định của hệ thống.', 'warning');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn gói "${plan.name}" (${plan.code}) không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await deleteAdminSubscriptionPlan(plan.id);
      showToast(`Đã xóa gói "${plan.name}" thành công!`, 'success');
      loadPlans();
    } catch (err) {
      showToast(err.message || 'Không thể xóa gói dịch vụ.', 'error');
    }
  };

  return (
    <div className="admin-plans-view" style={{ padding: '4px 0' }}>
      {/* Header bar */}
      <div
        className="adm-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
            Quản Lý Bảng Giá & Gói Dịch Vụ
          </h2>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13.5 }}>
            Chỉnh sửa trực quan giá bán, tỷ lệ hoa hồng sàn (%), hạn mức nghiệp vụ và nội dung quyền lợi hiển thị cho người dùng.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenCreate(activeRole)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, padding: '8px 16px', borderRadius: 10 }}
          >
            <Icon name="plus" width="14" height="14" /> Thêm Gói Mới
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadPlans}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
          >
            <Icon name="refresh" width="14" height="14" className={loading ? 'adm-spinner' : ''} /> Làm mới
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div
        style={{
          display: 'inline-flex',
          gap: 8,
          marginBottom: 24,
          background: 'var(--surface-2, rgba(0, 0, 0, 0.04))',
          padding: 5,
          borderRadius: 14,
          border: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveRole('employer')}
          className="btn btn-sm"
          style={{
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 800,
            fontSize: 13.5,
            border: 'none',
            background: activeRole === 'employer' ? 'var(--primary, #6366f1)' : 'transparent',
            color: activeRole === 'employer' ? '#fff' : 'var(--ink-soft)',
            boxShadow: activeRole === 'employer' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          🏢 Gói Nhà Tuyển Dụng ({plans.filter((p) => p.targetRole === 'employer').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveRole('student')}
          className="btn btn-sm"
          style={{
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 800,
            fontSize: 13.5,
            border: 'none',
            background: activeRole === 'student' ? 'var(--primary, #6366f1)' : 'transparent',
            color: activeRole === 'student' ? '#fff' : 'var(--ink-soft)',
            boxShadow: activeRole === 'student' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          🎓 Gói Sinh Viên / Freelancer ({plans.filter((p) => p.targetRole === 'student').length})
        </button>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          Đang nạp cấu hình bảng giá...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="adm-empty" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Chưa có gói nào trong danh mục này.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: filteredPlans.length <= 4
              ? 'repeat(auto-fit, minmax(240px, 1fr))'
              : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 16,
                padding: '20px 18px',
                background: plan.isActive ? 'var(--surface)' : 'rgba(241, 245, 249, 0.5)',
                border: plan.isPopular
                  ? '2px solid #6366f1'
                  : '1.5px solid var(--border)',
                boxShadow: plan.isPopular
                  ? '0 10px 30px rgba(99, 102, 241, 0.15)'
                  : '0 4px 18px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Popular Ribbon */}
              {plan.isPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 18,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: 999,
                    letterSpacing: 0.5,
                    boxShadow: '0 3px 10px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  NỔI BẬT NHẤT
                </div>
              )}

              {/* Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {plan.code}
                  </div>
                  <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                    {plan.name}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {plan.tagline || 'Chưa có khẩu hiệu'}
                  </div>
                </div>

                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    background: plan.isActive ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: plan.isActive ? '#16a34a' : '#dc2626',
                    border: plan.isActive ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {plan.isActive ? '✓ ĐANG BẬT' : '✕ TẠM TẮT'}
                </span>
              </div>

              {/* Price & Commission highlight */}
              <div
                style={{
                  background: 'var(--surface-2, rgba(0, 0, 0, 0.03))',
                  border: '1px solid var(--border)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  margin: '8px 0 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: -0.5 }}>
                    {plan.price === 0 ? 'Miễn phí' : fmtVND(plan.price)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {plan.priceSub || 'Theo tháng'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                    Phí hoa hồng sàn
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
                    {(plan.commissionRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Quotas overview */}
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink)',
                  marginBottom: 14,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 10px',
                  background: 'rgba(99, 102, 241, 0.04)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(99, 102, 241, 0.1)',
                }}
              >
                {plan.targetRole === 'employer' ? (
                  <>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Tin đăng:</span> <strong>{plan.maxActiveJobs ? `${plan.maxActiveJobs} tin` : 'Vô hạn'}</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Sửa bài:</span> <strong>{plan.defaultRevisionLimit} lần</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Ghim Hot:</span> <strong>{plan.freeFeaturedPins} lượt</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Mời SV:</span> <strong>{plan.freeDirectInvites} lượt</strong></div>
                  </>
                ) : (
                  <>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Nộp đơn:</span> <strong>{plan.maxWeeklyApplications ? `${plan.maxWeeklyApplications} đơn/tuần` : 'Vô hạn'}</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Quản lý CV:</span> <strong>{plan.maxCvFiles} bản</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Cấp bậc:</span> <strong>Hạng {plan.tierRank}</strong></div>
                    <div><span style={{ color: 'var(--ink-soft)' }}>Ưu tiên Top:</span> <strong>{plan.tierRank >= 2 ? 'Có' : 'Không'}</strong></div>
                  </>
                )}
              </div>

              {/* Features bullets */}
              <div style={{ flex: 1, borderTop: '1px dashed var(--border)', paddingTop: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Quyền lợi hiển thị ({plan.features?.length || 0}):
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.6 }}>
                  {(plan.features || []).map((f, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{f}</li>
                  ))}
                </ul>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', borderRadius: 10, fontWeight: 700, fontSize: 12.5 }}
                  onClick={() => handleOpenEdit(plan)}
                >
                  <Icon name="edit" width="13" height="13" /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  title={plan.isActive ? 'Tạm ngưng gói này' : 'Kích hoạt lại gói này'}
                  onClick={() => handleToggleActive(plan)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: plan.isActive ? '#dc2626' : '#16a34a',
                    borderColor: plan.isActive ? 'rgba(220, 38, 38, 0.35)' : 'rgba(22, 163, 74, 0.35)',
                  }}
                >
                  {plan.isActive ? 'Tắt' : 'Bật'}
                </button>
                {plan.code !== 'FREE_STUDENT' && plan.code !== 'FREE_EMPLOYER' && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    title="Xóa vĩnh viễn gói này"
                    onClick={() => handleDeletePlan(plan)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="trash" width="14" height="14" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) handleCloseEdit();
          }}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-box"
            style={{
              width: '100%',
              maxWidth: 740,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              padding: '28px 28px',
            }}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              className="modal-close"
              onClick={handleCloseEdit}
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="x" width="16" height="16" />
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                Chỉnh Sửa Gói Dịch Vụ: {editingPlan.code}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                Thay đổi sẽ lập tức áp dụng cho người dùng ngoài frontend và nghiệp vụ backend.
              </p>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="field">
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Tên gói dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Nhãn huy hiệu (Badge Text)
                  </label>
                  <select
                    value={isCustomEditBadge ? '__CUSTOM__' : (form.badgeText || '')}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomEditBadge(true);
                      } else {
                        setIsCustomEditBadge(false);
                        setForm({ ...form, badgeText: e.target.value });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 600,
                    }}
                  >
                    <option value="">— Không gắn nhãn —</option>
                    {STANDARD_BADGES.map((b) => (
                      <option key={b} value={b}>
                        🏷️ {b}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✏️ Tùy chỉnh khác...</option>
                  </select>
                  {isCustomEditBadge && (
                    <input
                      type="text"
                      style={{ marginTop: 8 }}
                      value={form.badgeText}
                      onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                      placeholder="Nhập tên nhãn huy hiệu tùy chỉnh..."
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  Khẩu hiệu ngắn (Tagline)
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="VD: Lựa chọn bứt phá thu nhập..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="field">
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Giá bán (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Phụ đề giá
                  </label>
                  <input
                    type="text"
                    value={form.priceSub}
                    onChange={(e) => setForm({ ...form, priceSub: e.target.value })}
                    placeholder="VD: Chỉ 1.000đ / ngày..."
                  />
                </div>
                <div className="field">
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Phí hoa hồng sàn (%) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.commissionRatePercent}
                      onChange={(e) => setForm({ ...form, commissionRatePercent: e.target.value })}
                      required
                    />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Quotas Section */}
              <div
                style={{
                  background: 'var(--surface-2, rgba(0, 0, 0, 0.02))',
                  padding: 18,
                  borderRadius: 14,
                  marginBottom: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 14 }}>
                  Hạn Mức Nghiệp Vụ Của Gói (Quotas & Limits)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {editingPlan.targetRole === 'employer' ? (
                    <>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số tin đăng mở đồng thời (để trống = Vô hạn)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.maxActiveJobs}
                          onChange={(e) => setForm({ ...form, maxActiveJobs: e.target.value })}
                          placeholder="Vô hạn nếu để trống"
                        />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số lần yêu cầu chỉnh sửa mặc định
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.defaultRevisionLimit}
                          onChange={(e) => setForm({ ...form, defaultRevisionLimit: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số lượt Ghim tin nổi bật tặng kèm
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.freeFeaturedPins}
                          onChange={(e) => setForm({ ...form, freeFeaturedPins: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số lượt mời ứng viên trực tiếp
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.freeDirectInvites}
                          onChange={(e) => setForm({ ...form, freeDirectInvites: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số đơn nộp tối đa / tuần (để trống = Vô hạn)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.maxWeeklyApplications}
                          onChange={(e) => setForm({ ...form, maxWeeklyApplications: e.target.value })}
                          placeholder="Vô hạn nếu để trống"
                        />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Số lượng bản CV tối đa được tạo
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.maxCvFiles}
                          onChange={(e) => setForm({ ...form, maxCvFiles: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bullet Features Editor */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, marginBottom: 8, color: 'var(--ink)' }}>
                  Danh Sách Quyền Lợi Hiển Thị (Features List)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {form.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', width: 22, fontWeight: 700 }}>
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1.5px solid var(--border)',
                          fontSize: 13.5,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                        value={feat}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRemoveFeature(idx)}
                        style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)', padding: '6px 10px', borderRadius: 8 }}
                        title="Xóa quyền lợi này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                    placeholder="Nhập nội dung quyền lợi mới (VD: Rút tiền tức thì trong 15 phút)..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAddFeature}
                    style={{ borderRadius: 10, padding: '9px 16px', fontWeight: 700 }}
                  >
                    + Thêm dòng
                  </button>
                </div>
              </div>

              {/* Popular checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary, #6366f1)' }}
                  />
                  Gắn nhãn "Gói phổ biến nhất" (Viền màu tím nổi bật ngoài trang Pricing)
                </label>
              </div>

              {/* Submit Button */}
              <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseEdit}
                  disabled={submitting}
                  style={{ borderRadius: 10, padding: '10px 20px', fontWeight: 700 }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ borderRadius: 10, padding: '10px 24px', fontWeight: 800 }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create New Plan Modal */}
      {isCreateOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) handleCloseCreate();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--surface, #fff)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 720,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                  Thêm Gói Dịch Vụ Mới
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  Định nghĩa gói bán mới, cấu hình giá, tỷ lệ chiết khấu sàn và hạn mức nghiệp vụ.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCloseCreate}
                disabled={submitting}
                style={{ borderRadius: 8, padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSave} style={{ padding: 24 }}>
              {/* Role selection & Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Đối tượng áp dụng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                    }}
                    value={createForm.targetRole}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        targetRole: e.target.value,
                        code: e.target.value === 'student' ? 'STU_CUSTOM' : 'EMP_CUSTOM',
                      })
                    }
                  >
                    <option value="employer">🏢 Nhà Tuyển Dụng (Employer)</option>
                    <option value="student">🎓 Sinh Viên / Freelancer (Student)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Mã gói (Code duy nhất) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                    placeholder="VD: EMP_ENTERPRISE"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        code: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase(),
                      })
                    }
                  />
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Chỉ chữ hoa, số và gạch dưới (VD: EMP_VIP_PLUS)
                  </div>
                </div>
              </div>

              {/* Plan Name & Badge Text */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Tên hiển thị gói <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                    }}
                    placeholder="VD: Doanh Nghiệp Tăng Tốc"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Nhãn huy hiệu (Badge Text)
                  </label>
                  <select
                    value={isCustomCreateBadge ? '__CUSTOM__' : (createForm.badgeText || '')}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomCreateBadge(true);
                      } else {
                        setIsCustomCreateBadge(false);
                        setCreateForm({ ...createForm, badgeText: e.target.value });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 600,
                    }}
                  >
                    <option value="">— Không gắn nhãn —</option>
                    {STANDARD_BADGES.map((b) => (
                      <option key={b} value={b}>
                        🏷️ {b}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✏️ Tùy chỉnh khác...</option>
                  </select>
                  {isCustomCreateBadge && (
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1.5px solid var(--border)',
                        fontSize: 13.5,
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        marginTop: 8,
                      }}
                      value={createForm.badgeText}
                      onChange={(e) => setCreateForm({ ...createForm, badgeText: e.target.value })}
                      placeholder="Nhập tên nhãn huy hiệu tùy chỉnh..."
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Tagline */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Khẩu hiệu ngắn (Tagline)
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    fontSize: 13.5,
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                  placeholder="VD: Đột phá tuyển dụng chuyên nghiệp"
                  value={createForm.tagline}
                  onChange={(e) => setCreateForm({ ...createForm, tagline: e.target.value })}
                />
              </div>

              {/* Price, Price Sub & Commission & Tier Rank */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Giá bán (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 800,
                    }}
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: '#0ea5e9', marginTop: 3, fontWeight: 700 }}>
                    {fmtVND(createForm.price)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Chu kỳ thanh toán
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                    placeholder="tháng"
                    value={createForm.priceSub}
                    onChange={(e) => setCreateForm({ ...createForm, priceSub: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Phí sàn (%) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: '#10b981',
                      fontWeight: 800,
                    }}
                    value={createForm.commissionRatePercent}
                    onChange={(e) => setCreateForm({ ...createForm, commissionRatePercent: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Cấp bậc (Tier) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontWeight: 800,
                    }}
                    value={createForm.tierRank}
                    onChange={(e) => setCreateForm({ ...createForm, tierRank: e.target.value })}
                  />
                </div>
              </div>

              {/* Quotas & Limits */}
              <div
                style={{
                  background: 'var(--surface-2, rgba(0, 0, 0, 0.02))',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>
                  ⚙️ Cấu Hình Hạn Mức Nghiệp Vụ Tự Động:
                </div>

                {createForm.targetRole === 'employer' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Tin đăng mở cùng lúc
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Để trống = Vô hạn"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.maxActiveJobs}
                        onChange={(e) => setCreateForm({ ...createForm, maxActiveJobs: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Lần sửa sản phẩm
                      </label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.defaultRevisionLimit}
                        onChange={(e) => setCreateForm({ ...createForm, defaultRevisionLimit: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Lượt Ghim Tin Hot
                      </label>
                      <input
                        type="number"
                        min="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.freeFeaturedPins}
                        onChange={(e) => setCreateForm({ ...createForm, freeFeaturedPins: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Lượt Mời Ứng Viên
                      </label>
                      <input
                        type="number"
                        min="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.freeDirectInvites}
                        onChange={(e) => setCreateForm({ ...createForm, freeDirectInvites: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Số đơn ứng tuyển tối đa / tuần
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Để trống = Vô hạn"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.maxWeeklyApplications}
                        onChange={(e) => setCreateForm({ ...createForm, maxWeeklyApplications: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        Số bản CV được quản lý
                      </label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        value={createForm.maxCvFiles}
                        onChange={(e) => setCreateForm({ ...createForm, maxCvFiles: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Features Builder */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Nội dung quyền lợi hiển thị trên thẻ:
                </label>
                {createForm.features.map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                      value={feat}
                      onChange={(e) => handleCreateFeatureChange(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRemoveCreateFeature(idx)}
                      style={{ borderRadius: 8, color: '#ef4444' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1.5px solid var(--border)',
                      fontSize: 13,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                    placeholder="Thêm dòng quyền lợi (VD: Tặng 3 lượt Ghim tin hot)..."
                    value={newCreateFeatureText}
                    onChange={(e) => setNewCreateFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCreateFeature();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAddCreateFeature}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    + Thêm dòng
                  </button>
                </div>
              </div>

              {/* Popular Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={createForm.isPopular}
                    onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary, #6366f1)' }}
                  />
                  Đánh dấu là gói Phổ Biến / Nổi Bật (Có viền sáng & nhãn thu hút)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseCreate}
                  disabled={submitting}
                  style={{ borderRadius: 10, padding: '10px 20px', fontWeight: 700 }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ borderRadius: 10, padding: '10px 24px', fontWeight: 800 }}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Gói Mới Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
