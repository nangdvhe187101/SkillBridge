import { createContext, useContext, useEffect, useMemo, useReducer, useCallback, useRef } from 'react';
import { jobsSeed } from '../data/jobs';
import { myJobsSeed } from '../data/myJobs';
import { conversationsSeed, AUTO_REPLIES } from '../data/conversations';
import { useToast } from './ToastContext';

import { login as loginApi, register as registerApi, logout as logoutApi, refreshToken as refreshTokenApi, changePassword as changePasswordApi } from '../api/authApi';
import * as jobApi from '../api/jobApi';
import * as cvApi from '../api/cvApi';
import * as applicationApi from '../api/applicationApi';
import * as userApi from '../api/userApi';
import * as deliverableApi from '../api/deliverableApi';
import * as walletApi from '../api/walletApi';
import * as notificationApi from '../api/notificationApi';
import * as chatApi from '../api/chatApi';
import { connectChatRealtime } from '../services/chatHubService';
import { setAccessToken, clearAccessToken, getAccessToken } from '../api/tokenStore';

const StoreContext = createContext(null);

export function mapConversationFromApi(c, existingConv = null) {
  const role = (c.otherUserRole || '').toLowerCase();
  const isStudent = role.includes('student') || role.includes('sinh viên');
  const isEmployer = role.includes('employer') || role.includes('nhà tuyển dụng') || role.includes('business');
  const roleLabel = isEmployer ? 'Nhà tuyển dụng' : (isStudent ? 'Sinh viên' : (c.otherUserRole || 'Thành viên'));
  const isPendingRequest = (c.requestStatus || '').toLowerCase() === 'pending' && !c.isRequestSender;

  return {
    id: c.id,
    name: c.otherUserName || 'Người dùng',
    subtitle: c.jobTitle ? `Dự án: ${c.jobTitle}` : roleLabel,
    avatar: c.otherUserAvatar || null,
    online: Boolean(c.isOnline),
    kind: isPendingRequest ? 'request' : 'chat',
    unread: c.unreadCount || 0,
    lastTime: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
    rawLastMessageAt: c.lastMessageAt,
    blocked: false,
    muted: false,
    archived: Boolean(c.isArchived),
    isArchived: Boolean(c.isArchived),
    isReadOnly: Boolean(c.isReadOnly),
    readOnlyReason: c.readOnlyReason || null,
    statusBannerMessage: c.statusBannerMessage || null,
    gracePeriodExpiresAt: c.gracePeriodExpiresAt || null,
    requestStatus: c.requestStatus || 'active',
    isRequestSender: Boolean(c.isRequestSender),
    requestInitiatedBy: c.requestInitiatedBy || null,
    jobId: c.jobId || null,
    jobTitle: c.jobTitle || null,
    jobBudget: c.jobBudget || null,
    partnerRole: isEmployer ? 'employer' : 'student',
    otherUserId: c.otherUserId,
    partnerSchool: c.otherUserSchool || null,
    partnerReliability: c.otherUserReliability !== undefined && c.otherUserReliability !== null ? c.otherUserReliability : null,
    partnerJobsDone: c.otherUserJobsDone !== undefined && c.otherUserJobsDone !== null ? c.otherUserJobsDone : 0,
    partnerRating: c.otherUserRating || null,
    partnerReviewCount: c.otherUserReviewCount || 0,
    lastMessageText: c.lastMessageText || '',
    messages: existingConv?.messages || (c.lastMessageText ? [{
      id: 'preview-' + c.id,
      from: 'them',
      type: 'text',
      text: c.lastMessageText,
      time: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
    }] : []),
  };
}

export function mapChatMessageFromApi(m) {
  const hasFile = Boolean(m.attachmentUrl);
  const cleanUrl = (m.attachmentUrl || '').toLowerCase().split('?')[0];
  const isImg = hasFile && (m.attachmentType?.includes('image') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(cleanUrl));
  const isAudio = hasFile && (m.attachmentType?.includes('audio') || m.attachmentType === 'voice' || /\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(cleanUrl));
  const isVideo = hasFile && (m.attachmentType?.includes('video') || /\.(mp4|webm|ogg|mov|mkv)$/i.test(cleanUrl));
  const fileName = m.attachmentUrl ? decodeURIComponent(m.attachmentUrl.split('/').pop()?.split('?')[0] || 'Tệp đính kèm') : null;

  let inferredType = 'text';
  if (isImg) inferredType = 'image';
  else if (isAudio) inferredType = 'voice';
  else if (isVideo) inferredType = 'video';
  else if (hasFile) inferredType = 'file';
  else if (m.attachmentType) inferredType = m.attachmentType;

  return {
    id: m.id,
    conversationId: m.conversationId,
    from: m.isMine ? 'me' : 'them',
    type: inferredType,
    text: m.messageText || '',
    fileName: fileName,
    fileUrl: m.attachmentUrl || null,
    fileSize: hasFile ? (m.fileSize || 'Đính kèm') : null,
    duration: m.duration || null,
    time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
    rawSentAt: m.sentAt,
    senderId: m.senderId,
    senderName: m.senderName,
    senderAvatar: m.senderAvatar,
  };
}

export function normalizeUtcDate(dateStr) {
  if (!dateStr) return null;
  let iso = String(dateStr).trim().replace(' ', 'T');
  if (iso && !iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += 'Z';
  }
  return iso;
}

export function mapPublicJob(j) {
  return {
    id: j.id,
    title: j.title,
    emp: j.employerName || 'Nhà tuyển dụng',
    employerAvatar: j.employerAvatar || null,
    empAvatar: j.employerAvatar || null,
    employerId: j.employerId,
    loc: j.location || 'Toàn quốc',
    cat: j.categoryName || 'Chung',
    categoryId: j.categoryId,
    budget: j.budget,
    urgent: j.isUrgent,
    time: j.postedAt ? new Date(normalizeUtcDate(j.postedAt)).toLocaleDateString('vi-VN') : 'Vừa đăng',
    postedAt: normalizeUtcDate(j.postedAt),
    desc: j.description || '',
    status: j.status,
    deadlineAt: normalizeUtcDate(j.deadlineAt),
    attachmentCount: j.attachmentCount !== undefined ? j.attachmentCount : (j.attachments?.length || 0),
    req: [],
    attachments: j.attachments || [],
    hiredApplicantId: j.hiredApplicantId ?? null,
    hiredApplicant: j.hiredStudentName || j.hiredApplicant || null,
    hiredStudentName: j.hiredStudentName || j.hiredApplicant || null,
    escrowAmount: j.escrowAmount !== undefined && j.escrowAmount !== null ? j.escrowAmount : null,
    revisionLimit: j.revisionLimit ?? 2,
    revisionCount: j.revisionCount ?? 0,
  };
}

export function mapMyJob(j) {
  return {
    id: j.id,
    title: j.title,
    employerAvatar: j.employerAvatar || null,
    empAvatar: j.employerAvatar || null,
    cat: j.categoryName || 'Chung',
    categoryId: j.categoryId,
    budget: j.budget,
    urgent: j.isUrgent,
    status: j.status,
    posted: j.postedAt ? new Date(normalizeUtcDate(j.postedAt)).toLocaleDateString('vi-VN') : 'Vừa đăng',
    postedAt: normalizeUtcDate(j.postedAt),
    deadlineAt: normalizeUtcDate(j.deadlineAt),
    attachmentCount: j.attachmentCount !== undefined ? j.attachmentCount : (j.attachments?.length || 0),
    applicantsCount: j.applicantCount !== undefined ? j.applicantCount : (j.applicants?.length || 0),
    applicants: j.applicants || [],
    attachments: j.attachments || [],
    hiredApplicantId: j.hiredApplicantId ?? null,
    hiredApplicant: j.hiredStudentName || j.hiredApplicant || null,
    hiredStudentName: j.hiredStudentName || j.hiredApplicant || null,
    escrowAmount: j.escrowAmount !== undefined && j.escrowAmount !== null ? j.escrowAmount : null,
    revisionLimit: j.revisionLimit ?? 2,
    revisionCount: j.revisionCount ?? 0,
  };
}

export function mapMyApplication(a) {
  return {
    id: a.id,
    jobId: a.jobId,
    title: a.jobTitle || a.title || 'Công việc',
    jobTitle: a.jobTitle || a.title || 'Công việc',
    emp: a.employerName || a.emp || 'Nhà tuyển dụng',
    employerName: a.employerName || a.emp || 'Nhà tuyển dụng',
    employerAvatarUrl: a.employerAvatarUrl || a.employerAvatar || null,
    empAvatar: a.employerAvatarUrl || a.employerAvatar || null,
    budget: a.budget || 0,
    employerId: a.employerId,
    studentId: a.studentId,
    cvFileId: a.cvFileId,
    cvFileName: a.cvFileName,
    cvFileUrl: a.cvFileUrl,
    cvLabel: a.cvLabel || a.cvFileName,
    coverLetter: a.coverLetter,
    status: a.status || 'pending',
    appliedAt: a.appliedAt ? new Date(normalizeUtcDate(a.appliedAt)).toLocaleDateString('vi-VN') : 'Mới nộp',
    rawAppliedAt: normalizeUtcDate(a.appliedAt),
    jobStatus: a.jobStatus || a.status || 'open',
    deadlineAt: normalizeUtcDate(a.deadlineAt),
    revisionLimit: a.revisionLimit ?? 2,
    revisionCount: a.revisionCount ?? 0,
  };
}

export function commissionRate(state, job = null) {
  let studentRate = 0.10;
  if (state?.effectiveCommissionRate !== undefined && state?.effectiveCommissionRate !== null) {
    studentRate = Number(state.effectiveCommissionRate);
  } else if (state?.activePlanCode === 'STU_MASTER') {
    studentRate = 0.03;
  } else if (state?.activePlanCode === 'STU_PRO' || state?.subscriptionPro) {
    studentRate = 0.05;
  } else if (state?.activePlanCode === 'STU_STARTER') {
    studentRate = 0.08;
  }

  let employerRate = 0.10;
  if (job?.employerPlanCode === 'EMP_VIP' || job?.employerIsVip || job?.isVip || (state?.role === 'employer' && state?.vipBusiness)) {
    employerRate = 0.05;
  } else if (job?.employerRate !== undefined && job?.employerRate !== null) {
    employerRate = Number(job.employerRate);
  }

  return Math.min(studentRate, employerRate);
}

export function mapReceiptsFromApi(apiReceipts) {
  if (!Array.isArray(apiReceipts) || apiReceipts.length === 0) return null;
  return apiReceipts.map((r) => ({
    id: 'rc-' + r.id,
    code: r.code || `SB-REC-${r.jobId}-${r.id}`,
    dashJobId: r.jobId,
    jobId: r.jobId,
    jobTitle: r.jobTitle,
    budget: r.budget,
    commission: r.commission,
    total: r.total || r.budget,
    net: r.netPayout !== undefined && r.netPayout !== null ? r.netPayout : (r.budget - (r.commission || 0)),
    student: r.studentName || 'Sinh viên',
    employer: r.employerName || 'Nhà tuyển dụng',
    date: r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Vừa xong'
  }));
}

const TX_ICON = {
  topup: 'arrow-down-left',
  withdraw: 'arrow-up-right',
  subscription: 'crown',
  escrow_hold: 'lock',
  escrow_refund: 'arrow-down-left',
  escrow_release: 'check',
  commission: 'receipt',
  insurance_payout: 'shield-check',
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
  { id: 'CLM-101', jobTitle: 'Biên tập 5 bài viết SEO Website', desc: 'Nhà tuyển dụng không phản hồi sau khi nhận bài 7 ngày', payout: 150000, status: 'resolved', statusLabel: 'Đã bồi thường 40%', date: '19/08/2026' },
  { id: 'CLM-102', jobTitle: 'Dựng motion graphic intro 10s', desc: 'Đang gửi bằng chứng đối soát video demo', payout: 0, status: 'pending', statusLabel: 'Đang chờ HĐ Bảo hiểm duyệt', date: '21/08/2026' },
];

const initialState = {
  balance: 350000,
  escrowLocked: 0,
  transactions: initialTransactionsSeed,
  receipts: initialReceiptsSeed,
  insuranceFund: 8200000,
  claims: initialClaimsSeed,
  bankAccount: null,
  subscriptionPro: false,
  vipBusiness: false,
  activePlanCode: null,
  activePlanName: null,
  subscriptionExpiresAt: null,
  effectiveCommissionRate: null,
  badge: null,
  myReliability: 96,
  myApplications: [],
  notifications: [],
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
  conversations: [],
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

function addTxTo(list, type, label, amount, sign, referenceId = null) {
  return [{ id: Date.now() + Math.random(), type, label, amount, sign, referenceId, date: fmtNow() }, ...list];
}

function reducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOGIN_SUCCESS': {
      const { token, userId, fullName, email, roleCode, avatarUrl } = action.payload;
      setAccessToken(token);
      const currentUser = {
        userId,
        fullName,
        email,
        roleCode,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : state.currentUser?.avatarUrl || null
      };
      localStorage.setItem('user', JSON.stringify(currentUser));
      return { ...state, token, currentUser, role: roleCode, isInitializing: false };
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
      const incoming = action.jobs || [];
      const jobs = incoming.map((newJ) => {
        const oldJ = (state.jobs || []).find((x) => String(x.id) === String(newJ.id));
        if (!oldJ) return newJ;
        return {
          ...oldJ,
          ...newJ,
          hiredApplicant: newJ.hiredApplicant || oldJ.hiredApplicant || null,
          hiredApplicantId: newJ.hiredApplicantId || oldJ.hiredApplicantId || null,
          hiredStudentName: newJ.hiredStudentName || oldJ.hiredStudentName || null,
          escrowAmount: newJ.escrowAmount ?? oldJ.escrowAmount ?? null,
        };
      });
      return { ...state, jobs };
    }

    case 'SET_MY_JOBS': {
      const incoming = action.myJobs || [];
      const myJobs = incoming.map((newJ) => {
        const oldJ = (state.myJobs || []).find((x) => String(x.id) === String(newJ.id));
        if (!oldJ) return newJ;
        return {
          ...oldJ,
          ...newJ,
          deadlineReminderSent: oldJ.deadlineReminderSent,
          hiredApplicant: newJ.hiredApplicant || oldJ.hiredApplicant || null,
          hiredApplicantId: newJ.hiredApplicantId || oldJ.hiredApplicantId || null,
          hiredStudentName: newJ.hiredStudentName || oldJ.hiredStudentName || null,
          escrowAmount: newJ.escrowAmount ?? oldJ.escrowAmount ?? null,
        };
      });
      return { ...state, myJobs };
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

    case 'START_EDIT_JOB':
      return { ...state, editingJobId: action.id };
    case 'CLEAR_EDIT_JOB':
      return { ...state, editingJobId: null };

    case 'DELETE_JOB':
      return { ...state, myJobs: state.myJobs.filter((j) => j.id !== action.id) };

    case 'REOPEN_JOB': {
      const myJobs = state.myJobs.map((j) => (String(j.id) === String(action.id) ? { ...j, status: 'open' } : j));
      const jobs = state.jobs.map((j) => (String(j.id) === String(action.id) ? { ...j, status: 'open' } : j));
      return { ...state, myJobs, jobs };
    }

    case 'CANCEL_JOB': {
      const myJobs = state.myJobs.map((j) => (String(j.id) === String(action.id) ? { ...j, status: 'cancelled' } : j));
      const jobs = state.jobs.map((j) => (String(j.id) === String(action.id) ? { ...j, status: 'cancelled' } : j));
      const myApplications = state.myApplications.map((a) => (a.jobId === action.id || a.dashJobId === action.id ? { ...a, status: 'cancelled' } : a));
      return { ...state, myJobs, jobs, myApplications };
    }

    case 'APPLY_JOB': {
      const j = state.jobs.find((x) => x.id === action.id);
      if (!j) return state;
      if (state.appliedJobIds.includes(action.id)) return state;
      const myApp = {
        id: 'ap' + Date.now(), jobId: j.id, dashJobId: j.dashJobId || null,
        title: j.title, emp: j.emp, budget: j.budget, status: 'pending', appliedAt: 'Vừa xong',
      };
      return {
        ...state,
        appliedJobIds: [...state.appliedJobIds, action.id],
        myApplications: [myApp, ...state.myApplications],
      };
    }

    case 'TOGGLE_SAVE_JOB': {
      const isSaved = (state.savedJobIds || []).includes(action.jobId);
      const savedJobIds = isSaved
        ? (state.savedJobIds || []).filter((id) => id !== action.jobId)
        : [...(state.savedJobIds || []), action.jobId];
      localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
      return { ...state, savedJobIds };
    }

    case 'UPDATE_ADS_SETTINGS': {
      const adsSettings = { ...state.adsSettings, ...action.payload };
      localStorage.setItem('adsSettings', JSON.stringify(adsSettings));
      return { ...state, adsSettings };
    }

    case 'HIRE': {
      const { jobId, applicantIdx, applicantName, days, method, applicant, hiredStudentId, escrowAmount } = action.payload;
      const job = state.myJobs.find((j) => String(j.id) === String(jobId)) || { id: jobId, title: 'Công việc', budget: 150000, applicants: [] };
      const selectedName = applicantName || applicant?.name || (job.applicants && job.applicants[applicantIdx]?.name) || 'Sinh viên';
      const rate = commissionRate(state);
      const commission = Math.round((job.budget || 150000) * rate);
      const hireAmount = escrowAmount || (job.budget || 150000);
      if (method === 'wallet' && state.balance < hireAmount) return state;

      const updatedApplicants = (job.applicants || []).map((app) =>
        app.name === selectedName ? app : { ...app, rejected: true }
      );
      const updatedJob = {
        ...job,
        status: 'in_progress',
        hiredApplicant: selectedName,
        hiredStudentName: selectedName,
        hiredApplicantId: hiredStudentId || applicant?.studentId || job.hiredApplicantId || null,
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
      const jobs = (state.jobs || []).map((pj) => (String(pj.id) === String(jobId) ? { ...pj, status: 'filled' } : pj));

      let balance = state.balance;
      let transactions = state.transactions;
      if (method === 'wallet') {
        balance -= hireAmount;
        transactions = addTxTo(transactions, 'escrow_hold', 'Ký quỹ thuê ' + selectedName + ' · ' + job.title, hireAmount, -1, job.id);
      } else {
        transactions = addTxTo(transactions, 'escrow_hold', 'Ký quỹ thuê ' + selectedName + ' · ' + job.title + ' (Thanh toán trực tiếp)', hireAmount, -1, job.id);
      }

      let myApplications = state.myApplications;
      const existingIdx = myApplications.findIndex((x) => String(x.dashJobId) === String(jobId));
      if (existingIdx >= 0) {
        myApplications = myApplications.map((x, i) => (i === existingIdx ? { ...x, status: 'hired' } : x));
      } else {
        const publicJob = jobs.find((pj) => String(pj.id) === String(jobId));
        myApplications = [
          { id: 'ap' + Date.now(), jobId: publicJob ? publicJob.id : null, dashJobId: job.id, title: job.title, emp: publicJob ? publicJob.emp : 'Bạn', budget: job.budget, status: 'hired', appliedAt: 'Vừa xong' },
          ...myApplications,
        ];
      }

      return { ...state, myJobs, jobs, balance, transactions, myApplications };
    }

    case 'MARK_JOB_COMPLETE': {
      const job = state.myJobs.find((j) => j.id === action.id);
      if (!job) return state;
      const rate = commissionRate(state, job);
      const commission = job.commissionAmount || Math.round(job.budget * rate);
      let transactions = state.transactions;
      const isStudent = job.hiredApplicantIsMe || (state.role === 'student' || state.currentUser?.roleCode === 'student');
      const isEmployer = state.role === 'employer' || state.currentUser?.roleCode === 'employer';

      // Chỉ thêm giao dịch nhận thù lao và phí sàn vào ví nếu người dùng hiện tại là Sinh viên
      if (isStudent && !isEmployer) {
        transactions = addTxTo(state.transactions, 'escrow_release', 'Giải ngân cho ' + job.hiredApplicant + ' · ' + job.title, job.budget - commission, 1);
        if (commission > 0) {
          transactions = addTxTo(transactions, 'commission', `Phí nền tảng · ${job.title}`, commission, -1);
        }
      }
      const myJobs = state.myJobs.map((j) => (j.id === action.id ? { ...j, status: 'completed' } : j));
      let myReliability = state.myReliability;
      let myApplications = state.myApplications;
      if (job.hiredApplicantIsMe) {
        myReliability = Math.min(100, myReliability + 3);
        myApplications = myApplications.map((a) => (a.dashJobId === job.id ? { ...a, status: 'completed' } : a));
      }
      const receipt = {
        id: 'rc' + Date.now(), dashJobId: job.id, jobTitle: job.title, budget: job.budget, commission,
        total: job.budget, student: job.hiredApplicant, date: fmtNow(),
      };
      return { ...state, myJobs, transactions, myReliability, myApplications, receipts: [receipt, ...state.receipts], lastReceiptId: receipt.id };
    }

    case 'RECORD_REAL_RECEIPT': {
      const { jobId, deliverableResult } = action.payload;
      const numericJobId = Number(jobId);
      const job = state.myJobs.find((j) => j.id === numericJobId || j.id === jobId) || state.jobs.find((j) => j.id === numericJobId || j.id === jobId);
      if (!job) return state;

      const studentName = job.hiredApplicant || job.hiredStudentName || deliverableResult?.studentName || 'Sinh viên';
      const budget = deliverableResult?.budget ?? job.budget ?? 0;
      const commission = deliverableResult?.commission ?? 0;
      const net = deliverableResult?.netPayout ?? (budget - commission);
      const total = deliverableResult?.total ?? budget;
      const receiptCode = `SB-REC-${job.id}-${Date.now().toString().slice(-4)}`;
      const receipt = {
        id: 'rc-' + job.id + '-' + Date.now(),
        code: receiptCode,
        dashJobId: job.id,
        jobId: job.id,
        jobTitle: job.title,
        budget: budget,
        commission: commission,
        total: total,
        net: net,
        student: studentName,
        employer: job.employerName || 'Nhà tuyển dụng',
        date: fmtNow()
      };

      const myJobs = state.myJobs.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j));
      const jobs = state.jobs.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j));
      const myApplications = state.myApplications.map((a) => (a.jobId === job.id || a.dashJobId === job.id ? { ...a, status: 'completed', jobStatus: 'completed' } : a));

      let transactions = state.transactions;
      // QUAN TRỌNG: Nhà tuyển dụng ĐÃ ký quỹ 100% khi duyệt ứng viên, khi nghiệm thu KHÔNG bị trừ phí sàn và KHÔNG có dòng commission.
      // Chỉ tài khoản Sinh viên thực nhận thù lao mới phát sinh giao dịch nhận tiền và khấu trừ hoa hồng.
      const isStudent = job.hiredApplicantIsMe || (state.role === 'student' || state.currentUser?.roleCode === 'student');
      const isEmployer = state.role === 'employer' || state.currentUser?.roleCode === 'employer' || (!job.hiredApplicantIsMe && Boolean(job.employerId || job.isEmployer));

      if (isStudent && !isEmployer) {
        const txLabel = `Nhận thù lao giải ngân công việc #${job.id} · ${job.title}`;
        const alreadyReleased = transactions.some(
          (t) => (t.type === 'escrow_release' || t.type === 'commission') && (t.referenceId === job.id || t.dashJobId === job.id || t.label === txLabel)
        );
        if (!alreadyReleased) {
          transactions = addTxTo(transactions, 'escrow_release', txLabel, net, 1, job.id);
          if (commission > 0) {
            transactions = addTxTo(transactions, 'commission', `Phí nền tảng · ${job.title}`, commission, -1, job.id);
          }
        }
      }

      return {
        ...state,
        myJobs,
        jobs,
        myApplications,
        transactions,
        receipts: [receipt, ...state.receipts.filter((r) => r.dashJobId !== job.id && r.jobId !== job.id)],
        lastReceiptId: receipt.id
      };
    }

    case 'SUBMIT_DELIVERABLE': {
      const { jobId, mode, url, note, fileName, fileSize, previewDataUrl, finalDataUrl } = action.payload;
      const job = state.myJobs.find((j) => j.id === jobId);
      const wasRevision = job?.status === 'revision_requested';
      const wasUpdate = job?.status === 'submitted' || wasRevision;
      const version = wasUpdate && job?.deliverable ? (job.deliverable.version || 1) + 1 : 1;
      const deliverable = { mode, url: url || '', fileName: fileName || '', fileSize: fileSize || 0, previewDataUrl: previewDataUrl || null, finalDataUrl: finalDataUrl || null, note, submittedAt: fmtNow(), version, status: 'submitted' };
      const myJobs = state.myJobs.map((j) => (j.id === jobId ? { ...j, deliverable, status: 'submitted', hiredApplicantIsMe: true } : j));
      let myApplications = state.myApplications.map((a) => (a.jobId === jobId || a.dashJobId === jobId ? { ...a, status: 'submitted', jobStatus: 'submitted' } : a));
      return { ...state, myJobs, myApplications };
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
      return { ...state, myJobs };
    }

    /* ---- wallet ---- */
    case 'SET_WALLET': {
      return {
        ...state,
        balance: action.balance !== undefined ? action.balance : state.balance,
        escrowLocked: action.escrowLocked !== undefined ? action.escrowLocked : state.escrowLocked,
        transactions: action.transactions || state.transactions,
        receipts: action.receipts !== undefined ? action.receipts : state.receipts,
        vipBusiness: action.vipBusiness !== undefined ? action.vipBusiness : state.vipBusiness,
        subscriptionPro: action.subscriptionPro !== undefined ? action.subscriptionPro : state.subscriptionPro,
        activePlanCode: action.activePlanCode !== undefined ? action.activePlanCode : state.activePlanCode,
        activePlanName: action.activePlanName !== undefined ? action.activePlanName : state.activePlanName,
        subscriptionExpiresAt: action.subscriptionExpiresAt !== undefined ? action.subscriptionExpiresAt : state.subscriptionExpiresAt,
        effectiveCommissionRate: action.effectiveCommissionRate !== undefined ? action.effectiveCommissionRate : state.effectiveCommissionRate,
        badge: action.badge !== undefined ? action.badge : state.badge,
        bankAccount: action.bankAccount !== undefined ? action.bankAccount : state.bankAccount,
      };
    }
    case 'WITHDRAW': {
      if (action.amount > state.balance) return state;
      const balance = state.balance - action.amount;
      const bankLabel = state.bankAccount
        ? `${state.bankAccount.bankName} ****${state.bankAccount.accountNumber ? String(state.bankAccount.accountNumber).slice(-4) : ''}`
        : 'Tài khoản ngân hàng';
      const transactions = addTxTo(state.transactions, 'withdraw', `Rút tiền về ${bankLabel}`, action.amount, -1);
      return { ...state, balance, transactions };
    }
    case 'SUBMIT_CLAIM': {
      const { jobTitle, jobBudget, desc } = action.payload;
      const rate = 0.3 + Math.random() * 0.2;
      const payout = Math.round((jobBudget * rate) / 1000) * 1000;
      let insuranceFund = state.insuranceFund;
      let balance = state.balance;
      let transactions = state.transactions;
      if (insuranceFund >= payout) {
        insuranceFund -= payout;
        balance += payout;
        transactions = addTxTo(transactions, 'insurance_payout', 'Bồi thường Quỹ Bảo hiểm · ' + jobTitle, payout, 1);
      }
      const claims = [{ id: 'c' + Date.now(), jobTitle, desc, payout, status: 'approved', date: 'Vừa xong' }, ...state.claims];
      return { ...state, insuranceFund, balance, transactions, claims };
    }

    case 'UPDATE_BANK_ACCOUNT': {
      return { ...state, bankAccount: action.payload };
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
      return { ...state, affiliateLeads };
    }

    case 'SET_CV':
      return { ...state, cvFile: action.file };
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
      return { ...state, cvFiles: [newCv, ...(state.cvFiles || [])] };
    }
    case 'REMOVE_CV_FILE':
      return { ...state, cvFiles: (state.cvFiles || []).filter((c) => c.id !== action.id) };
    case 'ADD_EMPLOYER_DOCS':
      return { ...state, employerDocs: [...action.files, ...state.employerDocs] };
    case 'REMOVE_EMPLOYER_DOC':
      return { ...state, employerDocs: state.employerDocs.filter((_, i) => i !== action.idx) };
    case 'ADD_PORTFOLIO':
      return { ...state, portfolioUploads: [action.item, ...state.portfolioUploads] };
    case 'REMOVE_PORTFOLIO':
      return { ...state, portfolioUploads: state.portfolioUploads.filter((_, i) => i !== action.idx) };

    /* ---- reviews ---- */
    case 'SUBMIT_REVIEW': {
      const { withName, stars, comment, direction, jobTitle } = action.payload;
      if (direction === 'toEmployer') {
        return {
          ...state,
          employerReviews: [{ name: withName, stars, comment, jobTitle }, ...state.employerReviews],
        };
      }
      const delta = (stars - 3) * 5;
      const myReliability = Math.max(0, Math.min(100, state.myReliability + delta));
      return {
        ...state,
        reviews: [{ name: withName, stars, comment }, ...state.reviews],
        myReliability,
      };
    }

    case 'CHECK_DEADLINES': {
      if (action.reminders && action.reminders.length > 0) {
        const reminderMap = new Map(action.reminders.map((r) => [String(r.jobId), r.level]));
        const myJobs = (state.myJobs || []).map((job) => {
          const level = reminderMap.get(String(job.id));
          return level ? { ...job, deadlineReminderSent: level } : job;
        });
        const myApplications = (state.myApplications || []).map((app) => {
          const level = reminderMap.get(String(app.jobId || app.id));
          return level ? { ...app, deadlineReminderSent: level } : app;
        });
        return { ...state, myJobs, myApplications };
      }

      let changed = false;
      const myJobs = state.myJobs.map((job) => {
        if (['in_progress', 'submitted', 'revision_requested'].includes(job.status) && job.deadlineAt) {
          const deadlineTs = typeof job.deadlineAt === 'number' ? job.deadlineAt : new Date(job.deadlineAt).getTime();
          if (isNaN(deadlineTs)) return job;
          const remain = deadlineTs - Date.now();
          if (remain <= 0 && job.deadlineReminderSent !== 'overdue') {
            changed = true;
            return { ...job, deadlineReminderSent: 'overdue' };
          }
          if (remain > 0 && remain < 12 * 3600000 && !job.deadlineReminderSent) {
            changed = true;
            return { ...job, deadlineReminderSent: 'warning' };
          }
        }
        return job;
      });
      if (!changed) return state;
      return { ...state, myJobs };
    }

    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.notifications };

    case 'MARK_ALL_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'MARK_NOTIF_READ':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };

    case 'TOGGLE_MESSENGER_PANEL':
      return { ...state, messengerPanelOpen: action.open !== undefined ? action.open : !state.messengerPanelOpen };

    case 'OPEN_CHAT_WINDOW': {
      const already = state.openChatIds.some((id) => String(id) === String(action.id));
      const openChatIds = already ? state.openChatIds : [...state.openChatIds, action.id].slice(-3);
      const conversations = state.conversations.map((c) => (String(c.id) === String(action.id) ? { ...c, unread: 0 } : c));
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
      const openChatIds = state.openChatIds.some((id) => String(id) === String(conv.id)) ? state.openChatIds : [...state.openChatIds, conv.id].slice(-3);
      return { ...state, conversations, openChatIds, messengerPanelOpen: false };
    }

    case 'SET_CONVERSATIONS': {
      const existingMap = new Map((state.conversations || []).map((c) => [String(c.id), c]));
      const mapped = action.conversations.map((c) => mapConversationFromApi(c, existingMap.get(String(c.id))));
      return { ...state, conversations: mapped };
    }

    case 'SET_CONVERSATION_MESSAGES': {
      const { id, messages } = action.payload;
      const formattedMessages = messages.map(mapChatMessageFromApi);
      const conversations = state.conversations.map((c) => (String(c.id) === String(id) ? { ...c, messages: formattedMessages } : c));
      return { ...state, conversations };
    }

    case 'RECEIVE_REALTIME_MESSAGE': {
      const rawMsg = action.message;
      const conversationId = rawMsg.conversationId;
      const currentUserId = state.currentUser?.id;
      const isMine = (rawMsg.senderId === currentUserId);
      const newMsg = mapChatMessageFromApi({ ...rawMsg, isMine });
      const isOpen = state.openChatIds.includes(conversationId);

      let found = false;
      const updatedList = (state.conversations || []).map((c) => {
        if (c.id !== conversationId) return c;
        found = true;
        const exists = c.messages.some((m) => m.id === newMsg.id);
        const nextMessages = exists ? c.messages : [...c.messages, newMsg];
        return {
          ...c,
          messages: nextMessages,
          lastTime: 'Vừa xong',
          lastMessageText: newMsg.text || (newMsg.fileUrl ? '[Tệp đính kèm]' : ''),
          unread: (isOpen || isMine) ? 0 : (c.unread || 0) + 1,
        };
      });

      if (!found) {
        return state;
      }

      const activeConvo = updatedList.find((c) => c.id === conversationId);
      const rest = updatedList.filter((c) => c.id !== conversationId);
      return { ...state, conversations: [activeConvo, ...rest] };
    }

    case 'CONVERSATION_READ_SYNC': {
      const { conversationId } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      };
    }

    case 'USER_STATUS_CHANGED': {
      const { userId, isOnline } = action.payload;
      return {
        ...state,
        conversations: (state.conversations || []).map((c) =>
          Number(c.otherUserId) === Number(userId) ? { ...c, online: Boolean(isOnline) } : c
        ),
      };
    }

    case 'ONLINE_USERS_SYNC': {
      const onlineSet = new Set((action.payload.onlineUserIds || []).map(Number));
      return {
        ...state,
        conversations: (state.conversations || []).map((c) => ({
          ...c,
          online: onlineSet.has(Number(c.otherUserId)),
        })),
      };
    }

    case 'CLOSE_CHAT_WINDOW':
      return { ...state, openChatIds: state.openChatIds.filter((id) => String(id) !== String(action.id)) };

    case 'MARK_CONVERSATION_READ':
      return { ...state, conversations: state.conversations.map((c) => (String(c.id) === String(action.id) ? { ...c, unread: 0 } : c)) };

    case 'SEND_CHAT_MESSAGE': {
      const { id, message } = action.payload;
      const conversations = state.conversations.map((c) => {
        if (String(c.id) !== String(id) || c.blocked) return c;
        const newMsg = {
          id: message.id || ('m-' + Date.now()),
          from: 'me',
          time: 'Vừa xong',
          text: message.text || message.messageText || '',
          type: message.type || 'text',
          fileUrl: message.fileUrl || message.attachmentUrl,
          fileName: message.fileName,
          ...message,
        };
        return {
          ...c,
          messages: [...c.messages, newMsg],
          lastTime: 'Vừa xong',
          lastMessageText: newMsg.text || (newMsg.fileUrl ? '[Tệp đính kèm]' : ''),
        };
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

    case 'ARCHIVE_CONVERSATION': {
      const { id, isArchived } = action.payload;
      const conversations = state.conversations.map((c) =>
        String(c.id) === String(id) ? { ...c, isArchived, archived: isArchived } : c
      );
      return { ...state, conversations };
    }

    case 'ACCEPT_MESSAGE_REQUEST': {
      const { id } = action.payload;
      const conversations = state.conversations.map((c) =>
        String(c.id) === String(id) ? { ...c, requestStatus: 'active', kind: 'chat' } : c
      );
      return { ...state, conversations };
    }

    case 'DECLINE_MESSAGE_REQUEST': {
      const { id } = action.payload;
      const conversations = state.conversations.filter((c) => String(c.id) !== String(id));
      return { ...state, conversations, openChatIds: state.openChatIds.filter((cid) => String(cid) !== String(id)) };
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
  const showToastRef = useRef(showToast);
  const stateRef = useRef(state);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  const refreshWallet = useCallback(async () => {
    if (!stateRef.current?.currentUser && !getAccessToken()) {
      return;
    }
    try {
      const res = await walletApi.getMyWallet();
      if (res) {
        const mappedReceipts = mapReceiptsFromApi(res.receipts);
        const mappedBank = res.bankName ? {
          bankBin: res.bankBin,
          bankName: res.bankName,
          accountNumber: res.accountNumber,
          accountHolder: res.accountHolder,
          branch: res.bankBranch,
          isVerified: res.isBankVerified
        } : null;
        dispatch({
          type: 'SET_WALLET',
          balance: res.balance,
          escrowLocked: res.escrowLocked ?? 0,
          bankAccount: mappedBank,
          transactions: (res.transactions || []).map(t => ({
            id: t.id,
            type: t.type,
            label: t.label,
            amount: t.amount,
            sign: t.sign,
            date: t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : 'Vừa xong'
          })),
          receipts: mappedReceipts || undefined,
          vipBusiness: Boolean(res.hasVipSubscription || res.activePlanCode === 'EMP_VIP'),
          subscriptionPro: Boolean(res.hasProSubscription || res.activePlanCode === 'STU_PRO'),
          activePlanCode: res.activePlanCode || null,
          activePlanName: res.activePlanName || null,
          subscriptionExpiresAt: res.subscriptionExpiresAt || null,
          effectiveCommissionRate: res.effectiveCommissionRate !== undefined ? res.effectiveCommissionRate : null,
          badge: res.badge || null
        });
        return res;
      }
    } catch {
      // Bỏ qua khi chưa đăng nhập hoặc lỗi mạng tạm thời
    }
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
        try {
          const profile = await userApi.getUserProfile();
          if (profile && isMounted) {
            dispatch({ type: 'UPDATE_PROFILE', patch: profile });
          }
          if (isMounted) {
            await refreshWallet();
          }
        } catch (e) {
          console.warn('Không thể tải hồ sơ hoặc ví chi tiết khi khởi động:', e);
        }
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
      dispatch({ type: 'SET_JOBS', jobs: items.map(mapPublicJob) });
    } catch (err) {
      console.error('Không thể tải danh sách công việc từ backend:', err);
    }
  }, []);

  const refreshMyJobs = useCallback(async () => {
    try {
      const res = await jobApi.getMyJobs(null, 1, 50);
      const items = res?.items || (Array.isArray(res) ? res : []);
      dispatch({ type: 'SET_MY_JOBS', myJobs: items.map(mapMyJob) });
    } catch (err) {
      console.error('Không thể tải công việc của tôi từ backend:', err);
    }
  }, []);


  const refreshMyApplications = useCallback(async () => {
    try {
      const res = await applicationApi.getMyApplications(1, 50);
      const list = Array.isArray(res) ? res : (res?.items || []);
      const mapped = list.map(mapMyApplication);
      dispatch({ type: 'SET_MY_APPLICATIONS', applications: mapped });
      return mapped;
    } catch (err) {
      console.error('Không thể tải danh sách ứng tuyển từ backend:', err);
      return [];
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications(1, 30);
      if (res?.items) {
        const formatted = res.items.map((n) => {
          const createdAt = new Date(n.createdAt);
          const diffMs = Date.now() - createdAt.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          let time = 'Vừa xong';
          if (diffMins >= 1440) {
            time = `${Math.floor(diffMins / 1440)} ngày trước`;
          } else if (diffMins >= 60) {
            time = `${Math.floor(diffMins / 60)} giờ trước`;
          } else if (diffMins > 1) {
            time = `${diffMins} phút trước`;
          }

          return {
            id: n.id,
            icon: n.icon || 'bell',
            text: n.messageText,
            link: n.link || null,
            read: n.isRead,
            time,
            createdAt: n.createdAt,
          };
        });
        dispatch({ type: 'SET_NOTIFICATIONS', notifications: formatted });
        return formatted;
      }
    } catch {
      // Bỏ qua khi chưa đăng nhập hoặc lỗi mạng tạm thời
    }
    return [];
  }, []);

  const refreshConversations = useCallback(async (tab = 'chat') => {
    try {
      const list = await chatApi.getConversations(tab);
      if (Array.isArray(list)) {
        dispatch({ type: 'SET_CONVERSATIONS', conversations: list });
        return list;
      }
    } catch {
      // Bỏ qua khi chưa đăng nhập hoặc lỗi mạng tạm thời
    }
    return [];
  }, []);

  const fetchConversationMessages = useCallback(async (conversationId, page = 1) => {
    try {
      const result = await chatApi.getConversationMessages(conversationId, { page, pageSize: 50 });
      if (result?.items) {
        dispatch({
          type: 'SET_CONVERSATION_MESSAGES',
          payload: { id: conversationId, messages: result.items },
        });
        return result.items;
      }
    } catch (err) {
      console.warn(`Không thể tải tin nhắn cho hội thoại ${conversationId}:`, err);
    }
    return [];
  }, []);

  const startConversationWithUser = useCallback(async (targetUserId, jobId = null) => {
    try {
      const res = await chatApi.startConversation(targetUserId, jobId);
      await refreshConversations();
      dispatch({ type: 'OPEN_CHAT_WINDOW', id: res.id });
      return res;
    } catch (err) {
      showToast(err?.message || 'Không thể bắt đầu cuộc hội thoại.', 'warning');
      throw err;
    }
  }, [refreshConversations, showToast]);

  // Kết nối và lắng nghe SignalR Chat realtime
  useEffect(() => {
    if (state.isInitializing || !state.currentUser) {
      return;
    }

    // Tải danh sách cuộc trò chuyện thực tế từ backend
    refreshConversations();

    const realtime = connectChatRealtime({
      onReceiveMessage: (message) => {
        dispatch({ type: 'RECEIVE_REALTIME_MESSAGE', message });
      },
      onConversationUpdated: () => {
        refreshConversations();
      },
      onConversationRead: ({ conversationId }) => {
        dispatch({ type: 'CONVERSATION_READ_SYNC', payload: { conversationId } });
      },
      onUserStatusChanged: ({ userId, isOnline }) => {
        dispatch({ type: 'USER_STATUS_CHANGED', payload: { userId, isOnline } });
      },
      onOnlineUsersList: (onlineUserIds) => {
        dispatch({ type: 'ONLINE_USERS_SYNC', payload: { onlineUserIds } });
      },
      onReconnected: () => {
        refreshConversations();
      },
    });

    return () => {
      realtime.stop();
    };
  }, [state.currentUser, state.isInitializing, refreshConversations]);

  // Tải danh mục và danh sách công việc công khai (không cần đăng nhập)
  useEffect(() => {
    jobApi.getCategories()
      .then((cats) => {
        dispatch({ type: 'SET_CATEGORIES', categories: cats });
      })
      .catch((err) => {
        console.error('Không thể tải danh mục từ backend:', err);
      });

    refreshJobs();
  }, [refreshJobs]);

  // Tải dữ liệu cá nhân theo role sau khi quá trình xác thực khởi tạo (refresh token) hoàn tất
  useEffect(() => {
    // Tránh race condition: nếu đang refresh-token khởi động hoặc chưa đăng nhập thì không tải API auth
    if (state.isInitializing || !state.currentUser) {
      return;
    }

    // Tải thông báo thực tế của người dùng từ backend
    refreshNotifications();

    // Nếu là employer, tải danh sách myJobs từ backend
    if (state.currentUser.roleCode === 'employer') {
      refreshMyJobs();
    }

    // Nếu là student đã đăng nhập, tải savedJobIds, cvFiles, myApplications từ API
    if (state.currentUser.roleCode === 'student') {
      jobApi.getSavedJobIds()
        .then((ids) => {
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids });
        })
        .catch(() => {});

      cvApi.getMyCvFiles()
        .then((files) => {
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

      refreshMyApplications();
    }
  }, [state.currentUser, state.isInitializing, refreshMyJobs, refreshMyApplications, refreshNotifications]);

  useEffect(() => {
    const checkDeadlines = () => {
      const isStudent = stateRef.current?.currentUser?.roleCode === 'student';
      const currentJobs = isStudent
        ? (stateRef.current?.myApplications || [])
            .filter((a) => ['hired', 'submitted', 'revision_requested'].includes(a.status))
            .map((a) => ({
              ...a,
              id: a.jobId || a.id,
              status: a.jobStatus || a.status,
              title: a.title || a.jobTitle || 'Công việc',
              deadlineAt: a.deadlineAt,
              hiredApplicant: a.emp || 'sinh viên',
              deadlineReminderSent: a.deadlineReminderSent,
            }))
        : (stateRef.current?.myJobs || []);

      const now = Date.now();
      const reminders = [];

      currentJobs.forEach((job) => {
        if (!['in_progress', 'submitted', 'revision_requested'].includes(job.status)) return;
        if (!job.deadlineAt) return;

        const deadlineTs = typeof job.deadlineAt === 'number' ? job.deadlineAt : new Date(job.deadlineAt).getTime();
        if (isNaN(deadlineTs)) return;
        const remain = deadlineTs - now;

        if (remain <= 0 && job.deadlineReminderSent !== 'overdue') {
          const message = isStudent
            ? `Công việc "${job.title}" đã quá hạn hoàn thành. Vui lòng hoàn tất nộp bài hoặc liên hệ nhà tuyển dụng.`
            : `Công việc "${job.title}" đã quá hạn hoàn thành. Vui lòng liên hệ ${job.hiredApplicant || 'sinh viên'} hoặc gửi khiếu nại nếu cần.`;
          showToastRef.current?.(message, 'warning');
          reminders.push({ jobId: job.id, level: 'overdue' });
        } else if (remain > 0 && remain < 12 * 3600000 && !job.deadlineReminderSent) {
          const message = isStudent
            ? `Công việc "${job.title}" sắp tới hạn (còn dưới 12 giờ). Hãy hoàn thành và nộp bàn giao sớm.`
            : `Công việc "${job.title}" sắp tới hạn (còn dưới 12 giờ). Nhắc ${job.hiredApplicant || 'sinh viên'} nộp bàn giao sớm.`;
          showToastRef.current?.(message, 'clock');
          reminders.push({ jobId: job.id, level: 'warning' });
        }
      });

      if (reminders.length > 0) {
        dispatch({ type: 'CHECK_DEADLINES', reminders });
      }
    };

    checkDeadlines();

    const id = setInterval(() => {
      checkDeadlines();
      if (stateRef.current?.currentUser) {
        refreshNotifications();
      }
    }, 30000);

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
  }, [refreshNotifications]);

  const actions = useMemo(() => {
    const act = {
      refreshJobs,
      refreshMyJobs,
      refreshMyApplications,
      createJobPost: async (jobData) => {
        const result = await jobApi.createJob(jobData);
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Đăng tin tuyển dụng thành công!', 'check');
        return result;
      },
      updateJobPost: async (id, jobData) => {
        const result = await jobApi.updateJob(id, jobData);
        await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
        showToast('Cập nhật tin tuyển dụng thành công!', 'check');
        return result;
      },
      cancelJob: async (id) => {
        try {
          const result = await jobApi.cancelJob(id);
          dispatch({ type: 'CANCEL_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã đóng tin tuyển dụng thành công.', 'ban');
          return result;
        } catch (err) {
          showToast(err?.message || 'Không thể đóng tin tuyển dụng.', 'warning');
          throw err;
        }
      },
      deleteJob: async (id) => {
        try {
          const result = await jobApi.deleteJob(id);
          dispatch({ type: 'DELETE_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã xóa vĩnh viễn tin tuyển dụng.', 'trash');
          return result;
        } catch (err) {
          showToast(err?.message || 'Không thể xóa tin tuyển dụng.', 'warning');
          throw err;
        }
      },
      reopenJob: async (id) => {
        try {
          const result = await jobApi.reopenJob(id);
          dispatch({ type: 'REOPEN_JOB', id });
          await Promise.allSettled([refreshJobs(), refreshMyJobs()]);
          showToast('Đã mở lại tin tuyển dụng thành công!', 'check');
          return result;
        } catch (err) {
          showToast(err?.message || 'Không thể mở lại tin tuyển dụng.', 'warning');
          throw err;
        }
      },
      startEditJob: (id) => dispatch({ type: 'START_EDIT_JOB', id }),
      clearEditJob: () => dispatch({ type: 'CLEAR_EDIT_JOB' }),
      toggleSaveJobAsync: async (jobId) => {
        const isSaved = (state.savedJobIds || []).includes(jobId);
        if (isSaved) {
          await jobApi.unsaveJob(jobId);
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids: (state.savedJobIds || []).filter((id) => id !== jobId) });
          showToast('Đã bỏ lưu công việc.', 'info');
        } else {
          await jobApi.saveJob(jobId);
          dispatch({ type: 'SET_SAVED_JOB_IDS', ids: [...(state.savedJobIds || []), jobId] });
          showToast('Đã lưu công việc vào mục yêu thích!', 'heart');
        }
      },
      applyJobAsync: async (jobId, cvFileId, coverLetter = '') => {
        const result = await applicationApi.applyJob(jobId, cvFileId, coverLetter);
        const apps = await applicationApi.getMyApplications().catch(() => null);
        if (apps) {
          const list = Array.isArray(apps) ? apps : (apps?.items || []);
          dispatch({ type: 'SET_MY_APPLICATIONS', applications: list.map(mapMyApplication) });
        } else {
          dispatch({ type: 'APPLY_JOB', id: jobId });
        }
        return result;
      },
      uploadCvAsync: async (payload) => {
        let created;
        if (payload instanceof FormData) {
          created = await cvApi.uploadCvFile(payload);
        } else if (payload?.file instanceof File || payload?.file instanceof Blob) {
          const formData = new FormData();
          formData.append('file', payload.file);
          if (payload.label) formData.append('label', payload.label);
          if (payload.categoryId) formData.append('categoryId', payload.categoryId);
          created = await cvApi.uploadCvFile(formData);
        } else if (payload?.fileUrl && typeof payload.fileUrl === 'string' && payload.fileUrl.trim()) {
          created = await cvApi.uploadCv(payload);
        } else {
          throw new Error('Vui lòng chọn file CV từ thiết bị để tải lên.');
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
        showToast('Tải lên CV chuyên môn thành công!', 'file-text');
        return formatted;
      },
      deleteCvAsync: async (id) => {
        await cvApi.deleteCv(id);
        dispatch({ type: 'SET_CV_FILES', files: (state.cvFiles || []).filter(c => c.id !== id) });
        showToast('Đã xóa CV.', 'trash');
      },
      hire: async (payload) => {
        const { jobId, applicationId, applicant, days } = payload;
        const appId = applicationId || applicant?.applicationId || applicant?.id;
        let hireResult = null;
        if (jobId && appId && !isNaN(Number(jobId)) && !isNaN(Number(appId))) {
          hireResult = await applicationApi.hireApplicant(Number(jobId), Number(appId), days || 3);
        }
        dispatch({
          type: 'HIRE',
          payload: {
            ...payload,
            applicantName: hireResult?.hiredStudentName || payload.applicantName || payload.applicant?.name,
            hiredStudentId: hireResult?.hiredStudentId,
            escrowAmount: hireResult?.escrowAmount
          }
        });
        await Promise.allSettled([refreshJobs(), refreshMyJobs(), refreshWallet()]);
        showToast('Đã thuê ứng viên và ký quỹ thành công!', 'award');
      },
      markJobComplete: (id) => dispatch({ type: 'MARK_JOB_COMPLETE', id }),
      refreshWallet,
      withdraw: (amount) => { dispatch({ type: 'WITHDRAW', amount }); showToast(`Đã gửi yêu cầu rút ${amount.toLocaleString('vi-VN')}đ.`, 'check'); },
      updateBankAccount: async (payload) => {
        try {
          const res = await walletApi.updateBankAccount({
            bankBin: payload.bankBin || '',
            bankName: payload.bankName,
            accountNumber: payload.accountNumber,
            accountHolder: payload.accountHolder,
            branch: payload.branch || ''
          });
          const mappedBank = res?.bankName ? {
            bankBin: res.bankBin,
            bankName: res.bankName,
            accountNumber: res.accountNumber,
            accountHolder: res.accountHolder,
            branch: res.bankBranch,
            isVerified: res.isBankVerified
          } : payload;
          dispatch({ type: 'UPDATE_BANK_ACCOUNT', payload: mappedBank });
          showToast('Liên kết tài khoản ngân hàng thành công!', 'check');
          return mappedBank;
        } catch (err) {
          showToast(err?.message || 'Không thể lưu tài khoản ngân hàng.', 'warning');
          throw err;
        }
      },
      purchaseSubscription: async (planType) => {
        try {
          const res = await walletApi.purchaseSubscription(planType);
          await refreshWallet();
          showToast(`Chúc mừng! Bạn đã đăng ký thành công gói ${res.planName || ''}!`, 'crown');
          return res;
        } catch (err) {
          showToast(err?.message || 'Không thể đăng ký gói dịch vụ.', 'warning');
          throw err;
        }
      },
      subscribePro: async () => {
        try {
          const res = await walletApi.purchaseSubscription('STU_PRO');
          await refreshWallet();
          showToast('Chúc mừng! Bạn đã đăng ký thành công gói Freelance Pro.', 'star');
          return res;
        } catch (err) {
          showToast(err?.message || 'Không thể đăng ký gói Freelance Pro.', 'warning');
          throw err;
        }
      },
      upgradeVip: async () => {
        try {
          const res = await walletApi.purchaseSubscription('EMP_VIP');
          await refreshWallet();
          showToast('Chúc mừng! Bạn đã nâng cấp VIP Business Suite thành công!', 'crown');
          return res;
        } catch (err) {
          showToast(err?.message || 'Không thể nâng cấp VIP Business Suite.', 'warning');
          throw err;
        }
      },
      submitClaim: (payload) => { dispatch({ type: 'SUBMIT_CLAIM', payload }); showToast('Đội ngũ Dispute Resolution đã xử lý khiếu nại của bạn!', 'shield-check'); },
      submitOneTouchLead: (payload) => { dispatch({ type: 'SUBMIT_ONE_TOUCH_LEAD', payload }); showToast('Đã gửi hồ sơ One-Touch Portfolio thành công!', 'check'); },
      setCv: (file) => { dispatch({ type: 'SET_CV', file }); showToast('Đã tải CV lên hồ sơ.', 'check'); },
      removeCv: () => { dispatch({ type: 'REMOVE_CV' }); showToast('Đã xoá CV khỏi hồ sơ.', 'trash'); },
      addCvFile: (payload) => { dispatch({ type: 'ADD_CV_FILE', payload }); showToast('Đã thêm CV chuyên môn mới!', 'file-text'); },
      removeCvFile: (id) => { dispatch({ type: 'REMOVE_CV_FILE', id }); showToast('Đã xóa CV.', 'trash'); },
      cancelStudentWorkAsync: async (jobId, reason = '') => {
        try {
          await applicationApi.cancelOrWithdrawApplication(jobId, reason);
          await refreshMyApplications();
          showToast('Đã hủy việc thành công.', 'info');
        } catch (err) {
          showToast(err?.message || 'Không thể hủy việc.', 'warning');
          throw err;
        }
      },
      withdrawApplicationAsync: async (jobId) => {
        try {
          await applicationApi.cancelOrWithdrawApplication(jobId, 'Rút đơn');
          await refreshMyApplications();
          showToast('Đã rút đơn ứng tuyển.', 'info');
        } catch (err) {
          showToast(err?.message || 'Không thể rút đơn ứng tuyển.', 'warning');
          throw err;
        }
      },
      addEmployerDocs: (files) => { dispatch({ type: 'ADD_EMPLOYER_DOCS', files }); showToast('Đã cập nhật hồ sơ công ty.', 'check'); },
      removeEmployerDoc: (idx) => dispatch({ type: 'REMOVE_EMPLOYER_DOC', idx }),
      addPortfolio: (item) => { dispatch({ type: 'ADD_PORTFOLIO', item }); showToast('Đã thêm vào portfolio.', 'check'); },
      removePortfolio: (idx) => dispatch({ type: 'REMOVE_PORTFOLIO', idx }),
      submitReview: (payload) => { dispatch({ type: 'SUBMIT_REVIEW', payload }); showToast('Cảm ơn bạn đã gửi đánh giá!', 'check'); },
      markAllNotifRead: async () => {
        dispatch({ type: 'MARK_ALL_NOTIF_READ' });
        try {
          await notificationApi.markAllNotificationsAsRead();
        } catch (err) {
          console.error('Không thể đánh dấu đã đọc tất cả thông báo:', err);
        }
      },
      markNotifRead: async (id) => {
        dispatch({ type: 'MARK_NOTIF_READ', id });
        try {
          await notificationApi.markNotificationAsRead(id);
        } catch (err) {
          console.error(`Không thể đánh dấu đã đọc thông báo ${id}:`, err);
        }
      },
      refreshNotifications,
      refreshConversations,
      fetchConversationMessages,
      startConversationWithUser,
      toggleMessengerPanel: (open) => dispatch({ type: 'TOGGLE_MESSENGER_PANEL', open }),
      openChat: (id) => {
        dispatch({ type: 'OPEN_CHAT_WINDOW', id });
        fetchConversationMessages(id);
      },
      openChatWithPerson: async (name, subtitle, options = {}) => {
        const targetUserId = options?.targetUserId || (typeof options === 'number' ? options : null);
        const jobId = options?.jobId || null;

        if (targetUserId) {
          try {
            const res = await chatApi.startConversation(targetUserId, jobId);
            await refreshConversations();
            dispatch({ type: 'OPEN_CHAT_WINDOW', id: res.id });
            fetchConversationMessages(res.id);
            return res;
          } catch (err) {
            console.warn('Lỗi startConversation:', err);
          }
        }

        const existing = (state.conversations || []).find((c) => c.name?.toLowerCase() === name?.toLowerCase());
        if (existing) {
          dispatch({ type: 'OPEN_CHAT_WINDOW', id: existing.id });
          fetchConversationMessages(existing.id);
          return existing;
        }

        dispatch({ type: 'OPEN_CHAT_WITH_PERSON', payload: { name, subtitle } });
      },
      closeChat: (id) => dispatch({ type: 'CLOSE_CHAT_WINDOW', id }),
      markConversationRead: async (id) => {
        dispatch({ type: 'MARK_CONVERSATION_READ', id });
        try {
          await chatApi.markConversationAsRead(id);
        } catch (err) {
          console.warn(`Lỗi đánh dấu đã đọc hội thoại ${id}:`, err);
        }
      },
      sendChatMessage: async (id, message) => {
        let targetConvId = id;
        const conv = (state.conversations || []).find((c) => String(c.id) === String(id));

        if (isNaN(Number(targetConvId)) || Number(targetConvId) <= 0) {
          if (conv?.otherUserId) {
            try {
              const created = await chatApi.startConversation(conv.otherUserId, conv.jobId);
              if (created?.id) {
                targetConvId = created.id;
                await refreshConversations();
              }
            } catch (e) {
              console.warn('Lỗi tự động tạo cuộc hội thoại thật:', e);
            }
          }
        }

        const tempId = 'temp-' + Date.now();
        dispatch({ type: 'SEND_CHAT_MESSAGE', payload: { id: targetConvId, message: { ...message, id: tempId } } });

        const numericId = Number(targetConvId);
        if (!isNaN(numericId) && numericId > 0) {
          try {
            const sent = await chatApi.sendMessage(numericId, {
              messageText: message.text || message.messageText,
              attachmentUrl: message.fileUrl || message.attachmentUrl,
              attachmentType: message.type,
            });
            return sent;
          } catch (err) {
            showToast(err?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.', 'warning');
          }
        } else {
          showToast('Cuộc hội thoại chưa được đồng bộ trên máy chủ.', 'warning');
        }
      },
      toggleConvFlag: (id, flag) => dispatch({ type: 'TOGGLE_CONV_FLAG', payload: { id, flag } }),
      archiveConversation: async (id, archive = true) => {
        dispatch({ type: 'ARCHIVE_CONVERSATION', payload: { id, isArchived: archive } });
        try {
          await chatApi.toggleArchiveConversation(id, archive);
          showToast(archive ? 'Đã lưu trữ cuộc hội thoại.' : 'Đã khôi phục cuộc hội thoại.', 'info');
        } catch (err) {
          showToast(err?.message || 'Không thể thay đổi trạng thái lưu trữ.', 'warning');
        }
      },
      acceptMessageRequest: async (id) => {
        try {
          await chatApi.acceptMessageRequest(id);
          dispatch({ type: 'ACCEPT_MESSAGE_REQUEST', payload: { id } });
          showToast('Đã chấp nhận yêu cầu tin nhắn.', 'check');
          await refreshConversations('chat');
        } catch (err) {
          showToast(err?.message || 'Không thể chấp nhận yêu cầu.', 'warning');
        }
      },
      declineMessageRequest: async (id) => {
        try {
          await chatApi.declineMessageRequest(id);
          dispatch({ type: 'DECLINE_MESSAGE_REQUEST', payload: { id } });
          showToast('Đã từ chối yêu cầu tin nhắn.', 'info');
          await refreshConversations('request');
        } catch (err) {
          showToast(err?.message || 'Không thể từ chối yêu cầu.', 'warning');
        }
      },
      refreshConversations,
      login: async (email, password) => {
        const result = await loginApi(email, password);
        setAccessToken(result.token);
        dispatch({ type: "AUTH_LOGIN_SUCCESS", payload: result });
        authBroadcast?.postMessage({ type: 'AUTH_LOGIN_SUCCESS', payload: result });
        try {
          const profile = await userApi.getUserProfile();
          if (profile) {
            dispatch({ type: 'UPDATE_PROFILE', patch: profile });
          }
        } catch (e) {
          console.warn('Không thể tải hồ sơ chi tiết khi đăng nhập:', e);
        }
        await refreshWallet();
        showToast(`Chào mừng bạn trở lại, ${result.fullName}!`, 'user');
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
        showToast(`Đã đăng xuất`, 'user');
      },
      reviewDeliverableAsync: async (jobId, deliverableId, reviewData) => {
        const res = await deliverableApi.reviewJobDeliverable(jobId, deliverableId, reviewData);
        await Promise.allSettled([refreshJobs(), refreshMyJobs(), refreshWallet()]);
        if (reviewData?.status === 'accepted') {
          dispatch({ type: 'RECORD_REAL_RECEIPT', payload: { jobId, deliverableResult: res } });
          showToast('Nghiệm thu sản phẩm & giải ngân thành công!', 'check');
        } else if (reviewData?.status === 'revision_requested') {
          showToast('Đã gửi yêu cầu chỉnh sửa sản phẩm.', 'edit');
        }
        return res;
      },
      updateProfile: async (patch) => {
        try {
          const res = await userApi.updateUserProfile({
            fullName: patch.fullName,
            phoneNumber: patch.phoneNumber || patch.phone || null,
            school: patch.school || null,
            companyDescription: patch.companyDescription || patch.bio || null,
            industry: patch.industry || null,
            companySize: patch.companySize || null,
            website: patch.website || null
          });
          dispatch({ type: 'UPDATE_PROFILE', patch: { ...patch, ...res } });
          showToast('Đã cập nhật thông tin tài khoản.', 'check');
          return res;
        } catch (err) {
          showToast(err.message || 'Không thể lưu thông tin tài khoản. Vui lòng thử lại.', 'x');
          throw err;
        }
      },
      changePassword: async (currentPassword, newPassword) => {
        const result = await changePasswordApi(currentPassword, newPassword);
        showToast(result?.message || 'Đã đổi mật khẩu thành công.', 'check');
        return result;
      },
      register: async (fullNameOrData, email, password, phoneNumber, roleCode) => {
        return registerApi(fullNameOrData, email, password, phoneNumber, roleCode);
      },
      updateAdsSettings: (patch) => {
        dispatch({ type: 'UPDATE_ADS_SETTINGS', payload: patch });
        showToast('Đã lưu cài đặt chiến dịch quảng cáo.', 'info');
      }
    };
    act.cancelJobPost = act.cancelJob;
    act.deleteJobPost = act.deleteJob;
    act.reopenJobPost = act.reopenJob;
    act.applyJob = act.applyJobAsync;
    act.toggleSaveJob = act.toggleSaveJobAsync;
    return act;
  },
  [showToast, state.savedJobIds, refreshJobs, refreshMyJobs, refreshMyApplications, refreshWallet, state.cvFiles, state.myApplications, refreshNotifications, refreshConversations, fetchConversationMessages, startConversationWithUser]
);

  const value = useMemo(() => ({ state, dispatch, showToast, ...actions }), [state, actions, showToast]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

export function fmtVND(n) {
  return (n || 0).toLocaleString('vi-VN') + 'đ';
}