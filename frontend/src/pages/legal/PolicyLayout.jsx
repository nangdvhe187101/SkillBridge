import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function PolicyLayout({ title, breadcrumbTitle, introText, sections }) {
  const [activeTab, setActiveTab] = useState(0);
  const location = useLocation();

  const policyNavItems = [
    { label: 'Quy chế & Điều khoản dịch vụ', path: '/terms' },
    { label: 'Chính sách bảo mật thông tin', path: '/privacy' },
    { label: 'Chính sách thanh toán & hoàn tiền', path: '/payment-policy' },
    { label: 'Giải quyết tranh chấp & Escrow', path: '/dispute-policy' },
    { label: 'Thông tin liên hệ & Khiếu nại', path: '/contact' },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '85vh', padding: '20px 0 60px 0', fontFamily: 'inherit' }}>
      <div className="wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* 1. Breadcrumbs (CellphoneS Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="home" width="14" height="14" />
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{breadcrumbTitle || title}</span>
        </div>

        {/* 2. Welcome Greeting (CellphoneS Exact Format) */}
        <div style={{
          background: 'transparent',
          marginBottom: 20,
          fontSize: 13.5,
          color: '#334155',
          lineHeight: 1.7
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#0f172a' }}>
            Chào mừng Quý khách !
          </p>
          <p style={{ margin: '0 0 6px 0' }}>
            {introText || (
              <>
                Dưới đây là chi tiết thông tin các quy định và chính sách hoạt động của nền tảng, <span style={{ color: '#d70018', fontWeight: 700 }}>SkillBridge</span> luôn nỗ lực để Quý khách và các bạn Sinh viên hài lòng và tin tưởng khi giao dịch.
              </>
            )}
          </p>
          <p style={{ margin: 0, fontWeight: 500 }}>
            Chân thành cảm ơn và mong được phục vụ Quý khách!
          </p>
        </div>

        {/* 3. Page Title (Centered, CellphoneS Style) */}
        <div style={{ textAlign: 'center', margin: '24px 0 28px 0' }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h1>
        </div>

        {/* 4. Two-Column Grid (CellphoneS Style: Left Sidebar + Right Content) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
          gap: 24,
          alignItems: 'start'
        }}>

          {/* Left Column: Sidebar Tabs */}
          <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sections List */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              {sections.map((sec, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px',
                      border: 'none',
                      background: isActive ? '#ffffff' : '#ffffff',
                      borderBottom: idx < sections.length - 1 ? '1px solid #f1f5f9' : 'none',
                      borderLeft: isActive ? '5px solid #d70018' : '5px solid transparent',
                      color: isActive ? '#d70018' : '#374151',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 13.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <span style={{ flex: 1 }}>{sec.title}</span>
                    {isActive && (
                      <span style={{ color: '#d70018', fontSize: 16, fontWeight: 700 }}>›</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Navigation to Other Legal Policies */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.3 }}>
                Danh mục chính sách
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {policyNavItems.map((item, idx) => {
                  const isCurrent = location.pathname === item.path;
                  return (
                    <li key={idx}>
                      <Link
                        to={item.path}
                        style={{
                          fontSize: 12.5,
                          color: isCurrent ? '#d70018' : '#475569',
                          fontWeight: isCurrent ? 700 : 500,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span style={{ fontSize: 10, color: isCurrent ? '#d70018' : '#94a3b8' }}>●</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Right Column: Detailed Content Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            minHeight: 460
          }}>
            {sections[activeTab] && (
              <div>
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#111827',
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  {sections[activeTab].title}
                </h2>

                <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                  {sections[activeTab].content}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
