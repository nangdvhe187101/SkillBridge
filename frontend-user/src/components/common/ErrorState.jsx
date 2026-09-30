import { Link } from 'react-router-dom';
import Icon from '../Icon';

export default function ErrorState({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải được dữ liệu. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.',
  onRetry,
  homeLink = '/',
  style = {},
  className = ''
}) {
  return (
    <div className={`error-state ${className}`.trim()} style={style} role="alert" aria-live="assertive">
      <div className="error-state-icon-wrap" aria-hidden="true">
        <Icon name="x" width="32" height="32" />
      </div>
      <h3 className="empty-state-title" style={{ color: 'var(--coral, #ef4444)' }}>{title}</h3>
      <p className="empty-state-desc">{message}</p>
      
      <div className="empty-state-actions">
        {onRetry && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
            Thử lại
          </button>
        )}
        {homeLink && (
          <Link to={homeLink} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)' }}>
            Về trang chủ
          </Link>
        )}
      </div>
    </div>
  );
}
