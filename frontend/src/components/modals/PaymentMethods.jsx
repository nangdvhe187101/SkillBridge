import { fmtVND } from '../../context/StoreContext';

export const PAY_METHODS = [
  { id: 'bank', ic: '🏦', name: 'Chuyển khoản / QR ngân hàng', sub: 'Chuyển qua VietQR — có mã QR minh hoạ' },
  { id: 'ewallet', ic: '📱', name: 'Ví MoMo / ZaloPay', sub: 'Mô phỏng liên kết ví điện tử' },
  { id: 'card', ic: '💳', name: 'Thẻ tín dụng / ghi nợ', sub: 'Mô phỏng cổng thanh toán thẻ' },
];

export function payMethodLabel(id) {
  return { bank: 'QR ngân hàng', ewallet: 'Ví điện tử', card: 'Thẻ ngân hàng', wallet: 'Ví SkillBridge' }[id] || id;
}

export default function PaymentMethods({ selected, onSelect, walletBalance }) {
  const methods = [...PAY_METHODS, { id: 'wallet', ic: '👛', name: 'Số dư ví SkillBridge', sub: 'Hiện có ' + fmtVND(walletBalance) }];
  return (
    <div className="paymethods">
      {methods.map((m) => (
        <div key={m.id} className={'paymethod' + (selected === m.id ? ' is-active' : '')} onClick={() => onSelect(m.id)}>
          <div className="pm-ic">{m.ic}</div>
          <div className="pm-main"><b>{m.name}</b><span>{m.sub}</span></div>
          <div className="pm-radio" />
        </div>
      ))}
    </div>
  );
}
