export const usersSeed = [
  { id: 'u1', name: 'Minh Anh', email: 'minhanh@fpt.edu.vn', role: 'student', school: 'FPT University', kyc: 'verified', reliability: 96, status: 'active' },
  { id: 'u2', name: 'Trà Sữa Mộc', email: 'contact@trasuamoc.vn', role: 'employer', school: '—', kyc: 'verified', reliability: 91, status: 'active' },
  { id: 'u3', name: 'Đức Huy', email: 'huy.nd@ueh.edu.vn', role: 'student', school: 'UEH', kyc: 'pending', reliability: 78, status: 'pending' },
  { id: 'u4', name: 'Cỏ May Agency', email: 'hr@comayagency.vn', role: 'employer', school: '—', kyc: 'verified', reliability: 88, status: 'active' },
  { id: 'u5', name: 'Nguyễn Văn Bình', email: 'binhnv@rmit.edu.vn', role: 'student', school: 'RMIT Vietnam', kyc: 'verified', reliability: 42, status: 'locked' },
  { id: 'u6', name: 'Thảo Vy', email: 'vy.thao@ftu.edu.vn', role: 'student', school: 'Ngoại Thương', kyc: 'verified', reliability: 18, status: 'blacklisted' },
  { id: 'u7', name: 'Song Ngư Studio', email: 'info@songngu.vn', role: 'employer', school: '—', kyc: 'pending', reliability: 65, status: 'pending' },
  { id: 'u8', name: 'Gia Bảo', email: 'baog@hust.edu.vn', role: 'student', school: 'Bách Khoa', kyc: 'verified', reliability: 100, status: 'active' },
];

export const blacklistSeed = [
  { name: 'Thảo Vy', reason: 'Bỏ ngang 2 công việc liên tiếp không thông báo', date: '12/07/2026' },
  { name: 'Shop ABC Fashion', reason: 'Không thanh toán sau khi nhận sản phẩm', date: '03/06/2026' },
];

export const moderationQueueSeed = [
  { id: 'm1', title: 'Cần gấp SV làm luận văn thuê', emp: 'Ẩn danh 0987xxxx', flag: 'Nghi ngờ vi phạm học thuật', risk: 'high' },
  { id: 'm2', title: 'Thiết kế bộ nhận diện thương hiệu quán cafe', emp: 'Mèo Béo Coffee', flag: 'Tin mới, chưa xác thực', risk: 'low' },
  { id: 'm3', title: 'Tuyển CTV nhập liệu, lương cao bất thường', emp: 'CôngTyXYZ99', flag: 'Nghi ngờ ghost job / lừa đảo', risk: 'high' },
  { id: 'm4', title: 'Dựng video review sản phẩm mỹ phẩm', emp: 'GlowUp Cosmetics', flag: 'Tin mới, chưa xác thực', risk: 'medium' },
];

export const categoriesSeed = [
  'Video Editing', 'Graphic Design', 'Content Marketing', 'Data Entry', 'Dịch thuật', 'Lập trình web cơ bản',
];

export const featuredRequestsSeed = [
  { id: 'f1', title: 'Dựng video TikTok quảng cáo trà sữa 30s', emp: 'Trà Sữa Mộc', paid: 20000 },
  { id: 'f2', title: 'Thiết kế poster sự kiện trường ĐH', emp: 'Cỏ May Agency', paid: 20000 },
];

export const disputesSeed = [
  {
    id: 'd1', jobTitle: 'Dựng video giới thiệu sản phẩm', student: 'Đức Huy', employer: 'ABC Cosmetics',
    reason: 'Nhà tuyển dụng không thanh toán sau khi nhận sản phẩm', amount: 300000, status: 'open', evidence: 'Ảnh chụp màn hình chat + link file đã giao lúc 21:40 ngày 28/07.',
  },
  {
    id: 'd2', jobTitle: 'Nhập liệu 2.000 dòng khảo sát', student: 'Thảo Vy', employer: 'Song Ngư Studio',
    reason: 'Sinh viên giao sai định dạng, không sửa theo yêu cầu', amount: 150000, status: 'open', evidence: 'File Excel đính kèm sai cột dữ liệu so với yêu cầu ban đầu.',
  },
  {
    id: 'd3', jobTitle: 'Thiết kế banner Fanpage', student: 'Gia Bảo', employer: 'Mèo Béo Coffee',
    reason: 'Nhà tuyển dụng phản hồi chậm, sinh viên khiếu nại chưa được thanh toán đúng hạn', amount: 80000, status: 'closed',
    decision: 'accept', payout: 32000, resolvedNote: 'Bằng chứng cho thấy sinh viên đã giao đúng brief, NTD chậm thanh toán không có lý do — chấp nhận bồi thường 40%.', evidence: 'File thiết kế banner + timestamp giao lúc 15:20 ngày 30/07.',
  },
];

export const subscriptionsSeed = [
  { id: 'sub1', user: 'Minh Anh', plan: 'Freelance Pro', renewAt: '15/09/2026', status: 'active' },
  { id: 'sub2', user: 'Cỏ May Agency', plan: 'VIP Business Suite', renewAt: '02/09/2026', status: 'active' },
  { id: 'sub3', user: 'Gia Bảo', plan: 'Freelance Pro', renewAt: '01/08/2026', status: 'expiring' },
];

export const partnersSeed = [
  { id: 'p1', name: 'CareerViet', category: 'Tuyển dụng toàn quốc', status: 'approved' },
  { id: 'p2', name: 'TopCV', category: 'Nền tảng CV & tuyển dụng', status: 'approved' },
  { id: 'p3', name: 'GlowUp Cosmetics', category: 'Thương hiệu mỹ phẩm', status: 'pending' },
];

export const campaignsSeed = [
  { id: 'c1', company: 'CareerViet', budget: 5000000, spent: 3120000, clicks: 1300, status: 'active' },
  { id: 'c2', company: 'TopCV', budget: 3000000, spent: 2980000, clicks: 1242, status: 'active' },
  { id: 'c3', company: 'GlowUp Cosmetics', budget: 1000000, spent: 0, clicks: 0, status: 'paused' },
];

export const adContentQueueSeed = [
  { id: 'ac1', sponsor: 'GlowUp Cosmetics', title: 'Tuyển CTV review mỹ phẩm trên TikTok', status: 'pending' },
];

export const ticketsSeed = [
  { id: 't1', user: 'Đức Huy', subject: 'Không rút được tiền về ngân hàng', priority: 'high', status: 'open' },
  { id: 't2', user: 'Mèo Béo Coffee', subject: 'Không thấy tin đăng sau khi duyệt', priority: 'medium', status: 'open' },
  { id: 't3', user: 'Gia Bảo', subject: 'Hỏi về cách tính điểm Reliability', priority: 'low', status: 'closed' },
];

export const auditLogSeed = [
  { time: '07/08/2026 09:12', actor: 'Super Admin', action: 'Khoá tài khoản Nguyễn Văn Bình do Reliability < 50' },
  { time: '06/08/2026 17:40', actor: 'Dispute Officer', action: 'Đóng case tranh chấp #d3, bồi thường 32.000đ' },
  { time: '06/08/2026 10:05', actor: 'Content Moderator', action: 'Duyệt tin "Thiết kế poster sự kiện trường ĐH"' },
];

export const rolesSeed = [
  { id: 'super', name: 'Super Admin', desc: 'Toàn quyền trên mọi module', modules: ['Người dùng', 'Nội dung', 'Tranh chấp', 'Tài chính', 'Đối tác', 'Phân tích', 'Vận hành', 'Phân quyền'] },
  { id: 'moderator', name: 'Content Moderator', desc: 'Duyệt tin đăng, quản lý danh mục', modules: ['Nội dung'] },
  { id: 'dispute', name: 'Dispute Officer', desc: 'Xử lý tranh chấp & bồi thường', modules: ['Tranh chấp'] },
  { id: 'finance', name: 'Finance Viewer', desc: 'Xem báo cáo tài chính (chỉ đọc)', modules: ['Tài chính'] },
];

export const teamSeed = [
  { name: 'Ngọc Trâm', email: 'tram.ops@skillbridge.vn', role: 'super' },
  { name: 'Anh Quân', email: 'quan.mod@skillbridge.vn', role: 'moderator' },
  { name: 'Bích Ngọc', email: 'ngoc.dispute@skillbridge.vn', role: 'dispute' },
  { name: 'Hải Đăng', email: 'dang.finance@skillbridge.vn', role: 'finance' },
];

export const revenueBarsSeed = [
  { label: 'Hoa hồng công việc', value: 18400000, max: 20000000 },
  { label: 'Gói Freelance Pro', value: 6200000, max: 20000000 },
  { label: 'VIP Business Suite', value: 4990000, max: 20000000 },
  { label: 'Featured Listing', value: 1200000, max: 20000000 },
];

export const growthBarsSeed = [
  { label: 'FPT University', value: 1240, max: 1500 },
  { label: 'UEH', value: 980, max: 1500 },
  { label: 'RMIT Vietnam', value: 760, max: 1500 },
  { label: 'Ngoại Thương', value: 690, max: 1500 },
  { label: 'Bách Khoa', value: 1120, max: 1500 },
];

export const funnelSeed = [
  { label: 'Đăng ký', value: 10000 },
  { label: 'Xác thực email trường', value: 8600 },
  { label: 'Đăng tin / Ứng tuyển', value: 5400 },
  { label: 'Hoàn thành công việc', value: 3100 },
  { label: 'Thanh toán thành công', value: 2950 },
];
