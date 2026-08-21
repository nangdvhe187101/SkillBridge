import { createContext, useContext, useState } from 'react';
import * as seed from '../data/adminSeed';
import { useToast } from './ToastContext';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { showToast } = useToast();
  const [viewRole, setViewRole] = useState('super');
  const [users, setUsers] = useState(seed.usersSeed);
  const [blacklist, setBlacklist] = useState(seed.blacklistSeed);
  const [queue, setQueue] = useState(seed.moderationQueueSeed);
  const [categories, setCategories] = useState(seed.categoriesSeed);
  const [featured, setFeatured] = useState(seed.featuredRequestsSeed);
  const [disputes, setDisputes] = useState(seed.disputesSeed);
  const [subscriptions, setSubscriptions] = useState(seed.subscriptionsSeed);
  const [partners, setPartners] = useState(seed.partnersSeed);
  const [campaigns, setCampaigns] = useState(seed.campaignsSeed);
  const [adQueue, setAdQueue] = useState(seed.adContentQueueSeed);
  const [tickets, setTickets] = useState(seed.ticketsSeed);
  const [auditLog, setAuditLog] = useState(seed.auditLogSeed);
  const [team, setTeam] = useState(seed.teamSeed);
  const [config, setConfig] = useState({
    commission: 10, vipCommission: 5, featuredFee: 20000, revisionLimit: 2, reliabilityLockThreshold: 50,
  });

  const [features, setFeatures] = useState(seed.featuresSeed);
  const [adminChats, setAdminChats] = useState(seed.adminChatsSeed);

  const log = (action) => setAuditLog((l) => [{ time: new Date().toLocaleString('vi-VN'), actor: seed.rolesSeed.find((r) => r.id === viewRole)?.name || 'Admin', action }, ...l]);

  const actions = {
    setViewRole,
    verifyUser: (id) => { setUsers((u) => u.map((x) => (x.id === id ? { ...x, kyc: 'verified', status: 'active' } : x))); log('Xác thực eKYC người dùng ' + id); showToast('Đã xác thực người dùng.', '✓'); },
    lockUser: (id) => { setUsers((u) => u.map((x) => (x.id === id ? { ...x, status: x.status === 'locked' ? 'active' : 'locked' } : x))); log('Khoá/mở khoá tài khoản ' + id); showToast('Đã cập nhật trạng thái tài khoản.', '✓'); },
    adjustReliability: (id, value, note) => {
      const u = users.find((x) => x.id === id);
      const val = Math.max(0, Math.min(100, isNaN(value) ? u.reliability : value));
      setUsers((list) => list.map((x) => (x.id === id ? { ...x, reliability: val } : x)));
      log(`Đã điều chỉnh Reliability Score của ${u?.name} thành ${val}/100.${note ? ' Lý do: ' + note : ''}`);
      showToast('Đã cập nhật Reliability Score.', '✓');
    },
    blacklistUser: (id, reason) => {
      const u = users.find((x) => x.id === id);
      setUsers((list) => list.map((x) => (x.id === id ? { ...x, status: 'blacklisted' } : x)));
      setBlacklist((b) => [{ name: u?.name, reason, date: new Date().toLocaleDateString('vi-VN') }, ...b]);
      log(`Đã đưa ${u?.name} vào Blacklist. Lý do: ${reason}`);
      showToast('Đã thêm vào Blacklist Board.', '🚫');
    },
    removeFromBlacklist: (idx) => setBlacklist((b) => b.filter((_, i) => i !== idx)),

    approveJob: (id) => { setQueue((q) => q.filter((x) => x.id !== id)); log('Duyệt tin đăng ' + id); showToast('Đã duyệt tin đăng.', '✓'); },
    rejectJob: (id) => { setQueue((q) => q.filter((x) => x.id !== id)); log('Từ chối tin đăng ' + id); showToast('Đã từ chối tin đăng.', '🚫'); },
    warnPoster: (id) => {
      const m = queue.find((x) => x.id === id);
      log(`Đã gửi cảnh báo tới người đăng "${m?.emp}" về tin "${m?.title}".`);
      showToast('Đã gửi cảnh báo tới người đăng tin.', '⚠️');
    },
    addCategory: (name) => { if (!name.trim()) return; setCategories((c) => [...c, name.trim()]); log('Thêm danh mục: ' + name); showToast('Đã thêm danh mục mới.', '✓'); },
    removeCategory: (idx) => setCategories((c) => c.filter((_, i) => i !== idx)),
    approveFeatured: (id) => { setFeatured((f) => f.filter((x) => x.id !== id)); showToast('Đã gắn nhãn Featured Listing.', '⭐'); },

    resolveDispute: (id, decision, rate, note) => {
      const d = disputes.find((x) => x.id === id);
      if (!d) return;
      let payout = 0;
      if (decision === 'accept') {
        payout = Math.round((d.amount * rate) / 100 / 1000) * 1000;
      }
      setDisputes((list) => list.map((x) => (x.id === id ? { ...x, status: 'closed', decision, payout, resolvedNote: note } : x)));
      setUsers((list) => list.map((u) => {
        if (decision === 'accept') {
          if (u.name === d.student) return { ...u, reliability: Math.min(100, u.reliability + 2) };
          if (u.name === d.employer) return { ...u, reliability: Math.max(0, u.reliability - 15) };
        } else if (u.name === d.student) {
          return { ...u, reliability: Math.max(0, u.reliability - 5) };
        }
        return u;
      }));
      log(`Đã đóng case tranh chấp "${d.jobTitle}" — ${decision === 'accept' ? 'chấp nhận bồi thường ' + payout.toLocaleString('vi-VN') + 'đ' : 'từ chối bồi thường'}. Reliability Score của 2 bên đã được cập nhật. Ghi chú: ${note}`);
      showToast('Đã đóng case và cập nhật Reliability Score.', '✓');
    },

    approvePartner: (id) => { setPartners((p) => p.map((x) => (x.id === id ? { ...x, status: 'approved' } : x))); showToast('Đã duyệt đối tác.', '✓'); },
    toggleCampaign: (id) => setCampaigns((c) => c.map((x) => (x.id === id ? { ...x, status: x.status === 'active' ? 'paused' : 'active' } : x))),
    approveAdContent: (id) => { setAdQueue((a) => a.filter((x) => x.id !== id)); showToast('Đã duyệt nội dung quảng cáo.', '✓'); },

    resolveTicket: (id) => { setTickets((t) => t.map((x) => (x.id === id ? { ...x, status: 'closed' } : x))); showToast('Đã đóng ticket hỗ trợ.', '✓'); },
    saveConfig: (newConfig) => { setConfig(newConfig); log('Cập nhật cấu hình hệ thống'); showToast('Đã lưu cấu hình hệ thống.', '⚙️'); },
    removeTeamMember: (idx) => setTeam((t) => t.filter((_, i) => i !== idx)),
    addTeamMember: (member) => setTeam((t) => [...t, member]),
    changeTeamRole: (idx, role) => { setTeam((t) => t.map((m, i) => (i === idx ? { ...m, role } : m))); showToast('Đã đổi vai trò thành viên.', '✓'); },
    renewSubscription: (id) => {
      const s = subscriptions.find((x) => x.id === id);
      setSubscriptions((list) => list.map((x) => (x.id === id ? { ...x, status: 'active' } : x)));
      log(`Đã gia hạn gói ${s?.plan} cho ${s?.user}.`);
      showToast('Đã gia hạn gói.', '✓');
    },
    cancelSubscription: (id) => {
      const s = subscriptions.find((x) => x.id === id);
      setSubscriptions((list) => list.filter((x) => x.id !== id));
      log(`Đã huỷ gói ${s?.plan} của ${s?.user}.`);
      showToast('Đã huỷ gói.', '🚫');
    },

    // Feature RBAC Matrix
    toggleFeatureRole: (featureId, roleCode) => {
      setFeatures((list) => list.map((f) => {
        if (f.id !== featureId) return f;
        const exists = f.roles.includes(roleCode);
        const nextRoles = exists ? f.roles.filter((r) => r !== roleCode) : [...f.roles, roleCode];
        return { ...f, roles: nextRoles };
      }));
      showToast('Đã cập nhật quyền truy cập tính năng.', '🔑');
    },
    addFeature: (feat) => {
      setFeatures((list) => [...list, { ...feat, id: 'f_' + Date.now() }]);
      log(`Thêm tính năng URL mới: ${feat.name} (${feat.url})`);
      showToast('Đã thêm tính năng/URL vào ma trận phân quyền.', '✓');
    },
    removeFeature: (featureId) => {
      setFeatures((list) => list.filter((f) => f.id !== featureId));
      showToast('Đã xoá tính năng khỏi ma trận phân quyền.', '🗑️');
    },

    // Admin Chat & Communications Monitor
    warnChatThread: (chatId) => {
      setAdminChats((list) => list.map((c) => {
        if (c.id !== chatId) return c;
        const warningMsg = {
          id: 'w_' + Date.now(),
          sender: 'Hệ thống Quản trị SkillBridge',
          text: '⚠️ CẢNH BÁO: Cuộc hội thoại này có dấu hiệu vi phạm chính sách giao dịch ngoài sàn. Vui lòng giao dịch qua Escrow để được bảo vệ.',
          time: 'Vừa xong',
          isSystem: true
        };
        return { ...c, status: 'warned', messages: [...c.messages, warningMsg] };
      }));
      log(`Gửi cảnh báo gian lận phòng chat #${chatId}`);
      showToast('Đã gửi cảnh báo gian lận vào phòng chat.', '⚠️');
    },
    lockChatThread: (chatId) => {
      setAdminChats((list) => list.map((c) => (c.id === chatId ? { ...c, status: 'locked' } : c)));
      log(`Khoá phòng chat #${chatId}`);
      showToast('Đã khoá phòng chat vi phạm.', '🔒');
    },
    sendAdminBroadcast: (title, message, targetRole = 'all') => {
      log(`Phát thông báo hệ thống "${title}" tới ${targetRole}`);
      showToast(`Đã phát thông báo toàn sàn tới nhóm: ${targetRole === 'all' ? 'Tất cả người dùng' : targetRole}.`, '📢');
    },
  };

  const value = {
    viewRole, users, blacklist, queue, categories, featured, disputes, subscriptions,
    partners, campaigns, adQueue, tickets, auditLog, team, config, features, adminChats, ...actions,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
