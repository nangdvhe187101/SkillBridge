import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import {
  getAdminConversations,
  getAdminConversationDetail,
  warnAdminConversation,
  lockAdminConversation,
  sendAdminBroadcast
} from '../api/adminApi';

export default function AdminMessages() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all'); // 'all' | 'warned' | 'active' | 'locked'

  // Modal xem chi tiết tin nhắn
  const [selectedChat, setSelectedChat] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal phát thông báo
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [bcTitle, setBcTitle] = useState('');
  const [bcContent, setBcContent] = useState('');
  const [bcRole, setBcRole] = useState('all');
  const [sendingBc, setSendingBc] = useState(false);

  // Fetch danh sách hội thoại từ backend
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminConversations({
        searchTerm: q.trim(),
        status: statusF,
        page,
        pageSize
      });
      if (res && res.items) {
        setConversations(res.items);
        setTotalCount(res.totalCount || res.items.length);
      } else if (Array.isArray(res)) {
        setConversations(res);
        setTotalCount(res.length);
      } else {
        setConversations([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách cuộc trò chuyện:', err);
      showToast('Không thể tải dữ liệu hội thoại từ máy chủ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [q, statusF, page, pageSize, showToast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const warnedCount = conversations.filter((c) => c.status === 'warned' || c.riskFlag).length;

  // Xem chi tiết hội thoại và kích hoạt AuditLog đối soát (Q-015)
  const handleOpenDetail = async (chat) => {
    setSelectedChat(chat);
    setLoadingDetail(true);
    try {
      const detail = await getAdminConversationDetail(chat.id);
      if (detail) {
        setSelectedChat(detail);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết chat:', err);
      showToast('Không thể tải chi tiết cuộc trò chuyện: ' + err.message, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Cảnh báo gian lận
  const handleWarnChat = async (chatId) => {
    const reason = window.prompt('Nhập lý do gửi cảnh báo vi phạm tới phòng chat này:', 'Phát hiện trao đổi thông tin liên lạc ngoài sàn SkillBridge.');
    if (!reason) return;

    try {
      await warnAdminConversation(chatId, reason);
      showToast('Đã gửi thông điệp cảnh báo vi phạm vào phòng chat thành công.', 'warning');
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, status: 'warned', riskFlag: reason } : c))
      );
      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat((prev) => ({
          ...prev,
          status: 'warned',
          riskFlag: reason,
          messages: [
            ...(prev.messages || []),
            {
              sender: 'Hệ thống SkillBridge (Cảnh báo)',
              text: `[CẢNH BÁO VI PHẠM]: ${reason}`,
              time: 'Vừa xong',
              isSystem: true,
              isViolation: true
            }
          ]
        }));
      }
    } catch (err) {
      showToast('Lỗi khi gửi cảnh báo: ' + err.message, 'error');
    }
  };

  // Khóa phòng chat
  const handleLockChat = async (chatId) => {
    const reason = window.prompt('Nhập lý do khóa phòng chat vĩnh viễn:', 'Hành vi cố ý vi phạm quy chế giao dịch ngoài sàn SkillBridge.');
    if (!reason) return;

    try {
      await lockAdminConversation(chatId, reason);
      showToast('Đã khóa phòng chat thành công. Hai bên không thể tiếp tục nhắn tin.', 'info');
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, status: 'locked' } : c))
      );
      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat((prev) => ({
          ...prev,
          status: 'locked',
          messages: [
            ...(prev.messages || []),
            {
              sender: 'Hệ thống SkillBridge (Thông báo)',
              text: `[PHÒNG CHAT ĐÃ BỊ KHÓA]: ${reason}`,
              time: 'Vừa xong',
              isSystem: true,
              isViolation: true
            }
          ]
        }));
      }
    } catch (err) {
      showToast('Lỗi khi khóa phòng chat: ' + err.message, 'error');
    }
  };

  // Phát thông báo toàn sàn
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcContent.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.', 'warning');
      return;
    }
    setSendingBc(true);
    try {
      const res = await sendAdminBroadcast(bcTitle.trim(), bcContent.trim(), bcRole);
      showToast(res.message || 'Đã phát thông báo hệ thống toàn sàn thành công!', 'success');
      setBroadcastModal(false);
      setBcTitle('');
      setBcContent('');
      setBcRole('all');
    } catch (err) {
      showToast('Lỗi khi phát thông báo: ' + err.message, 'error');
    } finally {
      setSendingBc(false);
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Quản lý Tin nhắn & Giám sát Giao tiếp</h2>
          <p>Giám sát hội thoại giữa Sinh viên & Doanh nghiệp, phát hiện từ khóa lừa đảo (Zalo/Telegram/CK ngoài), can thiệp cảnh báo và phát thông báo hệ thống.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setBroadcastModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="bell" width="15" height="15" /> Phát thông báo toàn sàn
        </button>
      </div>

      {/* KPI Cards */}
      <div className="adm-kpis">
        <div className="adm-kpi">
          <div className="k-lbl">Tổng cuộc trò chuyện</div>
          <div className="k-val">{totalCount}</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Cảnh báo rủi ro / Nghi vấn</div>
          <div className="k-val" style={{ color: 'var(--coral)' }}>{warnedCount}</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Tỷ lệ an toàn Escrow</div>
          <div className="k-val" style={{ color: '#16a34a' }}>99.2%</div>
        </div>
        <div className="adm-kpi">
          <div className="k-lbl">Trạng thái Bot quét từ khóa</div>
          <div className="k-val" style={{ fontSize: 13.5, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>Đang quét tự động (Q-020)</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Danh sách phòng chat trên hệ thống</h4>
          <span className="sub">Đang hiển thị {conversations.length} / {totalCount} phòng chat</span>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Tìm theo tên SV, Doanh nghiệp, tên công việc..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            style={{ flex: 1, minWidth: 260 }}
          />
          <select
            value={statusF}
            onChange={(e) => {
              setStatusF(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="warned">Có cảnh báo vi phạm</option>
            <option value="locked">Đã bị khoá chat</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={loadConversations} title="Tải lại danh sách">
            <Icon name="refresh" width="14" height="14" />
          </button>
        </div>

        {/* Chat List */}
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Đang tải danh sách cuộc trò chuyện...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conversations.length === 0 ? (
              <div className="adm-empty">Không tìm thấy cuộc hội thoại nào phù hợp.</div>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#ffffff',
                    borderRadius: 8,
                    border: chat.status === 'warned' ? '1px solid #fecaca' : '1px solid #e5e7eb',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14, color: '#111827' }}>{chat.jobTitle || 'Trao đổi công việc'}</b>
                      {chat.status === 'warned' && (
                        <span className="cf-status-pill" style={{ color: '#b91c1c' }}>
                          <span className="cf-status-dot" style={{ background: '#dc2626' }} />
                          Nghi vấn gian lận
                        </span>
                      )}
                      {chat.status === 'locked' && (
                        <span className="cf-status-pill" style={{ color: '#4b5563' }}>
                          <span className="cf-status-dot" style={{ background: '#6b7280' }} />
                          Đã khoá chat
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>
                      SV: <b>{chat.student}</b> ({chat.studentEmail}) ⟷ NTD: <b>{chat.employer}</b> ({chat.employerEmail})
                    </div>

                    <div style={{ fontSize: 13, color: '#374151', marginTop: 6, fontStyle: 'italic', background: '#f9fafb', padding: '6px 10px', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                      "{chat.lastMessage || 'Chưa có tin nhắn'}" <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'normal', marginLeft: 6 }}>({chat.lastTime || 'N/A'})</span>
                    </div>

                    {chat.riskFlag && (
                      <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 6, fontWeight: 500 }}>
                        ⚠️ {chat.riskFlag}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="cf-btn-secondary" style={{ padding: '5px 11px', fontSize: 12.5 }} onClick={() => handleOpenDetail(chat)}>
                      Lịch sử chat
                    </button>

                    {chat.status !== 'locked' && (
                      <div className="cf-btn-group">
                        <button
                          style={{ color: '#b91c1c' }}
                          onClick={() => handleWarnChat(chat.id)}
                        >
                          Cảnh báo
                        </button>
                        <button
                          onClick={() => handleLockChat(chat.id)}
                        >
                          Khoá chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL XEM LỊCH SỬ CHAT ĐỐI SOÁT TOÀN BỘ (CHAT TRANSCRIPT INSPECTOR) */}
      {/* ========================================================================= */}
      {selectedChat && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setSelectedChat(null); }}>
          <div className="modal-box" style={{ maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setSelectedChat(null)} aria-label="Đóng"><Icon name="x" width="18" height="18" /></button>

            <div style={{ marginBottom: 10 }}>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>Nhật ký tin nhắn đối soát (Q-015 Audit Log)</span>
              <h3 style={{ margin: '6px 0 2px', fontSize: 17 }}>{selectedChat.jobTitle || 'Phòng trò chuyện'}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
                <b>{selectedChat.student}</b> ({selectedChat.studentEmail}) ⟷ <b>{selectedChat.employer}</b> ({selectedChat.employerEmail})
              </p>
            </div>

            {/* Chat Transcript Box */}
            <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', background: 'var(--surface)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-soft)' }}>
                  Đang truy xuất lịch sử đối soát từ cơ sở dữ liệu...
                </div>
              ) : !selectedChat.messages || selectedChat.messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-soft)' }}>
                  Không có tin nhắn nào trong cuộc hội thoại này.
                </div>
              ) : (
                selectedChat.messages.map((m, idx) => (
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
                ))
              )}
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {selectedChat.status !== 'locked' && (
                <>
                  <button className="btn btn-outline" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }} onClick={() => handleWarnChat(selectedChat.id)}>
                    Gửi cảnh báo gian lận
                  </button>
                  <button className="btn btn-outline" onClick={() => handleLockChat(selectedChat.id)}>
                    Khoá phòng chat
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
            <button className="modal-close" onClick={() => setBroadcastModal(false)} aria-label="Đóng"><Icon name="x" width="18" height="18" /></button>
            <h3>Phát thông báo hệ thống</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Gửi thông báo broadcast tức thì tới toàn bộ người dùng hoặc theo nhóm vai trò cụ thể.
            </p>

            <form onSubmit={handleBroadcast}>
              <div className="field">
                <label>Nhóm đối tượng nhận tin</label>
                <select value={bcRole} onChange={(e) => setBcRole(e.target.value)}>
                  <option value="all">Tất cả người dùng (Sinh viên & Doanh nghiệp)</option>
                  <option value="student">Chỉ Sinh viên</option>
                  <option value="employer">Chỉ Nhà tuyển dụng</option>
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
                <button type="submit" className="btn btn-primary" disabled={sendingBc}>
                  {sendingBc ? 'Đang phát...' : 'Phát thông báo ngay'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setBroadcastModal(false)} disabled={sendingBc}>
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
