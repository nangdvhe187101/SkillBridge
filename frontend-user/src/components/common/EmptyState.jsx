import { Link } from 'react-router-dom';
import Icon from '../Icon';

export default function EmptyState({
  preset = 'general',
  icon,
  title = 'Không có dữ liệu',
  description,
  actionLabel,
  onAction,
  actionLink,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionLink,
  style = {},
  className = ''
}) {
  const getPresetIcon = () => {
    if (icon) return icon;
    switch (preset) {
      case 'search':
        return <Icon name="search" width="32" height="32" />;
      case 'briefcase':
      case 'jobs':
        return <Icon name="briefcase" width="32" height="32" />;
      case 'message':
      case 'chat':
        return <Icon name="chat" width="32" height="32" />;
      case 'wallet':
      case 'finance':
        return <Icon name="wallet" width="32" height="32" />;
      case 'users':
      case 'talents':
        return <Icon name="users" width="32" height="32" />;
      case 'document':
      case 'file':
        return <Icon name="file" width="32" height="32" />;
      default:
        return <Icon name="inbox" width="32" height="32" />;
    }
  };

  return (
    <div className={`empty-state ${className}`.trim()} style={style} role="status" aria-live="polite">
      <div className="empty-state-icon-wrap" aria-hidden="true">
        {getPresetIcon()}
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-desc">{description}</p>}
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && (
            actionLink ? (
              <Link to={actionLink} className="btn btn-primary btn-sm">
                {actionLabel}
              </Link>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
                {actionLabel}
              </button>
            )
          )}

          {secondaryActionLabel && (
            secondaryActionLink ? (
              <Link to={secondaryActionLink} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)' }}>
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ border: '1px solid var(--border)' }}
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
