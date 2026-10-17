import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getAdminSchoolsList, createAdminSchool, updateAdminSchool, deleteAdminSchool } from '../api/adminApi';
import Icon from './Icon';

const EMPTY_FORM = { code: '', name: '', shortName: '', domain: '', isActive: true };

export default function AdminSchools() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = đang thêm mới
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminSchoolsList();
      setSchools(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách trường.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (school) => {
    setEditingId(school.id);
    setForm({
      code: school.code || '',
      name: school.name || '',
      shortName: school.shortName || '',
      domain: school.domain || '',
      isActive: school.isActive,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên trường.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateAdminSchool(editingId, form);
        showToast(`Đã cập nhật trường "${form.name.trim()}" thành công!`, 'check');
      } else {
        await createAdminSchool(form);
        showToast(`Đã thêm trường "${form.name.trim()}" thành công!`, 'check');
      }
      setFormOpen(false);
      await fetchSchools();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi lưu thông tin trường.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (school) => {
    try {
      await updateAdminSchool(school.id, {
        code: school.code,
        name: school.name,
        shortName: school.shortName,
        domain: school.domain,
        isActive: !school.isActive,
      });
      showToast(school.isActive ? `Đã ẩn trường "${school.name}".` : `Đã mở lại trường "${school.name}".`, 'check');
      await fetchSchools();
    } catch (err) {
      showToast(err?.message || 'Lỗi cập nhật trạng thái trường.', 'warning');
    }
  };

  const handleDelete = async (school) => {
    const ok = await confirm(
      `Xóa trường "${school.name}" khỏi danh sách? Hành động này không thể hoàn tác. Nếu trường đang có sinh viên tham chiếu, hệ thống sẽ từ chối xóa.`,
      { confirmLabel: 'Xóa', danger: true }
    );
    if (!ok) return;
    try {
      await deleteAdminSchool(school.id);
      showToast(`Đã xóa trường "${school.name}" thành công.`, 'check');
      await fetchSchools();
    } catch (err) {
      showToast(err?.message || 'Không thể xóa trường này.', 'warning');
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý trường đại học/cao đẳng</h2>
        <p>Danh sách trường hiển thị cho sinh viên khi nộp yêu cầu xác minh thẻ sinh viên. Thêm trường mới tại đây mà không cần sửa code.</p>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="graduation" width="16" height="16" /> Danh sách trường ({schools.length})
            </h4>
            <span className="sub">Trường ở trạng thái "Ngừng hoạt động" sẽ không hiện trong form nộp hồ sơ của sinh viên</span>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={openCreateForm}>
            <Icon name="plus" width="14" height="14" /> Thêm trường mới
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} style={{ margin: '0 16px 16px', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên trường *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Đại học Bách khoa Hà Nội"
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên viết tắt</label>
                <input
                  type="text"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  placeholder="HUST"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mã trường</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="HUST"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Domain email trường</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="hust.edu.vn"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
                {editingId ? 'Lưu thay đổi' : 'Thêm trường'}
              </button>
              <button type="button" className="cf-btn-secondary" onClick={() => setFormOpen(false)} style={{ padding: '7px 14px', fontSize: 13 }}>
                Hủy
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Đang tải danh sách trường...
          </div>
        ) : schools.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Chưa có trường nào trong danh sách.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Tên trường</th>
                  <th>Viết tắt</th>
                  <th>Mã trường</th>
                  <th>Domain email</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 200 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.shortName || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{s.code || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{s.domain || '—'}</td>
                    <td>
                      <span className="chip" style={{ background: s.isActive ? '#dcfce7' : '#f3f4f6', color: s.isActive ? '#15803d' : '#6b7280', fontWeight: 600 }}>
                        {s.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="cf-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEditForm(s)}>
                          Sửa
                        </button>
                        <button type="button" className="cf-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleToggleActive(s)}>
                          {s.isActive ? 'Ẩn' : 'Mở lại'}
                        </button>
                        <button type="button" className="cf-btn-secondary" style={{ padding: '5px 10px', fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(s)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
