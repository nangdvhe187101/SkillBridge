import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react';
import { jobsSeed } from '../data/jobs';
import { myJobsSeed } from '../data/myJobs';
import { conversationsSeed, AUTO_REPLIES } from '../data/conversations';
import { useToast } from './ToastContext';

import { login as loginApi, register as registerApi, logout as logoutApi, refreshToken as refreshTokenApi, changePassword as changePasswordApi } from '../api/authApi';
import * as jobApi from '../api/jobApi';
import * as cvApi from '../api/cvApi';
import * as applicationApi from '../api/applicationApi';
import { setAccessToken, clearAccessToken } from '../api/tokenStore';

const StoreContext = createContext(null);

export function mapPublicJob(j) {
  return {
    id: j.id,
    title: j.title,
    emp: j.employerName || 'Nhà tuyển dụng',
    loc: j.location || 'Toàn quốc',
    cat: j.categoryName || 'Chung',
    categoryId: j.categoryId,
    budget: j.budget,
    urgent: j.isUrgent,
    time: j.postedAt ? new Date(j.postedAt).toLocaleDateString('vi-VN') : 'Vừa đăng',
    postedAt: j.postedAt,
    desc: j.description || '',
    status: j.status,
    deadlineAt: j.deadlineAt,
    attachmentCount: j.attachmentCount !== undefined ? j.attachmentCount : (j.attachments?.length || 0),
    req: [],
    attachments: j.attachments || []
  };
}

export function mapMyJob(j) {
  return {
    id: j.id,
    title: j.title,
    cat: j.categoryName || 'Chung',
    categoryId: j.categoryId,
    budget: j.budget,
    urgent: j.isUrgent,
    status: j.status,
    posted: j.postedAt ? new Date(j.postedAt).toLocaleDateString('vi-VN') : 'Vừa đăng',
    postedAt: j.postedAt,
    deadlineAt: j.deadlineAt,
    attachmentCount: j.attachmentCount !== undefined ? j.attachmentCount : (j.attachments?.length || 0),
    applicantsCount: j.applicantCount !== undefined ? j.applicantCount : (j.applicants?.length || 0),
    applicants: j.applicants || [],
    attachments: j.attachments || []
  };
}

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

const initialTransactionsSeed = [
  { id: 1, type: 'topup', label: 'Nạp tiền qua Chuyển khoản QR MB Bank', amount: 500000, sign: 1, date: '21/08/2026 14:30' },
  { id: 2, type: 'escrow_hold', label: 'Tạm giữ Ký quỹ Escrow — Job #12 Dựng video TikTok', amount: 250000, sign: -1, date: '21/08/2026 15:00' },
  { id: 3, type: 'escrow_release', label: 'Nhận thù lao giải ngân — Thiết kế logo quán cafe', amount: 400000, sign: 1, date: '20/08/2026 18:45' },
  { id: 4, type: 'insurance_payout', label: 'Bồi thường 40% Quỹ Bảo hiểm — Job #9 Sự cố hủy đơn', amount: 120000, sign: 1, date: '19/08/2026 10:15' },
  { id: 5, type: 'withdraw', label: 'Rút tiền về MB Bank *6666', amount: 300000, sign: -1, date: '18/08/2026 09:20' },
];

const initialReceiptsSeed = [
  { id: 'REC-901', code: 'SB-REC-2026-08901', jobTitle: 'Thiết kế logo & Menu A4 quán cafe', employer: 'Trà Sữa Mộc', student: 'Minh Anh', total: 400000, fee: 0, net: 400000, date: '20/08/2026 18:45', status: 'completed' },
  { id: 'REC-902', code: 'SB-REC-2026-08902', jobTitle: 'Dịch thuật tài liệu Tiếng Anh 1500 từ', employer: 'Cỏ May Media', student: 'Hoàng Long', total: 350000, fee: 0, net: 350000, date: '17/08/2026 11:20', status: 'completed' },
];

const initialClaimsSeed = [
  { id: 'CLM-101', jobTitle: 'Biên tập 5 bài viết SEO Website', desc: 'Nhà tuyển dụng không phản hồi sau khi nhận bài 7 ngày', payout: 150000, status: 'resolved', statusLabel: '✅ Đã bồi thường 40%', date: '19/08/2026' },
  { id: 'CLM-102', jobTitle: 'Dựng motion graphic intro 10s', desc: 'Đang gửi bằng chứng đối soát video demo', payout: 0, status: 'pending', statusLabel: '⏳ Đang chờ HĐ Bảo hiểm duyệt', date: '21/08/2026' },
];

const initialState = {
  balance: 350000,
  escrowLocked: 250000,
  transactions: initialTransactionsSeed,
  receipts: initialReceiptsSeed,
  insuranceFund: 8200000,
  claims: initialClaimsSeed,
  bankAccount: {
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: '999988886666',
    accountHolder: 'NGUYEN VAN A',
    branch: 'Chi nhánh Hà Nội'
  },
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
  token: null, // token chỉ lưu trong memory (tokenStore.js), không còn persist localStorage
  currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
  role: JSON.parse(localStorage.getItem('user') || 'null')?.roleCode || 'student',
  // isInitializing: true khi app đang chờ refresh token lúc khởi động
  isInitializing: !!JSON.parse(localStorage.getItem('user') || 'null'),
  cvFile: null,
  cvFiles: [
    { id: 1, name: 'CV_NguyenVanAn_WebDev.pdf', label: 'CV Lập trình Web Frontend', category: 'Lập trình web', size: '245 KB', date: '10/08/2026' },
    { id: 2, name: 'CV_NguyenVanAn_GraphicDesign.pdf', label: 'CV Thiết kế Đồ họa & Video', category: 'Thiết kế đồ hoạ', size: '1.2 MB', date: '12/08/2026' },
    { id: 3, name: 'CV_NguyenVanAn_ContentWriter.pdf', label: 'CV Viết bài SEO & Dịch thuật', category: 'Viết nội dung', size: '198 KB', date: '15/08/2026' },
  ],
  categories: [],
  employerDocs: [],
  portfolioUploads: [],
  jobs: jobsSeed,
  myJobs: myJobsSeed,
  appliedJobIds: [],
  savedJobIds: JSON.parse(localStorage.getItem('savedJobIds') || '[101, 103]'),
  nextJobId: 200,
  editingJobId: null,
  triZeroUsed: 2,
  conversations: conversationsSeed,
  openChatIds: [],
  messengerPanelOpen: false,
  adsSettings: JSON.parse(localStorage.getItem('adsSettings') || JSON.stringify({
    adsOn: true,
    budget: 120000,
    audience: 'Sinh viên khối Kinh tế / Marketing',
    title: 'Tuyển Thực tập sinh Content & Video Creator (Remote)',
    desc: 'Làm việc linh hoạt theo thời gian rảnh, nhận trợ cấp 2.500.000đ/tháng + cấp chứng nhận thực tập chính quy.',
    sponsor: 'Trà Sữa Mộc F&B',
    ctaText: 'Ứng tuyển nhanh qua One-Touch Portfolio'
  })),
  affiliateLeads: [
    { id: 'lead-1', name: 'Minh Anh', school: 'FPT University', email: 'anh.nm@fpt.edu.vn', time: '10 phút trước', skills: ['Canva', 'CapCut', 'Content Writing'], reliability: 96, avatar: 'M' },
    { id: 'lead-2', name: 'Nguyễn Hoàng Long', school: 'ĐH Kinh Tế TP.HCM (UEH)', email: 'long.nh@ueh.edu.vn', time: '1 giờ trước', skills: ['SEO', 'Copywriting', 'Tiktok Ads'], reliability: 94, avatar: 'L' },
    { id: 'lead-3', name: 'Trần Thị Thu Thảo', school: 'ĐH Ngoại Thương (FTU)', email: 'thao.ttt@ftu.edu.vn', time: '3 giờ trước', skills: ['Content Marketing', 'Translation', 'Event'], reliability: 98, avatar: 'T' },
  ],
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
      const { token, userId, fullName, email, roleCode } = action.payload;
      setAccessToken(token);
      localStorage.setItem('user', JSON.stringify({ userId, fullName, email, roleCode }));
      return { ...state, token, currentUser: { userId, fullName, email, roleCode }, role: roleCode, isInitializing: false };
    }

    case 'AUTH_LOGOUT': {
      clearAccessToken();
      localStorage.removeItem('user');
      return {
        ...state,
        token: null,
        currentUser: null,
        role: 'student',
        isInitializing: false,
        appliedJobIds: [],
        myApplications: [],
        myJobs: [],
        cvFiles: [],
        savedJobIds: [],
      };
    }

    case 'SET_ACCESS_TOKEN': {
      return { ...state, token: action.token, isInitializing: false };
    }

    case 'UPDATE_PROFILE': {
      if (!state.currentUser) return state;
      const currentUser = { ...state.currentUser, ...action.patch };
      localStorage.setItem('user', JSON.stringify(currentUser));
      return { ...state, currentUser };
    }

    case 'SET_CATEGORIES': {
      return { ...state, categories: action.categories || [] };
    }

    case 'SET_JOBS': {
      return { ...state, jobs: action.jobs || [] };
    }

    case 'SET_MY_JOBS': {
      return { ...state, myJobs: action.myJobs || [] };
    }

    case 'SET_SAVED_JOB_IDS': {
      return { ...state, savedJobIds: action.ids || [] };
    }

    case 'SET_CV_FILES': {
      return { ...state, cvFiles: action.files || [] };
    }

    case 'SET_MY_APPLICATIONS': {
      const apps = action.applications || [];
      const appliedJobIds = apps.map((a) => a.jobId);
      return { ...state, myApplications: apps, appliedJobIds };
    }

    case 'SUBMIT_JOB_FORM': {
      const { title, cat, budget, desc, req, urgent, attachments, editingId } = action.payload;
      const fileList = attachments || [];
      if (editingId) {
        const myJobs = state.myJobs.map((j) => (j.id === editingId ? { ...j, title, cat, budget, desc, req: req || j.req, urgent, attachments: fileList } : j));
        const jobs = state.jobs.map((j) => (j.dashJobId === editingId ? { ...j, title, cat, budget, desc, req: req || j.req, urgent, attachments: fileList } : j));
        return { ...state, myJobs, jobs, editingJobId: null };
      }
      const newId = state.nextJobId;
      const newDashJob = {
        id: newId,
        title,
        cat,
        budget,
        desc,
        req: req || ['Hoàn thành đúng deadline', 'Giao sản phẩm qua hệ thống SkillBridge'],
        urgent,
        status: 'open',
        posted: 'Vừa đăng',
        applicants: [],
        attachments: fileList,
      };
      const newPublicJob = {
        id: 1000 + newId,
        title,
        emp: 'Bạn (Nhà tuyển dụng)',
        loc: 'TP.HCM',
        cat,
        budget,
        urgent,
        time: 'Vừa đăng',
        desc,
        req: req || ['Hoàn thành đúng deadline', 'Giao sản phẩm qua hệ thống SkillBridge'],
        status: 'open',
        dashJobId: newId,
        attachments: fileList,
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

    case 'REOPEN_JOB': {
      const myJobs = state.myJobs.map((j) => (j.id === action.id ? { ...j, status: 'open' } : j));
      const jobs = state.jobs.map((j) => (j.dashJobId === action.id ? { ...j, status: 'open' } : j));
      return { ...state, myJobs, jobs };
    }

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

    case 'TOGGLE_SAVE_JOB': {
      const isSaved = (state.savedJobIds || []).includes(action.jobId);
      const savedJobIds = isSaved
        ? (state.savedJobIds || []).filter((id) => id !== action.jobId)
        : [...(state.savedJobIds || []), action.jobId];
      localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
      const job = state.jobs.find((j) => j.id === action.jobId);
      const notifications = !isSaved
        ? addNotifTo(state.notifications, '❤️', `Đã lưu công việc "${job?.title || '#' + action.jobId}" vào danh sách yêu thích.`, `/jobs/${action.jobId}`)
        : state.notifications;
      return { ...state, savedJobIds, notifications };
    }

    case 'UPDATE_ADS_SETTINGS': {
      const adsSettings = { ...state.adsSettings, ...action.payload };
      localStorage.setItem('adsSettings', JSON.stringify(adsSettings));
      return { ...state, adsSettings };
    }

    case 'HIRE': {
      const { jobId, applicantIdx, applicantName, days, method, applicant } = action.payload;
      const job = state.myJobs.find((j) => String(j.id) === String(jobId)) || { id: jobId, title: 'Công việc', budget: 150000, applicants: [] };
      const selectedName = applicantName || applicant?.name || (job.applicants && job.applicants[applicantIdx]?.name) || 'Sinh viên';
      const rate = commissionRate(state);
      const commission = Math.round((job.budget || 150000) * rate);
      const hireAmount = (job.budget || 150000) + commission;
      if (method === 'wallet' && state.balance < hireAmount) return state;

      const updatedApplicants = (job.applicants || []).map((app) =>
        app.name === selectedName ? app : { ...app, rejected: true }
      );
      const updatedJob = {
        ...job,
        status: 'in_progress',
        hiredApplicant: selectedName,
        hiredApplicantIsMe: false,
        commissionAmount: commission,
        escrowAmount: hireAmount,
        deadlineDays: days || 3,
        deadlineAt: Date.now() + (days || 3) * 86400000,
        deliverable: null,
        deliverableFeedback: [],
        revisionLimit: 2,
        revisionCount: 0,
        applicants: updatedApplicants,
      };
      const myJobs = (state.myJobs || []).some((j) => String(j.id) === String(jobId))
        ? state.myJobs.map((j) => (String(j.id) === String(jobId) ? updatedJob : j))
        : [updatedJob, ...(state.myJobs || [])];
      const jobs = (state.jobs || []).map((pj) => (String(pj.dashJobId) === String(jobId) ? { ...pj, status: 'filled' } : pj));

      let balance = state.balance;
      let transactions = state.transactions;
      if (method === 'wallet') {
        balance -= hireAmount;
        transactions = addTxTo(transactions, 'escrow_hold', 'Ký quỹ thuê ' + selectedName + ' · ' + job.title, hireAmount, -1);
      } else {
        transactions = addTxTo(transactions, 'escrow_hold', 'Ký quỹ thuê ' + selectedName + ' · ' + job.title + ' (Thanh toán trực tiếp)', hireAmount, -1);
      }

      let myApplications = state.myApplications;
      const existingIdx = myApplications.findIndex((x) => String(x.dashJobId) === String(jobId));
      if (existingIdx >= 0) {
        myApplications = myApplications.map((x, i) => (i === existingIdx ? { ...x, status: 'hired' } : x));
      } else {
        const publicJob = jobs.find((pj) => String(pj.dashJobId) === String(jobId));
        myApplications = [
          { id: 'ap' + Date.now(), jobId: publicJob ? publicJob.id : null, dashJobId: job.id, title: job.title, emp: publicJob ? publicJob.emp : 'Bạn', budget: job.budget, status: 'hired', appliedAt: 'Vừa xong' },
          ...myApplications,
        ];
      }

      let notifications = addNotifTo(state.notifications, '🔒', `Đã thuê ${a.name} và giữ ${hireAmount.toLocaleString('vi-VN')}đ trong ví ký quỹ. Hạn: ${days || 3} ngày.`, '/dashboard');
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
      const amount = action.amount || 199000;
      if (action.method === 'wallet' && state.balance < amount) return state;
      const balance = action.method === 'wallet' ? state.balance - amount : state.balance;
      let transactions = addTxTo(state.transactions, 'subscription', 'Đăng ký gói VIP Business Suite (1 tháng)', amount, -1);
      const fundAlloc = Math.round(amount * 0.1);
      const insuranceFund = state.insuranceFund + fundAlloc;
      let notifications = addNotifTo(state.notifications, '👑', 'Chúc mừng! Tài khoản của bạn đã là VIP Business Suite — hoa hồng giảm còn 5%.', '/pricing');
      notifications = addNotifTo(notifications, '🛡️', `${fundAlloc.toLocaleString('vi-VN')}đ (10% gói VIP) vừa được trích vào Quỹ Bảo hiểm.`, '/wallet');
      return { ...state, balance, transactions, vipBusiness: true, insuranceFund, notifications };
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

    case 'UPDATE_BANK_ACCOUNT': {
      const notifications = addNotifTo(state.notifications, '🏦', 'Đã cập nhật thông tin tài khoản ngân hàng nhận tiền.', '/wallet');
      return { ...state, bankAccount: action.payload, notifications };
    }

    case 'SUBMIT_ONE_TOUCH_LEAD': {
      const newLead = {
        id: 'lead-' + Date.now(),
        name: action.payload.name || (state.currentUser?.fullName || 'Sinh viên'),
        school: state.currentUser?.school || 'FPT University',
        email: state.currentUser?.email || 'student@fpt.edu.vn',
        time: 'Vừa xong',
        skills: ['Canva', 'Video Editing', 'Content Marketing', 'English'],
        reliability: state.myReliability || 96,
        avatar: (action.payload.name || state.currentUser?.fullName || 'S').charAt(0).toUpperCase(),
        note: action.payload.note || '',
        sponsor: action.payload.sponsor || 'Doanh nghiệp'
      };
      const affiliateLeads = [newLead, ...(state.affiliateLeads || [])];
      const notifications = addNotifTo(state.notifications, '⚡', `Đã gửi hồ sơ One-Touch Portfolio tới ${action.payload.sponsor || 'Doanh nghiệp'}!`, '/mywork');
      return { ...state, affiliateLeads, notifications };
    }

    case 'SET_CV':
      return { ...state, cvFile: action.file, notifications: addNotifTo(state.notifications, '📄', `Đã cập nhật CV: ${action.file.name}`, '/profile') };
    case 'REMOVE_CV':
      return { ...state, cvFile: null };
    case 'ADD_CV_FILE': {
      const newCv = {
        id: Date.now(),
        name: action.payload.name,
        label: action.payload.label || action.payload.name,
        category: action.payload.category || 'Lập trình web',
        size: action.payload.size ? (action.payload.size > 1024 * 1024 ? (action.payload.size / (1024 * 1024)).toFixed(1) + ' MB' : (action.payload.size / 1024).toFixed(0) + ' KB') : '250 KB',
        date: fmtNow()
      };
      return { ...state, cvFiles: [newCv, ...(state.cvFiles || [])], notifications: addNotifTo(state.notifications, '📄', `Đã thêm CV mới: ${newCv.label}`, '/profile') };
    }
    case 'REMOVE_CV_FILE':
      return { ...state, cvFiles: (state.cvFiles || []).filter((c) => c.id !== action.id) };
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

    case 'MARK_ALL_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'MARK_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };

    case 'TOGGLE_MESSENGER_PANEL':
      return { ...state, messengerPanelOpen: action.open !== undefined ? action.open : !state.messengerPanelOpen };

    case 'OPEN_CHAT_WINDOW': {
      const already = state.openChatIds.includes(action.id);
      const openChatIds = already ? state.openChatIds : [...state.openChatIds, action.id].slice(-3);
      const conversations = state.conversations.map((c) => (c.id === action.id ? { ...c, unread: 0 } : c));
      return { ...state, openChatIds, conversations, messengerPanelOpen: false };
    }

    case 'OPEN_CHAT_WITH_PERSON': {
      const { name, subtitle } = action.payload;
      let conv = state.conversations.find((c) => c.name === name);
      let conversations = state.conversations;
      if (!conv) {
        conv = {
          id: 'conv-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
          name,
          subtitle: subtitle || '',
          online: true,
          kind: 'chat',
          unread: 0,
          lastTime: 'Vừa xong',
          blocked: false,
          muted: false,
          archived: false,
          messages: [
            { id: 'm' + Date.now(), type: 'text', from: 'them', text: `Chào bạn! Mình là ${name}, có gì cần trao đổi cứ nhắn nhé.`, time: fmtTimeNow() },
          ],
        };
        conversations = [conv, ...state.conversations];
      }
      const openChatIds = state.openChatIds.includes(conv.id) ? state.openChatIds : [...state.openChatIds, conv.id].slice(-3);
      return { ...state, conversations, openChatIds, messengerPanelOpen: false };
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

const authBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('skillbridge_auth_sync')
  : null;

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();

  // Lắng nghe sự kiện đăng nhập/đăng xuất từ các tab khác
  useEffect(() => {
    if (!authBroadcast) return;
    const handleAuthMessage = (e) => {
      if (e.data?.type === 'AUTH_LOGIN_SUCCESS') {
        setAccessToken(e.data.payload.token);
        dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: e.data.payload });
      } else if (e.data?.type === 'AUTH_LOGOUT') {
        clearAccessToken();
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };
    authBroadcast.addEventListener('message', handleAuthMessage);
    return () => {
      authBroadcast.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  useEffect(() => {
    if (!state.currentUser) {
      dispatch({ type: 'SET_ACCESS_TOKEN', token: null });
      return;
    }

    let isMounted = true;
    const MAX_RETRIES = 4;

    const tryInitSession = async (retryCount = 0) => {
      try {
        const result = await refreshTokenApi();
        if (!isMounted) return;
        setAccessToken(result.token);
        dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: result });
        authBroadcast?.postMessage({ type: 'AUTH_LOGIN_SUCCESS', payload: result });
      } catch (err) {
        if (!isMounted) return;

        if (err?.isGraceWindow) {
          if (retryCount < MAX_RETRIES) {
            const baseDelay = Math.min(3200, 400 * Math.pow(2, retryCount));
            const jitter = Math.floor(Math.random() * 200);
            setTimeout(() => {
              if (isMounted) {
                tryInitSession(retryCount + 1);
              }
            }, baseDelay + jitter);
            return;
          }

          dispatch({ type: 'AUTH_LOGOUT' });
          authBroadcast?.postMessage({ type: 'AUTH_LOGOUT' });
          return;
        }

        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    tryInitSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const res = await jobApi.getJobs({ page: 1, pageSize: 50 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        dispatch({ type: 'SET_JOBS', jobs: items.map(mapPublicJob) });
      }
    } catch (err) {
      console.error('Không thể tải danh sách công việc từ backend:', err);
    }
  }, []);

  const refreshMyJobs = useCallback(async () => {
    try {
      const res = await jobApi.getMyJobs(null, 1, 50);
      const items = res?.items || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        dispatch({ type: 'SET_MY_JOBS', myJobs: items.map(mapMyJob) });
      }
    } catch (err) {
      console.error('Không thể tải công việc của tôi từ backend:', err);
    }
  }, []);

  useEffect(() => {
    // Tải danh sách Categories từ API
    jobApi.getCategories()
      .then((cats) => {
        dispatch({ type: 'SET_CATEGORIES', categories: cats });
      })
      .catch((err) => {
        console.error('Không thể tải danh mục từ backend:', err);
      });

    // Tải danh sách Jobs công khai từ backend
    refreshJobs();

    // Nếu là employer, tải danh sách myJobs từ backend
    if (state.currentUser?.roleCode === 'employer') {
      refreshMyJobs();
    }

    // Nếu là student đã đăng nhập, tải savedJobIds, cvFiles, myApplications từ API
    if (state.currentUser?.roleCode === 'student') {
      jobApi.getSavedJobIds()
        .then((ids) => {
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids });
        })
        .catch(() => {});

      cvApi.getMyCvFiles()
        .then((files) => {
          // Chuẩn hóa định dạng hiển thị nếu cần
          const formatted = (files || []).map(c => ({
            id: c.id,
            name: c.fileName,
            fileUrl: c.fileUrl,
            label: c.label || c.fileName,
            category: c.categoryName || 'Chung',
            categoryId: c.categoryId,
            size: c.fileSize > 1024 * 1024 ? (c.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(c.fileSize / 1024) + ' KB',
            rawSize: c.fileSize,
            uploadedAt: c.uploadedAt
          }));
          dispatch({ type: 'SET_CV_FILES', files: formatted });
        })
        .catch((err) => console.error('Lỗi tải danh sách CV:', err));

      applicationApi.getMyApplications()
        .then((apps) => {
          const list = Array.isArray(apps) ? apps : (apps?.items || []);
          dispatch({ type: 'SET_MY_APPLICATIONS', applications: list });
        })
        .catch((err) => console.error('Lỗi tải danh sách ứng tuyển:', err));
    }
  }, [state.currentUser, refreshJobs, refreshMyJobs]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'CHECK_DEADLINES' }), 30000);
    const onTokenRefreshed = (e) => {
      if (e.detail?.token) {
        dispatch({ type: 'SET_ACCESS_TOKEN', token: e.detail.token });
      }
    };
    window.addEventListener('auth:token_refreshed', onTokenRefreshed);

    return () => {
      clearInterval(id);
      window.removeEventListener('auth:token_refreshed', onTokenRefreshed);
    };
  }, []);

  const actions = useMemo(
    () => ({
      submitJobForm: (payload) => dispatch({ type: 'SUBMIT_JOB_FORM', payload }),
      refreshJobs,
      refreshMyJobs,
      createJobPost: async (jobData) => {
        const result = await jobApi.createJob(jobData);
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Đăng tin tuyển dụng thành công!', '🚀');
        return result;
      },
      updateJobPost: async (id, jobData) => {
        const result = await jobApi.updateJob(id, jobData);
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Cập nhật tin tuyển dụng thành công!', '✓');
        return result;
      },
      cancelJobPost: async (id) => {
        try {
          const result = await jobApi.cancelJob(id);
          dispatch({ type: 'CANCEL_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã đóng tin tuyển dụng thành công.', '🚫');
          return result;
        } catch (err) {
          dispatch({ type: 'CANCEL_JOB', id });
          showToast('Đã đóng tin tuyển dụng.', '🚫');
        }
      },
      deleteJobPost: async (id) => {
        try {
          const result = await jobApi.deleteJob(id);
          dispatch({ type: 'DELETE_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã xóa vĩnh viễn tin tuyển dụng.', '🗑');
          return result;
        } catch (err) {
          dispatch({ type: 'DELETE_JOB', id });
          showToast('Đã xóa tin tuyển dụng.', '🗑');
        }
      },
      toggleSaveJobAsync: async (jobId) => {
        const isSaved = (state.savedJobIds || []).includes(jobId);
        if (isSaved) {
          await jobApi.unsaveJob(jobId);
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids: (state.savedJobIds || []).filter((id) => id !== jobId) });
          showToast('Đã bỏ lưu công việc.', '💔');
        } else {
          await jobApi.saveJob(jobId);
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids: [...(state.savedJobIds || []), jobId] });
          showToast('Đã lưu công việc vào mục yêu thích!', '❤️');
        }
      },
      startEditJob: (id) => dispatch({ type: 'START_EDIT_JOB', id }),
      clearEditJob: () => dispatch({ type: 'CLEAR_EDIT_JOB' }),
      deleteJob: async (id) => {
        try {
          await jobApi.deleteJob(id);
        } catch (err) {
          console.warn("Delete job API fallback to local:", err);
        }
        dispatch({ type: 'DELETE_JOB', id });
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Đã xóa tin tuyển dụng.', '🗑');
      },
      cancelJob: async (id) => {
        try {
          await jobApi.cancelJob(id);
        } catch (err) {
          console.warn("Cancel job API fallback to local:", err);
        }
        dispatch({ type: 'CANCEL_JOB', id });
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Đã đóng tin tuyển dụng thành công.', '🚫');
      },
      reopenJob: async (id) => {
        try {
          await jobApi.reopenJob(id);
        } catch (err) {
          console.warn("Reopen job API fallback to local:", err);
        }
        dispatch({ type: 'REOPEN_JOB', id });
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Đã mở lại tin tuyển dụng thành công!', '🎉');
      },
      reopenJobPost: async (id) => {
        try {
          const result = await jobApi.reopenJob(id);
          dispatch({ type: 'REOPEN_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã mở lại tin tuyển dụng thành công!', '🎉');
          return result;
        } catch (err) {
          dispatch({ type: 'REOPEN_JOB', id });
          showToast('Đã mở lại tin tuyển dụng.', '🎉');
        }
      },
      studentAbandonJob: (id) => dispatch({ type: 'STUDENT_ABANDON_JOB', id }),
      applyJob: (id) => dispatch({ type: 'APPLY_JOB', id }),
      applyJobAsync: async (jobId, cvFileId, coverLetter = '') => {
        const result = await applicationApi.applyJob(jobId, cvFileId, coverLetter);
        dispatch({ type: 'APPLY_JOB', id: jobId });
        showToast('Nộp đơn ứng tuyển thành công!', '🚀');
        return result;
      },
      uploadCvAsync: async (payload) => {
        let created;
        if (payload instanceof FormData) {
          created = await cvApi.uploadCvFile(payload);
        } else if (payload.file instanceof File || payload.file instanceof Blob) {
          const formData = new FormData();
          formData.append('file', payload.file);
          if (payload.label) formData.append('label', payload.label);
          if (payload.categoryId) formData.append('categoryId', payload.categoryId);
          created = await cvApi.uploadCvFile(formData);
        } else {
          created = await cvApi.uploadCv(payload);
        }

        const formatted = {
          id: created.id,
          name: created.fileName,
          fileUrl: created.fileUrl,
          label: created.label || created.fileName,
          category: created.categoryName || 'Chung',
          categoryId: created.categoryId,
          size: created.fileSize > 1024 * 1024 ? (created.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(created.fileSize / 1024) + ' KB',
          rawSize: created.fileSize,
          uploadedAt: created.uploadedAt
        };
        dispatch({ type: 'SET_CV_FILES', files: [formatted, ...(state.cvFiles || [])] });
        showToast('Tải lên CV chuyên môn thành công!', '📄');
        return formatted;
      },
      deleteCvAsync: async (id) => {
        await cvApi.deleteCv(id);
        dispatch({ type: 'SET_CV_FILES', files: (state.cvFiles || []).filter(c => c.id !== id) });
        showToast('Đã xóa CV.', '🗑️');
      },
      toggleSaveJob: (jobId) => dispatch({ type: 'TOGGLE_SAVE_JOB', jobId }),
      hire: (payload) => dispatch({ type: 'HIRE', payload }),
      markJobComplete: (id) => dispatch({ type: 'MARK_JOB_COMPLETE', id }),
      submitDeliverable: (payload) => dispatch({ type: 'SUBMIT_DELIVERABLE', payload }),
      requestRevision: (payload) => dispatch({ type: 'REQUEST_REVISION', payload }),
      topup: (amount, methodLabel) => { dispatch({ type: 'TOPUP', amount, methodLabel }); showToast(`Nạp ${amount.toLocaleString('vi-VN')}đ thành công!`, '✓'); },
      withdraw: (amount) => { dispatch({ type: 'WITHDRAW', amount }); showToast(`Đã gửi yêu cầu rút ${amount.toLocaleString('vi-VN')}đ.`, '✓'); },
      updateBankAccount: (payload) => { dispatch({ type: 'UPDATE_BANK_ACCOUNT', payload }); showToast('Cập nhật tài khoản ngân hàng thành công!', '✓'); },
      subscribePro: (amount, method) => dispatch({ type: 'SUBSCRIBE_PRO', amount, method }),
      upgradeVip: (amount, method) => { dispatch({ type: 'UPGRADE_VIP', amount, method }); showToast('Đã nâng cấp VIP Business Suite!', '👑'); },
      submitClaim: (payload) => { dispatch({ type: 'SUBMIT_CLAIM', payload }); showToast('Đội ngũ Dispute Resolution đã xử lý khiếu nại của bạn!', '🛡️'); },
      submitOneTouchLead: (payload) => { dispatch({ type: 'SUBMIT_ONE_TOUCH_LEAD', payload }); showToast('⚡ Đã gửi hồ sơ One-Touch Portfolio thành công!', '🚀'); },
      setCv: (file) => { dispatch({ type: 'SET_CV', file }); showToast('Đã tải CV lên hồ sơ.', '✓'); },
      removeCv: () => { dispatch({ type: 'REMOVE_CV' }); showToast('Đã xoá CV khỏi hồ sơ.', '🗑️'); },
      addCvFile: (payload) => { dispatch({ type: 'ADD_CV_FILE', payload }); showToast('Đã thêm CV chuyên môn mới!', '📄'); },
      removeCvFile: (id) => { dispatch({ type: 'REMOVE_CV_FILE', id }); showToast('Đã xóa CV.', '🗑️'); },
      addEmployerDocs: (files) => { dispatch({ type: 'ADD_EMPLOYER_DOCS', files }); showToast('Đã cập nhật hồ sơ công ty.', '✓'); },
      removeEmployerDoc: (idx) => dispatch({ type: 'REMOVE_EMPLOYER_DOC', idx }),
      addPortfolio: (item) => { dispatch({ type: 'ADD_PORTFOLIO', item }); showToast('Đã thêm vào portfolio.', '✓'); },
      removePortfolio: (idx) => dispatch({ type: 'REMOVE_PORTFOLIO', idx }),
      submitReview: (payload) => { dispatch({ type: 'SUBMIT_REVIEW', payload }); showToast('Cảm ơn bạn đã gửi đánh giá!', '✓'); },
      markAllNotifRead: () => dispatch({ type: 'MARK_ALL_NOTIF_READ' }),
      markNotifRead: (id) => dispatch({ type: 'MARK_NOTIF_READ', id }),
      toggleMessengerPanel: (open) => dispatch({ type: 'TOGGLE_MESSENGER_PANEL', open }),
      openChat: (id) => dispatch({ type: 'OPEN_CHAT_WINDOW', id }),
      openChatWithPerson: (name, subtitle) => dispatch({ type: 'OPEN_CHAT_WITH_PERSON', payload: { name, subtitle } }),
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
        setAccessToken(result.token);
        dispatch({ type: "AUTH_LOGIN_SUCCESS", payload: result });
        authBroadcast?.postMessage({ type: 'AUTH_LOGIN_SUCCESS', payload: result });
        showToast(`Chào mừng bạn trở lại, ${result.fullName}!`, '👋');
        return result;
      },
      logout: async () => {
        try {
          await logoutApi();
        } catch {
          // bỏ qua lỗi mạng khi logout
        }
        clearAccessToken();
        dispatch({ type: 'AUTH_LOGOUT' });
        authBroadcast?.postMessage({ type: 'AUTH_LOGOUT' });
        showToast(`Đã đăng xuất`, '👋');
      },
      updateProfile: (patch) => {
        dispatch({ type: 'UPDATE_PROFILE', patch });
        showToast('Đã cập nhật thông tin tài khoản.', '✓');
      },
      changePassword: async (currentPassword, newPassword) => {
        const result = await changePasswordApi(currentPassword, newPassword);
        showToast(result?.message || 'Đã đổi mật khẩu thành công.', '✓');
        return result;
      },
      register: async (fullName, email, password, phoneNumber, roleCode) => {
        return registerApi(fullName, email, password, phoneNumber, roleCode);
      },
      updateAdsSettings: (patch) => {
        dispatch({ type: 'UPDATE_ADS_SETTINGS', payload: patch });
        showToast('Đã lưu cài đặt chiến dịch quảng cáo.', '📢');
      }
    }),
    [showToast, state.savedJobIds, refreshJobs, refreshMyJobs]
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