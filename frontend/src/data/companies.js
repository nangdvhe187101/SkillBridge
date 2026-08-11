export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'x';
}

export const companiesSeed = [
  {
    name: 'Trà Sữa Mộc', website: 'https://trasuamoc.vn', taxCode: '0108552391', size: '25-99 nhân viên',
    industry: 'F&B / Bán lẻ', address: '15 Lê Văn Sỹ, Phường Võ Thị Sáu, TP.HCM', followers: 214,
    description: 'Trà Sữa Mộc là chuỗi trà sữa thuần Việt với hơn 20 chi nhánh tại TP.HCM, tập trung vào nguyên liệu tự nhiên và trải nghiệm thương hiệu trẻ trung, năng động.',
    longDescription: 'Ra đời từ 2019, Trà Sữa Mộc hướng đến việc xây dựng cộng đồng khách hàng trẻ thông qua nội dung mạng xã hội sáng tạo. Chúng tôi thường xuyên hợp tác với sinh viên có năng khiếu dựng video, thiết kế và content để cùng phát triển hình ảnh thương hiệu trên TikTok, Instagram và Facebook.',
  },
  {
    name: 'Cỏ May Agency', website: 'https://comayagency.vn', taxCode: '0109887213', size: '10-24 nhân viên',
    industry: 'Marketing / Quảng cáo', address: 'Tầng 5, Toà Sông Đà, Cầu Giấy, Hà Nội', followers: 356,
    description: 'Cỏ May Agency là agency truyền thông chuyên tổ chức sự kiện và sản xuất nội dung sáng tạo cho các trường đại học và thương hiệu giáo dục.',
    longDescription: 'Với hơn 5 năm kinh nghiệm, Cỏ May Agency đã đồng hành cùng hơn 40 sự kiện tuyển sinh, ngày hội việc làm và chiến dịch truyền thông học đường. Chúng tôi ưu tiên hợp tác với sinh viên vì hiểu rõ insight và ngôn ngữ của thế hệ Gen Z.',
  },
  {
    name: 'Mộc Coffee House', website: 'https://moccoffeehouse.vn', taxCode: '0107334298', size: '1-9 nhân viên',
    industry: 'F&B', address: '82 Nguyễn Văn Linh, Hải Châu, Đà Nẵng', followers: 89,
    description: 'Quán cà phê phong cách vintage tại Đà Nẵng, không gian dành cho học tập và làm việc, thường xuyên cập nhật menu theo mùa.',
    longDescription: 'Mộc Coffee House mong muốn xây dựng một cộng đồng khách hàng gắn bó qua nội dung mạng xã hội chân thực, gần gũi. Chúng tôi tìm kiếm những bạn sinh viên viết caption duyên dáng, hiểu văn hoá quán cà phê địa phương.',
  },
  {
    name: 'Boutique Xinh', website: 'https://boutiquexinh.com', taxCode: '0110223456', size: '10-24 nhân viên',
    industry: 'Thời trang / Bán lẻ', address: '120 Hai Bà Trưng, Quận 1, TP.HCM', followers: 178,
    description: 'Thương hiệu thời trang nữ trẻ trung, phân phối chủ yếu qua Shopee, TikTok Shop và showroom tại TP.HCM.',
    longDescription: 'Boutique Xinh cần đội ngũ vận hành số liệu và nội dung linh hoạt, thường xuyên tuyển sinh viên hỗ trợ nhập liệu danh mục, quản lý đơn hàng và sáng tạo nội dung sản phẩm mới.',
  },
  {
    name: 'GlowUp Cosmetics', website: 'https://glowupcosmetics.vn', taxCode: '0111998877', size: '25-99 nhân viên',
    industry: 'Mỹ phẩm / Làm đẹp', address: 'Toà Etown, Cộng Hoà, Tân Bình, TP.HCM', followers: 502,
    description: 'GlowUp Cosmetics là thương hiệu mỹ phẩm nội địa phát triển nhanh, nổi bật với chiến lược KOC/KOL và nội dung review trên TikTok.',
    longDescription: 'Chúng tôi xây dựng đội ngũ Content Creator cộng tác dài hạn gồm phần lớn là sinh viên có gu thẩm mỹ tốt và khả năng quay dựng video review sản phẩm chân thực, thu hút.',
  },
  {
    name: 'LaunchPad Ventures', website: 'https://launchpad.vn', taxCode: '0112004455', size: '100-499 nhân viên',
    industry: 'Công nghệ / Startup', address: 'Toà Bitexco, Quận 1, TP.HCM', followers: 891,
    description: 'Quỹ tăng tốc khởi nghiệp hỗ trợ các startup giai đoạn đầu tại Việt Nam về vốn, cố vấn và nguồn lực vận hành.',
    longDescription: 'LaunchPad Ventures thường xuyên tuyển cộng tác viên sinh viên hỗ trợ các startup trong danh mục đầu tư về nội dung, thiết kế và phân tích dữ liệu — cơ hội tốt để tiếp cận môi trường khởi nghiệp thực tế.',
  },
  {
    name: 'EduPath Consulting', website: 'https://edupath.vn', taxCode: '0113667788', size: '10-24 nhân viên',
    industry: 'Giáo dục / Tư vấn du học', address: '45 Trần Duy Hưng, Cầu Giấy, Hà Nội', followers: 267,
    description: 'EduPath Consulting tư vấn du học và định hướng nghề nghiệp cho học sinh, sinh viên trên toàn quốc.',
    longDescription: 'Chúng tôi tìm kiếm sinh viên hỗ trợ biên tập nội dung tư vấn, quản lý dữ liệu học viên và thiết kế tài liệu truyền thông tuyển sinh.',
  },
];

export function getCompanyByName(name) {
  const c = companiesSeed.find((x) => x.name === name);
  if (c) return c;
  return {
    name: name || 'Nhà tuyển dụng', website: null, taxCode: '—', size: '—',
    industry: '—', address: 'Chưa cập nhật', followers: 0,
    description: 'Nhà tuyển dụng này chưa cập nhật thông tin giới thiệu.', longDescription: '',
  };
}
