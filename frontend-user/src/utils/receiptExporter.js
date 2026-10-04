/**
 * Utility xuất và in Hóa đơn / Biên nhận thanh toán điện tử SkillBridge
 */

export function readVietnameseCurrency(n) {
  if (!n || n === 0) return 'Không đồng chẵn.';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group, isFirst) {
    let [h, t, u] = group.map(Number);
    let res = [];
    if (!isFirst || h > 0) res.push(digits[h] + ' trăm');
    if (t === 0) {
      if (u > 0 && (!isFirst || h > 0)) res.push('lẻ ' + digits[u]);
      else if (u > 0) res.push(digits[u]);
    } else if (t === 1) {
      res.push('mười');
      if (u === 1) res.push('một');
      else if (u === 5) res.push('lăm');
      else if (u > 0) res.push(digits[u]);
    } else {
      res.push(digits[t] + ' mươi');
      if (u === 1) res.push('mốt');
      else if (u === 4) res.push('tư');
      else if (u === 5) res.push('lăm');
      else if (u > 0) res.push(digits[u]);
    }
    return res.join(' ');
  }

  let str = Math.round(Math.abs(n)).toString();
  while (str.length % 3 !== 0) str = '0' + str;
  let groups = [];
  for (let i = 0; i < str.length; i += 3) groups.push(str.slice(i, i + 3).split(''));
  let units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let parts = [];
  let totalGroups = groups.length;
  for (let i = 0; i < totalGroups; i++) {
    let group = groups[i];
    let unit = units[totalGroups - 1 - i];
    let groupNum = Number(group.join(''));
    if (groupNum > 0) {
      let isFirst = parts.length === 0;
      let text = readGroup(group, isFirst);
      parts.push(text + (unit ? ' ' + unit : ''));
    }
  }
  let s = parts.join(' ').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng chẵn.';
}

export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

export function generateReceiptHtml(receipt) {
  const code = receipt.code || `SB-REC-${receipt.jobId || receipt.dashJobId || '2026'}`;
  const dateStr = receipt.date || new Date().toLocaleString('vi-VN');
  const jobTitle = receipt.jobTitle || 'Dịch vụ hợp tác kỹ năng';
  const employer = receipt.employer || 'Nhà tuyển dụng SkillBridge';
  const employerTaxCode = receipt.employerTaxCode || receipt.taxCode || 'Chưa cập nhật MST';
  const employerRepresentative = receipt.employerRepresentative || receipt.representative || 'Đại diện hợp pháp Bên A';
  const student = receipt.student || 'Sinh viên thực hiện';
  const studentSchool = receipt.studentSchool || receipt.school || 'Đại học đối tác SkillBridge';
  const budget = receipt.budget || receipt.total || 0;
  const commission = receipt.commission || 0;
  const total = receipt.total || budget;
  const net = receipt.net !== undefined ? receipt.net : (total - commission);
  const words = readVietnameseCurrency(total);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên bản nghiệm thu & Hóa đơn điện tử - ${code}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 44px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .toolbar {
      max-width: 820px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f1f5f9;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-info h2 {
      margin: 0 0 6px 0;
      color: #0284c7;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-info p {
      margin: 3px 0;
      font-size: 12.5px;
      color: #475569;
    }
    .national-header {
      text-align: right;
    }
    .national-header h4 {
      margin: 0 0 4px 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .national-header p {
      margin: 0 0 8px 0;
      font-size: 12px;
      font-style: italic;
    }
    .receipt-title {
      text-align: center;
      margin: 20px 0 18px;
    }
    .receipt-title h1 {
      margin: 0 0 4px;
      font-size: 21px;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .receipt-title .sub-title {
      font-size: 12.5px;
      color: #64748b;
      font-style: italic;
    }
    .accounting-badge {
      display: inline-block;
      margin-top: 6px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 3px 12px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    .party-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      line-height: 1.5;
    }
    .party-title {
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      font-size: 12px;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .meta-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 10px 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 18px;
      font-size: 13px;
    }
    .acceptance-clause {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 10px 14px;
      font-size: 12.5px;
      color: #1e3a8a;
      margin-bottom: 18px;
      border-radius: 0 6px 6px 0;
      line-height: 1.5;
    }
    .table-container {
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 10px 12px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .summary-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .summary-table {
      width: 340px;
      font-size: 13.5px;
    }
    .summary-table div {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      color: #475569;
    }
    .summary-table div.total-row {
      border-top: 2px solid #0284c7;
      margin-top: 4px;
      padding-top: 8px;
      font-weight: 700;
      color: #0f172a;
      font-size: 15.5px;
    }
    .amount-words {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 13px;
      margin-bottom: 24px;
      color: #166534;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      margin-top: 24px;
      page-break-inside: avoid;
      gap: 12px;
    }
    .sign-box h5 {
      margin: 0 0 3px;
      font-size: 12.5px;
      text-transform: uppercase;
      color: #1e293b;
    }
    .sign-box span {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }
    .stamp-container {
      margin-top: 12px;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      border: 2px dashed #059669;
      border-radius: 6px;
      padding: 6px 10px;
      background: rgba(16, 185, 129, 0.05);
      color: #059669;
    }
    .stamp-text-bold {
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .stamp-sub {
      font-size: 10px;
      margin-top: 2px;
    }
    .footer-note {
      margin-top: 28px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      font-size: 11.5px;
      color: #94a3b8;
      line-height: 1.5;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar no-print">
    <button class="btn btn-outline" onclick="window.close()">← Đóng</button>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
        </svg>
        In / Tải file PDF Phiếu nghiệm thu
      </button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header-row">
      <div class="company-info">
        <h2>SKILLBRIDGE VIỆT NAM</h2>
        <p><b>Hệ thống Kết nối Việc làm & Ký quỹ Sinh viên Minh bạch</b></p>
        <p>Mã số định danh / MST: <b>0109988776-SB</b></p>
        <p>Hotline: 1900-8888 | Email: accounting@skillbridge.vn</p>
        <p>Địa chỉ: Khu Công Nghệ Cao, Q. Nam Từ Liêm, TP. Hà Nội</p>
      </div>
      <div class="national-header">
        <h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
        <p>Độc lập - Tự do - Hạnh phúc</p>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
          Mẫu số: <b>01GTKT0/001</b><br/>
          Ký hiệu: <b>SB/26E</b>
        </div>
      </div>
    </div>

    <div class="receipt-title">
      <h1>BIÊN BẢN NGHIỆM THU DỰ ÁN & HÓA ĐƠN ĐIỆN TỬ</h1>
      <div class="sub-title">(Certificate of Acceptance & Project Escrow Settlement Receipt)</div>
      <div class="accounting-badge">Hồ sơ chứng từ lưu trữ kế toán nội bộ hợp lệ</div>
    </div>

    <div class="meta-box">
      <div>Mã biên bản / Hóa đơn: <b>${code}</b></div>
      <div>Thời gian lập: <b>${dateStr}</b></div>
      <div>Mã hợp đồng công việc: <b>JOB-${receipt.jobId || receipt.dashJobId || 'ESCROW'}</b></div>
      <div>Trạng thái: <b style="color: #059669;">✓ ĐÃ NGHIỆM THU & GIẢI NGÂN HOÀN TẤT</b></div>
    </div>

    <div class="parties-grid">
      <div class="party-card">
        <div class="party-title">BÊN GIAO VIỆC (BÊN A) / NHÀ TUYỂN DỤNG</div>
        <div>Đơn vị: <b>${employer}</b></div>
        <div>Mã số thuế / ĐKKD: <b>${employerTaxCode}</b></div>
        <div>Người đại diện: <b>${employerRepresentative}</b></div>
        <div>Tài khoản thanh toán: <b>Ví ký quỹ Doanh nghiệp SkillBridge</b></div>
      </div>

      <div class="party-card">
        <div class="party-title">BÊN NHẬN VIỆC (BÊN B) / SINH VIÊN THỰC HIỆN</div>
        <div>Họ và tên: <b>${student}</b></div>
        <div>Trường / Viện đào tạo: <b>${studentSchool}</b></div>
        <div>Mã định danh ứng viên: <b>STU-${receipt.studentId || receipt.hiredStudentId || 'VERIFIED'}</b></div>
        <div>Tài khoản thụ hưởng: <b>Ví cá nhân sinh viên đã định danh</b></div>
      </div>
    </div>

    <div class="acceptance-clause">
      <b>CĂN CỨ VÀ KẾT QUẢ NGHIỆM THU:</b><br/>
      Hai bên thống nhất xác nhận: Bên B đã bàn giao đầy đủ sản phẩm, hồ sơ, mã nguồn hoặc tài liệu theo đúng yêu cầu đề bài của Bên A. Bên A đã kiểm tra chất lượng, nghiệm thu đạt yêu cầu 100% và chấp thuận giải ngân toàn bộ số tiền ký quỹ Escrow tương ứng. Hai bên cam kết không có bất kỳ tranh chấp hay khiếu nại nào sau khi biên bản này được tạo lập.
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 45px;">STT</th>
            <th>Nội dung công việc bàn giao & nghiệm thu</th>
            <th class="text-center" style="width: 90px;">ĐVT</th>
            <th class="text-right" style="width: 125px;">Đơn giá</th>
            <th class="text-right" style="width: 125px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td>
              <b>Quyết toán nghiệm thu hợp đồng:</b> ${jobTitle}<br/>
              <span style="font-size: 12px; color: #64748b;">(Giải ngân tiền dự án từ Ví ký quỹ Escrow sang Tài khoản bên B)</span>
            </td>
            <td class="text-center">Dự án</td>
            <td class="text-right">${formatVND(budget)}</td>
            <td class="text-right"><b>${formatVND(budget)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-row">
      <div class="summary-table">
        <div>
          <span>Tổng giá trị nghiệm thu:</span>
          <b>${formatVND(budget)}</b>
        </div>
        <div>
          <span>Phí dịch vụ sàn & trung gian ký quỹ:</span>
          <b>${commission > 0 ? formatVND(commission) : '0đ (Miễn phí nền tảng)'}</b>
        </div>
        <div>
          <span>Thuế TNCN khấu trừ tại nguồn:</span>
          <b>0đ</b>
        </div>
        <div class="total-row">
          <span>Tổng tiền thanh toán giải ngân:</span>
          <b style="color: #0284c7; font-size: 16px;">${formatVND(net)}</b>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <b>Số tiền viết bằng chữ:</b> <em>${words}</em>
    </div>

    <div class="signatures">
      <div class="sign-box">
        <h5>ĐẠI DIỆN BÊN A</h5>
        <span>(Ký, ghi rõ họ tên)</span>
        <div style="margin-top: 32px; font-weight: 600; color: #334155;">${employerRepresentative}</div>
      </div>
      <div class="sign-box">
        <h5>BÊN THỤ HƯỞNG (BÊN B)</h5>
        <span>(Ký, ghi rõ họ tên)</span>
        <div style="margin-top: 32px; font-weight: 600; color: #334155;">${student}</div>
      </div>
      <div class="sign-box">
        <h5>XÁC NHẬN NỀN TẢNG SKILLBRIDGE</h5>
        <span>(Chứng thực ký quỹ & giải ngân số)</span>
        <div class="stamp-container">
          <div class="stamp-text-bold">✓ ĐÃ KÝ SỐ HỢP LỆ</div>
          <div class="stamp-sub">SkillBridge Platform Escrow</div>
          <div class="stamp-sub" style="font-size: 9.5px; color: #047857;">Mã xác thực: SHA256-${code}</div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Biên lai nghiệm thu và giải ngân điện tử này có giá trị làm chứng từ xác nhận chi phí kế toán nội bộ của Bên A.<br/>
      Hệ thống lưu trữ vĩnh viễn trên cơ sở dữ liệu SkillBridge, có thể tra cứu mã hóa đơn bất kỳ lúc nào.
    </div>
  </div>
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar no-print">
    <button class="btn btn-outline" onclick="window.close()">← Đóng cửa sổ</button>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
        </svg>
        In / Lưu dưới dạng PDF
      </button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header-row">
      <div class="company-info">
        <h2>SKILLBRIDGE VIỆT NAM</h2>
        <p><b>Hệ thống Kết nối Việc làm & Ký quỹ Sinh viên Minh bạch</b></p>
        <p>Mã số định danh / MST: <b>0109988776-SB</b></p>
        <p>Hotline: 1900-8888 | Email: support@skillbridge.vn</p>
        <p>Địa chỉ: Khu Công Nghệ Cao, Q. Nam Từ Liêm, TP. Hà Nội</p>
      </div>
      <div class="national-header">
        <h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
        <p>Độc lập - Tự do - Hạnh phúc</p>
        <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
          Mẫu số: <b>01GTKT0/001</b><br/>
          Ký hiệu: <b>SB/26E</b>
        </div>
      </div>
    </div>

    <div class="receipt-title">
      <h1>PHIẾU THU / BIÊN NHẬN THANH TOÁN ĐIỆN TỬ</h1>
      <div class="sub-title">(Electronic Escrow Settlement & Payment Receipt)</div>
    </div>

    <div class="meta-box">
      <div class="meta-item">Mã biên nhận: <b>${code}</b></div>
      <div class="meta-item">Thời gian lập: <b>${dateStr}</b></div>
      <div class="meta-item">Đơn vị chi trả (NTD): <b>${employer}</b></div>
      <div class="meta-item">Người thụ hưởng (SV): <b>${student}</b></div>
      <div class="meta-item" style="grid-column: span 2;">Phương thức giao dịch: <b>Ví ký quỹ SkillBridge Escrow (Tự động giải ngân)</b></div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 50px;">STT</th>
            <th>Diễn giải nội dung dịch vụ</th>
            <th class="text-center" style="width: 100px;">ĐVT</th>
            <th class="text-right" style="width: 130px;">Đơn giá</th>
            <th class="text-right" style="width: 130px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td>
              <b>Quyết toán hoàn tất công việc:</b> ${jobTitle}<br/>
              <span style="font-size: 12px; color: #64748b;">(Hợp đồng số: JOB-${receipt.jobId || receipt.dashJobId || 'ESCROW'})</span>
            </td>
            <td class="text-center">Gói</td>
            <td class="text-right">${formatVND(budget)}</td>
            <td class="text-right"><b>${formatVND(budget)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-row">
      <div class="summary-table">
        <div>
          <span>Tổng ngân sách thỏa thuận:</span>
          <b>${formatVND(budget)}</b>
        </div>
        <div>
          <span>Phí bảo trợ nền tảng:</span>
          <b>${commission > 0 ? formatVND(commission) : '0đ (Miễn phí)'}</b>
        </div>
        <div>
          <span>Thuế TNCN khấu trừ tại nguồn:</span>
          <b>0đ</b>
        </div>
        <div class="total-row">
          <span>Tổng thanh toán / Thực nhận:</span>
          <b style="color: #0284c7; font-size: 17px;">${formatVND(net)}</b>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <b>Số tiền viết bằng chữ:</b> <em>${words}</em>
    </div>

    <div class="signatures">
      <div class="sign-box">
        <h5>BÊN THỤ HƯỞNG</h5>
        <span>(Ký, ghi rõ họ tên)</span>
        <div style="margin-top: 36px; font-weight: 600; color: #334155;">${student}</div>
      </div>
      <div class="sign-box">
        <h5>ĐẠI DIỆN NỀN TẢNG SKILLBRIDGE</h5>
        <span>(Xác thực ký số điện tử)</span>
        <div class="stamp-container">
          <div class="stamp-text-bold">✓ ĐÃ KÝ ĐIỆN TỬ HỢP LỆ</div>
          <div class="stamp-sub">SkillBridge Platform Vietnam</div>
          <div class="stamp-sub" style="font-size: 10px; color: #047857;">Mã xác thực: SHA256-${code}</div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Biên nhận điện tử được tạo và lưu trữ an toàn theo tiêu chuẩn giao dịch điện tử của SkillBridge.<br/>
      Quý khách có thể tra cứu tính hợp lệ tại hệ thống Ví điện tử hoặc liên hệ Trung tâm hỗ trợ khách hàng SkillBridge.
    </div>
  </div>

  <script>
    // Tự động kích hoạt in nếu người dùng mở trực tiếp
    window.addEventListener('load', () => {
      // Nhẹ nhàng delay để render xong styles
      setTimeout(() => {
        // window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Mở cửa sổ in / xuất PDF cho biên nhận
 */
export function printReceipt(receipt) {
  if (!receipt) return;
  const html = generateReceiptHtml(receipt);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Cho phép hiển thị rồi gọi print
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.warn('Không thể tự động gọi in:', err);
      }
    }, 400);
  } else {
    // Trường hợp popup bị chặn, fallback tải file HTML trực tiếp
    downloadReceiptHtml(receipt);
  }
}

/**
 * Tải file HTML của biên nhận về máy
 */
export function downloadReceiptHtml(receipt) {
  if (!receipt) return;
  const html = generateReceiptHtml(receipt);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PhieuThu_${receipt.code || receipt.jobId || 'SkillBridge'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Tải file TXT sao kê của biên nhận về máy
 */
export function downloadReceiptTxt(receipt) {
  if (!receipt) return;
  const code = receipt.code || `SB-REC-${receipt.jobId || receipt.dashJobId || '2026'}`;
  const budget = receipt.budget || receipt.total || 0;
  const commission = receipt.commission || 0;
  const total = receipt.total || budget;
  const net = receipt.net !== undefined ? receipt.net : (total - commission);
  const words = readVietnameseCurrency(total);

  const content = `=====================================================
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-----------------------------------------------------
PHIẾU THU / BIÊN NHẬN THANH TOÁN ĐIỆN TỬ
(SkillBridge Escrow Settlement & Service Receipt)
=====================================================
Mã biên nhận: ${code}
Ngày giao dịch: ${receipt.date || new Date().toLocaleString('vi-VN')}
Trạng thái: ĐÃ QUYẾT TOÁN & GIẢI NGÂN THÀNH CÔNG

THÔNG TIN GIAO DỊCH:
- Đơn vị chi trả (NTD): ${receipt.employer || 'Nhà tuyển dụng SkillBridge'}
- Người thụ hưởng (SV): ${receipt.student || 'Sinh viên thực hiện'}
- Hạng mục dịch vụ: ${receipt.jobTitle || 'Dịch vụ hợp tác kỹ năng'}
- Mã công việc: JOB-${receipt.jobId || receipt.dashJobId || 'ESCROW'}

BẢNG KÊ QUYẾT TOÁN TÀI CHÍNH:
1. Ngân sách hợp đồng: ${formatVND(budget)}
2. Phí dịch vụ bảo trợ sàn: ${commission > 0 ? formatVND(commission) : '0đ (Miễn phí nền tảng)'}
3. Thuế TNCN khấu trừ tại nguồn: 0đ
-----------------------------------------------------
TỔNG SỐ TIỀN THANH TOÁN / THỰC NHẬN: ${formatVND(net)}
(Bằng chữ: ${words})
=====================================================
XÁC NHẬN HỢP LỆ BỞI NỀN TẢNG KÝ QUỸ SKILLBRIDGE
Hotline hỗ trợ: 1900-8888 | Email: support@skillbridge.vn
Địa chỉ: Khu Công Nghệ Cao, TP. Hà Nội
=====================================================`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BienNhan_${code}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
