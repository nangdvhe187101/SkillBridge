import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import {
  getAdminChatConversations,
  getAdminChatMessages,
  sendAdminChatMessage,
  markAdminChatAsRead
} from '../api/adminApi';

export default function AdminChat() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = useCallback(async (autoSelectFirst = false) => {
    try {
      const res = await getAdminChatConversations();
      const list = Array.isArray(res) ? res : (res?.items || []);
      setConversations(list);

      if (autoSelectFirst && list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách hội thoại:', err);
      showToast('Không thể tải danh sách tin nhắn: ' + (err.message || ''), 'warning');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeId, showToast]);

  const handleManualRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    loadConversations(false);
  };

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const res = await getAdminChatMessages(convId);
      const list = res?.items || (Array.isArray(res) ? res : []);
      setMessages(list);

      // Cập nhật lại unread count trên local state
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Lỗi khi tải tin nhắn:', err);
      showToast('Không thể tải nội dung tin nhắn: ' + (err.message || ''), 'warning');
    } finally {
      setLoadingMsgs(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadConversations(true);
    // Tự động kiểm tra tin nhắn mới mỗi 8 giây
    const timer = setInterval(() => {
      loadConversations(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeId || sending) return;

    const textToSend = inputText.trim();
    setSending(true);
    try {
      const newMsg = await sendAdminChatMessage(activeId, textToSend);
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');

      // Cập nhật lại conversation list
      loadConversations(false);

      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      showToast(err?.message || 'Không thể gửi tin nhắn.', 'error');
    } finally {
      setSending(false);
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeId);

  const filteredConversations = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    const role = (c.otherUserRole || '').toLowerCase();
    const isEmployer = role.includes('employer');

    if (roleFilter === 'unread' && !(c.unreadCount > 0)) return false;
    if (roleFilter === 'student' && isEmployer) return false;
    if (roleFilter === 'employer' && !isEmployer) return false;

    if (!q) return true;
    return (
      (c.otherUserName || '').toLowerCase().includes(q) ||
      (c.lastMessageText || '').toLowerCase().includes(q) ||
      role.includes(q)
    );
  });

  return (
    <section className="adm-section active" style={{ padding: 0 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '330px 1fr',
        gap: 0,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        height: 'calc(100vh - 140px)',
        minHeight: 520,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          height: '100%',
          minWidth: 0
        }}>
          {/* Header & Search */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>Hộp thư hỗ trợ</b>
                <span className="chip" style={{ fontSize: 10, padding: '1px 6px', background: '#eff6ff', color: '#2563eb', fontWeight: 700 }}>
                  {conversations.length}
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                title="Làm mới danh sách"
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                <Icon name="refresh" width="13" height="13" />
                <span style={{ marginLeft: 4 }}>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Tìm tên, tin nhắn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12.5, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>

            {/* Quick Filter Pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'unread', label: 'Chưa đọc' },
                { id: 'student', label: 'Sinh viên' },
                { id: 'employer', label: 'Doanh nghiệp' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRoleFilter(f.id)}
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: '1px solid',
                    borderColor: roleFilter === f.id ? '#2563eb' : 'var(--border)',
                    background: roleFilter === f.id ? '#2563eb' : 'transparent',
                    color: roleFilter === f.id ? '#fff' : 'var(--ink-soft)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>
                Đang tải tin nhắn...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>
                {search ? 'Không có cuộc hội thoại nào phù hợp.' : 'Chưa có tin nhắn nào từ người dùng.'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeId;
                const isEmployer = (c.otherUserRole || '').toLowerCase().includes('employer');
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.05))',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <b style={{ fontSize: 13.5, color: isActive ? 'var(--primary)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {c.otherUserName || 'Người dùng'}
                      </b>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: 10.5,
                          padding: '1px 6px',
                          background: isEmployer ? 'rgba(37, 99, 235, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                          color: isEmployer ? '#2563eb' : '#16a34a',
                          borderRadius: 4
                        }}
                      >
                        {isEmployer ? 'Nhà tuyển dụng' : 'Sinh viên'}
                      </span>
                      {c.otherUserSchool && (
                        <span style={{ fontSize: 11, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                          · {c.otherUserSchool}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 12,
                        color: c.unreadCount > 0 ? 'var(--ink)' : 'var(--ink-soft)',
                        fontWeight: c.unreadCount > 0 ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 220
                      }}>
                        {c.lastMessageText || 'Bắt đầu cuộc trò chuyện...'}
                      </span>
                      {c.unreadCount > 0 && (
                        <span style={{
                          background: '#dc2626',
                          color: '#fff',
                          borderRadius: '50%',
                          fontSize: 10.5,
                          fontWeight: 700,
                          minWidth: 18,
                          height: 18,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px'
                        }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG CHAT CHI TIẾT */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface-2, #fafafa)' }}>
          {activeConvo ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '14px 20px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 15, color: 'var(--ink)' }}>{activeConvo.otherUserName}</b>
                    <span
                      className="chip"
                      style={{
                        fontSize: 11,
                        background: (activeConvo.otherUserRole || '').toLowerCase().includes('employer') ? 'rgba(37, 99, 235, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                        color: (activeConvo.otherUserRole || '').toLowerCase().includes('employer') ? '#2563eb' : '#16a34a'
                      }}
                    >
                      {(activeConvo.otherUserRole || '').toLowerCase().includes('employer') ? 'Doanh nghiệp' : 'Sinh viên'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    ID: #{activeConvo.otherUserId} {activeConvo.otherUserSchool ? `· ${activeConvo.otherUserSchool}` : ''}
                  </div>
                </div>

                <div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => loadMessages(activeConvo.id)}
                    title="Tải lại tin nhắn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon name="refresh" width="13" height="13" /> Làm mới
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ink-soft)', fontSize: 13 }}>
                    Đang tải lịch sử tin nhắn...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ink-soft)', fontSize: 13 }}>
                    Chưa có tin nhắn nào trong cuộc trò chuyện này.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFromAdmin = m.isSender || m.senderId === activeConvo.userAId ? (activeConvo.userAId !== activeConvo.otherUserId) : true;
                    // Hoặc dựa vào m.isSender nếu API trả về theo ngữ cảnh user hiện tại
                    const isAdmin = m.isSender;

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          fontSize: 11,
                          color: 'var(--ink-soft)',
                          marginBottom: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <b>{isAdmin ? 'Quản trị viên (Bạn)' : activeConvo.otherUserName}</b>
                          <span>{new Date(m.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          background: isAdmin ? 'var(--primary, #6366f1)' : '#ffffff',
                          color: isAdmin ? '#ffffff' : 'var(--ink)',
                          border: isAdmin ? 'none' : '1px solid var(--border)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {m.text || m.messageText}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} style={{
                padding: '14px 20px',
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 10,
                alignItems: 'center'
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Trả lời ${activeConvo.otherUserName}... (Nhấn Enter để gửi)`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13.5
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !inputText.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}
                >
                  <Icon name="send" width="14" height="14" />
                  <span>{sending ? 'Đang gửi...' : 'Gửi'}</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--ink-soft)',
              padding: 40,
              textAlign: 'center'
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <Icon name="chat" width="30" height="30" />
              </div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--ink)' }}>Chọn một cuộc hội thoại</h4>
              <p style={{ margin: 0, fontSize: 13, maxWidth: 320 }}>
                Chọn một người dùng ở danh sách bên trái để xem lịch sử và trả lời tin nhắn trực tiếp.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
