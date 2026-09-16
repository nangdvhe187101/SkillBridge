export const jobsSeed = [
  {
    id: 1, title: "Dựng video TikTok quảng cáo trà sữa 30s", emp: "Trà Sữa Mộc", loc: "TP.HCM", cat: "Video Editing", budget: 250000, urgent: true, time: "2 giờ trước",
    desc: "Cần dựng 1 video TikTok quảng cáo sản phẩm trà sữa mới ra mắt, thời lượng 30 giây, phong cách trẻ trung bắt trend. Đã có sẵn footage quay tại quán.",
    req: ["Thành thạo CapCut hoặc Premiere", "Có ví dụ video TikTok đã từng dựng", "Giao bản nháp trong 24 giờ"],
    status: 'open', dashJobId: 101,
    attachments: [
      { id: 'f1', name: 'Brief_TikTok_TraSuaMoc.pdf', size: 1450000 },
      { id: 'f2', name: 'Raw_Footage_QuayQuan.zip', size: 18500000 },
    ]
  },
  {
    id: 2, title: "Thiết kế poster sự kiện tuyển sinh trường", emp: "Cỏ May Agency", loc: "Hà Nội", cat: "Graphic Design", budget: 180000, urgent: true, time: "5 giờ trước",
    desc: "Thiết kế 1 poster khổ dọc quảng bá sự kiện tuyển sinh, cần có logo trường, thông tin sự kiện và màu sắc theo bộ nhận diện được cung cấp.",
    req: ["Thành thạo Canva hoặc Photoshop", "Hiểu bố cục poster sự kiện", "File xuất định dạng in ấn"],
    status: 'open', dashJobId: 102,
    attachments: [
      { id: 'f3', name: 'Brand_Guideline_CoMay.pdf', size: 2300000 },
      { id: 'f4', name: 'Logo_Vector_Assets.zip', size: 4200000 },
    ]
  },
  {
    id: 3, title: "Viết caption Instagram cho 10 bài đăng", emp: "Mộc Coffee House", loc: "Đà Nẵng", cat: "Content Marketing", budget: 150000, urgent: false, time: "1 ngày trước",
    desc: "Cần viết 10 caption ngắn gọn, có emoji, giọng văn gần gũi cho chuỗi bài đăng giới thiệu menu mới của quán cà phê.",
    req: ["Viết tiếng Việt tự nhiên, đúng chính tả", "Hiểu ngôn ngữ mạng xã hội Gen Z", "Giao trong 2 ngày"],
    status: 'open', dashJobId: 103,
    attachments: [
      { id: 'f5', name: 'Menu_ChiTiet_MocCoffee.docx', size: 340000 },
      { id: 'f6', name: 'Hinh_Anh_Mon_Moi.zip', size: 8900000 },
    ]
  },
  {
    id: 4, title: "Nhập liệu danh mục 200 sản phẩm Shopee", emp: "Boutique Xinh", loc: "TP.HCM", cat: "Data Entry", budget: 200000, urgent: false, time: "1 ngày trước",
    desc: "Nhập thông tin 200 sản phẩm (tên, giá, mô tả ngắn, size) từ file Excel mẫu vào hệ thống quản lý shop Shopee.",
    req: ["Thành thạo Excel/Google Sheets", "Cẩn thận, ít sai sót", "Hoàn thành trong 3 ngày"],
    status: 'open', dashJobId: 104,
    attachments: [
      { id: 'f7', name: 'File_Mau_NhapLieu_Shopee.xlsx', size: 850000 },
    ]
  },
  {
    id: 5, title: "Dựng Reels giới thiệu sản phẩm mỹ phẩm", emp: "GlowUp Cosmetics", loc: "TP.HCM", cat: "Video Editing", budget: 280000, urgent: false, time: "6 giờ trước",
    desc: "Dựng 1 video Reels 45 giây từ các đoạn footage sản phẩm có sẵn, thêm nhạc nền trend và hiệu ứng chuyển cảnh mượt.",
    req: ["Có kinh nghiệm dựng Reels/TikTok", "Am hiểu xu hướng âm nhạc hiện tại"],
    status: 'open',
    attachments: [
      { id: 'f8', name: 'Kich_Ban_Reels_GlowUp.pdf', size: 980000 },
      { id: 'f9', name: 'Footage_GlowUp_Serum.zip', size: 24500000 },
    ]
  },
  {
    id: 6, title: "Thiết kế bộ slide pitch deck cho startup", emp: "LaunchPad Ventures", loc: "Hà Nội", cat: "Graphic Design", budget: 350000, urgent: false, time: "2 ngày trước",
    desc: "Thiết kế 12 trang slide pitch deck gọi vốn, cần bố cục chuyên nghiệp, đồng bộ màu thương hiệu.",
    req: ["Thành thạo Canva/Figma/PowerPoint", "Có portfolio slide trước đó"],
    status: 'open',
    attachments: [
      { id: 'f10', name: 'Outline_PitchDeck_LaunchPad.docx', size: 520000 },
      { id: 'f11', name: 'Financial_Summary.xlsx', size: 760000 },
    ]
  },
  {
    id: 7, title: "Viết bài blog SEO chủ đề du học", emp: "EduPath Consulting", loc: "TP.HCM", cat: "Content Marketing", budget: 220000, urgent: true, time: "3 giờ trước",
    desc: "Viết 1 bài blog khoảng 800 từ về chủ đề 'Kinh nghiệm săn học bổng du học', tối ưu SEO cơ bản.",
    req: ["Kỹ năng viết content chuẩn SEO", "Nộp bài trong 48 giờ"],
    status: 'open',
    attachments: [
      { id: 'f12', name: 'Danh_Sach_Tu_Khoa_SEO.xlsx', size: 310000 },
    ]
  },
  {
    id: 8, title: "Tổng hợp dữ liệu khảo sát vào Google Sheets", emp: "Research Lab HCMUS", loc: "TP.HCM", cat: "Data Entry", budget: 170000, urgent: false, time: "8 giờ trước",
    desc: "Tổng hợp 150 phiếu khảo sát giấy vào Google Sheets theo mẫu cột đã cho sẵn.",
    req: ["Cẩn thận, đúng deadline", "Có laptop cá nhân"],
    status: 'open',
    attachments: [
      { id: 'f13', name: 'Mau_Phieu_Khao_Sat.pdf', size: 1200000 },
    ]
  },
];
