export async function downloadJobAttachment(file, jobTitle = '', jobId = null) {
    const fileName = file?.fileName || file?.name || 'Tai_lieu_SkillBridge.pdf';
    const effectiveJobId = jobId || file?.jobId;
    const attachmentId = file?.id;

    // 1. Tải trực tiếp qua Backend Stream API (an toàn 100%, không cần public R2, không bao giờ mở tab mới)
    if (effectiveJobId && typeof attachmentId === 'number' && attachmentId > 0) {
        try {
            const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
            const downloadUrl = `${API_URL}/jobs/${effectiveJobId}/attachments/${attachmentId}/download`;
            const res = await fetch(downloadUrl);
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                return;
            }
        } catch (err) {
            console.warn("Lỗi tải qua Backend Proxy Stream, chuyển sang tải trực tiếp:", err);
        }
    }

    // 2. Tải qua Blob từ URL gốc (nếu có URL hợp lệ)
    const fileUrl = file?.fileUrl || file?.url;
    if (fileUrl && typeof fileUrl === 'string' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/'))) {
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                return;
            }
        } catch {
            // bỏ qua
        }
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

import { getAccessToken } from '../api/tokenStore';

export async function downloadCandidateCv(cvFileId, originalFileName = 'CV_UngVien_SkillBridge.pdf') {
    const fileName = originalFileName || 'CV_UngVien_SkillBridge.pdf';
    if (!cvFileId) return;

    try {
        const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
        const downloadUrl = `${API_URL}/cv-files/${cvFileId}/download`;
        const token = getAccessToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(downloadUrl, { headers, credentials: 'include' });
        if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            return;
        } else {
            console.error(`Tải CV thất bại với HTTP status: ${res.status}`);
        }
    } catch (err) {
        console.error("Lỗi khi tải file CV của ứng viên:", err);
    }
}

export async function downloadDeliverableFile(jobId, deliverableId, originalFileName = 'deliverable.zip', type = 'final') {
    const fileName = originalFileName || 'deliverable';
    if (!jobId || !deliverableId) return;

    try {
        const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
        const downloadUrl = `${API_URL}/jobs/${jobId}/deliverables/${deliverableId}/download?type=${type}`;
        const token = getAccessToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(downloadUrl, { headers, credentials: 'include' });
        if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            return;
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error(`Tải sản phẩm bàn giao thất bại (${res.status}):`, errData.message || res.statusText);
            alert(errData.message || 'Không thể tải file sản phẩm bàn giao.');
        }
    } catch (err) {
        console.error("Lỗi khi tải file sản phẩm bàn giao:", err);
    }
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
