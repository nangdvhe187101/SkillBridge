import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import Pagination from './Pagination';
import AdminModal from './AdminModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { fmtVND } from '../utils/formatters';
import { downloadJobAttachment } from '../utils/fileDownloader';
import {
  getAdminModerationQueue,
  getAdminContentStats,
  approveAdminJob,
  rejectAdminJob,
  warnAdminJobPoster,
  getAdminCategories,
  createAdminCategory,
  deleteAdminCategory,
  getAdminFeaturedRequests,
  approveAdminFeatured,
} from '../api/adminApi';

const RISK_LABEL = {
  high: 'Rủi ro cao',
  med: 'Rủi ro vừa',
  low: 'Rủi ro thấp',
};

const RISK_STYLE = {
  high: { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)' },
  med: { background: 'rgba(234, 179, 8, 0.12)', color: '#d97706', border: '1px solid rgba(234, 179, 8, 0.25)' },
  low: { background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.25)' },
};

export default function AdminContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Tab State: 'queue' | 'cats' | 'featured'
  const [sub, setSub] = useState('queue');

  // Moderation Queue States
  const [queue, setQueue] = useState([]);
  const [totalQueue, setTotalQueue] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Stats State
  const [stats, setStats] = useState({
    pendingJobsCount: 0,
    highRiskCount: 0,
    totalCategoriesCount: 0,
    featuredRequestsCount: 0,
  });

  // Categories States
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [catsLoading, setCatsLoading] = useState(false);

  // Featured Requests States
  const [featured, setFeatured] = useState([]);
  const [featLoading, setFeatLoading] = useState(false);

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [viewJob, setViewJob] = useState(null); // Full dossier modal
  const [rejectModal, setRejectModal] = useState(null); // { job }
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [warnModal, setWarnModal] = useState(null); // { job }
  const [warnMessage, setWarnMessage] = useState('');
  const [warnError, setWarnError] = useState('');

  const [approveModal, setApproveModal] = useState(null); // { job }
  const [approveNote, setApproveNote] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Content Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminContentStats();
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê kiểm duyệt:', err);
    }
  }, []);

  // Load Moderation Queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminModerationQueue({
        page: currentPage,
        pageSize,
        risk: riskFilter,
        query: debouncedSearch,
        status: 'pending',
      });

      if (res) {
        setQueue(res.items || []);
        setTotalQueue(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Lỗi tải hàng đợi duyệt tin:', err);
      setError(err.message || 'Không thể tải danh sách tin chờ duyệt.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, riskFilter, debouncedSearch]);

  // Load Categories
  const fetchCategories = useCallback(async () => {
    try {
      setCatsLoading(true);
      const res = await getAdminCategories();
      if (res) {
        setCategories(res);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục ngành nghề:', err);
    } finally {
      setCatsLoading(false);
    }
  }, []);

  // Load Featured Requests
  const fetchFeatured = useCallback(async () => {
    try {
      setFeatLoading(true);
      const res = await getAdminFeaturedRequests();
      if (res) {
        setFeatured(res);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách Featured:', err);
    } finally {
      setFeatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (sub === 'queue') {
      fetchQueue();
    } else if (sub === 'cats') {
      fetchCategories();
    } else if (sub === 'featured') {
      fetchFeatured();
    }
  }, [sub, fetchQueue, fetchCategories, fetchFeatured]);

  // Handle Approve Job
  const handleApprove = (m) => {
    setApproveNote('');
    setApproveModal({ job: m });
  };

  const confirmApprove = async () => {
    if (!approveModal?.job) return;
    setIsSubmitting(true);
    try {
      await approveAdminJob(approveModal.job.jobId, approveNote.trim());
      showToast(`Đã duyệt tin "${approveModal.job.title}" thành công. Tin đã hiển thị công khai!`, 'check');
      setApproveModal(null);
      setViewJob(null);
      fetchQueue();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi phê duyệt tin.', 'ban');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject Job
  const handleReject = (m) => {
    setRejectReason('');
    setRejectError('');
    setRejectModal({ job: m });
  };

  const confirmReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Lý do từ chối bắt buộc phải có tối thiểu 5 ký tự để gửi giải thích cho NTD.');
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectAdminJob(rejectModal.job.jobId, rejectReason.trim());
      showToast(`Đã từ chối tin tuyển dụng "${rejectModal.job.title}".`, 'ban');
      setRejectModal(null);
      setViewJob(null);
      fetchQueue();
      fetchStats();
    } catch (err) {
      setRejectError(err.message || 'Lỗi khi từ chối tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Warn Poster
  const handleWarn = (m) => {
    setWarnMessage('');
    setWarnError('');
    setWarnModal({ job: m });
  };

  const confirmWarn = async () => {
    if (!warnMessage.trim() || warnMessage.trim().length < 5) {
      setWarnError('Nội dung cảnh báo bắt buộc phải có tối thiểu 5 ký tự.');
      return;
    }
    setIsSubmitting(true);
    try {
      await warnAdminJobPoster(warnModal.job.jobId, warnMessage.trim());
      showToast(`Đã gửi cảnh báo chính sách tới nhà tuyển dụng "${warnModal.job.employerName}".`, 'warning');
      setWarnModal(null);
      setViewJob(null);
    } catch (err) {
      setWarnError(err.message || 'Lỗi gửi cảnh báo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      showToast('Vui lòng nhập tên danh mục ngành nghề.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCategory({ name: newCatName.trim() });
      showToast(`Đã thêm danh mục "${newCatName.trim()}" thành công!`, 'check');
      setNewCatName('');
      fetchCategories();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi tạo danh mục.', 'ban');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (cat) => {
    if (cat.jobsCount > 0) {
      showToast(`Không thể xóa danh mục "${cat.Name || cat.name}" vì đang có ${cat.jobsCount} tin liên kết.`, 'ban');
      return;
    }
    const catName = cat.name || cat.Name;
    if (await confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn danh mục "${catName}"?`, { danger: true, confirmLabel: 'Xóa danh mục' })) {
      try {
        await deleteAdminCategory(cat.id || cat.Id);
        showToast(`Đã xóa danh mục "${catName}".`, 'check');
        fetchCategories();
        fetchStats();
      } catch (err) {
        showToast(err.message || 'Lỗi xóa danh mục.', 'ban');
      }
    }
  };

  // Handle Approve Featured Request
  const handleApproveFeatured = async (f) => {
    if (await confirm(`Phê duyệt gắn nhãn Featured Listing 7 ngày cho tin "${f.jobTitle}"?`, { confirmLabel: 'Gắn nhãn Featured' })) {
      try {
        await approveAdminFeatured(f.id);
        showToast(`Đã gắn nhãn Featured 7 ngày cho tin "${f.jobTitle}" (Q-017).`, 'star');
        fetchFeatured();
        fetchStats();
      } catch (err) {
        showToast(err.message || 'Lỗi duyệt tin nổi bật.', 'ban');
      }
    }
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Kiểm duyệt nội dung & Tin tuyển dụng</h2>
        <p>Hàng đợi kiểm duyệt tin đăng mới, đối soát chống tin ảo/gian lận học thuật, quản lý danh mục và Featured Listing.</p>
      </div>

      {/* Cloudflare Horizontal Stats Bar */}
      <div className="cf-stats-row" style={{ marginBottom: 16 }}>
        <div className="cf-stat-col">
          <span className="cf-stat-lbl">
            <span>Tin chờ kiểm duyệt</span>
            <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title="Tin tuyển dụng mới gửi chờ phê duyệt">ⓘ</span>
          </span>
          <span className="cf-stat-val" style={{ color: stats.pendingJobsCount > 0 ? '#d97706' : '#16a34a' }}>
            {stats.pendingJobsCount}
          </span>
        </div>
        <div className="cf-stat-col">
          <span className="cf-stat-lbl">
            <span>Tin rủi ro cao</span>
            <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title="Có dấu hiệu cọc tiền, nạp tiền hoặc lừa đảo">⚠️</span>
          </span>
          <span className="cf-stat-val" style={{ color: stats.highRiskCount > 0 ? '#dc2626' : '#374151' }}>
            {stats.highRiskCount}
          </span>
        </div>
        <div className="cf-stat-col">
          <span className="cf-stat-lbl">
            <span>Ngành nghề toàn sàn</span>
            <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title="Tổng số danh mục nghề nghiệp hoạt động">ⓘ</span>
          </span>
          <span className="cf-stat-val">{stats.totalCategoriesCount}</span>
        </div>
        <div className="cf-stat-col">
          <span className="cf-stat-lbl">
            <span>Featured Requests</span>
            <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }} title="Yêu cầu tin nổi bật đã thanh toán">⭐</span>
          </span>
          <span className="cf-stat-val">{stats.featuredRequestsCount}</span>
        </div>
      </div>

      {/* Sub-tabs phẳng */}
      <div className="cf-tabs-row" style={{ marginBottom: 16 }}>
        <button
          className={`cf-tab-btn ${sub === 'queue' ? 'is-active' : ''}`}
          onClick={() => setSub('queue')}
        >
          Hàng đợi duyệt tin ({stats.pendingJobsCount})
        </button>
        <button
          className={`cf-tab-btn ${sub === 'cats' ? 'is-active' : ''}`}
          onClick={() => setSub('cats')}
        >
          Danh mục ngành nghề ({stats.totalCategoriesCount})
        </button>
        <button
          className={`cf-tab-btn ${sub === 'featured' ? 'is-active' : ''}`}
          onClick={() => setSub('featured')}
        >
          Featured Listing ({stats.featuredRequestsCount})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HÀNG ĐỢI DUYỆT TIN (MODERATION QUEUE) */}
      {/* ========================================================================= */}
      {sub === 'queue' && (
        <div>
          {/* Toolbar tìm kiếm & lọc rủi ro */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 480 }}>
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề tin, nhà tuyển dụng, ngành nghề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
              {searchQuery && (
                <button
                  className="cf-btn-secondary"
                  onClick={() => setSearchQuery('')}
                  style={{ padding: '7px 10px', fontSize: 12 }}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#374151',
                }}
              >
                <option value="all">Tất cả mức độ rủi ro</option>
                <option value="high">Rủi ro cao (Cần đối soát gắt gao)</option>
                <option value="med">Rủi ro vừa</option>
                <option value="low">Rủi ro thấp</option>
              </select>

              <button
                className="cf-btn-secondary"
                onClick={() => { fetchQueue(); fetchStats(); }}
                title="Làm mới dữ liệu từ máy chủ"
                style={{ padding: '7px 10px' }}
                disabled={loading}
              >
                ↻
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: 16,
                borderRadius: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <span>⚠️ {error}</span>
              <button
                onClick={fetchQueue}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          <div className="adm-card">
            <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Tin đăng chờ kiểm duyệt</h4>
              <span className="sub">{totalQueue} tin cần xử lý</span>
            </div>

            {loading ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
                <div style={{ fontSize: 14 }}>Đang tải danh sách tin tuyển dụng từ hệ thống...</div>
              </div>
            ) : queue.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  Tất cả tin đăng đã được kiểm duyệt sạch sẽ!
                </div>
                <div style={{ fontSize: 13 }}>Không có tin tuyển dụng nào đang chờ duyệt trong hàng đợi.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                {queue.map((m) => {
                  const riskKey = m.risk?.toLowerCase() || 'low';
                  const riskStyle = RISK_STYLE[riskKey] || RISK_STYLE.low;
                  const riskLabel = RISK_LABEL[riskKey] || 'Rủi ro thấp';

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: 14,
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <b style={{ fontSize: 14, color: '#111827' }}>{m.title}</b>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                            Người đăng: <b>{m.employerName}</b> ({m.employerEmail}) · Ngành nghề: <b>{m.categoryName}</b> · Ngân sách: <b style={{ color: '#0051c3' }}>{fmtVND(m.budget || 300000)}</b> · {new Date(m.submittedAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <span className="cf-status-pill">
                          <span
                            className="cf-status-dot"
                            style={{
                              background: riskKey === 'high' ? '#dc2626' : riskKey === 'med' ? '#d97706' : '#16a34a',
                            }}
                          />
                          <span style={{ color: riskKey === 'high' ? '#b91c1c' : riskKey === 'med' ? '#b45309' : '#15803d' }}>
                            {riskLabel}
                          </span>
                        </span>
                      </div>

                      {m.flagReason && (
                        <div style={{ fontSize: 12, background: '#fef2f2', padding: '6px 10px', borderRadius: 6, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #fecaca' }}>
                          <Icon name="alert-triangle" style={{ width: 14, height: 14, flexShrink: 0 }} />
                          <div><b>Cảnh báo hệ thống:</b> {m.flagReason}</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                        <button className="cf-btn-secondary" onClick={() => setViewJob(m)} style={{ padding: '5px 10px', fontSize: 12.5 }}>
                          <Icon name="search" style={{ width: 13, height: 13 }} />
                          <span>Chi tiết</span>
                        </button>
                        <button className="cf-btn-primary" onClick={() => handleApprove(m)} style={{ padding: '5px 12px', fontSize: 12.5 }}>
                          <Icon name="check" style={{ width: 13, height: 13 }} />
                          <span>Duyệt tin</span>
                        </button>
                        <div className="cf-btn-group">
                          <button onClick={() => handleReject(m)} style={{ color: '#b91c1c' }}>
                            Từ chối
                          </button>
                          <button onClick={() => handleWarn(m)}>
                            Cảnh báo
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phân trang */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalQueue}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="tin đăng"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ DANH MỤC NGÀNH NGHỀ (CATEGORIES) */}
      {/* ========================================================================= */}
      {sub === 'cats' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Danh mục ngành nghề toàn sàn</h4>
            <span className="sub">{categories.length} ngành nghề</span>
          </div>

          <div className="adm-toolbar" style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <input
              type="text"
              placeholder="Nhập tên ngành nghề mới, ví dụ: Lập trình Mobile Flutter / AI Engineer"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Đang thêm...' : '+ Thêm danh mục'}
            </button>
          </div>

          {catsLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
              <div>Đang tải danh sách ngành nghề...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              {categories.map((c) => {
                const catName = c.name || c.Name;
                const catId = c.id || c.Id;
                const jobsCount = c.jobsCount || 0;

                return (
                  <span
                    className="chip"
                    key={catId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      fontSize: 13,
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                    }}
                  >
                    <b>{catName}</b>
                    <span style={{ fontSize: 11, color: '#6b7280', background: '#e5e7eb', padding: '1px 6px', borderRadius: 10 }}>
                      {jobsCount} jobs
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#dc2626',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                      title="Xóa danh mục"
                    >
                      <Icon name="x" style={{ width: 13, height: 13 }} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEATURED LISTING REQUESTS */}
      {/* ========================================================================= */}
      {sub === 'featured' && (
        <div className="adm-card">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Yêu cầu gắn nhãn Featured Listing (Q-017)</h4>
            <span className="sub">Thời hạn hiệu lực: 7 ngày kể từ khi bấm Phê duyệt</span>
          </div>

          {featLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
              <div>Đang tải danh sách yêu cầu Featured...</div>
            </div>
          ) : featured.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
              Không có yêu cầu Featured nào đang chờ phê duyệt.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {featured.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#ffffff',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <b style={{ fontSize: 14, color: '#111827' }}>{f.jobTitle}</b>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                      NTD: <b>{f.employerName}</b> ({f.employerEmail}) · Phí đã thanh toán: <b style={{ color: '#16a34a' }}>{fmtVND(f.paidAmount || 20000)}</b> · Ngày yêu cầu: {new Date(f.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                    {f.expiresAt && (
                      <div style={{ fontSize: 11.5, color: '#d97706', marginTop: 2 }}>
                        Hạn hiển thị Featured: {new Date(f.expiresAt).toLocaleDateString('vi-VN')}
                      </div>
                    )}
                  </div>

                  <div>
                    {f.status === 'approved' ? (
                      <span className="chip" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' }}>
                        ✓ Đang Featured
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApproveFeatured(f)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="star" style={{ width: 13, height: 13, color: '#f59e0b' }} />
                        <span>Kích hoạt Featured (7 ngày)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XEM CHI TIẾT TIN TUYỂN DỤNG CẦN DUYỆT (JOB MODERATION DOSSIER) */}
      {/* ========================================================================= */}
      {viewJob && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setViewJob(null); }}>
          <div className="modal-box" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setViewJob(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" style={{ width: 16, height: 16 }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="chip" style={{ ...RISK_STYLE[viewJob.risk?.toLowerCase() || 'low'], fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                <span>{RISK_LABEL[viewJob.risk?.toLowerCase() || 'low']}</span>
              </span>
              <span className="chip chip-lime" style={{ fontSize: 11 }}>{viewJob.categoryName}</span>
            </div>

            <h2 style={{ fontSize: 18, margin: '6px 0 12px' }}>{viewJob.title}</h2>

            <div className="checkout-summary" style={{ marginBottom: 14 }}>
              <div className="cs-row">
                <span>Nhà tuyển dụng / Người đăng</span>
                <b>{viewJob.employerName} ({viewJob.employerEmail || 'Chưa xác thực email'})</b>
              </div>
              <div className="cs-row">
                <span>Ngân sách chi trả</span>
                <b style={{ color: 'var(--primary)' }}>{fmtVND(viewJob.budget || 300000)}</b>
              </div>
              <div className="cs-row">
                <span>Thời gian gửi tin</span>
                <span>{new Date(viewJob.submittedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {viewJob.flagReason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="alert-triangle" style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <b style={{ color: '#dc2626', fontSize: 13 }}>Cảnh báo hệ thống:</b>
                  <p style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>{viewJob.flagReason}</p>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>MÔ TẢ CÔNG VIỆC</h4>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, background: 'var(--surface)', padding: 12, borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {viewJob.description}
              </p>
            </div>

            {viewJob.requirements?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>YÊU CẦU ĐỐI VỚI SINH VIÊN</h4>
                <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  {viewJob.requirements.map((r, idx) => <li key={idx} style={{ marginBottom: 4 }}>{r}</li>)}
                </ul>
              </div>
            )}

            {viewJob.attachments?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>TÀI LIỆU ĐÍNH KÈM ({viewJob.attachments.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewJob.attachments.map((fileUrl, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="file-text" style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                        <b>Tài liệu #{idx + 1}</b>
                      </span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      >
                        <Icon name="download" style={{ width: 13, height: 13 }} />
                        <span>Xem / Tải file</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
              <button className="btn btn-primary" onClick={() => handleApprove(viewJob)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="check" style={{ width: 14, height: 14 }} />
                <span>Duyệt tin lên sàn</span>
              </button>
              <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleReject(viewJob)}>
                Từ chối tin
              </button>
              <button className="btn btn-outline" onClick={() => handleWarn(viewJob)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="alert-triangle" style={{ width: 14, height: 14 }} />
                <span>Gửi cảnh báo</span>
              </button>
              <button className="btn btn-outline" onClick={() => setViewJob(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PHÊ DUYỆT TIN KÈM GHI CHÚ --- */}
      <AdminModal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Xác nhận Phê duyệt Tin đăng"
        icon="check"
        iconColor="#16a34a"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14, lineHeight: 1.5 }}>
          Bạn đang phê duyệt tin tuyển dụng <b>"{approveModal?.job?.title}"</b> của nhà tuyển dụng <b>{approveModal?.job?.employerName}</b>. Tin này sẽ ngay lập tức được công khai trên sàn việc làm của sinh viên.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Ghi chú kiểm duyệt (tùy chọn)
          </label>
          <input
            type="text"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            placeholder="Ví dụ: Đã đối soát yêu cầu brief, hợp lệ..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setApproveModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button className="cf-btn-primary" onClick={confirmApprove} disabled={isSubmitting}>
            {isSubmitting ? 'Đang duyệt...' : 'Xác nhận Duyệt tin'}
          </button>
        </div>
      </AdminModal>

      {/* --- MODAL TỪ CHỐI TIN ĐĂNG --- */}
      <AdminModal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Từ chối Tin tuyển dụng"
        icon="ban"
        iconColor="#dc2626"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14 }}>
          Từ chối tin tuyển dụng <b>"{rejectModal?.job?.title}"</b>. Tin đăng sẽ bị hủy và hệ thống sẽ gửi thông báo giải thích lý do cho nhà tuyển dụng.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Lý do từ chối phê duyệt <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
            placeholder="Ví dụ: Nội dung tin yêu cầu ứng viên đặt cọc tiền bảo đảm, vi phạm nghiêm trọng chính sách sàn..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
          />
        </div>
        {rejectError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14 }}>⚠️ {rejectError}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setRejectModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button
            className="cf-btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={confirmReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Từ chối tin'}
          </button>
        </div>
      </AdminModal>

      {/* --- MODAL GỬI CẢNH BÁO NTD --- */}
      <AdminModal
        isOpen={!!warnModal}
        onClose={() => setWarnModal(null)}
        title="Gửi Cảnh Báo Vi Phạm Tới Nhà Tuyển Dụng"
        icon="alert-triangle"
        iconColor="#d97706"
      >
        <p style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 14 }}>
          Gửi cảnh báo tới NTD <b>{warnModal?.job?.employerName}</b> về tin tuyển dụng <b>"{warnModal?.job?.title}"</b>.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Nội dung cảnh báo vi phạm <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={warnMessage}
            onChange={(e) => { setWarnMessage(e.target.value); setWarnError(''); }}
            placeholder="Ví dụ: Vui lòng không chèn số Zalo/Telegram trong mô tả brief để giao dịch ngoài sàn..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
          />
        </div>
        {warnError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14 }}>⚠️ {warnError}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="cf-btn-secondary" onClick={() => setWarnModal(null)} disabled={isSubmitting}>
            Huỷ
          </button>
          <button
            className="cf-btn-secondary"
            style={{ color: '#d97706', borderColor: '#fcd34d' }}
            onClick={confirmWarn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi cảnh báo'}
          </button>
        </div>
      </AdminModal>
    </section>
  );
}
