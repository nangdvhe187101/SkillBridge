import { useState, useMemo, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Pagination from '../Pagination';
import { rolesSeed } from '../../data/adminSeed';

const ROLE_NAME = {
  super: 'Super Admin',
  moderator: 'Content Moderator',
  dispute: 'Dispute Officer',
  finance: 'Finance Viewer'
};

const GROUPS = ['Tất cả', 'Việc làm', 'Tuyển dụng', 'Sinh viên', 'Tài chính', 'Giao tiếp', 'Doanh nghiệp', 'Hệ thống', 'Quản trị'];

export default function AdminRoles() {
  const {
    team, removeTeamMember, changeTeamRole, addTeamMember,
    features, toggleFeatureRole, addFeature, removeFeature
  } = useAdmin();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('rbac'); // 'rbac' | 'team'
  const [q, setQ] = useState('');
  const [groupF, setGroupF] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, groupF]);

  // Add Feature Modal
  const [newFeatModal, setNewFeatModal] = useState(false);
  const [featName, setFeatName] = useState('');
  const [featUrl, setFeatUrl] = useState('');
  const [featGroup, setFeatGroup] = useState('Tuyển dụng');
  const [featRoles, setFeatRoles] = useState(['employer', 'admin']);

  // Add Team Member Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (groupF !== 'Tất cả' && f.group !== groupF) return false;
      if (q) {
        const query = q.toLowerCase();
        return f.name.toLowerCase().includes(query) || f.url.toLowerCase().includes(query) || f.group.toLowerCase().includes(query);
      }
      return true;
    });
  }, [features, q, groupF]);

  const totalPages = Math.ceil(filteredFeatures.length / pageSize) || 1;
  const pagedFeatures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeatures.slice(start, start + pageSize);
  }, [filteredFeatures, currentPage, pageSize]);

  const handleRemoveTeam = async (m, i) => {
    if (await confirm(`Xoá thành viên ${m.name} khỏi đội ngũ quản trị?`, { danger: true, confirmLabel: 'Xoá thành viên' })) {
      removeTeamMember(i);
    }
  };

  const submitAddTeam = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    addTeamMember({ name: name.trim(), email: email.trim(), role });
    setName('');
    setEmail('');
  };

  const handleSaveNewFeature = (e) => {
    e.preventDefault();
    if (!featName.trim() || !featUrl.trim()) {
      showToast('Vui lòng nhập đầy đủ tên tính năng và URL route.', '⚠️');
      return;
    }
    addFeature({
      name: featName.trim(),
      url: featUrl.trim(),
      group: featGroup,
      roles: featRoles
    });
    setNewFeatModal(false);
    setFeatName('');
    setFeatUrl('');
  };

  const toggleModalRole = (r) => {
    setFeatRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const handleSaveMatrix = () => {
    showToast('Đã lưu cấu hình Ma trận Phân quyền URL & Tính năng thành công!', '💾');
  };

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Phân quyền Truy cập & Ma trận URL (RBAC)</h2>
          <p>Kiểm soát quyền truy cập từng URL route/tính năng cho các vai trò (Khách, Sinh viên, Doanh nghiệp, Admin) và quản lý đội ngũ.</p>
        </div>
        {activeSubTab === 'rbac' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setNewFeatModal(true)}>
              + Thêm URL / Tính năng mới
            </button>
            <button className="btn btn-lime btn-sm" onClick={handleSaveMatrix}>
              💾 Lưu ma trận phân quyền
            </button>
          </div>
        )}
      </div>

      <div className="adm-tabs-mini" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={activeSubTab === 'rbac' ? 'is-active' : ''} onClick={() => setActiveSubTab('rbac')}>
          🔑 Ma trận Phân quyền URL & Tính năng ({features.length})
        </button>
        <button className={activeSubTab === 'team' ? 'is-active' : ''} onClick={() => setActiveSubTab('team')}>
          👥 Đội ngũ Quản trị & Vai trò Nội bộ ({team.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MA TRẬN PHÂN QUYỀN URL & FEATURE THEO ROLE (DB FEATURE TABLE CONTROL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'rbac' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Bảng điều khiển phân quyền Tính năng / URL (Table: Feature)</h4>
            <span className="sub">Đang hiển thị {filteredFeatures.length} / {features.length} tính năng</span>
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

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 230 }}>Chức năng / Tính năng</th>
                  <th style={{ minWidth: 160 }}>URL Route</th>
                  <th style={{ minWidth: 100, textAlign: 'center' }}>🌐 Khách</th>
                  <th style={{ minWidth: 120, textAlign: 'center' }}>🎓 Sinh viên</th>
                  <th style={{ minWidth: 130, textAlign: 'center' }}>🏢 Doanh nghiệp</th>
                  <th style={{ minWidth: 90, textAlign: 'center' }}>⚡ Admin</th>
                  <th style={{ minWidth: 80, textAlign: 'center' }}>Xoá</th>
                </tr>
              </thead>
              <tbody>
                {pagedFeatures.map((f) => (
                  <tr key={f.id}>
                    {/* Feature Name & Group */}
                    <td>
                      <b>{f.name}</b>
                      <div style={{ marginTop: 2 }}>
                        <span className="chip" style={{ fontSize: 10.5, padding: '1px 6px', background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)' }}>
                          {f.group}
                        </span>
                      </div>
                    </td>

                    {/* URL Path */}
                    <td>
                      <code style={{ background: 'rgba(108, 76, 255, 0.08)', border: '1px solid rgba(108, 76, 255, 0.2)', padding: '3px 8px', borderRadius: 6, color: 'var(--primary)', fontWeight: 600, fontSize: 12.5 }}>
                        {f.url}
                      </code>
                    </td>

                    {/* Role 1: Guest */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={f.roles.includes('guest')}
                        onChange={() => toggleFeatureRole(f.id, 'guest')}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        title="Cho phép Khách truy cập"
                      />
                    </td>

                    {/* Role 2: Student */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={f.roles.includes('student')}
                        onChange={() => toggleFeatureRole(f.id, 'student')}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        title="Cho phép Sinh viên truy cập"
                      />
                    </td>

                    {/* Role 3: Employer */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={f.roles.includes('employer')}
                        onChange={() => toggleFeatureRole(f.id, 'employer')}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        title="Cho phép Nhà tuyển dụng truy cập"
                      />
                    </td>

                    {/* Role 4: Admin */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={f.roles.includes('admin')}
                        onChange={() => toggleFeatureRole(f.id, 'admin')}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        title="Cho phép Admin truy cập"
                      />
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => removeFeature(f.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)', fontSize: 14 }}
                        title="Xoá tính năng"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredFeatures.length === 0 && (
                  <tr>
                    <td colSpan={7} className="adm-empty" style={{ textAlign: 'center', padding: '24px 0' }}>
                      Không tìm thấy chức năng hoặc URL route nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
            {rolesSeed.map((r) => (
              <div className="adm-role-card" key={r.id}>
                <h4>{r.name}</h4>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '6px 0 10px' }}>{r.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {r.modules.map((m) => <span className="chip" key={m} style={{ fontSize: 11 }}>{m}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="adm-card-head"><h4>Thành viên đội ngũ quản trị</h4></div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Thành viên</th><th>Email</th><th>Vai trò nội bộ</th><th>Hành động</th></tr></thead>
                <tbody>
                  {team.map((m, i) => (
                    <tr key={i}>
                      <td><b>{m.name}</b></td>
                      <td>{m.email}</td>
                      <td>
                        <select value={m.role} onChange={(e) => changeTeamRole(i, e.target.value)}>
                          {Object.entries(ROLE_NAME).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleRemoveTeam(m, i)}>
                          Xoá khỏi đội ngũ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="adm-card-head"><h4>+ Thêm thành viên quản trị mới</h4></div>
            <form onSubmit={submitAddTeam} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'end' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Họ tên</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Email nội bộ</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@skillbridge.vn" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Vai trò đảm nhiệm</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {Object.entries(ROLE_NAME).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Thêm thành viên</button>
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
            <button className="modal-close" onClick={() => setNewFeatModal(false)}>✕</button>
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
                />
              </div>

              <div className="field">
                <label>Đường dẫn URL Route <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  type="text"
                  value={featUrl}
                  onChange={(e) => setFeatUrl(e.target.value)}
                  placeholder="Ví dụ: /wallet/statements hoặc /api/v1/jobs/export..."
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
                    🌐 Khách
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('student')} onChange={() => toggleModalRole('student')} />
                    🎓 Sinh viên
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('employer')} onChange={() => toggleModalRole('employer')} />
                    🏢 Doanh nghiệp
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={featRoles.includes('admin')} onChange={() => toggleModalRole('admin')} />
                    ⚡ Admin
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 18 }}>
                <button type="submit" className="btn btn-primary">
                  ✓ Thêm vào Ma trận
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setNewFeatModal(false)}>
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
