export const studentsSeed = [
  {
    name: 'Minh Anh', school: 'FPT University', reliability: 96, completedJobs: 32, avgRating: 5.0,
    skills: ['✓ Verified Canva Operator', '✓ CapCut Speed Editor', '✓ Content Writing'],
    bio: 'Sinh viên năm 3 ngành Truyền thông đa phương tiện, chuyên dựng video ngắn cho TikTok và Reels. Từng cộng tác với 12 thương hiệu F&B và thời trang.',
    portfolio: ['TikTok Ads · Trà Sữa Mộc', 'Reels sản phẩm mỹ phẩm', 'Video review quán ăn'],
    reviews: [
      { name: 'Trà Sữa Mộc', stars: 5, comment: 'Làm việc rất nhanh và đúng brief, chắc chắn sẽ thuê lại.' },
      { name: 'Cỏ May Agency', stars: 5, comment: 'Sản phẩm chỉn chu, giao trước deadline 1 ngày.' },
    ],
  },
  {
    name: 'Quốc Bảo', school: 'UEH', reliability: 81, completedJobs: 14, avgRating: 4.7,
    skills: ['✓ Premiere Pro', '✓ After Effects cơ bản'],
    bio: 'Sinh viên ngành Marketing, thích làm video sản phẩm và motion graphic đơn giản cho các shop online.',
    portfolio: ['Video giới thiệu sản phẩm', 'Banner quảng cáo Shopee'],
    reviews: [{ name: 'Boutique Xinh', stars: 4, comment: 'Chất lượng ổn, cần trao đổi kỹ hơn ở bản nháp đầu.' }],
  },
  {
    name: 'Thảo Vy', school: 'Ngoại Thương', reliability: 64, completedJobs: 3, avgRating: 4.2,
    skills: ['✓ Canva'],
    bio: 'Sinh viên năm 2, mới bắt đầu làm freelance, đang xây dựng portfolio thiết kế.',
    portfolio: ['Poster sự kiện CLB trường'],
    reviews: [],
  },
  {
    name: 'Hải Đăng', school: 'Bách Khoa', reliability: 88, completedJobs: 19, avgRating: 4.8,
    skills: ['✓ Illustrator', '✓ Photoshop', '✓ Figma'],
    bio: 'Sinh viên Kỹ thuật, đam mê thiết kế đồ hoạ và UI/UX, từng thiết kế bộ nhận diện cho 3 startup sinh viên.',
    portfolio: ['Bộ nhận diện thương hiệu startup', 'UI app di động demo'],
    reviews: [{ name: 'LaunchPad Ventures', stars: 5, comment: 'Tư duy thiết kế tốt, giao tiếp chuyên nghiệp.' }],
  },
  {
    name: 'Ngọc Trâm', school: 'RMIT Vietnam', reliability: 94, completedJobs: 27, avgRating: 4.9,
    skills: ['✓ Adobe XD', '✓ Illustrator', '✓ Copywriting'],
    bio: 'Sinh viên ngành Thiết kế Truyền thông, thế mạnh về concept sáng tạo và trình bày ý tưởng trực quan.',
    portfolio: ['Bộ slide pitch startup', 'Banner social Shopee'],
    reviews: [{ name: 'GlowUp Cosmetics', stars: 5, comment: 'Ý tưởng sáng tạo, làm việc chuyên nghiệp.' }],
  },
  {
    name: 'Gia Hân', school: 'FPT University', reliability: 99, completedJobs: 41, avgRating: 5.0,
    skills: ['✓ Content Writing', '✓ SEO cơ bản', '✓ Social Media Planning'],
    bio: 'Content Creator tự do với hơn 40 dự án, chuyên viết caption, kịch bản ngắn cho thương hiệu F&B và giáo dục.',
    portfolio: ['Chuỗi caption Instagram 30 ngày', 'Kịch bản video ngắn'],
    reviews: [{ name: 'Mộc Coffee House', stars: 5, comment: 'Viết rất tự nhiên, đúng chất giọng thương hiệu.' }],
  },
];

export function getStudentByName(name) {
  const s = studentsSeed.find((x) => x.name === name);
  if (s) return s;
  return {
    name: name || 'Sinh viên', school: '—', reliability: 70, completedJobs: 0, avgRating: 0,
    skills: [], bio: 'Sinh viên này chưa cập nhật giới thiệu bản thân.', portfolio: [], reviews: [],
  };
}
