import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useStore, fmtVND } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

const CATS = ['Video Editing', 'Graphic Design', 'Content Marketing', 'Data Entry'];

export default function PostJob() {
  const { state, submitJobForm, clearEditJob } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const editingJob = state.editingJobId ? state.myJobs.find((j) => j.id === state.editingJobId) : null;

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState(CATS[0]);
  const [budget, setBudget] = useState('');
  const [desc, setDesc] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title);
      setCat(editingJob.cat);
      setBudget(String(editingJob.budget));
      setDesc(editingJob.desc || '');
      setUrgent(!!editingJob.urgent);
    }
  }, [editingJob]);

  const triZeroLeft = Math.max(0, 3 - state.triZeroUsed);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim() || !budget) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc.', '⚠️');
      return;
    }
    submitJobForm({ title: title.trim(), cat, budget: Number(budget), desc: desc.trim(), urgent, editingId: editingJob?.id || null });
    showToast(editingJob ? 'Đã cập nhật tin tuyển dụng!' : 'Đã đăng tin tuyển dụng thành công!', '✓');
    navigate('/dashboard');
  };

  const cancelEdit = () => { clearEditJob(); navigate('/dashboard'); };

  return (
    <div className="page active">
      <div className="post-body wrap">
        <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(editingJob ? '/dashboard' : '/'); }}>
          <Icon name="chevleft" /> {editingJob ? 'Về Dashboard' : 'Về trang chủ'}
        </a>

        <div className="post-grid">
          <form className="post-form-card" onSubmit={submit}>
            <h2>{editingJob ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}</h2>
            <div className="sub">
              {editingJob
                ? 'Cập nhật thông tin — thay đổi sẽ hiển thị ngay cho ứng viên.'
                : (triZeroLeft > 0
                  ? `Còn ${triZeroLeft}/3 lượt đăng tin miễn phí hoa hồng nền tảng.`
                  : 'Đã dùng hết ưu đãi Triple-Zero — phí nền tảng tiêu chuẩn sẽ áp dụng.')}
            </div>

            <div className="field">
              <label>Tiêu đề công việc</label>
              <input type="text" placeholder="Ví dụ: Dựng video TikTok quảng cáo 30s" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Danh mục</label>
                <select value={cat} onChange={(e) => setCat(e.target.value)}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Ngân sách (VND)</label>
                <input type="number" placeholder="250000" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Mô tả chi tiết</label>
              <textarea placeholder="Mô tả yêu cầu, thời hạn, tài liệu tham khảo..." value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            <div className="check-row">
              <input type="checkbox" id="pjUrgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              <label htmlFor="pjUrgent">Đánh dấu là công việc cần tuyển gấp (Featured Listing, 20.000đ)</label>
            </div>

            <button type="submit" className="btn btn-primary btn-block">{editingJob ? 'Lưu thay đổi' : 'Đăng tin ngay'}</button>
            {editingJob && <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={cancelEdit}>Hủy chỉnh sửa</button>}
          </form>

          <div>
            <div className="preview-label">Xem trước tin đăng</div>
            <div className="job-card" style={{ cursor: 'default' }}>
              <div className="jc-top">
                <div className="jc-emp">
                  <div className="jc-av" style={{ background: 'linear-gradient(135deg,var(--primary),var(--coral))' }} />
                  <div><b>Doanh nghiệp của bạn <Icon name="check" style={{ width: 12, height: 12, display: 'inline' }} /></b><span>Vị trí chưa xác định</span></div>
                </div>
                {urgent && <span className="chip chip-coral">Gấp</span>}
              </div>
              <h3>{title || 'Tiêu đề công việc sẽ hiện ở đây'}</h3>
              <div className="jc-tags"><span className="chip">{cat}</span></div>
              <div className="jc-foot">
                <span className="jc-price">{budget ? fmtVND(Number(budget)) : '—'}</span>
                <span className="jc-time">Vừa đăng</span>
              </div>
            </div>

            <div className="pcard" style={{ marginTop: 16 }}>
              <h4>Vì sao nên đăng tin ở đây?</h4>
              <ul className="price-feat" style={{ marginBottom: 0 }}>
                <li><Icon name="check" /> Ghép ứng viên phù hợp trong dưới 15 phút</li>
                <li><Icon name="check" /> Toàn bộ ứng viên đã xác thực email đại học</li>
                <li><Icon name="check" /> Được bảo vệ bởi hệ thống Reliability Score</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
