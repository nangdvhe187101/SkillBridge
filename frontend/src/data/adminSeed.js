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
  {
    id: 'm1',
    title: 'Cần gấp SV làm luận văn & tiểu luận thuê',
    emp: 'Ẩn danh (0987xxxx)',
    empEmail: 'guest99@gmail.com',
    budget: 800000,
    cat: 'Học thuật / Viết lách',
    desc: 'Cần thuê 1 bạn sinh viên làm hộ toàn bộ tiểu luận môn Triết học và Pháp luật đại cương, độ dài khoảng 35 trang, yêu cầu giao bài trước 23h ngày mai.',
    req: ['Cam kết bảo mật tuyệt đối', 'Không dùng công cụ AI phát hiện đạo văn'],
    flag: 'Nghi ngờ vi phạm quy chế liêm chính học thuật',
    risk: 'high',
    riskReason: 'Tin đăng có nội dung vi phạm chính sách Liêm chính học thuật (Academic Integrity) của SkillBridge và yêu cầu thanh toán ngoài sàn.',
    attachments: [{ name: 'De_Bai_Tieu_Luan_Mau.docx', size: 320000 }],
    postedAt: 'Hôm nay lúc 14:15'
  },
  {
    id: 'm2',
    title: 'Thiết kế bộ nhận diện thương hiệu quán cafe vintage',
    emp: 'Mèo Béo Coffee',
    empEmail: 'meobeo@coffee.vn',
    budget: 450000,
    cat: 'Graphic Design',
    desc: 'Thiết kế trọn bộ nhận diện quán cà phê gồm: Logo phong cách retro, Menu A4 2 mặt, và mẫu cốc giấy in thương hiệu.',
    req: ['Thành thạo Illustrator / Photoshop', 'Có gu thẩm mỹ vintage / retro', 'Giao file vector in ấn'],
    flag: 'Tin mới từ tài khoản doanh nghiệp mới tạo',
    risk: 'low',
    riskReason: 'Doanh nghiệp mới đăng ký, nội dung và ngân sách phù hợp tiêu chuẩn kiểm duyệt.',
    attachments: [{ name: 'Moodboard_ThamKhao.pdf', size: 2100000 }],
    postedAt: 'Hôm nay lúc 11:30'
  },
  {
    id: 'm3',
    title: 'Tuyển CTV nhập liệu tại nhà lương 500k/ngày',
    emp: 'CôngTyXYZ99',
    empEmail: 'tuyendungxyz@hotmail.com',
    budget: 1500000,
    cat: 'Data Entry',
    desc: 'Việc nhẹ lương cao, chỉ cần copy paste văn bản kiếm 500k/ngày, yêu cầu kết bạn Telegram để được hướng dẫn đặt cọc nhận tài liệu.',
    req: ['Có tài khoản Telegram', 'Có thẻ ngân hàng để nhận tiền'],
    flag: 'Nghi ngờ ghost job / lừa đảo đặt cọc Telegram',
    risk: 'high',
    riskReason: 'Nghi vấn lừa đảo tuyển dụng chuyển hướng sang Telegram để lừa tiền cọc của sinh viên (Ghost Job Scam).',
    attachments: [],
    postedAt: 'Hôm nay lúc 09:00'
  },
  {
    id: 'm4',
    title: 'Dựng video review sản phẩm serum dưỡng ẩm TikTok',
    emp: 'GlowUp Cosmetics',
    empEmail: 'marketing@glowup.vn',
    budget: 350000,
    cat: 'Video Editing',
    desc: 'Dựng 1 clip ngắn 45s từ footage có sẵn của shop, chèn hiệu ứng giọt nước, text động và lồng tiếng giới thiệu sản phẩm.',
    req: ['Thành thạo CapCut / Premiere', 'Bắt trend nhạc TikTok'],
    flag: 'Tin mới cần kiểm duyệt nội dung video footage',
    risk: 'medium',
    riskReason: 'Cần đối soát tệp brief đính kèm đảm bảo không chứa sản phẩm bị cấm quảng cáo.',
    attachments: [{ name: 'KichBan_Review_GlowUp.pdf', size: 850000 }],
    postedAt: 'Hôm qua lúc 16:45'
  },
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
    id: 'd1',
    jobTitle: 'Dựng video giới thiệu sản phẩm mỹ phẩm 45s',
    student: 'Đức Huy',
    studentEmail: 'huy.nd@ueh.edu.vn',
    studentReliability: 78,
    employer: 'ABC Cosmetics',
    employerEmail: 'contact@abccosmetics.vn',
    employerReliability: 65,
    amount: 300000,
    status: 'open',
    filedAt: '28/07/2026 22:15',
    deadlineAt: '28/07/2026 18:00',
    reason: 'Nhà tuyển dụng không xác nhận nghiệm thu và không phản hồi sau khi nhận đủ video hoàn chỉnh.',
    studentStatement: 'Tôi đã bàn giao video bản v1 đúng hẹn lúc 17:30 ngày 28/07. NTD yêu cầu đổi nhạc nền lúc 19:00, tôi đã xuất bản v2 hoàn chỉnh và gửi lại lúc 21:40. Tuy nhiên sau đó NTD đã tải video về đăng lên kênh TikTok của họ nhưng không bấm xác nhận giải ngân trên SkillBridge và không trả lời tin nhắn.',
    employerStatement: 'Video của sinh viên màu sắc chưa đạt chuẩn nhận diện thương hiệu, chúng tôi đang bận chưa kịp phản hồi thì đã bị gửi khiếu nại.',
    evidence: 'Ảnh chụp màn hình kênh TikTok của NTD đã đăng tải đúng video và link chat trao đổi lúc 21:40 ngày 28/07.',
    files: [
      { name: 'Video_BanGiao_Final_v2.mp4', size: 24500000, type: 'video' },
      { name: 'AnhChup_TikTok_DaDang.png', size: 1200000, type: 'image' },
      { name: 'LichSu_Chat_Zalo_2807.pdf', size: 850000, type: 'doc' },
      { name: 'Brief_Goc_ABCCosmetics.pdf', size: 1400000, type: 'doc' },
    ],
    timeline: [
      { time: '26/07 09:00', event: 'NTD ký quỹ 300.000đ vào Escrow và giao việc cho SV Đức Huy' },
      { time: '28/07 17:30', event: 'SV nộp bàn giao bản nháp v1 trước deadline' },
      { time: '28/07 19:00', event: 'NTD yêu cầu sửa lại nhạc nền (Lượt sửa 1/2)' },
      { time: '28/07 21:40', event: 'SV nộp lại bản v2 hoàn chỉnh' },
      { time: '28/07 22:15', event: 'SV mở khiếu nại do NTD im lặng nhưng đã đăng video lên TikTok' },
    ]
  },
  {
    id: 'd2',
    jobTitle: 'Nhập liệu 2.000 dòng danh mục khảo sát vào Excel',
    student: 'Thảo Vy',
    studentEmail: 'vy.thao@ftu.edu.vn',
    studentReliability: 18,
    employer: 'Song Ngư Studio',
    employerEmail: 'info@songngu.vn',
    employerReliability: 85,
    amount: 150000,
    status: 'open',
    filedAt: '29/07/2026 14:30',
    deadlineAt: '27/07/2026 23:59',
    reason: 'Sinh viên nộp bài trễ 2 ngày, dữ liệu nhập sai định dạng cột và từ chối chỉnh sửa theo yêu cầu.',
    studentStatement: 'Do em bận thi học kỳ nên nộp trễ một chút, file dữ liệu em đã nhập đủ 2000 dòng.',
    employerStatement: 'Sinh viên nộp bài trễ 48 tiếng làm chậm tiến độ báo cáo của công ty. Ngoài ra cột giá trị số bị chuyển thành text sai hoàn toàn template Excel mẫu đã giao.',
    evidence: 'File Excel đối chiếu lỗi định dạng cột và lịch sử timestamp nộp trễ deadline 48 giờ.',
    files: [
      { name: 'File_Excel_LoiDinhDang_v1.xlsx', size: 650000, type: 'doc' },
      { name: 'Template_Mau_BanDau.xlsx', size: 450000, type: 'doc' },
    ],
    timeline: [
      { time: '25/07 10:00', event: 'Ký kết hợp đồng nhập liệu 2.000 dòng, hạn 27/07' },
      { time: '27/07 23:59', event: 'Hết hạn bàn giao — SV chưa nộp bài' },
      { time: '29/07 12:00', event: 'SV nộp file trễ 2 ngày, dữ liệu lỗi định dạng' },
      { time: '29/07 14:30', event: 'NTD gửi yêu cầu hủy và hoàn tiền ký quỹ' },
    ]
  },
  {
    id: 'd3',
    jobTitle: 'Thiết kế banner Fanpage khai trương quán cà phê',
    student: 'Gia Bảo',
    studentEmail: 'baog@hust.edu.vn',
    studentReliability: 100,
    employer: 'Mèo Béo Coffee',
    employerEmail: 'meobeo@coffee.vn',
    employerReliability: 70,
    amount: 80000,
    status: 'closed',
    filedAt: '30/07/2026 10:00',
    decision: 'accept',
    payout: 40000,
    resolvedNote: 'Bằng chứng cho thấy sinh viên đã giao đúng brief 100% trước deadline. NTD chậm thanh toán do quên mật khẩu — phán quyết bồi thường 50% từ Quỹ Bảo hiểm và nhắc nhở NTD.',
    evidence: 'File thiết kế banner PNG chuẩn size + timestamp giao lúc 15:20 ngày 30/07.',
    files: [
      { name: 'Banner_Fanpage_Final.png', size: 3200000, type: 'image' },
      { name: 'File_ThietKe_Goc.psd', size: 45000000, type: 'doc' },
    ],
    timeline: [
      { time: '29/07 14:00', event: 'Ký quỹ thiết kế banner 80.000đ' },
      { time: '30/07 15:20', event: 'SV bàn giao file đúng chuẩn' },
      { time: '31/07 11:00', event: 'Admin phán quyết bồi thường thành công' },
    ]
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
  {
    id: 't1',
    user: 'Đức Huy',
    userEmail: 'huy.nd@ueh.edu.vn',
    subject: 'Lỗi rút tiền ví SkillBridge về ngân hàng Vietcombank',
    priority: 'high',
    status: 'open',
    createdAt: '08/08/2026 14:20',
    message: 'Chào Admin, em vừa hoàn thành công việc dựng video TikTok và được NTD giải ngân 250.000đ vào ví SkillBridge. Khi em thực hiện lệnh rút tiền về STK Vietcombank 0123456789 thì hệ thống báo lỗi cổng thanh toán và tiền bị giữ lại. Mong admin kiểm tra và hỗ trợ giải ngân giúp em.',
    replies: [
      { sender: 'Hệ thống SkillBridge', time: '08/08/2026 14:21', text: 'Hệ thống đã ghi nhận yêu cầu hỗ trợ mã #T1. Chuyên viên hỗ trợ sẽ phản hồi trong vòng 30 phút.' }
    ]
  },
  {
    id: 't2',
    user: 'Mèo Béo Coffee',
    userEmail: 'meobeo@coffee.vn',
    subject: 'Tin tuyển dụng thiết kế poster chưa hiển thị trên trang tìm việc',
    priority: 'medium',
    status: 'open',
    createdAt: '08/08/2026 11:05',
    message: 'Chúng tôi vừa đăng tin tuyển sinh viên thiết kế poster và đã thanh toán gói Featured 20.000đ lúc 10:45. Nhưng vào mục Tìm việc vẫn chưa thấy xuất hiện tin. Nhờ admin kiểm tra trạng thái duyệt giúp công ty.',
    replies: []
  },
  {
    id: 't3',
    user: 'Gia Bảo',
    userEmail: 'baog@hust.edu.vn',
    subject: 'Thắc mắc về điều kiện xét duyệt Gold Tier',
    priority: 'low',
    status: 'closed',
    createdAt: '07/08/2026 09:30',
    message: 'Em đã đạt 100 điểm Reliability và hoàn thành 15 việc, em muốn hỏi sau bao lâu thì hệ thống tự động gắn huy hiệu Gold Tier trên hồ sơ cá nhân?',
    replies: [
      { sender: 'Admin Support (Anh Quân)', time: '07/08/2026 10:15', text: 'Chào Gia Bảo, hệ thống tự động quét và nâng cấp thứ hạng Gold Tier vào 00:00 hàng ngày. Tài khoản của bạn hiện đã được kích hoạt huy hiệu Gold Tier rồi nhé!' }
    ]
  },
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

export const featuresSeed = [
  { id: 'f_jobs', name: 'Xem danh sách việc làm', url: '/jobs', group: 'Việc làm', roles: ['guest', 'student', 'employer', 'admin'] },
  { id: 'f_job_detail', name: 'Chi tiết việc làm & Tải đề bài', url: '/jobs/:id', group: 'Việc làm', roles: ['guest', 'student', 'employer', 'admin'] },
  { id: 'f_post_job', name: 'Đăng tin tuyển dụng & Đính kèm file', url: '/post-job', group: 'Tuyển dụng', roles: ['employer', 'admin'] },
  { id: 'f_applicants', name: 'Quản lý ứng viên & Phê duyệt tuyển', url: '/dashboard/jobs/:id', group: 'Tuyển dụng', roles: ['employer', 'admin'] },
  { id: 'f_dashboard', name: 'Dashboard Doanh nghiệp & Quản lý việc', url: '/dashboard', group: 'Tuyển dụng', roles: ['employer', 'admin'] },
  { id: 'f_mywork', name: 'Không gian làm việc & Nộp bài SV', url: '/mywork', group: 'Sinh viên', roles: ['student', 'admin'] },
  { id: 'f_wallet', name: 'Ví SkillBridge, Nạp/Rút & Ký quỹ Escrow', url: '/wallet', group: 'Tài chính', roles: ['student', 'employer', 'admin'] },
  { id: 'f_insurance_claim', name: 'Gửi khiếu nại bồi thường Bảo hiểm', url: '/wallet/claim', group: 'Tài chính', roles: ['student', 'admin'] },
  { id: 'f_messages', name: 'Hộp thư tin nhắn trực tuyến', url: '/messages', group: 'Giao tiếp', roles: ['student', 'employer', 'admin'] },
  { id: 'f_profile_student', name: 'Hồ sơ & Showcase Portfolio', url: '/profile (student)', group: 'Sinh viên', roles: ['student', 'admin'] },
  { id: 'f_profile_company', name: 'Trang thông tin Doanh nghiệp', url: '/company/:slug', group: 'Doanh nghiệp', roles: ['guest', 'student', 'employer', 'admin'] },
  { id: 'f_settings_emp', name: 'Cài đặt tài khoản Doanh nghiệp', url: '/settings (employer)', group: 'Hệ thống', roles: ['employer', 'admin'] },
  { id: 'f_settings_stu', name: 'Cài đặt tài khoản Sinh viên', url: '/settings (student)', group: 'Hệ thống', roles: ['student', 'admin'] },
  { id: 'f_pricing', name: 'Bảng giá Freelance Pro & VIP Business', url: '/pricing', group: 'Tài chính', roles: ['guest', 'student', 'employer', 'admin'] },
  { id: 'f_admin_users', name: 'Quản lý Người dùng & eKYC', url: '/admin/users', group: 'Quản trị', roles: ['admin'] },
  { id: 'f_admin_content', name: 'Kiểm duyệt Tin đăng & Danh mục', url: '/admin/content', group: 'Quản trị', roles: ['admin'] },
  { id: 'f_admin_disputes', name: 'Trọng tài Xử lý Tranh chấp', url: '/admin/disputes', group: 'Quản trị', roles: ['admin'] },
  { id: 'f_admin_finance', name: 'Doanh thu & Quỹ Bảo hiểm', url: '/admin/finance', group: 'Quản trị', roles: ['admin'] },
  { id: 'f_admin_messages', name: 'Giám sát Tin nhắn & Chống lừa đảo', url: '/admin/messages', group: 'Quản trị', roles: ['admin'] },
  { id: 'f_admin_rbac', name: 'Phân quyền Tính năng & URL Matrix', url: '/admin/roles', group: 'Quản trị', roles: ['admin'] },
];

export const adminChatsSeed = [
  {
    id: 'ch1',
    jobTitle: 'Dựng video TikTok quảng cáo trà sữa 30s',
    student: 'Đức Huy',
    studentEmail: 'huy.nd@ueh.edu.vn',
    employer: 'Trà Sữa Mộc',
    employerEmail: 'contact@trasuamoc.vn',
    lastMessage: 'Em đã gửi file video bản v2 qua link Drive nhé anh.',
    lastTime: '10:45 Hôm nay',
    status: 'active',
    riskFlag: null,
    messages: [
      { id: 'm1', sender: 'Trà Sữa Mộc', text: 'Chào Huy, shop cần đổi lại nhạc nền tươi vui hơn một chút nhé.', time: '09:30' },
      { id: 'm2', sender: 'Đức Huy', text: 'Dạ vâng, em đang render lại bản mới ạ.', time: '10:15' },
      { id: 'm3', sender: 'Đức Huy', text: 'Em đã gửi file video bản v2 qua link Drive nhé anh.', time: '10:45' },
    ]
  },
  {
    id: 'ch2',
    jobTitle: 'Nhập liệu 2.000 dòng danh mục khảo sát',
    student: 'Thảo Vy',
    studentEmail: 'vy.thao@ftu.edu.vn',
    employer: 'Ẩn danh (0987xxxx)',
    employerEmail: 'tuyendungxyz@hotmail.com',
    lastMessage: 'Bạn add Zalo 0987xxxx hoặc Telegram @tuyendungxyz để nhận tiền cọc nhé.',
    lastTime: '08:20 Hôm nay',
    status: 'warned',
    riskFlag: '⚠️ Nghi vấn gian lận: Yêu cầu chuyển sang Zalo/Telegram đặt cọc ngoài sàn.',
    messages: [
      { id: 'm1', sender: 'Ẩn danh (0987xxxx)', text: 'Chào em, công việc này bên anh trả 500k/ngày nhé.', time: '08:15' },
      { id: 'm2', sender: 'Ẩn danh (0987xxxx)', text: 'Bạn add Zalo 0987xxxx hoặc Telegram @tuyendungxyz để nhận tiền cọc nhé.', time: '08:20', isViolation: true },
      { id: 'm3', sender: 'Hệ thống SkillBridge', text: '⚠️ CẢNH BÁO: SkillBridge nghiêm cấm giao dịch hoặc đặt cọc ngoài sàn. Mọi trao đổi ngoài nền tảng sẽ không được Quỹ Bảo hiểm bảo vệ.', time: '08:21', isSystem: true },
    ]
  },
  {
    id: 'ch3',
    jobTitle: 'Thiết kế bộ nhận diện thương hiệu vintage',
    student: 'Minh Anh',
    studentEmail: 'minhanh@fpt.edu.vn',
    employer: 'Mèo Béo Coffee',
    employerEmail: 'meobeo@coffee.vn',
    lastMessage: 'Logo nhìn rất ưng ý! Bạn xuất giúp mình file vector chuẩn in ấn nhé.',
    lastTime: 'Hôm qua lúc 16:30',
    status: 'active',
    riskFlag: null,
    messages: [
      { id: 'm1', sender: 'Minh Anh', text: 'Em gửi bản phác thảo 3 mẫu logo cafe retro ạ.', time: '14:20' },
      { id: 'm2', sender: 'Mèo Béo Coffee', text: 'Logo nhìn rất ưng ý! Bạn xuất giúp mình file vector chuẩn in ấn nhé.', time: '16:30' },
    ]
  },
];
