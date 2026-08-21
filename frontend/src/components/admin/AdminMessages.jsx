import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';

export default function AdminMessages() {
  const { adminChats, warnChatThread, lockChatThread, sendAdminBroadcast } = useAdmin();
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all'); // 'all' | 'warned' | 'active' | 'locked'
  const [selectedChat, setSelectedChat] = useState(null);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [bcTitle, setBcTitle] = useState('');
  const [bcContent, setBcContent] = useState('');
  const [bcRole, setBcRole] = useState('all');

  const filtered = adminChats.filter((c) => {
    if (statusF !== 'all' && c.status !== statusF) return false;
    if (q) {
      const query = q.toLowerCase();
      return (
        c.student.toLowerCase().includes(query) ||
        c.employer.toLowerCase().includes(query) ||
        c.jobTitle.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const warnedCount = adminChats.filter((c) => c.status === 'warned' || c.riskFlag).length;

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcContent.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.', '⚠️');
      return;
    }
    sendAdminBroadcast(bcTitle.trim(), bcContent.trim(), bcRole);
    setBroadcastModal(false);
    setBcTitle('');
    setBcContent('');
  };

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Quản lý Tin nhắn & Giám sát Giao tiếp</h2>
          <p>Giám sát hội thoại giữa Sinh viên & Doanh nghiệp, phát hiện từ khóa lừa đảo (Zalo/Telegram), can thiệp cảnh báo và phát thông báo hệ thống.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setBroadcastModal(true)}>
          📢 Phát thông báo toàn sàn
        </button>
      </div>

      {/* KPI Cards */}
      <div className="adm-kpis">
        <div className="adm-kpi">
          <div className="k-lbl">Tổng cuộc trò chuyện</div>
          <div className="k-val">{adminChats.length}</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Cảnh báo rủi ro / Nghi vấn</div>
          <div className="k-val" style={{ color: 'var(--coral)' }}>{warnedCount}</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Tỷ lệ an toàn Escrow</div>
          <div className="k-val" style={{ color: '#16a34a' }}>98.5%</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Trạng thái Bot quét từ khóa</div>
          <div className="k-val" style={{ fontSize: 13.5, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>🟢 Đang hoạt động 24/7</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Danh sách phòng chat trên hệ thống</h4>
          <span className="sub">Đang hiển thị {filtered.length} phòng chat</span>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Tìm theo tên SV, Doanh nghiệp, tên công việc..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 260 }}
          />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">🟢 Đang hoạt động</option>
            <option value="warned">⚠️ Có cảnh báo vi phạm</option>
            <option value="locked">🔒 Đã bị khoá chat</option>
          </select>
        </div>

        {/* Chat List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="adm-empty">Không tìm thấy cuộc hội thoại nào phù hợp.</div>
          ) : (
            filtered.map((chat) => (
              <div
                key={chat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: chat.status === 'warned' ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface)',
                  borderRadius: 10,
                  border: chat.status === 'warned' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 14 }}>{chat.jobTitle}</b>
                    {chat.status === 'warned' && (
                      <span className="chip" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', fontSize: 11 }}>
                        ⚠️ Nghi vấn gian lận
                      </span>
                    )}
                    {chat.status === 'locked' && (
                      <span className="chip" style={{ background: 'rgba(0, 0, 0, 0.2)', color: '#fff', fontSize: 11 }}>
                        🔒 Đã khoá chat
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                    🎓 SV: <b>{chat.student}</b> ({chat.studentEmail}) ⟷ 🏢 NTD: <b>{chat.employer}</b> ({chat.employerEmail})
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 6, fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: 6 }}>
                    💬 "{chat.lastMessage}" <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'normal', marginLeft: 6 }}>({chat.lastTime})</span>
                  </div>

                  {chat.riskFlag && (
                    <div style={{ fontSize: 12, color: 'var(--coral)', marginTop: 6, fontWeight: 600 }}>
                      {chat.riskFlag}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedChat(chat)}>
                    🔍 Xem lịch sử tin nhắn
                  </button>

                  {chat.status !== 'locked' && (
                    <>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => warnChatThread(chat.id)}>
                        ⚠️ Cảnh báo
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => lockChatThread(chat.id)}>
                        🔒 Khoá chat
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL XEM LỊCH SỬ CHAT ĐỐI SOÁT TOÀN BỘ (CHAT TRANSCRIPT INSPECTOR) */}
      {/* ========================================================================= */}
      {selectedChat && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setSelectedChat(null); }}>
          <div className="modal-box" style={{ maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setSelectedChat(null)}>✕</button>

            <div style={{ marginBottom: 10 }}>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>Nhật ký tin nhắn đối soát</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: 17 }}>{selectedChat.jobTitle}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
                🎓 <b>{selectedChat.student}</b> ({selectedChat.studentEmail}) ⟷ 🏢 <b>{selectedChat.employer}</b> ({selectedChat.employerEmail})
              </p>
            </div>

            {/* Chat Transcript Box */}
            <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0' }}>
              {selectedChat.messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.isSystem ? 'center' : (m.sender === selectedChat.student ? 'flex-end' : 'flex-start'),
                    maxWidth: m.isSystem ? '95%' : '80%',
                    background: m.isSystem
                      ? 'rgba(239, 68, 68, 0.1)'
                      : (m.isViolation ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-card, #252538)'),
                    border: m.isViolation ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, marginBottom: 2 }}>
                    <b style={{ color: m.isSystem ? '#dc2626' : (m.sender === selectedChat.student ? '#3b82f6' : '#a855f7') }}>
                      {m.sender}
                    </b>
                    <span style={{ color: 'var(--ink-soft)' }}>{m.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>{m.text}</p>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {selectedChat.status !== 'locked' && (
                <>
                  <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => warnChatThread(selectedChat.id)}>
                    ⚠️ Gửi cảnh báo gian lận
                  </button>
                  <button className="btn btn-outline" onClick={() => { lockChatThread(selectedChat.id); setSelectedChat(null); }}>
                    🔒 Khoá phòng chat
                  </button>
                </>
              )}
              <button className="btn btn-outline" onClick={() => setSelectedChat(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL PHÁT THÔNG BÁO TOÀN SÀN (SYSTEM BROADCAST MODAL) */}
      {/* ========================================================================= */}
      {broadcastModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setBroadcastModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <button className="modal-close" onClick={() => setBroadcastModal(false)}>✕</button>
            <h3>📢 Phát thông báo hệ thống</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Gửi thông báo broadcast tức thì tới toàn bộ người dùng hoặc theo nhóm vai trò cụ thể.
            </p>

            <form onSubmit={handleBroadcast}>
              <div className="field">
                <label>Nhóm đối tượng nhận tin</label>
                <select value={bcRole} onChange={(e) => setBcRole(e.target.value)}>
                  <option value="all">🌐 Tất cả người dùng (Sinh viên & Doanh nghiệp)</option>
                  <option value="student">🎓 Chỉ Sinh viên</option>
                  <option value="employer">🏢 Chỉ Nhà tuyển dụng</option>
                </select>
              </div>

              <div className="field">
                <label>Tiêu đề thông báo <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  type="text"
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value)}
                  placeholder="Ví dụ: Cảnh báo chiêu trò lừa đảo đặt cọc Telegram ngoài sàn..."
                />
              </div>

              <div className="field">
                <label>Nội dung chi tiết <span style={{ color: 'var(--coral)' }}>*</span></label>
                <textarea
                  value={bcContent}
                  onChange={(e) => setBcContent(e.target.value)}
                  placeholder="Nhập nội dung cảnh báo, hướng dẫn bảo mật hoặc thông báo bảo trì..."
                  rows={4}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">
                  📢 Phát thông báo ngay
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setBroadcastModal(false)}>
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
