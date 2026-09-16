import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function Footer() {

  return (
    <footer style={{
      background: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      padding: '40px 0 24px 0',
      marginTop: 48,
      fontSize: 13,
      color: '#1e293b'
    }}>
      <div className="wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* 1. Main Navigation Columns (CellphoneS Style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 28,
          paddingBottom: 28,
          borderBottom: '1px solid #f1f5f9'
        }}>

          {/* Column 1: Hotline & Customer Support */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', marginBottom: 14 }}>
              Tổng đài hỗ trợ (Miễn phí)
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#475569' }}>
              <div>
                <span>Hỗ trợ sinh viên & người dùng:</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <b style={{ color: '#d70018', fontSize: 16 }}>1900 6828</b>
                  <span style={{ fontSize: 11.5 }}>(8h00 - 21h00)</span>
                </div>
              </div>
              <div>
                <span>Khiếu nại & Tranh chấp:</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <b style={{ color: '#2563eb', fontSize: 15 }}>0987 654 321</b>
                  <span style={{ fontSize: 11.5 }}>(8h00 - 21h30)</span>
                </div>
              </div>
              <div>
                <span>Email hỗ trợ:</span>
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>support@skillbridge.vn</span>
                </div>
              </div>
              <div>
                <span>Hợp tác trường học & doanh nghiệp:</span>
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>partner@skillbridge.vn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: About SkillBridge */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', marginBottom: 14 }}>
              Về SkillBridge
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link to="/jobs" style={{ color: '#475569', textDecoration: 'none' }}>Tìm việc làm vi mô (Micro-jobs)</Link></li>
              <li><Link to="/employer/post-job" style={{ color: '#475569', textDecoration: 'none' }}>Đăng tin tuyển dụng sinh viên</Link></li>
              <li><Link to="/pricing" style={{ color: '#475569', textDecoration: 'none' }}>Bảng giá dịch vụ & Gói tin VIP</Link></li>
              <li><Link to="/wallet" style={{ color: '#475569', textDecoration: 'none' }}>Ví tiền & Quản lý số dư</Link></li>
              <li><Link to="/contact" style={{ color: '#475569', textDecoration: 'none' }}>Dự án Khởi nghiệp EXE FPT</Link></li>
              <li><Link to="/dispute-policy" style={{ color: '#475569', textDecoration: 'none' }}>Quỹ Bảo hiểm Tương hỗ Cộng đồng</Link></li>
            </ul>
          </div>

          {/* Column 3: Policies & Regulations */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', marginBottom: 14 }}>
              Chính sách & Quy định
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link to="/terms" style={{ color: '#475569', textDecoration: 'none' }}>Quy chế hoạt động sàn TMĐT</Link></li>
              <li><Link to="/terms" style={{ color: '#475569', textDecoration: 'none' }}>Điều khoản dịch vụ</Link></li>
              <li><Link to="/privacy" style={{ color: '#475569', textDecoration: 'none' }}>Chính sách bảo mật dữ liệu cá nhân</Link></li>
              <li><Link to="/payment-policy" style={{ color: '#475569', textDecoration: 'none' }}>Chính sách thanh toán & hoàn tiền</Link></li>
              <li><Link to="/dispute-policy" style={{ color: '#475569', textDecoration: 'none' }}>Quy trình giải quyết tranh chấp (Dispute)</Link></li>
              <li><Link to="/contact" style={{ color: '#475569', textDecoration: 'none' }}>Liên hệ & Tiếp nhận khiếu nại</Link></li>
            </ul>
          </div>

          {/* Column 4: Payment Partners & Social */}
          <div>
            <h5 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a', marginBottom: 14 }}>
              Phương thức thanh toán
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {/* VietQR Badge */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }} title="Chuyển khoản nhanh VietQR 24/7 qua SePay">
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0052cc', display: 'block' }}>VIET<span style={{ color: '#ea1e25' }}>QR</span></span>
                <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>Tự động 24/7</span>
              </div>

              {/* TPBank Badge */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }} title="Ngân hàng thụ hưởng TPBank">
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#5b2d90', display: 'block' }}>TPBank</span>
                <span style={{ fontSize: 9, color: '#64748b' }}>Ngân hàng</span>
              </div>

              {/* VNPAY Badge */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }} title="Cổng VNPAY (Đang làm thủ tục xin cấp phép)">
                <span style={{ fontSize: 11, fontWeight: 800, color: '#005baa', display: 'block' }}>VN<span style={{ color: '#e31837' }}>PAY</span></span>
                <span style={{ fontSize: 9, color: '#f59e0b' }}>Đối tác</span>
              </div>

              {/* Napas 247 */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#004c8f', display: 'block' }}>napas</span>
                <span style={{ fontSize: 9, color: '#64748b' }}>247</span>
              </div>

              {/* MB Bank Badge */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#001a9c', display: 'block' }}>MB Bank</span>
                <span style={{ fontSize: 9, color: '#64748b' }}>Ngân hàng</span>
              </div>

              {/* Visa / Master Badge */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'default'
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#1a1f71', display: 'block' }}>VISA</span>
                <span style={{ fontSize: 9, color: '#eb001b', fontWeight: 700 }}>MC</span>
              </div>
            </div>

            <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', marginBottom: 8 }}>
              Kết nối cùng SkillBridge
            </h5>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="social-ico" style={{ cursor: 'default' }} aria-label="Facebook"><Icon name="fb" /></span>
              <span className="social-ico" style={{ cursor: 'default' }} aria-label="Instagram"><Icon name="ig" /></span>
              <span className="social-ico" style={{ cursor: 'default' }} aria-label="TikTok"><Icon name="tiktok" /></span>
            </div>
          </div>
        </div>

        {/* 2. Popular Search Keywords Row (CellphoneS Bottom Tags Style) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '6px 12px',
          fontSize: 11.5,
          color: '#64748b',
          padding: '16px 0 16px 0',
          borderBottom: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <span>Tìm việc làm sinh viên</span> <span>|</span>
          <span>Thiết kế đồ họa</span> <span>|</span>
          <span>Lập trình Web sinh viên</span> <span>|</span>
          <span>Gia sư trực tuyến</span> <span>|</span>
          <span>Dịch thuật tài liệu</span> <span>|</span>
          <span>Chỉnh sửa video TikTok</span> <span>|</span>
          <span>Viết bài content SEO</span> <span>|</span>
          <span>Nhập liệu online</span> <span>|</span>
          <span>Quản trị Fanpage</span> <span>|</span>
          <span>Trợ giảng IELTS</span> <span>|</span>
          <span>Nạp tiền ví VietQR 24/7</span> <span>|</span>
          <span>Ký quỹ Escrow an toàn</span>
        </div>

        {/* 3. Corporate Legal Details & Non-clickable Official Badges (CellphoneS Style) */}
        <div style={{
          paddingTop: 18,
          textAlign: 'center',
          fontSize: 12,
          color: '#64748b',
          lineHeight: 1.8
        }}>
          {/* Company details lines */}
          <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#334155' }}>
            Dự án Khởi nghiệp Sáng tạo Sinh viên · FPT University EXE Capstone Project
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            Công ty Cổ phần Công nghệ và Giáo dục SkillBridge Việt Nam — GPĐKKD: <b>0110829145</b> cấp tại Sở KH & ĐT TP. Hà Nội ngày 15/03/2024.
          </p>
          <p style={{ margin: '0 0 16px 0' }}>
            Địa chỉ văn phòng: Tòa nhà FPT Polytechnic, Phố Trịnh Văn Bô, Phường Phương Canh, Quận Nam Từ Liêm, TP. Hà Nội. Điện thoại: 1900.6828 - 0987.654.321. Chịu trách nhiệm nội dung: <b>Đặng Vũ Văn Năng</b>.
          </p>

          {/* Official Seals & Badges: DISPLAY ONLY, NO OUTBOUND LINKS */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            margin: '0 auto 16px auto',
            cursor: 'default',
            userSelect: 'none',
            pointerEvents: 'none'
          }}>

            {/* Official Blue "ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG" Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#0284c7',
                borderRadius: 20,
                padding: '4px 14px 4px 6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                cursor: 'default'
              }}
              title="Đã thông báo với Bộ Công Thương theo quy định TMĐT"
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <Icon name="shield-check" width="14" height="14" style={{ color: '#0284c7' }} />
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  ĐÃ THÔNG BÁO
                </div>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#ffffff', letterSpacing: 0.2 }}>
                  BỘ CÔNG THƯƠNG
                </div>
              </div>
            </div>

            {/* Official Green "DMCA.com PROTECTED" Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#15803d',
                borderRadius: 20,
                padding: '4px 14px 4px 6px',
                boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                cursor: 'default'
              }}
              title="Bản quyền nội dung được bảo vệ bởi DMCA"
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 900,
                color: '#15803d',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                ©
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: '#bbf7d0', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  COPYRIGHT PROTECTED
                </div>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#ffffff', letterSpacing: 0.2 }}>
                  DMCA.COM
                </div>
              </div>
            </div>

            {/* SSL 256-Bit Secure Seal */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#334155',
                borderRadius: 20,
                padding: '4px 12px 4px 8px',
                boxShadow: '0 2px 6px rgba(51, 65, 85, 0.2)',
                cursor: 'default'
              }}
            >
              <Icon name="lock" width="12" height="12" style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.3 }}>
                SSL 256-BIT SECURE
              </span>
            </div>

          </div>

          {/* Legal Navigation Links */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: 12,
            color: '#64748b'
          }}>
            <Link to="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Điều khoản dịch vụ</Link>
            <span>·</span>
            <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Chính sách bảo mật</Link>
            <span>·</span>
            <Link to="/payment-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Chính sách thanh toán</Link>
            <span>·</span>
            <Link to="/dispute-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Giải quyết tranh chấp</Link>
            <span>·</span>
            <Link to="/contact" style={{ color: '#64748b', textDecoration: 'none' }}>Liên hệ & Khiếu nại</Link>
          </div>
        </div>

      </div>

    </footer>
  );
}
