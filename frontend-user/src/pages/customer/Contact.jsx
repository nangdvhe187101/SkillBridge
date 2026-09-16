import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function Contact() {
  const { showToast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'support', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'x');
      return;
    }
    setSubmitted(true);
    showToast('Yêu cầu hỗ trợ đã được gửi thành công!', 'check');
  };

  return (
    <div className="container" style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 10px 0' }}>Liên hệ & Chăm sóc Khách hàng</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15, maxWidth: 640, margin: '0 auto' }}>
          Đội ngũ SkillBridge luôn sẵn sàng đồng hành, hỗ trợ và lắng nghe mọi thắc mắc của bạn 24/7.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Company Legal Info Card */}
        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: 'var(--ink)' }}>
            Thông tin Pháp lý Doanh nghiệp
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, lineHeight: 1.6 }}>
            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Đơn vị chủ quản:</span>
              <b style={{ color: 'var(--primary)', fontSize: 15 }}>CÔNG TY CỔ PHẦN CÔNG NGHỆ SKILLBRIDGE VIỆT NAM</b>
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Mã số doanh nghiệp (MST):</span>
              <b style={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>0110688999</b>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Do Sở Kế hoạch và Đầu tư Thành phố Hà Nội cấp ngày 15/03/2024
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Người đại diện theo pháp luật:</span>
              <b>ĐẶNG VŨ VĂN NĂNG</b> — Chức vụ: Giám đốc Điều hành (CEO)
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Địa chỉ trụ sở chính:</span>
              <span>Tòa nhà FPT Polytechnic, Phố Trịnh Văn Bô, Phường Phương Canh, Quận Nam Từ Liêm, TP. Hà Nội, Việt Nam</span>
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Văn phòng giao dịch:</span>
              <span>Tầng 5, Tòa nhà Innovation Hub, Quận Cầu Giấy, TP. Hà Nội</span>
            </div>

            <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', padding: 12, borderRadius: 10, marginTop: 4 }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="phone" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Hotline CSKH:</b> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>1900 6828</span> / 0987 654 321
              </div>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="mail" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Email chung:</b> <code>support@skillbridge.vn</code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Giờ làm việc:</b> 08:00 - 18:00 (Thứ 2 đến Thứ 7)
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: 'var(--ink)' }}>
            Gửi yêu cầu hỗ trợ / Khiếu nại
          </h3>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(22, 163, 74, 0.12)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 0 8px rgba(22, 163, 74, 0.05)'
              }}>
                <Icon name="check" width="34" height="34" />
              </div>
              <h4 style={{ color: '#16a34a', margin: '0 0 8px 0' }}>Đã tiếp nhận yêu cầu!</h4>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
                Đội ngũ Hỗ trợ khách hàng của SkillBridge sẽ xem xét và phản hồi đến email <b>{form.email}</b> trong vòng 24 giờ làm việc.
              </p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setSubmitted(false)}>
                Gửi phản hồi khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Họ và tên <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, rgba(0,0,0,0.15))' }}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Email liên hệ <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, rgba(0,0,0,0.15))' }}
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, rgba(0,0,0,0.15))' }}
                    placeholder="09xx xxx xxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Chủ đề yêu cầu
                </label>
                <select
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, rgba(0,0,0,0.15))', background: 'transparent' }}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option value="support">Hỗ trợ kỹ thuật & tài khoản</option>
                  <option value="billing">Thanh toán nạp/rút tiền (VNPay / SePay)</option>
                  <option value="dispute">Khiếu nại công việc & Ký quỹ Escrow</option>
                  <option value="partnership">Hợp tác doanh nghiệp / trường học</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Nội dung chi tiết <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, rgba(0,0,0,0.15))' }}
                  placeholder="Mô tả cụ thể vấn đề bạn cần hỗ trợ kèm mã đơn/mã công việc nếu có..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }}>
                Gửi yêu cầu hỗ trợ
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
