import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { getAdminAnalyticsOverview } from '../api/adminApi';
import { fmtVND } from '../utils/formatters';

export default function AdminAnalytics() {
  const [data, setData] = useState({
    totalUsers: 0,
    studentsCount: 0,
    employersCount: 0,
    verifiedKycCount: 0,
    pendingKycCount: 0,
    totalJobs: 0,
    openJobsCount: 0,
    inProgressJobsCount: 0,
    completedJobsCount: 0,
    cancelledJobsCount: 0,
    completionRate: 0,
    totalEscrowVolume: 0,
    totalWalletBalances: 0,
    topSchools: [],
    jobStatusBreakdown: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminAnalyticsOverview();
      if (res) setData(res);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phân tích:', err);
      setError(err?.message || 'Không thể kết nối đến máy chủ quản trị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = [
    {
      label: 'Tổng người dùng thực tế',
      value: loading ? '...' : `${data.totalUsers.toLocaleString('vi-VN')} tài khoản`,
      sub: loading ? '' : `${data.studentsCount} Sinh viên · ${data.employersCount} NTD`,
      icon: 'users',
      colorClass: 'kpi-emerald',
    },
    {
      label: 'Tỷ lệ hoàn thành công việc',
      value: loading ? '...' : `${data.completionRate}%`,
      sub: loading ? '' : `${data.completedJobsCount} đã xong / ${data.totalJobs} tổng việc`,
      icon: 'check',
      colorClass: 'kpi-blue',
    },
    {
      label: 'Việc đang làm & Tiền bảo chứng',
      value: loading ? '...' : `${data.inProgressJobsCount} việc`,
      sub: loading ? '' : `Escrow: ${fmtVND(data.totalEscrowVolume)}`,
      icon: 'shield-check',
      colorClass: 'kpi-purple',
    },
    {
      label: 'Xác thực định danh eKYC',
      value: loading ? '...' : `${data.verifiedKycCount} đã duyệt`,
      sub: loading ? '' : `${data.pendingKycCount} hồ sơ đang chờ duyệt`,
      icon: 'clock',
      colorClass: 'kpi-amber',
    },
  ];

  const advancedKpis = [
    { label: 'Retention 30 ngày', value: '—', note: 'Cần Event Tracking' },
    { label: 'Giá trị vòng đời (LTV)', value: '—', note: 'Cần Data Warehouse' },
    { label: 'Chi phí thu nạp (CAC)', value: '—', note: 'Chưa gắn mã chuyển đổi' },
    { label: 'Thời gian ghép việc TB', value: '—', note: 'Chưa có telemetry' },
  ];

  return (
    <section className="adm-section active">
      <div className="adm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Báo cáo số liệu & Phân tích hệ thống</h2>
          <p>Dữ liệu thời gian thực được tính toán và trích xuất trực tiếp từ cơ sở dữ liệu nền tảng.</p>
        </div>
        <button
          type="button"
          className="cf-btn-secondary"
          onClick={fetchAnalytics}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}
        >
          {loading ? '⏳ Đang tải...' : '🔄 Làm mới dữ liệu'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="adm-vibrant-kpis">
        {kpis.map((k) => (
          <div className={`adm-vibrant-kpi ${k.colorClass}`} key={k.label}>
            <div className="adm-kpi-icon-wrap">
              <Icon name={k.icon} style={{ width: 22, height: 22 }} />
            </div>
            <div className="adm-kpi-content">
              <div className="k-lbl">{k.label}</div>
              <div className="k-val" style={{ fontSize: 20 }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>{k.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginTop: 16 }}>
        {/* Top Schools Chart */}
        <div className="adm-card" style={{ margin: 0 }}>
          <div className="adm-card-head">
            <h4>Phân bố sinh viên theo Trường Đại học</h4>
            <span className="sub">Thực tế từ Database ({data.studentsCount} sinh viên)</span>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {data.topSchools && data.topSchools.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.topSchools.map((s, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>{s.schoolName}</span>
                      <span style={{ color: '#4b5563', fontWeight: 500 }}>
                        {s.studentCount} SV <span style={{ color: '#9ca3af' }}>({s.percentage}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(s.percentage, 4)}%`,
                          height: '100%',
                          background: '#0051c3',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                Chưa có dữ liệu sinh viên cập nhật trường đại học.
              </div>
            )}
          </div>
        </div>

        {/* Job Status Breakdown */}
        <div className="adm-card" style={{ margin: 0 }}>
          <div className="adm-card-head">
            <h4>Vòng đời & Trạng thái Công việc</h4>
            <span className="sub">Tổng cộng {data.totalJobs} công việc trên sàn</span>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {data.jobStatusBreakdown && data.jobStatusBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.jobStatusBreakdown.map((j, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>{j.label}</span>
                      <span style={{ color: '#4b5563', fontWeight: 500 }}>
                        {j.count} việc <span style={{ color: '#9ca3af' }}>({j.percentage}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(j.percentage, j.count > 0 ? 4 : 0)}%`,
                          height: '100%',
                          background: j.Color || '#2563eb',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                Chưa có công việc nào được đăng tải trên hệ thống.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Telemetry & Sustainability Notice */}
      <div className="adm-card" style={{ marginTop: 16 }}>
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>Chỉ số Phân tích Nâng cao & Bền vững (BI Telemetry)</h4>
          <span className="sub" style={{ color: '#b45309' }}>
            ⚠️ Hiển thị — theo nguyên tắc trung thực (chưa có Data Warehouse)
          </span>
        </div>
        <div className="adm-kpis">
          {advancedKpis.map((k) => (
            <div className="adm-kpi" key={k.label}>
              <div className="k-lbl">{k.label}</div>
              <div className="k-val" style={{ color: '#9ca3af' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{k.note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
