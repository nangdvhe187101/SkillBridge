export function downloadJobAttachment(file, jobTitle = '') {
    const fileName = file?.name || 'Tai_lieu_SkillBridge.pdf';
    const content = `=====================================================
SKILLBRIDGE - TÀI LIỆU ĐÍNH KÈM & BRIEF CÔNG VIỆC
=====================================================
Dự án: ${jobTitle || 'Công việc trên SkillBridge'}
Tên tài liệu: ${fileName}
Dung lượng: ${file?.size ? (file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB') : 'Đính kèm'}
Thời gian tải về: ${new Date().toLocaleString('vi-VN')}

--- NỘI DUNG BRIEF & YÊU CẦU BÀN GIAO ---
1. Mục tiêu công việc & tiêu chuẩn bàn giao từ Nhà tuyển dụng.
2. Định dạng sản phẩm bàn giao (File gốc + File xem trước).
3. Cam kết thanh toán bảo vệ qua Quỹ Ký quỹ Escrow SkillBridge.

(Tài liệu đính kèm chính thức từ Nhà tuyển dụng).
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
