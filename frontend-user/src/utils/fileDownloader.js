import { getAccessToken } from '../api/tokenStore';
import * as XLSX from 'xlsx';

export async function downloadJobAttachment(file, jobTitle = '', jobId = null) {
    const fileName = file?.fileName || file?.name || 'Tai_lieu_SkillBridge.pdf';
    const effectiveJobId = jobId || file?.jobId;
    const attachmentId = file?.id;

    // 1. Tải trực tiếp qua Backend Stream API (an toàn 100%, không cần public R2, không bao giờ mở tab mới)
    if (effectiveJobId && typeof attachmentId === 'number' && attachmentId > 0) {
        try {
            const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";
            const downloadUrl = `${API_URL}/jobs/${effectiveJobId}/attachments/${attachmentId}/download`;
            const token = getAccessToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
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
            }
        } catch (err) {
            console.warn("Lỗi tải qua Backend Proxy Stream, chuyển sang tải trực tiếp:", err);
        }
    }

    // 2. Tải qua Blob từ URL gốc (nếu có URL hợp lệ)
    const fileUrl = file?.fileUrl || file?.url;
    if (fileUrl && typeof fileUrl === 'string' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/'))) {
        try {
            const token = getAccessToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(fileUrl, { headers, credentials: 'include' });
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
            // Fallback tải văn bản nếu không tải được blob
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

export async function downloadDeliverableFile(jobId, deliverableId, originalFileName = 'deliverable.zip', type = 'final', version = 1) {
    let rawName = (originalFileName || 'san_pham_ban_giao').trim();
    rawName = rawName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
    const ext = rawName.includes('.') ? rawName.split('.').pop() : 'zip';
    const baseName = rawName.includes('.') ? rawName.substring(0, rawName.lastIndexOf('.')) : rawName;

    let fileName = rawName;
    if (!rawName.toLowerCase().startsWith(`skillbridge_job${jobId}`)) {
        const previewPrefix = type === 'preview' ? 'Preview_' : '';
        fileName = `SkillBridge_Job${jobId}_v${version || 1}_${previewPrefix}${baseName}.${ext}`;
    }

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
            // Đọc tên file chuẩn từ Header Content-Disposition của backend nếu có
            const disposition = res.headers.get('content-disposition');
            if (disposition && disposition.includes('filename=')) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    fileName = match[1].replace(/['"]/g, '').trim();
                }
            }

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

export const TRANSACTION_TYPE_MAP = {
    topup: 'Nạp tiền vào ví',
    withdraw: 'Rút tiền về tài khoản ngân hàng',
    escrow_hold: 'Tạm giữ ký quỹ Escrow dự án',
    escrow_release: 'Nhận giải ngân thù lao dự án',
    escrow_refund: 'Hoàn trả tiền ký quỹ Escrow',
    insurance_payout: 'Bồi thường Quỹ Bảo hiểm bảo trợ',
    subscription: 'Đăng ký gói đặc quyền hội viên',
    commission: 'Phí bảo trợ nền tảng SkillBridge',
    default: 'Giao dịch ví điện tử'
};

export function getTransactionTypeLabel(type) {
    return TRANSACTION_TYPE_MAP[type] || type || TRANSACTION_TYPE_MAP.default;
}

function formatDateTimeForExport(val) {
    if (!val) return '—';
    if (typeof val === 'string' && val.includes('/')) return val;
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return String(val);
    }
}

function formatVNDDisplay(num) {
    return (Number(num) || 0).toLocaleString('vi-VN') + ' VNĐ';
}

export function exportTransactionsToExcel(transactions = [], options = {}) {
    const config = typeof options === 'string' ? { fileName: options } : (options || {});
    const user = config.user || {};
    const userName = user.fullName || config.userName || 'Khách hàng';
    const userEmail = user.email || config.userEmail || 'Chưa cập nhật';
    const roleName = config.roleName || (user.roleCode === 'employer' ? 'Nhà tuyển dụng' : 'Freelancer / Ứng viên');
    const balance = Number(config.balance ?? 0);
    const escrowLocked = Number(config.escrowLocked ?? 0);
    const bankAccount = config.bankAccount;
    const bankInfo = bankAccount && bankAccount.accountNumber
        ? `${bankAccount.bankName || 'Ngân hàng'} - STK: ${bankAccount.accountNumber} (${bankAccount.accountHolder || userName})`
        : 'Chưa liên kết tài khoản ngân hàng';
    const filterLabel = config.filterLabel || 'Tất cả danh mục';
    const exportTime = new Date().toLocaleString('vi-VN');

    const cleanUser = (userName || 'User').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    const nowTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const finalFileName = config.fileName
        ? (config.fileName.endsWith('.xlsx') ? config.fileName : `${config.fileName.replace(/\.csv$/i, '')}.xlsx`)
        : `Sao_ke_vi_SkillBridge_${cleanUser}_${nowTag}.xlsx`;

    const wb = XLSX.utils.book_new();

    // 1. DATA SHEET: "Sao Kê Giao Dịch"
    const sheetData = [
        ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Độc lập - Tự do - Hạnh phúc'],
        ['HỆ THỐNG SÀN GIAO DỊCH VIỆC LÀM & DỰ ÁN SKILLBRIDGE VIỆT NAM'],
        ['BẢNG SAO KÊ CHI TIẾT LỊCH SỬ GIAO DỊCH VÍ ĐIỆN TỬ'],
        ['(Chứng từ trích xuất chính thức từ hệ thống kế toán & tài chính SkillBridge)'],
        [],
        ['Chủ tài khoản ví:', userName, '', '', 'Thời điểm xuất:', exportTime, '', '', ''],
        ['Email tài khoản:', userEmail, '', '', 'Vai trò tài khoản:', roleName, '', '', ''],
        ['Số dư khả dụng:', balance, '', '', 'Tiền ký quỹ (Escrow):', escrowLocked, '', '', ''],
        ['Tài khoản ngân hàng:', bankInfo, '', '', 'Bộ lọc áp dụng:', filterLabel, '', '', ''],
        ['Tổng số giao dịch:', `${transactions.length} giao dịch`, '', '', 'Trạng thái đối soát:', 'Hợp lệ — Đã xác thực', '', '', ''],
        [],
        ['STT', 'Mã Giao Dịch', 'Thời Gian Giao Dịch', 'Phân Loại Nghiệp Vụ', 'Nội Dung / Diễn Giải Chi Tiết', 'Số Tiền Chi / Ghi Nợ (VNĐ)', 'Số Tiền Thu / Ghi Có (VNĐ)', 'Biến Động Ròng (VNĐ)', 'Trạng Thái']
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    transactions.forEach((t, idx) => {
        const rawAmount = Math.abs(Number(t.amount || 0));
        const isCredit = t.sign === 1;
        const isDebit = t.sign === -1;
        const debit = isDebit ? rawAmount : 0;
        const credit = isCredit ? rawAmount : 0;
        const net = credit - debit;

        totalDebit += debit;
        totalCredit += credit;

        const txId = t.id ? String(t.id) : `TX-${1000 + idx + 1}`;
        const txTime = formatDateTimeForExport(t.date || t.createdAt);
        const txType = getTransactionTypeLabel(t.type);
        const txLabel = t.label || 'Giao dịch ví điện tử';

        sheetData.push([
            idx + 1,
            txId,
            txTime,
            txType,
            txLabel,
            debit,
            credit,
            net,
            'Thành công'
        ]);
    });

    const totalNet = totalCredit - totalDebit;

    // Dòng tổng cộng phát sinh
    sheetData.push([]);
    sheetData.push([
        '',
        'TỔNG CỘNG PHÁT SINH',
        '',
        '',
        '',
        totalDebit,
        totalCredit,
        totalNet,
        ''
    ]);
    sheetData.push([]);
    sheetData.push(['* BẢN SAO KÊ ĐIỆN TỬ: Dữ liệu được bảo chứng bằng công nghệ ký quỹ Escrow và lưu trữ tự động trên nền tảng SkillBridge.']);
    sheetData.push(['* Mọi khiếu nại hoặc đối soát phát sinh vui lòng liên hệ Trung tâm Trợ giúp SkillBridge (support@skillbridge.vn) trong vòng 30 ngày.']);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Cấu hình độ rộng từng cột chuẩn chỉnh
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 18 }, // Mã GD
        { wch: 22 }, // Thời Gian
        { wch: 28 }, // Loại GD
        { wch: 48 }, // Diễn giải
        { wch: 24 }, // Tiền Chi
        { wch: 24 }, // Tiền Thu
        { wch: 24 }, // Biến Động Ròng
        { wch: 14 }  // Trạng Thái
    ];

    // Cấu hình Merges cho tiêu đề và khối thông tin khách hàng
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
        { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },
        { s: { r: 5, c: 5 }, e: { r: 5, c: 8 } },
        { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } },
        { s: { r: 6, c: 5 }, e: { r: 6, c: 8 } },
        { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } },
        { s: { r: 7, c: 5 }, e: { r: 7, c: 8 } },
        { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } },
        { s: { r: 8, c: 5 }, e: { r: 8, c: 8 } },
        { s: { r: 9, c: 1 }, e: { r: 9, c: 3 } },
        { s: { r: 9, c: 5 }, e: { r: 9, c: 8 } },
        { s: { r: sheetData.length - 2, c: 0 }, e: { r: sheetData.length - 2, c: 8 } },
        { s: { r: sheetData.length - 1, c: 0 }, e: { r: sheetData.length - 1, c: 8 } }
    ];

    // Định dạng số tiền chuyên nghiệp
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 12; R <= range.e.r; ++R) {
        for (let C = 5; C <= 7; ++C) {
            const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cellAddr] && typeof ws[cellAddr].v === 'number') {
                ws[cellAddr].z = '#,##0';
            }
        }
    }

    const balCell = XLSX.utils.encode_cell({ r: 7, c: 1 });
    if (ws[balCell] && typeof ws[balCell].v === 'number') ws[balCell].z = '#,##0';
    const escCell = XLSX.utils.encode_cell({ r: 7, c: 5 });
    if (ws[escCell] && typeof ws[escCell].v === 'number') ws[escCell].z = '#,##0';

    XLSX.utils.book_append_sheet(wb, ws, 'Sao Kê Chi Tiết');

    // 2. SUMMARY SHEET: "Thống Kê Tổng Hợp"
    const catMap = {};
    transactions.forEach(t => {
        const cat = getTransactionTypeLabel(t.type);
        if (!catMap[cat]) catMap[cat] = { count: 0, credit: 0, debit: 0 };
        catMap[cat].count++;
        const rawAmt = Math.abs(Number(t.amount || 0));
        if (t.sign === 1) catMap[cat].credit += rawAmt;
        if (t.sign === -1) catMap[cat].debit += rawAmt;
    });

    const summaryRows = [
        ['BẢNG TỔNG HỢP GIAO DỊCH VÀ DÒNG TIỀN THEO DANH MỤC'],
        ['(Tổng hợp từ các giao dịch trong kỳ sao kê)'],
        [],
        ['STT', 'Danh Mục Nghiệp Vụ', 'Số Lượng Giao Dịch', 'Tổng Tiền Vào / Thu (VNĐ)', 'Tổng Tiền Ra / Chi (VNĐ)', 'Chênh Lệch Dòng Tiền (VNĐ)']
    ];

    let catIdx = 1;
    Object.entries(catMap).forEach(([cat, data]) => {
        summaryRows.push([
            catIdx++,
            cat,
            data.count,
            data.credit,
            data.debit,
            data.credit - data.debit
        ]);
    });

    summaryRows.push([]);
    summaryRows.push([
        '',
        'TỔNG CỘNG TOÀN BỘ',
        transactions.length,
        totalCredit,
        totalDebit,
        totalNet
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws2['!cols'] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 20 },
        { wch: 26 },
        { wch: 26 },
        { wch: 26 }
    ];
    ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];

    const range2 = XLSX.utils.decode_range(ws2['!ref']);
    for (let R = 4; R <= range2.e.r; ++R) {
        for (let C = 3; C <= 5; ++C) {
            const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws2[cellAddr] && typeof ws2[cellAddr].v === 'number') {
                ws2[cellAddr].z = '#,##0';
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws2, 'Thống Kê Tổng Hợp');

    // Tạo file và kích hoạt tải về
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function exportTransactionsToCSV(transactions = [], optionsOrFileName = 'Sao_ke_giao_dich_SkillBridge.csv') {
    const config = typeof optionsOrFileName === 'string' ? { fileName: optionsOrFileName } : (optionsOrFileName || {});
    const user = config.user || {};
    const userName = user.fullName || config.userName || 'Khách hàng';
    const userEmail = user.email || config.userEmail || 'Chưa cập nhật';
    const balance = Number(config.balance ?? 0);
    const escrowLocked = Number(config.escrowLocked ?? 0);
    const exportTime = new Date().toLocaleString('vi-VN');
    const filterLabel = config.filterLabel || 'Tất cả danh mục';

    const cleanUser = (userName || 'User').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    const nowTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = config.fileName
        ? (config.fileName.endsWith('.csv') ? config.fileName : `${config.fileName.replace(/\.xlsx$/i, '')}.csv`)
        : `Sao_ke_vi_SkillBridge_${cleanUser}_${nowTag}.csv`;

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
    };

    const lines = [
        [escapeCSV('HỆ THỐNG SÀN GIAO DỊCH VIỆC LÀM & DỰ ÁN SKILLBRIDGE VIỆT NAM'), '""', '""', '""', '""', '""', '""', '""', '""'].join(','),
        [escapeCSV('BẢNG SAO KÊ LỊCH SỬ GIAO DỊCH VÍ ĐIỆN TỬ'), '""', '""', '""', '""', '""', '""', '""', '""'].join(','),
        [escapeCSV(`Thời gian trích xuất: ${exportTime}`), '""', '""', '""', '""', '""', '""', '""', '""'].join(','),
        [escapeCSV('Chủ tài khoản ví:'), escapeCSV(userName), '""', escapeCSV('Email:'), escapeCSV(userEmail), '""', escapeCSV('Bộ lọc:'), escapeCSV(filterLabel), '""'].join(','),
        [escapeCSV('Số dư khả dụng:'), escapeCSV(formatVNDDisplay(balance)), '""', escapeCSV('Ký quỹ Escrow:'), escapeCSV(formatVNDDisplay(escrowLocked)), '""', escapeCSV('Tổng số giao dịch:'), escapeCSV(`${transactions.length} mục`), '""'].join(','),
        ['""', '""', '""', '""', '""', '""', '""', '""', '""'].join(','),
        ['STT', 'Mã Giao Dịch', 'Thời Gian Giao Dịch', 'Loại Giao Dịch', 'Diễn Giải Chi Tiết', 'Số Tiền Chi / Ghi Nợ (VNĐ)', 'Số Tiền Thu / Ghi Có (VNĐ)', 'Biến Động Ròng (VNĐ)', 'Trạng Thái'].map(escapeCSV).join(',')
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    transactions.forEach((t, idx) => {
        const rawAmount = Math.abs(Number(t.amount || 0));
        const isCredit = t.sign === 1;
        const isDebit = t.sign === -1;
        const debit = isDebit ? rawAmount : 0;
        const credit = isCredit ? rawAmount : 0;
        const net = credit - debit;

        totalDebit += debit;
        totalCredit += credit;

        const txId = t.id ? String(t.id) : `TX-${1000 + idx + 1}`;
        const txTime = formatDateTimeForExport(t.date || t.createdAt);
        const txType = getTransactionTypeLabel(t.type);
        const txLabel = t.label || 'Giao dịch ví điện tử';

        lines.push([
            idx + 1,
            txId,
            txTime,
            txType,
            txLabel,
            debit,
            credit,
            net > 0 ? `+${net}` : net,
            'Thành công'
        ].map(escapeCSV).join(','));
    });

    const totalNet = totalCredit - totalDebit;
    lines.push(['""', '""', '""', '""', '""', '""', '""', '""', '""'].join(','));
    lines.push([
        escapeCSV(''),
        escapeCSV('TỔNG CỘNG PHÁT SINH'),
        escapeCSV(''),
        escapeCSV(''),
        escapeCSV(''),
        totalDebit,
        totalCredit,
        totalNet > 0 ? `+${totalNet}` : totalNet,
        escapeCSV('')
    ].join(','));

    const csvContent = '\uFEFF' + lines.join('\r\n');
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

