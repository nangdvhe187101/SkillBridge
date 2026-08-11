import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useConfirm } from '../../context/ConfirmContext';
import { rolesSeed } from '../../data/adminSeed';

const ROLE_NAME = { super: 'Super Admin', moderator: 'Content Moderator', dispute: 'Dispute Officer', finance: 'Finance Viewer' };

export default function AdminRoles() {
  const { team, removeTeamMember, changeTeamRole, addTeamMember } = useAdmin();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');

  const handleRemove = async (m, i) => {
    if (await confirm(`Xoá thành viên ${m.name} khỏi đội ngũ quản trị?`, { danger: true, confirmLabel: 'Xoá thành viên' })) removeTeamMember(i);
  };

  const submitAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    addTeamMember({ name: name.trim(), email: email.trim(), role });
    setName(''); setEmail('');
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Phân quyền quản trị</h2>
        <p>Quản lý các vai trò trong đội ngũ CS/Admin — mỗi vai trò chỉ thấy các module tương ứng.</p>
      </div>
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
        <div className="adm-card-head"><h4>Thành viên đội ngũ</h4></div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Thành viên</th><th>Email</th><th>Vai trò</th><th>Hành động</th></tr></thead>
            <tbody>
              {team.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td><td>{m.email}</td>
                  <td>
                    <select value={m.role} onChange={(e) => changeTeamRole(i, e.target.value)}>
                      {Object.entries(ROLE_NAME).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleRemove(m, i)}>Xoá khỏi đội ngũ</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>+ Thêm thành viên mới</h4></div>
        <form onSubmit={submitAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Họ tên</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@skillbridge.vn" /></div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Vai trò</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.entries(ROLE_NAME).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Thêm thành viên</button>
        </form>
      </div>
    </section>
  );
}
