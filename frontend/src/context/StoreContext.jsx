import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { jobsSeed } from '../data/jobs';
import { myJobsSeed } from '../data/myJobs';
import { conversationsSeed, AUTO_REPLIES } from '../data/conversations';
import { useToast } from './ToastContext';

import { login as loginApi, register as registerApi, logout as logoutApi } from '../api/authApi';

const StoreContext = createContext(null);

export function commissionRate(state) {
  return state.vipBusiness ? 0.05 : 0.1;
}

const TX_ICON = {
  topup: '💰', withdraw: '🏦', subscription: '⭐', escrow_hold: '🔒',
  escrow_refund: '↩️', escrow_release: '✅', commission: '🏷️', insurance_payout: '🛡️',
};
export { TX_ICON };

function fmtNow() {
  return new Date().toLocaleString('vi-VN');
}
function fmtTimeNow() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const initialState = {
  balance: 350000,
  transactions: [],
  receipts: [],
  insuranceFund: 8200000,
  claims: [],
  subscriptionPro: false,
  vipBusiness: false,
  myReliability: 96,
  myApplications: [],
  notifications: [
    { id: 1, icon: '👋', text: 'Chào mừng bạn đến với SkillBridge!', read: false, time: 'Vừa xong', link: '/' },
    { id: 2, icon: '✓', text: 'Hồ sơ của bạn đã được xác thực qua email trường.', read: false, time: '1 giờ trước', link: '/profile' },
  ],
  reviews: [],
  employerReviews: [],
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
  role: 'student',
  cvFile: null,
  employerDocs: [],
  portfolioUploads: [],
  jobs: jobsSeed,
  myJobs: myJobsSeed,
  appliedJobIds: [],
  nextJobId: 200,
  editingJobId: null,
  triZeroUsed: 2,
  conversations: conversationsSeed,
  openChatIds: [],
  messengerPanelOpen: false,
};

function addNotifTo(list, icon, text, link = null) {
  return [{ id: Date.now() + Math.random(), icon, text, read: false, time: 'Vừa xong', link }, ...list];
}
function addTxTo(list, type, label, amount, sign) {
  return [{ id: Date.now() + Math.random(), type, label, amount, sign, date: fmtNow() }, ...list];
}

function reducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOGIN_SUCCESS': {
      const { token, refreshToken, userId, fullName, email, roleCode } = action.payload;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      const currentUser = { userId, fullName, email, roleCode };
      localStorage.setItem('user', JSON.stringify(currentUser));
      return { ...state, token, refreshToken, currentUser, role: roleCode };
    }

    case 'AUTH_LOGOUT': {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return { ...state, token: null, refreshToken: null, currentUser: null, role: 'student' };
    }

    case 'UPDATE_PROFILE': {
      if (!state.currentUser) return state;
      const currentUser = { ...state.currentUser, ...action.patch };
      localStorage.setItem('user', JSON.stringify(currentUser));
      return { ...state, currentUser };
    }

    case 'SUBMIT_JOB_FORM': {
      const { title, cat, budget, desc, urgent, editingId } = action.payload;
      if (editingId) {
        const myJobs = state.myJobs.map((j) => (j.id === editingId ? { ...j, title, cat, budget, desc, urgent } : j));
        const jobs = state.jobs.map((j) => (j.dashJobId === editingId ? { ...j, title, cat, budget, desc, urgent } : j));
        return { ...state, myJobs, jobs, editingJobId: null };
      }
      const newId = state.nextJobId;
      const newDashJob = { id: newId, title, cat, budget, desc, urgent, status: 'open', posted: 'Vừa đăng', applicants: [] };
      const newPublicJob = {
        id: 1000 + newId, title, emp: 'Bạn (Nhà tuyển dụng)', loc: 'TP.HCM', cat, budget, urgent, time: 'Vừa đăng',
        desc, req: ['Hoàn thành đúng deadline', 'Giao sản phẩm qua hệ thống SkillBridge'],
        status: 'open', dashJobId: newId,
      };
      return {
        ...state,
        myJobs: [newDashJob, ...state.myJobs],
        jobs: [newPublicJob, ...state.jobs],
        nextJobId: state.nextJobId + 1,
        editingJobId: null,
      };
    }

    case 'START_EDIT_JOB':
      return { ...state, editingJobId: action.id };
    case 'CLEAR_EDIT_JOB':
      return { ...state, editingJobId: null };

    case 'DELETE_JOB':
      return { ...state, myJobs: state.myJobs.filter((j) => j.id !== action.id) };

    case 'CANCEL_JOB': {
      const job = state.myJobs.find((j) => j.id === action.id);
      if (!job) return state;
      const wasEscrowed = ['in_progress', 'submitted', 'revision_requested'].includes(job.status);
      let { balance, transactions, myReliability, myApplications, notifications } = state;
      if (wasEscrowed) {
        const refund = job.escrowAmount || job.budget;
        balance += refund;
        transactions = addTxTo(transactions, 'escrow_refund', 'Hoàn tiền ký quỹ do hủy việc · ' + job.title, refund, 1);
        if (job.hiredApplicantIsMe) {
          myReliability = Math.max(0, myReliability - 8);
          myApplications = myApplications.map((a) => (a.dashJobId === job.id ? { ...a, status: 'cancelled' } : a));
          notifications = addNotifTo(notifications, '⚠️', `Công việc "${job.title}" đã bị nhà tuyển dụng hủy giữa chừng.`, '/mywork');
        }
        notifications = addNotifTo(notifications, '🚫', `Bạn đã hủy công việc "${job.title}". ${refund.toLocaleString('vi-VN')}đ đã hoàn lại vào ví.`, '/dashboard');
      } else {
        notifications = addNotifTo(notifications, '🚫', `Bạn đã hủy tin tuyển dụng "${job.title}".`, '/dashboard');
      }
      const myJobs = state.myJobs.map((j) => (j.id === action.id ? { ...j, status: 'cancelled' } : j));
      const jobs = state.jobs.map((j) => (j.dashJobId === action.id ? { ...j, status: 'cancelled' } : j));
      return { ...state, balance, transactions, myReliability, myApplications, notifications, myJobs, jobs };
    }

    case 'STUDENT_ABANDON_JOB': {
      const job = state.myJobs.find((j) => j.id === action.id);
      if (!job) return state;
      const refund = job.escrowAmount || job.budget;
      const balance = state.balance + refund;
      const transactions = addTxTo(state.transactions, 'escrow_refund', 'Hoàn tiền ký quỹ (sinh viên bỏ ngang) · ' + job.title, refund, 1);
      const myReliability = Math.max(0, state.myReliability - 15);
      const myJobs = state.myJobs.map((j) => (j.id === action.id ? { ...j, status: 'cancelled' } : j));
      const jobs = state.jobs.map((j) => (j.dashJobId === action.id ? { ...j, status: 'cancelled' } : j));
      const myApplications = state.myApplications.map((a) => (a.dashJobId === action.id ? { ...a, status: 'cancelled' } : a));
      const notifications = addNotifTo(state.notifications, '🚫', `Bạn đã bỏ ngang công việc "${job.title}". Điểm uy tín hiện tại: ${myReliability}/100.`, '/mywork');
      return { ...state, balance, transactions, myReliability, myJobs, jobs, myApplications, notifications };
    }

    case 'APPLY_JOB': {
      const j = state.jobs.find((x) => x.id === action.id);
      if (!j) return state;
      if (state.appliedJobIds.includes(action.id)) return state;
      const myApp = {
        id: 'ap' + Date.now(), jobId: j.id, dashJobId: j.dashJobId || null,
        title: j.title, emp: j.emp, budget: j.budget, status: 'pending', appliedAt: 'Vừa xong',
      };
      const notifications = addNotifTo(state.notifications, '📨', `Bạn đã ứng tuyển "${j.title}". Nhà tuyển dụng sẽ phản hồi sớm.`, '/mywork');
      return {
        ...state,
        appliedJobIds: [...state.appliedJobIds, action.id],
        myApplications: [myApp, ...state.myApplications],
        notifications,
      };
    }

    case 'HIRE': {
      const { jobId, applicantIdx, days, method } = action.payload;
      const job = state.myJobs.find((j) => j.id === jobId);
      if (!job) return state;
      const a = job.applicants[applicantIdx];
      if (!a) return state;
      const rate = commissionRate(state);
      const commission = Math.round(job.budget * rate);
      const hireAmount = job.budget + commission;
      if (method === 'wallet' && state.balance < hireAmount) return state;

      const updatedApplicants = job.applicants.map((app, idx) =>
        idx === applicantIdx ? app : { ...app, rejected: true }
      );
      const updatedJob = {
        ...job,
        status: 'in_progress',
        hiredApplicant: a.name,
        hiredApplicantIsMe: true,
        commissionAmount: commission,
        escrowAmount: hireAmount,
        deadlineDays: days,
        deadlineAt: Date.now() + days * 86400000,
        deliverable: null,
        deliverableFeedback: [],
        revisionLimit: 2,
        revisionCount: 0,
        applicants: updatedApplicants,
      };
      const myJobs = state.myJobs.map((j) => (j.id === jobId ? updatedJob : j));
      const jobs = state.jobs.map((pj) => (pj.dashJobId === jobId ? { ...pj, status: 'filled' } : pj));

      let balance = state.balance;
      let transactions = state.transactions;
      if (method === 'wallet') {
        balance -= hireAmount;
        transactions = addTxTo(transactions, 'escrow_hold', 'Ký quỹ thuê ' + a.name + ' · ' + job.title, hireAmount, -1);
      }

      let myApplications = state.myApplications;
      const existingIdx = myApplications.findIndex((x) => x.dashJobId === jobId);
      if (existingIdx >= 0) {
        myApplications = myApplications.map((x, i) => (i === existingIdx ? { ...x, status: 'hired' } : x));
      } else {
        const publicJob = jobs.find((pj) => pj.dashJobId === jobId);
        myApplications = [
          { id: 'ap' + Date.now(), jobId: publicJob ? publicJob.id : null, dashJobId: jobId, title: job.title, emp: publicJob ? publicJob.emp : 'Bạn', budget: job.budget, status: 'hired', appliedAt: 'Vừa xong' },
          ...myApplications,
        ];
      }

      let notifications = addNotifTo(state.notifications, '🔒', `Đã thuê ${a.name} và giữ ${hireAmount.toLocaleString('vi-VN')}đ trong ví ký quỹ. Hạn: ${days} ngày.`, '/dashboard');
      notifications = addNotifTo(notifications, '🎉', `Ứng viên "${a.name}" đã trúng tuyển "${job.title}".`, '/mywork');

      return { ...state, myJobs, jobs, balance, transactions, myApplications, notifications };
    }

    case 'MARK_JOB_COMPLETE': {
      const job = state.myJobs.find((j) => j.id === action.id);
      if (!job) return state;
      const commission = job.commissionAmount || Math.round(job.budget * commissionRate(state));
      let transactions = addTxTo(state.transactions, 'escrow_release', 'Giải ngân cho ' + job.hiredApplicant + ' · ' + job.title, job.budget, 1);
      transactions = addTxTo(transactions, 'commission', `Phí nền tảng · ${job.title}`, commission, -1);
      const myJobs = state.myJobs.map((j) => (j.id === action.id ? { ...j, status: 'completed' } : j));
      let myReliability = state.myReliability;
      let myApplications = state.myApplications;
      if (job.hiredApplicantIsMe) {
        myReliability = Math.min(100, myReliability + 3);
        myApplications = myApplications.map((a) => (a.dashJobId === job.id ? { ...a, status: 'completed' } : a));
      }
      const receipt = {
        id: 'rc' + Date.now(), dashJobId: job.id, jobTitle: job.title, budget: job.budget, commission,
        total: commission + job.budget, student: job.hiredApplicant, date: fmtNow(),
      };
      const notifications = addNotifTo(state.notifications, '✅', `Công việc "${job.title}" đã hoàn thành và tiền đã giải ngân cho ${job.hiredApplicant}.`, '/wallet');
      return { ...state, myJobs, transactions, myReliability, myApplications, receipts: [receipt, ...state.receipts], notifications, lastReceiptId: receipt.id };
    }

    case 'SUBMIT_DELIVERABLE': {
      const { jobId, mode, url, note, fileName, fileSize, previewDataUrl, finalDataUrl } = action.payload;
      const job = state.myJobs.find((j) => j.id === jobId);
      if (!job) return state;
      const wasRevision = job.status === 'revision_requested';
      const wasUpdate = job.status === 'submitted' || wasRevision;
      const version = wasUpdate && job.deliverable ? (job.deliverable.version || 1) + 1 : 1;
      const deliverable = { mode, url: url || '', fileName: fileName || '', fileSize: fileSize || 0, previewDataUrl: previewDataUrl || null, finalDataUrl: finalDataUrl || null, note, submittedAt: fmtNow(), version, status: 'submitted' };
      const myJobs = state.myJobs.map((j) => (j.id === jobId ? { ...j, deliverable, status: 'submitted', hiredApplicantIsMe: true } : j));
      let myApplications = state.myApplications;
      const idx = myApplications.findIndex((a) => a.dashJobId === jobId);
      if (idx >= 0) myApplications = myApplications.map((a, i) => (i === idx ? { ...a, status: 'submitted' } : a));
      const notifications = addNotifTo(
        state.notifications, '📤',
        wasRevision ? `Bạn đã nộp lại bàn giao (phiên bản ${version}).` : (wasUpdate ? `Bạn đã cập nhật bàn giao.` : `Bạn đã nộp bàn giao — đang chờ xác nhận.`),
        '/mywork'
      );
      return { ...state, myJobs, myApplications, notifications };
    }

    case 'REQUEST_REVISION': {
      const { jobId, text } = action.payload;
      const job = state.myJobs.find((j) => j.id === jobId);
      if (!job || !job.deliverable) return state;
      const revisionCount = (job.revisionCount || 0) + 1;
      const feedback = [...(job.deliverableFeedback || []), { version: job.deliverable.version || 1, text, at: fmtNow() }];
      const myJobs = state.myJobs.map((j) =>
        j.id === jobId ? { ...j, deliverableFeedback: feedback, revisionCount, status: 'revision_requested', deliverable: { ...j.deliverable, status: 'revision_requested' } } : j
      );
      const notifications = addNotifTo(state.notifications, '✏️', `Bạn đã yêu cầu ${job.hiredApplicant} sửa lại bàn giao (lượt ${revisionCount}/${job.revisionLimit}).`, '/dashboard');
      return { ...state, myJobs, notifications };
    }

    /* ---- wallet ---- */
    case 'TOPUP': {
      const balance = state.balance + action.amount;
      const transactions = addTxTo(state.transactions, 'topup', 'Nạp tiền qua ' + action.methodLabel, action.amount, 1);
      const notifications = addNotifTo(state.notifications, '💰', `Nạp tiền thành công ${action.amount.toLocaleString('vi-VN')}đ vào ví.`, '/wallet');
      return { ...state, balance, transactions, notifications };
    }
    case 'WITHDRAW': {
      if (action.amount > state.balance) return state;
      const balance = state.balance - action.amount;
      const transactions = addTxTo(state.transactions, 'withdraw', 'Rút tiền về Vietcombank ****4821', action.amount, -1);
      const notifications = addNotifTo(state.notifications, '🏦', `Yêu cầu rút ${action.amount.toLocaleString('vi-VN')}đ đã được xử lý.`, '/wallet');
      return { ...state, balance, transactions, notifications };
    }
    case 'SUBSCRIBE_PRO': {
      if (action.method === 'wallet' && state.balance < action.amount) return state;
      const balance = action.method === 'wallet' ? state.balance - action.amount : state.balance;
      let transactions = addTxTo(state.transactions, 'subscription', 'Đăng ký gói Freelance Pro (1 tháng)', action.amount, -1);
      const fundAlloc = Math.round(action.amount * 0.1);
      const insuranceFund = state.insuranceFund + fundAlloc;
      let notifications = addNotifTo(state.notifications, '⭐', 'Chúc mừng! Bạn đã nâng cấp lên Freelance Pro.', '/pricing');
      notifications = addNotifTo(notifications, '🛡️', `${fundAlloc.toLocaleString('vi-VN')}đ (10% doanh thu Premium) vừa được trích vào Quỹ Bảo hiểm.`, '/wallet');
      return { ...state, balance, transactions, subscriptionPro: true, insuranceFund, notifications };
    }
    case 'UPGRADE_VIP': {
      const notifications = addNotifTo(state.notifications, '👑', 'Chúc mừng! Tài khoản của bạn đã là VIP Business Suite — hoa hồng giảm còn 5%.', '/pricing');
      return { ...state, vipBusiness: true, notifications };
    }
    case 'SUBMIT_CLAIM': {
      const { jobTitle, jobBudget, desc } = action.payload;
      const rate = 0.3 + Math.random() * 0.2;
      const payout = Math.round((jobBudget * rate) / 1000) * 1000;
      let insuranceFund = state.insuranceFund;
      let balance = state.balance;
      let transactions = state.transactions;
      let msg;
      if (insuranceFund >= payout) {
        insuranceFund -= payout;
        balance += payout;
        transactions = addTxTo(transactions, 'insurance_payout', 'Bồi thường Quỹ Bảo hiểm · ' + jobTitle, payout, 1);
        msg = `Khiếu nại "${jobTitle}" đã được duyệt — bồi thường ${payout.toLocaleString('vi-VN')}đ (${Math.round(rate * 100)}%).`;
      } else {
        msg = `Khiếu nại "${jobTitle}" đã ghi nhận, quỹ tạm thời không đủ — sẽ xử lý ở kỳ đối soát tiếp theo.`;
      }
      const claims = [{ id: 'c' + Date.now(), jobTitle, desc, payout, status: 'approved', date: 'Vừa xong' }, ...state.claims];
      const notifications = addNotifTo(state.notifications, '🛡️', msg, '/wallet');
      return { ...state, insuranceFund, balance, transactions, claims, notifications };
    }

    /* ---- profile uploads ---- */
    case 'SET_CV':
      return { ...state, cvFile: action.file, notifications: addNotifTo(state.notifications, '📄', `Đã cập nhật CV: ${action.file.name}`, '/profile') };
    case 'REMOVE_CV':
      return { ...state, cvFile: null };
    case 'ADD_EMPLOYER_DOCS':
      return { ...state, employerDocs: [...action.files, ...state.employerDocs], notifications: addNotifTo(state.notifications, '🏢', `Đã tải ${action.files.length} file hồ sơ nhà tuyển dụng.`, '/profile') };
    case 'REMOVE_EMPLOYER_DOC':
      return { ...state, employerDocs: state.employerDocs.filter((_, i) => i !== action.idx) };
    case 'ADD_PORTFOLIO':
      return { ...state, portfolioUploads: [action.item, ...state.portfolioUploads], notifications: addNotifTo(state.notifications, '🖼️', `Đã thêm portfolio: ${action.item.name}`, '/profile') };
    case 'REMOVE_PORTFOLIO':
      return { ...state, portfolioUploads: state.portfolioUploads.filter((_, i) => i !== action.idx) };

    /* ---- reviews ---- */
    case 'SUBMIT_REVIEW': {
      const { withName, stars, comment, direction, jobTitle } = action.payload;
      if (direction === 'toEmployer') {
        return {
          ...state,
          employerReviews: [{ name: withName, stars, comment, jobTitle }, ...state.employerReviews],
          notifications: addNotifTo(state.notifications, '⭐', `Bạn đã đánh giá nhà tuyển dụng ${withName} ${stars} sao.`, '/profile'),
        };
      }
      const delta = (stars - 3) * 5;
      const myReliability = Math.max(0, Math.min(100, state.myReliability + delta));
      return {
        ...state,
        reviews: [{ name: withName, stars, comment }, ...state.reviews],
        myReliability,
        notifications: addNotifTo(state.notifications, '⭐', `Bạn đã đánh giá ${withName} ${stars} sao.`, '/profile'),
      };
    }

    /* ---- deadline reminders ---- */
    case 'CHECK_DEADLINES': {
      let notifications = state.notifications;
      let changed = false;
      const myJobs = state.myJobs.map((job) => {
        if (['in_progress', 'submitted', 'revision_requested'].includes(job.status) && job.deadlineAt && !job.deadlineReminderSent) {
          const remain = job.deadlineAt - Date.now();
          if (remain <= 0) {
            notifications = addNotifTo(notifications, '⏰', `Công việc "${job.title}" đã quá hạn hoàn thành. Vui lòng liên hệ ${job.hiredApplicant} hoặc gửi khiếu nại nếu cần.`, '/dashboard');
            changed = true;
            return { ...job, deadlineReminderSent: true };
          }
          if (remain > 0 && remain < 12 * 3600000) {
            notifications = addNotifTo(notifications, '⏰', `Công việc "${job.title}" sắp tới hạn (còn dưới 12 giờ). Nhắc ${job.hiredApplicant} nộp bàn giao sớm.`, '/dashboard');
            changed = true;
            return { ...job, deadlineReminderSent: true };
          }
        }
        return job;
      });
      if (!changed) return state;
      return { ...state, myJobs, notifications };
    }

    /* ---- notifications ---- */
    case 'MARK_ALL_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'MARK_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };

    /* ---- messenger ---- */
    case 'TOGGLE_MESSENGER_PANEL':
      return { ...state, messengerPanelOpen: action.open !== undefined ? action.open : !state.messengerPanelOpen };

    case 'OPEN_CHAT_WINDOW': {
      const already = state.openChatIds.includes(action.id);
      const openChatIds = already ? state.openChatIds : [...state.openChatIds, action.id].slice(-3);
      const conversations = state.conversations.map((c) => (c.id === action.id ? { ...c, unread: 0 } : c));
      return { ...state, openChatIds, conversations, messengerPanelOpen: false };
    }

    case 'CLOSE_CHAT_WINDOW':
      return { ...state, openChatIds: state.openChatIds.filter((id) => id !== action.id) };

    case 'MARK_CONVERSATION_READ':
      return { ...state, conversations: state.conversations.map((c) => (c.id === action.id ? { ...c, unread: 0 } : c)) };

    case 'SEND_CHAT_MESSAGE': {
      const { id, message } = action.payload;
      const conversations = state.conversations.map((c) => {
        if (c.id !== id || c.blocked) return c;
        const newMsg = { id: 'm' + Date.now() + Math.random(), from: 'me', time: fmtTimeNow(), ...message };
        return { ...c, messages: [...c.messages, newMsg], lastTime: 'Vừa xong' };
      });
      return { ...state, conversations };
    }

    case 'RECEIVE_CHAT_REPLY': {
      const { id, text } = action.payload;
      const isOpen = state.openChatIds.includes(id);
      const conversations = state.conversations.map((c) => {
        if (c.id !== id || c.blocked) return c;
        const newMsg = { id: 'm' + Date.now() + Math.random(), from: 'them', type: 'text', text, time: fmtTimeNow() };
        return { ...c, messages: [...c.messages, newMsg], lastTime: 'Vừa xong', unread: isOpen ? 0 : c.unread + 1 };
      });
      return { ...state, conversations };
    }

    case 'TOGGLE_CONV_FLAG': {
      const { id, flag } = action.payload;
      const conversations = state.conversations.map((c) => (c.id === id ? { ...c, [flag]: !c[flag] } : c));
      return { ...state, conversations };
    }

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'CHECK_DEADLINES' }), 30000);
    return () => clearInterval(id);
  }, []);

  const actions = useMemo(
    () => ({
      submitJobForm: (payload) => dispatch({ type: 'SUBMIT_JOB_FORM', payload }),
      startEditJob: (id) => dispatch({ type: 'START_EDIT_JOB', id }),
      clearEditJob: () => dispatch({ type: 'CLEAR_EDIT_JOB' }),
      deleteJob: (id) => dispatch({ type: 'DELETE_JOB', id }),
      cancelJob: (id) => dispatch({ type: 'CANCEL_JOB', id }),
      studentAbandonJob: (id) => dispatch({ type: 'STUDENT_ABANDON_JOB', id }),
      applyJob: (id) => dispatch({ type: 'APPLY_JOB', id }),
      hire: (payload) => dispatch({ type: 'HIRE', payload }),
      markJobComplete: (id) => dispatch({ type: 'MARK_JOB_COMPLETE', id }),
      submitDeliverable: (payload) => dispatch({ type: 'SUBMIT_DELIVERABLE', payload }),
      requestRevision: (payload) => dispatch({ type: 'REQUEST_REVISION', payload }),
      topup: (amount, methodLabel) => { dispatch({ type: 'TOPUP', amount, methodLabel }); showToast(`Nạp ${amount.toLocaleString('vi-VN')}đ thành công!`, '✓'); },
      withdraw: (amount) => { dispatch({ type: 'WITHDRAW', amount }); showToast(`Đã gửi yêu cầu rút ${amount.toLocaleString('vi-VN')}đ.`, '✓'); },
      subscribePro: (amount, method) => dispatch({ type: 'SUBSCRIBE_PRO', amount, method }),
      upgradeVip: () => { dispatch({ type: 'UPGRADE_VIP' }); showToast('Đã nâng cấp VIP Business Suite!', '👑'); },
      submitClaim: (payload) => { dispatch({ type: 'SUBMIT_CLAIM', payload }); showToast('Đội ngũ Dispute Resolution đã xử lý khiếu nại của bạn!', '🛡️'); },
      setCv: (file) => { dispatch({ type: 'SET_CV', file }); showToast('Đã tải CV lên hồ sơ.', '✓'); },
      removeCv: () => { dispatch({ type: 'REMOVE_CV' }); showToast('Đã xoá CV khỏi hồ sơ.', '🗑️'); },
      addEmployerDocs: (files) => { dispatch({ type: 'ADD_EMPLOYER_DOCS', files }); showToast('Đã cập nhật hồ sơ công ty.', '✓'); },
      removeEmployerDoc: (idx) => dispatch({ type: 'REMOVE_EMPLOYER_DOC', idx }),
      addPortfolio: (item) => { dispatch({ type: 'ADD_PORTFOLIO', item }); showToast('Đã thêm vào portfolio.', '✓'); },
      removePortfolio: (idx) => dispatch({ type: 'REMOVE_PORTFOLIO', idx }),
      submitReview: (payload) => { dispatch({ type: 'SUBMIT_REVIEW', payload }); showToast('Cảm ơn bạn đã gửi đánh giá!', '✓'); },
      markAllNotifRead: () => dispatch({ type: 'MARK_ALL_NOTIF_READ' }),
      markNotifRead: (id) => dispatch({ type: 'MARK_NOTIF_READ', id }),
      toggleMessengerPanel: (open) => dispatch({ type: 'TOGGLE_MESSENGER_PANEL', open }),
      openChat: (id) => dispatch({ type: 'OPEN_CHAT_WINDOW', id }),
      closeChat: (id) => dispatch({ type: 'CLOSE_CHAT_WINDOW', id }),
      markConversationRead: (id) => dispatch({ type: 'MARK_CONVERSATION_READ', id }),
      sendChatMessage: (id, message) => {
        dispatch({ type: 'SEND_CHAT_MESSAGE', payload: { id, message } });
        setTimeout(() => {
          const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
          dispatch({ type: 'RECEIVE_CHAT_REPLY', payload: { id, text: reply } });
        }, 900 + Math.random() * 700);
      },
      toggleConvFlag: (id, flag) => dispatch({ type: 'TOGGLE_CONV_FLAG', payload: { id, flag } }),
      login: async (email, password) => {
        const result = await loginApi(email, password);
        dispatch({ type: "AUTH_LOGIN_SUCCESS", payload: result });
        showToast(`Chào mừng bạn trở lại, ${result.fullName}!`, '👋');
        return result;
      },
      logout: async () => {
        const currentRefreshToken = localStorage.getItem('refreshToken');
        try {
          await logoutApi(currentRefreshToken);
        } catch {
        }
        dispatch({ type: 'AUTH_LOGOUT' });
        showToast(`Đã đăng xuất`, '👋');
      },
      updateProfile: (patch) => {
        dispatch({ type: 'UPDATE_PROFILE', patch });
        showToast('Đã cập nhật thông tin tài khoản.', '✓');
      },
      changePassword: async (currentPassword, newPassword) => {
        const result = await changePasswordApi(currentPassword, newPassword);
        showToast('Đã đổi mật khẩu thành công.', '✓');
        return result;
      },
      register: async (fullName, email, password, phoneNumber, roleCode) => {
        return registerApi(fullName, email, password, phoneNumber, roleCode);
      }
    }),
    [showToast]
  );

  const value = useMemo(() => ({ state, dispatch, ...actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

export function fmtVND(n) {
  return (n || 0).toLocaleString('vi-VN') + 'đ';
}