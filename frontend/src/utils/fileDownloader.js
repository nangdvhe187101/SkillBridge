export function downloadJobAttachment(file, jobTitle = '') {
    const fileUrl = file?.fileUrl || file?.url;
    const fileName = file?.fileName || file?.name || 'Tai_lieu_SkillBridge.pdf';

    if (fileUrl && typeof fileUrl === 'string' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/'))) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    const content = `=====================================================
SKILLBRIDGE - TÀI LIỆU ĐÍNH KÈM & BRIEF CÔNG VIỆC
=====================================================
Dự án: ${jobTitle || 'Công việc trên SkillBridge'}
Tên tài liệu: ${fileName}
Dung lượng: ${file?.size || file?.fileSize ? ((file.size || file.fileSize) > 1024 * 1024 ? ((file.size || file.fileSize) / (1024 * 1024)).toFixed(1) + ' MB' : ((file.size || file.fileSize) / 1024).toFixed(0) + ' KB') : 'Đính kèm'}
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

export function exportTransactionsToCSV(transactions, fileName = 'Sao_ke_giao_dich_SkillBridge.csv') {
    const headers = ['Mã Giao Dịch', 'Thời Gian', 'Loại Giao Dịch', 'Diễn Giải', 'Biến Động (VNĐ)', 'Chiều Tiền'];
    const rows = transactions.map((t, idx) => {
        const id = t.id || `TX-${1000 + idx}`;
        const date = t.date || '—';
        const type = t.type || 'Khác';
        const label = `"${(t.label || '').replace(/"/g, '""')}"`;
        const amount = t.amount || 0;
        const sign = t.sign === 1 ? '+ Tăng' : '- Giảm';
        return [id, date, type, label, amount, sign].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
