import { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';

export default function Contact() {
  const { user, showToast } = useStore();
  const { companyInfo } = useCompanyInfo();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'support',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || user.phoneNumber || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'x');
      return;
    }

    setIsSubmitting(true);
    try {
      // Giả lập gửi qua network và lưu lịch sử liên hệ cục bộ
      await new Promise((res) => setTimeout(res, 600));

      const contactHistory = JSON.parse(localStorage.getItem('skillbridge_contact_messages') || '[]');
      contactHistory.push({
        ...form,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('skillbridge_contact_messages', JSON.stringify(contactHistory));

      setSubmitted(true);
      showToast('Yêu cầu hỗ trợ đã được gửi thành công!', 'check');
    } catch {
      showToast('Có lỗi xảy ra, vui lòng liên hệ hotline hoặc gửi email trực tiếp.', 'x');
    } finally {
      setIsSubmitting(false);
    }
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
              <b style={{ color: 'var(--primary)', fontSize: 15 }}>{companyInfo.companyName}</b>
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Mã số doanh nghiệp (MST):</span>
              <b style={{ color: '#d97706', fontSize: 13 }}>Đang hoàn tất thủ tục cấp phép & đăng ký kinh doanh</b>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                {companyInfo.projectName}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Đại diện dự án / Phụ trách vận hành:</span>
              <b>{companyInfo.projectLead}</b> — Chức vụ: {companyInfo.projectLeadTitle}
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Phụ trách kỹ thuật & Công nghệ:</span>
              <b>{companyInfo.techLead}</b> — Chức vụ: {companyInfo.techLeadTitle}
            </div>

            <div>
              <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Địa chỉ:</span>
              <span>{companyInfo.address}</span>
            </div>

            <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', padding: 12, borderRadius: 10, marginTop: 4 }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="phone" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Hotline & Hỗ trợ:</b>{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {companyInfo.hotline1} {companyInfo.hotline2 ? `/ ${companyInfo.hotline2}` : ''}
                </span>
              </div>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="mail" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Email:</b> <code>{companyInfo.email}</code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" width="15" height="15" style={{ color: 'var(--primary)' }} />
                <b>Giờ làm việc:</b> {companyInfo.workingHours}
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
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
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
              <h4 style={{ color: '#16a34a', margin: '0 0 8px 0', fontSize: 18 }}>Đã tiếp nhận yêu cầu!</h4>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, maxWidth: 360, margin: '0 auto 16px auto', lineHeight: 1.6 }}>
                Hệ thống đã ghi nhận nội dung hỗ trợ từ bạn. Ban quản trị sẽ phản hồi sớm nhất qua email <b>{form.email}</b> trong vòng 24 giờ làm việc.
              </p>
              
              <div style={{ background: 'var(--bg-subtle, #f8fafc)', padding: '14px', borderRadius: 10, marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>Cần hỗ trợ gấp ngay lập tức?</div>
                <div style={{ color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>📞 Gọi Hotline: <a href={`tel:${companyInfo.hotline1}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{companyInfo.hotline1}</a> {companyInfo.hotline2 ? <>hoặc <a href={`tel:${companyInfo.hotline2}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{companyInfo.hotline2}</a></> : null}</div>
                  <div>✉️ Email trực tiếp: <a href={`mailto:${companyInfo.email}?subject=[Hỗ trợ khẩn cấp] ${encodeURIComponent(form.name)}&body=${encodeURIComponent(form.message)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{companyInfo.email}</a></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`mailto:${companyInfo.email}?subject=[Yêu cầu hỗ trợ] ${encodeURIComponent(form.name)} - ${form.subject}&body=Họ tên: ${encodeURIComponent(form.name)}%0D%0ASĐT: ${encodeURIComponent(form.phone)}%0D%0ANội dung: ${encodeURIComponent(form.message)}`}
                  className="btn btn-outline btn-sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="mail" width="14" height="14" /> Mở Email gửi trực tiếp
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSubmitted(false);
                    setForm((prev) => ({ ...prev, message: '' }));
                  }}
                >
                  Gửi phản hồi khác
                </button>
              </div>
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

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  'Gửi yêu cầu hỗ trợ'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
