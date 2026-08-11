    export const myJobsSeed = [
      {
        id: 101, title: "Dựng video TikTok quảng cáo trà sữa 30s", cat: "Video Editing", budget: 250000, urgent: true, status: "open", posted: "2 ngày trước",
        desc: "Cần dựng 1 video TikTok quảng cáo sản phẩm trà sữa mới ra mắt, thời lượng 30 giây, phong cách trẻ trung bắt trend. Đã có sẵn footage quay tại quán.",
        applicants: [
          { name: "Minh Anh", tier: "gold", score: 96, tags: "Video Editing · 32 việc hoàn thành" },
          { name: "Quốc Bảo", tier: "silver", score: 81, tags: "Video Editing · 14 việc hoàn thành" },
          { name: "Thảo Vy", tier: "bronze", score: 64, tags: "Video Editing · 3 việc hoàn thành" },
        ]
      },
      {
        id: 102, title: "Thiết kế poster sự kiện tuyển sinh trường", cat: "Graphic Design", budget: 180000, urgent: true, status: "open", posted: "4 ngày trước",
        desc: "Thiết kế 1 poster khổ dọc quảng bá sự kiện tuyển sinh, cần có logo trường, thông tin sự kiện và màu sắc theo bộ nhận diện được cung cấp.",
        applicants: [
          { name: "Hải Đăng", tier: "silver", score: 88, tags: "Graphic Design · 19 việc hoàn thành" },
          { name: "Ngọc Trâm", tier: "gold", score: 94, tags: "Graphic Design · 27 việc hoàn thành" },
        ]
      },
      {
        id: 103, title: "Viết caption Instagram cho 10 bài đăng", cat: "Content Marketing", budget: 150000, urgent: false, status: "filled", posted: "1 tuần trước", hiredApplicant: "Gia Hân",
        desc: "Cần viết 10 caption ngắn gọn, có emoji, giọng văn gần gũi cho chuỗi bài đăng giới thiệu menu mới của quán cà phê.",
        applicants: [
          { name: "Gia Hân", tier: "gold", score: 99, tags: "Content Marketing · 41 việc hoàn thành" },
        ]
      },
      {
        id: 104, title: "Nhập liệu danh mục 200 sản phẩm Shopee", cat: "Data Entry", budget: 200000, urgent: false, status: "open", posted: "1 tuần trước",
        desc: "Nhập thông tin 200 sản phẩm (tên, giá, mô tả ngắn, size) từ file Excel mẫu vào hệ thống quản lý shop Shopee.",
        applicants: [
          { name: "Anh Thư", tier: "bronze", score: 70, tags: "Data Entry · 5 việc hoàn thành" },
        ]
      },
    ];
