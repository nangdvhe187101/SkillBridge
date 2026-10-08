import { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import Pagination from './Pagination';
import { rolesSeed } from '../data/adminSeed';
import {
  getAdminTeamMembers,
  addAdminTeamMember,
  updateAdminTeamMember,
  deleteAdminTeamMember,
  getAdminRolesList,
  getAdminPermissionMatrix,
  addAdminPermissionRoute,
  toggleAdminRolePermission,
  deleteAdminPermissionRoute
} from '../api/adminApi';

const ROLE_NAME = {
  super_admin: 'Super Admin',
  super: 'Super Admin',
  admin: 'Business Admin',
  business_admin: 'Business Admin',
  business: 'Business Admin',
  moderator: 'Content Moderator',
  content_moderator: 'Content Moderator',
  dispute: 'Dispute Officer',
  dispute_officer: 'Dispute Officer',
  finance: 'Finance Viewer',
  finance_viewer: 'Finance Viewer'
};

const GROUPS = ['Tất cả', 'Việc làm', 'Khám phá & Tài năng', 'Xác thực & Tài khoản', 'Sinh viên', 'Doanh nghiệp', 'Tài chính & Escrow', 'Giao tiếp & Đồng hành', 'Hệ thống'];

export default function AdminRoles() {
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('rbac'); // 'rbac' | 'team'
  const [q, setQ] = useState('');
  const [groupF, setGroupF] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // RBAC State từ Backend
  const [features, setFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  // Team State từ Backend
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [rolesList, setRolesList] = useState(rolesSeed);

  // Add Feature Modal
  const [newFeatModal, setNewFeatModal] = useState(false);
  const [featName, setFeatName] = useState('');
  const [featUrl, setFeatUrl] = useState('');
  const [featGroup, setFeatGroup] = useState('Việc làm');
  const [featRoles, setFeatRoles] = useState(['student', 'employer']);
  const [submittingFeat, setSubmittingFeat] = useState(false);

  // Add Team Member Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('business_admin');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Load RBAC Matrix từ Backend
  const loadMatrix = useCallback(async () => {
    setLoadingFeatures(true);
    try {
      const res = await getAdminPermissionMatrix();
      if (res && Array.isArray(res) && res.length > 0) {
        setFeatures(res);
      } else {
        setFeatures(featuresSeed);
      }
    } catch (err) {
      console.warn('Lỗi khi tải ma trận phân quyền RBAC:', err);
      setFeatures(featuresSeed);
    } finally {
      setLoadingFeatures(false);
    }
  }, []);

  // Load Team Members từ Backend
  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const res = await getAdminTeamMembers();
      if (res && Array.isArray(res)) {
        setTeam(res);
      }
      const rolesRes = await getAdminRolesList();
      if (rolesRes && Array.isArray(rolesRes) && rolesRes.length > 0) {
        setRolesList(rolesRes);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách đội ngũ quản trị:', err);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
    loadTeam();
  }, [loadMatrix, loadTeam]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, groupF]);

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (groupF !== 'Tất cả' && f.group !== groupF) return false;
      if (q) {
        const query = q.toLowerCase();
        return (
          (f.name && f.name.toLowerCase().includes(query)) ||
          (f.url && f.url.toLowerCase().includes(query)) ||
          (f.group && f.group.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [features, q, groupF]);

  const totalPages = Math.ceil(filteredFeatures.length / pageSize) || 1;
  const pagedFeatures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeatures.slice(start, start + pageSize);
  }, [filteredFeatures, currentPage, pageSize]);

  // Toggle Role Permission Checkbox
  const handleToggleFeatureRole = async (featureId, roleCode) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;
    const isCurrentlyGranted = (feat.roles || []).includes(roleCode);
    const newGranted = !isCurrentlyGranted;

    // Optimistic UI update
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        const currentRoles = f.roles || [];
        const nextRoles = newGranted
          ? [...currentRoles, roleCode]
          : currentRoles.filter((r) => r !== roleCode);
        return { ...f, roles: nextRoles };
      })
    );

    try {
      await toggleAdminRolePermission({
        permissionId: featureId,
        roleCode,
        isGranted: newGranted
      });
      showToast(`Đã ${newGranted ? 'cấp quyền' : 'thu hồi quyền'} [${roleCode}] cho '${feat.name}'.`, 'check');
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật quyền.', 'error');
      loadMatrix(); // Rollback
    }
  };

  // Remove Feature Route
  const handleRemoveFeature = async (featureId, featureName) => {
    if (await confirm(`Xóa tính năng '${featureName}' khỏi ma trận RBAC?`, { danger: true, confirmLabel: 'Xóa tính năng' })) {
      try {
        await deleteAdminPermissionRoute(featureId);
        showToast(`Đã xóa tính năng '${featureName}' thành công.`, 'check');
        setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      } catch (err) {
        showToast(err.message || 'Lỗi khi xóa tính năng.', 'error');
      }
    }
  };

  // Save New Feature
  const handleSaveNewFeature = async (e) => {
    e.preventDefault();
    if (!featName.trim() || !featUrl.trim()) {
      showToast('Vui lòng nhập đầy đủ tên tính năng và URL route.', 'error');
      return;
    }

    setSubmittingFeat(true);
    try {
      const created = await addAdminPermissionRoute({
        name: featName.trim(),
        url: featUrl.trim(),
        group: featGroup,
        roles: featRoles
      });
      showToast(`Đã thêm tính năng '${created.name}' vào ma trận RBAC!`, 'check');
      setFeatures((prev) => [created, ...prev]);
      setNewFeatModal(false);
      setFeatName('');
      setFeatUrl('');
    } catch (err) {
      showToast(err.message || 'Lỗi khi thêm tính năng mới.', 'error');
    } finally {
      setSubmittingFeat(false);
    }
  };

  const toggleModalRole = (r) => {
    setFeatRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  // Change Team Member Role
  const handleChangeTeamRole = async (memberId, newRoleCode) => {
    try {
      await updateAdminTeamMember(memberId, { roleCode: newRoleCode });
      showToast('Đã cập nhật vai trò quản trị viên thành công.', 'check');
      setTeam((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, roleCode: newRoleCode } : m))
      );
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật vai trò.', 'error');
      loadTeam();
    }
  };

  // Remove Team Member
  const handleRemoveTeam = async (m) => {
    if (await confirm(`Xóa thành viên ${m.name} khỏi đội ngũ quản trị?`, { danger: true, confirmLabel: 'Xóa thành viên' })) {
      try {
        await deleteAdminTeamMember(m.id);
        showToast(`Đã xóa thành viên ${m.name} khỏi đội ngũ.`, 'check');
        setTeam((prev) => prev.filter((t) => t.id !== m.id));
      } catch (err) {
        showToast(err.message || 'Lỗi khi xóa thành viên.', 'error');
      }
    }
  };

  // Reset Member Password
  const handleResetMemberPassword = async (m) => {
    const newPass = window.prompt(`Nhập mật khẩu mới cho quản trị viên ${m.name} (${m.email}):`);
    if (!newPass) return;
    if (newPass.trim().length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự.', 'warning');
      return;
    }
    try {
      await updateAdminTeamMember(m.id, { password: newPass.trim() });
      showToast(`Đã đổi mật khẩu cho ${m.name} thành công.`, 'check');
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật mật khẩu.', 'error');
    }
  };

  // Add Team Member
  const submitAddTeam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Vui lòng nhập họ tên và email thành viên.', 'warning');
      return;
    }
    if (!password || password.trim().length < 6) {
      showToast('Vui lòng nhập mật khẩu khởi tạo (tối thiểu 6 ký tự).', 'warning');
      return;
    }

    setSubmittingTeam(true);
    try {
      const newMember = await addAdminTeamMember({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        roleCode: role
      });
      showToast(`Đã bổ nhiệm ${newMember.name} vào đội ngũ quản trị thành công!`, 'check');
      setTeam((prev) => [...prev, newMember]);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      showToast(err.message || 'Lỗi khi thêm thành viên.', 'error');
    } finally {
      setSubmittingTeam(false);
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Phân quyền Truy cập & Ma trận URL (RBAC)</h2>
          <p>Kiểm soát quyền truy cập từng URL route/tính năng cho các vai trò (Khách, Sinh viên, Doanh nghiệp, Admin) và quản lý đội ngũ quản trị.</p>
        </div>
        {activeSubTab === 'rbac' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cf-btn-primary" onClick={() => setNewFeatModal(true)} style={{ padding: '6px 12px', fontSize: 13 }}>
              + Thêm URL / Tính năng mới
            </button>
          </div>
        )}
      </div>

      <div className="adm-tabs-mini" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={activeSubTab === 'rbac' ? 'is-active' : ''} onClick={() => setActiveSubTab('rbac')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="key" style={{ width: 14, height: 14 }} />
          <span>Ma trận Phân quyền URL & Tính năng ({features.length})</span>
        </button>
        <button className={activeSubTab === 'team' ? 'is-active' : ''} onClick={() => setActiveSubTab('team')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="users" style={{ width: 14, height: 14 }} />
          <span>Đội ngũ Quản trị & Vai trò Nội bộ ({team.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MA TRẬN PHÂN QUYỀN URL & FEATURE THEO ROLE (DB FEATURE TABLE CONTROL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'rbac' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Bảng điều khiển phân quyền Tính năng / URL (Table: permissions)</h4>
            <span className="sub">Đang hiển thị {filteredFeatures.length} / {features.length} tính năng</span>
          </div>

          <div style={{ background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 8, padding: '10px 14px', margin: '12px 0 14px', fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span>
              <b>Nguyên tắc RBAC:</b> Vai trò Quản trị viên (Super Admin) mặc định sở hữu toàn quyền quản trị và giám sát toàn hệ thống. Bảng ma trận dưới đây chuyên trách cấu hình quyền truy cập URL cho 3 nhóm người dùng nền tảng: <b>Khách (Guest)</b>, <b>Sinh viên (Student)</b> và <b>Doanh nghiệp (Employer)</b>.
            </span>
          </div>

          <div className="adm-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Tìm theo tên chức năng, đường dẫn URL (vd: /post-job, /wallet)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 260 }}
            />
            <select value={groupF} onChange={(e) => setGroupF(e.target.value)}>
              {GROUPS.map((g) => <option key={g} value={g}>{g === 'Tất cả' ? 'Tất cả phân nhóm' : g}</option>)}
            </select>
          </div>

          {loadingFeatures ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-soft)' }}>
              Đang tải ma trận phân quyền...
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 230 }}>Chức năng / Tính năng</th>
                    <th style={{ minWidth: 240 }}>API Endpoint & URL Màn hình</th>
                    <th style={{ minWidth: 100, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <Icon name="users" style={{ width: 13, height: 13 }} />
                        <span>Khách</span>
                      </span>
                    </th>
                    <th style={{ minWidth: 120, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <Icon name="graduation" style={{ width: 13, height: 13 }} />
                        <span>Sinh viên</span>
                      </span>
                    </th>
                    <th style={{ minWidth: 130, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <Icon name="building" style={{ width: 13, height: 13 }} />
                        <span>Doanh nghiệp</span>
                      </span>
                    </th>
                    <th style={{ minWidth: 80, textAlign: 'center' }}>Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFeatures.map((f) => (
                    <tr key={f.id}>
                      {/* Feature Name & Group */}
                      <td>
                        <b style={{ fontSize: 13, color: 'var(--ink)' }}>{f.name}</b>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                          Nhóm: <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{f.group}</span>
                        </div>
                      </td>

                      {/* URL Route & API Endpoint */}
                      <td>
                        {(() => {
                          const raw = f.url || '';
                          const routeMatch = raw.match(/\[Route:\s*([^\]]+)\]/i);
                          const apiPath = raw.replace(/\[Route:\s*[^\]]+\]/i, '').trim();
                          const webRoute = routeMatch ? routeMatch[1].trim() : null;
                          const method = (f.method || 'GET').toUpperCase();
                          const methodColor = 
                            method === 'POST' ? '#2563eb' :
                            method === 'PUT' ? '#d97706' :
                            method === 'DELETE' ? '#dc2626' :
                            method === 'PATCH' ? '#7c3aed' : '#059669';

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: `${methodColor}15`,
                                  color: methodColor,
                                  border: `1px solid ${methodColor}30`,
                                  fontFamily: 'monospace'
                                }}>
                                  {method}
                                </span>
                                <code style={{ fontSize: 11.5, background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink)', wordBreak: 'break-all' }}>
                                  {apiPath || raw}
                                </code>
                              </div>
                              {webRoute && (
                                <div style={{ fontSize: 11, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
                                  <span style={{ fontSize: 10 }}>🌐 Màn hình:</span>
                                  <b style={{ fontFamily: 'monospace' }}>{webRoute}</b>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Role 1: Guest */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={(f.roles || []).includes('guest')}
                          onChange={() => handleToggleFeatureRole(f.id, 'guest')}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          title="Cho phép Khách truy cập"
                        />
                      </td>

                      {/* Role 2: Student */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={(f.roles || []).includes('student')}
                          onChange={() => handleToggleFeatureRole(f.id, 'student')}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          title="Cho phép Sinh viên truy cập"
                        />
                      </td>

                      {/* Role 3: Employer */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={(f.roles || []).includes('employer')}
                          onChange={() => handleToggleFeatureRole(f.id, 'employer')}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          title="Cho phép Doanh nghiệp truy cập"
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoveFeature(f.id, f.name)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Xoá tính năng"
                        >
                          <Icon name="trash" style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFeatures.length === 0 && (
                    <tr>
                      <td colSpan={6} className="adm-empty" style={{ textAlign: 'center', padding: '24px 0' }}>
                        Không tìm thấy chức năng hoặc URL route nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredFeatures.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[8, 16, 24]}
            itemLabel="tính năng / URL"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUẢN LÝ ĐỘI NGŨ QUẢN TRỊ & VAI TRÒ NỘI BỘ */}
      {/* ========================================================================= */}
      {activeSubTab === 'team' && (
        <>
          <div className="adm-role-grid">
            {rolesList.map((r) => (
              <div className="adm-role-card" key={r.id}>
                <h4>{r.name}</h4>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '6px 0 10px' }}>{r.desc || r.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(r.modules || []).map((m) => <span className="chip" key={m} style={{ fontSize: 11 }}>{m}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* 1. KHỐI SUPER ADMIN DUY NHẤT CỦA HỆ THỐNG */}
          <div className="adm-card" style={{
            marginTop: 20,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(248,250,252,0.95) 100%)',
            border: '1px solid rgba(37,99,235,0.18)',
            borderLeft: '5px solid #2563eb',
            borderRadius: 10,
            padding: '16px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                }}>
                  👑
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 17, color: 'var(--ink)', fontWeight: 800 }}>Quản Trị Viên Hệ Thống</h3>
                    <span className="chip" style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                      Super Admin Duy Nhất
                    </span>
                    <span className="chip" style={{ background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 600 }}>
                      Chủ sở hữu hệ thống (Owner)
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>Email: <b style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: 13.5 }}>skillbridge.vn@gmail.com</b></span>
                    <span>•</span>
                    <span>Quyền hạn: <b style={{ color: '#059669' }}>Toàn quyền Quản trị & Điều hành tối cao</b></span>
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: 12,
                color: '#059669',
                background: 'rgba(5,150,105,0.08)',
                padding: '6px 14px',
                borderRadius: 20,
                fontWeight: 600,
                border: '1px solid rgba(5,150,105,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span>✓</span>
                <span>Tài khoản gốc bất biến (Không thể xóa / chuyển nhượng)</span>
              </div>
            </div>
          </div>

          {/* 2. BẢNG NHÂN SỰ CẤP DƯỚI ĐƯỢC PHÂN QUYỀN */}
          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>
                Thành viên nhân sự được phân quyền ({team.filter(m => (m.email || '').toLowerCase() !== 'skillbridge.vn@gmail.com').length})
              </h4>
              <span className="sub">Nhân sự nội bộ hỗ trợ vận hành do Super Admin bổ nhiệm</span>
            </div>
            {loadingTeam ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-soft)' }}>
                Đang tải danh sách nhân sự...
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Nhân sự</th><th>Email nội bộ</th><th>Vai trò đảm nhiệm</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {team
                      .filter(m => (m.email || '').toLowerCase() !== 'skillbridge.vn@gmail.com')
                      .map((m) => {
                        const rawCode = (m.roleCode || m.role || '').toLowerCase();
                        const selectVal =
                          (rawCode === 'content_moderator' || rawCode === 'moderator') ? 'moderator' :
                          (rawCode === 'dispute_officer' || rawCode === 'dispute') ? 'dispute' :
                          (rawCode === 'finance_viewer' || rawCode === 'finance') ? 'finance' :
                          'business_admin';

                        return (
                          <tr key={m.id}>
                            <td><b>{m.name}</b></td>
                            <td>{m.email}</td>
                            <td>
                              <select
                                value={selectVal}
                                onChange={(e) => handleChangeTeamRole(m.id, e.target.value)}
                              >
                                <option value="business_admin">Business Admin</option>
                                <option value="moderator">Content Moderator</option>
                                <option value="dispute">Dispute Officer</option>
                                <option value="finance">Finance Viewer</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: 12, padding: '3px 8px' }}
                                  onClick={() => handleResetMemberPassword(m)}
                                  title="Đặt lại mật khẩu đăng nhập cho nhân sự này"
                                >
                                  Đổi mật khẩu
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--coral)', borderColor: 'var(--coral)', fontSize: 12, padding: '3px 8px' }}
                                  onClick={() => handleRemoveTeam(m)}
                                >
                                  Xoá khỏi đội ngũ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {team.filter(m => (m.email || '').toLowerCase() !== 'skillbridge.vn@gmail.com').length === 0 && (
                      <tr>
                        <td colSpan={4} className="adm-empty" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                          <div style={{ fontSize: 26, marginBottom: 8 }}>👥</div>
                          <b style={{ fontSize: 14, color: 'var(--ink)' }}>Hiện tại chưa có nhân sự cấp dưới nào được bổ nhiệm</b>
                          <p style={{ fontSize: 12.5, margin: '6px 0 0', color: 'var(--ink-subtle)' }}>
                            Hệ thống hiện tại đang được quản trị độc lập và an toàn bởi duy nhất 01 Quản trị viên tối cao (<b>skillbridge.vn@gmail.com</b>).
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="adm-card-head">
              <h4 style={{ margin: 0 }}>+ Bổ nhiệm nhân sự quản trị mới</h4>
              <span className="sub">Cấp tài khoản & mật khẩu đăng nhập cho nhân viên phụ trách nội dung/kinh doanh, kiểm duyệt hoặc kế toán</span>
            </div>
            <form onSubmit={submitAddTeam} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, alignItems: 'end', marginTop: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Họ tên nhân sự</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Email nội bộ (Đăng nhập)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@skillbridge.vn"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Mật khẩu khởi tạo</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Vai trò đảm nhiệm</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="business_admin">Business Admin (Gói dịch vụ, Content & Đối tác)</option>
                  <option value="moderator">Content Moderator (Kiểm duyệt tin)</option>
                  <option value="dispute">Dispute Officer (Trọng tài tranh chấp)</option>
                  <option value="finance">Finance Viewer (Kế toán đối soát)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submittingTeam} style={{ height: 38 }}>
                {submittingTeam ? 'Đang tạo...' : 'Bổ nhiệm nhân sự'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM TÍNH NĂNG / URL ROUTE MỚI VÀO MA TRẬN */}
      {/* ========================================================================= */}
      {newFeatModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setNewFeatModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <button className="modal-close" onClick={() => setNewFeatModal(false)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" style={{ width: 16, height: 16 }} />
            </button>
            <h3>+ Thêm Tính năng / URL Route vào Ma trận RBAC</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Khai báo chức năng hoặc đường dẫn URL mới để phân quyền truy cập cho từng Role.
            </p>

            <form onSubmit={handleSaveNewFeature}>
              <div className="field">
                <label>Tên tính năng / Chức năng <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  type="text"
                  value={featName}
                  onChange={(e) => setFeatName(e.target.value)}
                  placeholder="Ví dụ: Báo cáo đối soát thu nhập Escrow..."
                  required
                />
              </div>

              <div className="field">
                <label>Đường dẫn URL Route <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  type="text"
                  value={featUrl}
                  onChange={(e) => setFeatUrl(e.target.value)}
                  placeholder="Ví dụ: /wallet/statements hoặc /api/v1/jobs/export..."
                  required
                />
              </div>

              <div className="field">
                <label>Phân nhóm chức năng</label>
                <select value={featGroup} onChange={(e) => setFeatGroup(e.target.value)}>
                  {GROUPS.filter((g) => g !== 'Tất cả').map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Các Role được phép truy cập mặc định</label>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('guest')} onChange={() => toggleModalRole('guest')} />
                    <Icon name="users" style={{ width: 13, height: 13 }} />
                    <span>Khách</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('student')} onChange={() => toggleModalRole('student')} />
                    <Icon name="graduation" style={{ width: 13, height: 13 }} />
                    <span>Sinh viên</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('employer')} onChange={() => toggleModalRole('employer')} />
                    <Icon name="building" style={{ width: 13, height: 13 }} />
                    <span>Doanh nghiệp</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 18 }}>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} disabled={submittingFeat}>
                  <Icon name="check" style={{ width: 13, height: 13 }} />
                  <span>{submittingFeat ? 'Đang thêm...' : 'Thêm vào Ma trận'}</span>
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setNewFeatModal(false)} disabled={submittingFeat}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
