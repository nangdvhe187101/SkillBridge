import { fmtVND } from '../../context/StoreContext';
import Icon from '../Icon';

export const PAY_METHODS = [
  {
    id: 'bank',
    iconName: 'bank',
    name: 'Chuyển khoản VietQR (SePay)',
    sub: 'Quét mã VietQR trên app ngân hàng bất kỳ — Tự động xác nhận sau 2 giây',
    badge: 'Khuyên dùng · 24/7',
    badgeColor: '#16a34a',
    disabled: false,
  },
  {
    id: 'vnpay',
    iconName: 'card',
    name: 'Cổng thanh toán VNPAY',
    sub: 'Thẻ ATM nội địa, Visa/Mastercard, VNPAY-QR (Đang làm thủ tục xin cấp phép)',
    badge: 'Đang triển khai',
    badgeColor: '#f59e0b',
    disabled: true,
  },
  {
    id: 'ewallet',
    iconName: 'smartphone',
    name: 'Ví MoMo / ZaloPay',
    sub: 'Mô phỏng liên kết ví điện tử',
    badge: 'Sắp ra mắt',
    badgeColor: '#64748b',
    disabled: true,
  },
];

export function payMethodLabel(id) {
  return {
    bank: 'VietQR (SePay)',
    vnpay: 'VNPAY (Đang triển khai)',
    ewallet: 'Ví điện tử',
    card: 'Thẻ ngân hàng',
    wallet: 'Ví SkillBridge'
  }[id] || id;
}

export default function PaymentMethods({ selected, onSelect, walletBalance, includeWallet = true, onDisabledClick }) {
  const methods = includeWallet
    ? [...PAY_METHODS, { id: 'wallet', iconName: 'wallet', name: 'Số dư ví SkillBridge', sub: 'Hiện có ' + fmtVND(walletBalance), disabled: false }]
    : PAY_METHODS;

  const handleClick = (m) => {
    if (m.disabled) {
      if (typeof onDisabledClick === 'function') {
        onDisabledClick(m);
      }
      return;
    }
    onSelect(m.id);
  };

  return (
    <div className="paymethods">
      {methods.map((m) => {
        const isSelected = selected === m.id;
        return (
          <div
            key={m.id}
            className={'paymethod' + (isSelected ? ' is-active' : '') + (m.disabled ? ' is-disabled' : '')}
            style={{
              opacity: m.disabled ? 0.65 : 1,
              cursor: m.disabled ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
            onClick={() => handleClick(m)}
          >
            <div className="pm-ic" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={m.iconName} width="22" height="22" />
            </div>
            <div className="pm-main" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ color: m.disabled ? 'var(--ink-soft)' : 'var(--ink)' }}>{m.name}</b>
                {m.badge && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: `${m.badgeColor}18`,
                    color: m.badgeColor,
                    border: `1px solid ${m.badgeColor}40`
                  }}>
                    {m.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, display: 'block' }}>{m.sub}</span>
            </div>
            <div className="pm-radio" style={{ opacity: m.disabled ? 0.3 : 1 }} />
          </div>
        );
      })}
    </div>
  );
}
