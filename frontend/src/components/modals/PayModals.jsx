import { useState, useMemo } from 'react';
import ModalShell from './ModalShell';
import PaymentMethods, { payMethodLabel } from './PaymentMethods';
import { useStore, commissionRate, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import Icon from '../Icon';

import { useEffect, useRef } from 'react';
import { createPaymentOrder, getPaymentOrderStatus, getActivePendingOrder, cancelPendingOrder } from '../../api/paymentApi';
import { connectPaymentRealtime } from '../../services/paymentSignalR';

export function TopupModal({ onClose, initialOrder }) {
  const { state, refreshWallet, showToast } = useStore();
  const [amount, setAmount] = useState(() => initialOrder?.amount || 200000);
  const [method, setMethod] = useState('bank'); // 'bank' (SePay) | 'vnpay'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // QR Screen state (for SePay)
  const [orderData, setOrderData] = useState(() => initialOrder || null);
  const [activePending, setActivePending] = useState(null);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (initialOrder?.expiresAt) {
      return Math.max(10, Math.floor((new Date(initialOrder.expiresAt).getTime() - Date.now()) / 1000));
    }
    return 900;
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const signalRRef = useRef(null);

  // Tự động kiểm tra đơn pending còn hiệu lực nếu người dùng mở modal nạp tiền
  useEffect(() => {
    if (!initialOrder && !orderData) {
      getActivePendingOrder()
        .then((p) => {
          if (p) setActivePending(p);
        })
        .catch(() => {});
    }
  }, [initialOrder, orderData]);

  // Clear polling, timer and SignalR on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (signalRRef.current) signalRRef.current.stop();
    };
  }, []);

  // Timer countdown when orderData is set
  useEffect(() => {
    if (!orderData || paymentSuccess) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (signalRRef.current) {
            signalRRef.current.stop();
            signalRRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [orderData, paymentSuccess]);

  // Realtime SignalR notification + Fallback Short-polling
  useEffect(() => {
    if (!orderData || paymentSuccess) return;

    let isSubscribed = true;

    const handleSuccess = async (res) => {
      if (!isSubscribed) return;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (signalRRef.current) {
        signalRRef.current.stop();
        signalRRef.current = null;
      }
      setPaymentSuccess(true);
      if (typeof refreshWallet === 'function') {
        await refreshWallet();
      }
      showToast(`Nạp ${fmtVND(res.amount)} vào ví thành công!`, 'check');
    };

    const checkStatus = async () => {
      try {
        const res = await getPaymentOrderStatus(orderData.orderCode);
        if (res && res.status === 'paid') {
          await handleSuccess(res);
        }
      } catch {
        // Silent poll error handling
      }
    };

    // 1. Kết nối SignalR Realtime với Redis Pub/Sub backplane
    signalRRef.current = connectPaymentRealtime(orderData.orderCode, {
      onPaymentSuccess: (payload) => {
        handleSuccess(payload);
      },
      onReconnected: () => {
        // Reconnect: sync lại trạng thái qua REST API ngay lập tức
        checkStatus();
      },
      onError: () => {
        // Fallback polling vẫn tiếp tục chạy làm safety net
      }
    });

    // 2. Chốt chặn an toàn: Kiểm tra ngay và fallback polling nhẹ (mỗi 4s)
    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 4000);

    return () => {
      isSubscribed = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (signalRRef.current) {
        signalRRef.current.stop();
        signalRRef.current = null;
      }
    };
  }, [orderData, paymentSuccess, refreshWallet, showToast]);

  const handleStartPayment = async () => {
    setErrorMsg('');
    if (!amount || amount < 10000 || amount > 100000000) {
      setErrorMsg('Số tiền nạp tối thiểu là 10.000đ và tối đa là 100.000.000đ.');
      return;
    }

    if (method !== 'bank') {
      setErrorMsg('Cổng thanh toán VNPAY hiện đang trong quá trình xin cấp phép kết nối. Vui lòng chọn phương thức Chuyển khoản VietQR!');
      return;
    }

    try {
      setLoading(true);
      const res = await createPaymentOrder('SEPAY', amount);

      // SePay VietQR mode
      setOrderData(res);
      const remainingSecs = res.expiresAt
        ? Math.max(10, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000))
        : 900;
      setTimeLeft(remainingSecs);
    } catch (err) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi khởi tạo đơn nạp tiền.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép ${fieldName}!`, 'copy');
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Screen 3: Payment Success
  if (paymentSuccess) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 8px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(22, 163, 74, 0.12)',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 0 8px rgba(22, 163, 74, 0.05)'
          }}>
            <Icon name="check" width="34" height="34" />
          </div>
          <h3 style={{ color: '#16a34a', margin: '0 0 8px 0', fontSize: 20 }}>Nạp tiền thành công!</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
            Tài khoản đã được cộng <b>{fmtVND(amount)}</b> vào số dư ví SkillBridge.
          </p>
          <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-soft)' }}>Mã đơn hàng:</span>
              <b>{orderData?.orderCode}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-soft)' }}>Phương thức:</span>
              <span>VietQR (SePay)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-soft)' }}>Trạng thái:</span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>Đã thanh toán (Paid)</span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Hoàn tất
          </button>
        </div>
      </ModalShell>
    );
  }

  // Screen 2: VietQR Transfer Info
  if (orderData) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingRight: 36, gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Quét mã VietQR để nạp tiền</h3>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: timeLeft < 120 ? '#dc2626' : 'var(--primary)',
            background: 'var(--bg-subtle, rgba(0,0,0,0.05))',
            padding: '4px 10px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Icon name="timer" width="15" height="15" />
            <span>{formatTimer(timeLeft)}</span>
          </span>
        </div>

        {timeLeft === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>Đơn nạp tiền này đã hết hạn hiệu lực.</p>
            <button className="btn btn-outline" onClick={() => setOrderData(null)}>Tạo mã mới</button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {orderData.qrCodeUrl && (
                <div style={{
                  display: 'inline-block',
                  background: '#fff',
                  padding: 12,
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}>
                  <img
                    src={orderData.qrCodeUrl}
                    alt="VietQR nạp tiền SkillBridge"
                    style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
                  />
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
                Mở ứng dụng ngân hàng bất kỳ để quét mã QR chuyển khoản tự động
              </div>
            </div>

            <div style={{
              background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
              border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Ngân hàng:</span>
                <b>{orderData.bankName || orderData.bankCode || 'MB Bank'}</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Số tài khoản:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b>{orderData.accountNumber}</b>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: copiedField === 'Số tài khoản' ? '#16a34a' : 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center' }}
                    onClick={() => copyToClipboard(orderData.accountNumber, 'Số tài khoản')}
                    title="Sao chép số tài khoản"
                  >
                    <Icon name={copiedField === 'Số tài khoản' ? 'check' : 'copy'} width="14" height="14" />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Số tiền:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b style={{ color: 'var(--primary)', fontSize: 14 }}>{fmtVND(orderData.amount)}</b>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: copiedField === 'Số tiền' ? '#16a34a' : 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center' }}
                    onClick={() => copyToClipboard(orderData.amount.toString(), 'Số tiền')}
                    title="Sao chép số tiền"
                  >
                    <Icon name={copiedField === 'Số tiền' ? 'check' : 'copy'} width="14" height="14" />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(234, 88, 12, 0.08)', padding: '8px 10px', borderRadius: 8 }}>
                <div>
                  <span style={{ color: '#ea580c', fontWeight: 600, display: 'block', fontSize: 11 }}>NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC):</span>
                  <b style={{ color: '#ea580c', fontSize: 14, letterSpacing: 0.5 }}>{orderData.transferContent}</b>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ borderColor: '#ea580c', color: '#ea580c', padding: '4px 8px' }}
                  onClick={() => copyToClipboard(orderData.transferContent, 'Nội dung chuyển khoản')}
                >
                  {copiedField === 'Nội dung chuyển khoản' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
              <span className="spinner-dots" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }} />
              Đang chờ hệ thống xác nhận thanh toán tự động...
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setOrderData(null)}>Quay lại</button>
              <button className="btn btn-outline" onClick={onClose}>Đóng</button>
            </div>
          </>
        )}
      </ModalShell>
    );
  }

  // Screen 1: Choose Amount and Gateway
  return (
    <ModalShell onClose={onClose}>
      <h3>Nạp tiền vào ví SkillBridge</h3>
      <p>Chọn số tiền và cổng thanh toán để nạp tiền trực tiếp vào tài khoản của bạn.</p>

      {activePending && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.1), rgba(249, 115, 22, 0.05))',
          border: '1px solid rgba(234, 88, 12, 0.35)',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5, color: '#c2410c' }}>
                <Icon name="hourglass" width="15" height="15" />
                <span>Bạn đang có đơn nạp {fmtVND(activePending.amount)} chưa hoàn tất</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Mã: <b>{activePending.orderCode}</b> · {activePending.provider}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ background: '#ea580c', borderColor: '#ea580c', fontSize: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setOrderData(activePending);
                const remainingSecs = activePending.expiresAt
                  ? Math.max(10, Math.floor((new Date(activePending.expiresAt).getTime() - Date.now()) / 1000))
                  : 900;
                setTimeLeft(remainingSecs);
              }}
            >
              <Icon name="qr" width="14" height="14" />
              <span>Tiếp tục quét mã QR</span>
              <Icon name="arrow" width="13" height="13" />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={async () => {
                await cancelPendingOrder(activePending.orderCode).catch(() => {});
                setActivePending(null);
                showToast('Đã hủy đơn nạp cũ.', 'check');
              }}
            >
              <Icon name="x" width="12" height="12" />
              <span>Hủy đơn này</span>
            </button>
          </div>
        </div>
      )}

      <div className="amt-chip-row">
        {[100000, 200000, 500000, 1000000, 2000000].map((v) => (
          <button
            key={v}
            type="button"
            className={'amt-chip' + (amount === v ? ' is-active' : '')}
            onClick={() => { setAmount(v); setErrorMsg(''); }}
          >
            {fmtVND(v)}
          </button>
        ))}
      </div>

      <div className="field">
        <label>Hoặc nhập số tiền khác (VND)</label>
        <input
          type="number"
          min="10000"
          max="100000000"
          step="10000"
          value={amount || ''}
          placeholder="Tối thiểu 10.000đ"
          onChange={(e) => {
            setAmount(Number(e.target.value) || 0);
            setErrorMsg('');
          }}
        />
      </div>

      <PaymentMethods
        selected={method}
        onSelect={(m) => { setMethod(m); setErrorMsg(''); }}
        onDisabledClick={(m) => {
          showToast(`Phương thức "${m.name}" đang trong quá trình xin cấp phép kết nối. Vui lòng thanh toán qua VietQR!`, 'hourglass');
        }}
        walletBalance={state.balance}
        includeWallet={false}
      />

      {errorMsg && (
        <div className="field-error" style={{ margin: '12px 0', color: '#dc2626', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || !amount || amount < 10000}
          onClick={handleStartPayment}
        >
          {loading ? 'Đang khởi tạo đơn...' : 'Tạo mã VietQR nạp tiền'}
        </button>
        <button type="button" className="btn btn-outline" disabled={loading} onClick={onClose}>
          Hủy
        </button>
      </div>
    </ModalShell>
  );
}


export function WithdrawModal({ onClose }) {
  const { withdraw, state } = useStore();
  const [amount, setAmount] = useState(100000);
  const confirm = () => {
    if (!amount || amount <= 0 || amount > state.balance) return;
    withdraw(amount);
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <h3>Rút tiền về ngân hàng</h3>
      <p>Số dư khả dụng: <b>{fmtVND(state.balance)}</b>. Tiền thường về tài khoản trong 24 giờ (mô phỏng demo).</p>
      <div className="field">
        <label>Số tiền muốn rút (VND)</label>
        <input type="number" defaultValue={100000} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
      </div>
      <div className="field">
        <label>Tài khoản nhận</label>
        <input type="text" disabled style={{ opacity: 0.7 }} defaultValue="**** **** 4821 · Vietcombank" />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={confirm}>Xác nhận rút tiền</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function SubscribeModal({ onClose }) {
  const { subscribePro, state } = useStore();
  const { openModal } = useModal();
  const amount = 49000;
  const isInsufficient = state.balance < amount;
  const shortfall = amount - state.balance;
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const confirm = async () => {
    if (isInsufficient) return;
    try {
      setSubmitting(true);
      setErrorMsg('');
      await subscribePro();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đăng ký gói Freelance Pro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>Thanh toán gói Freelance Pro</h3>
      <div className="checkout-summary">
        <div className="cs-row"><span>Gói Freelance Pro (1 tháng)</span><span>{fmtVND(amount)}</span></div>
        <div className="cs-row"><span>Thuế / phí xử lý</span><span>0đ</span></div>
        <div className="cs-row total"><span>Tổng thanh toán</span><span>{fmtVND(amount)}</span></div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'rgba(22, 163, 74, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(22, 163, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <Icon name="wallet" width="18" height="18" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Số dư Ví SkillBridge</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Hiện có: <b>{fmtVND(state.balance)}</b>
            </div>
          </div>
        </div>
        <span className="badge badge-success" style={{ fontSize: 11 }}>Trừ từ ví</span>
      </div>

      {isInsufficient && (
        <div style={{ background: 'rgba(255, 92, 122, 0.12)', border: '1px solid var(--coral)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 13 }}>
          <b style={{ color: 'var(--coral)' }}>Số dư ví không đủ ({fmtVND(state.balance)} / {fmtVND(amount)})</b>
          <p style={{ marginTop: 4, color: 'var(--ink-soft)' }}>
            Bạn cần nạp thêm <b>{fmtVND(shortfall)}</b> vào ví để đăng ký gói Pro.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => {
              onClose();
              openModal('topup', { initialOrder: { amount: shortfall } });
            }}
          >
            + Nạp thêm {fmtVND(shortfall)} vào ví
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="field-error" style={{ margin: '10px 0' }}>{errorMsg}</div>
      )}

      <div className="modal-actions">
        <button
          className="btn btn-primary"
          disabled={submitting || isInsufficient}
          onClick={confirm}
        >
          {submitting ? 'Đang xử lý...' : 'Thanh toán & nâng cấp'}
        </button>
        <button className="btn btn-outline" disabled={submitting} onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function UpgradeVipModal({ onClose }) {
  const { upgradeVip, state } = useStore();
  const { openModal } = useModal();
  const amount = 199000;
  const isInsufficient = state.balance < amount;
  const shortfall = amount - state.balance;
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const confirm = async () => {
    if (isInsufficient) return;
    try {
      setSubmitting(true);
      setErrorMsg('');
      await upgradeVip();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi nâng cấp VIP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Nâng cấp VIP Business Suite</h3>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Dành cho Doanh nghiệp & Agency</span>
      </div>

      <div className="checkout-summary">
        <div className="cs-row"><span>Gói VIP Business Suite (1 tháng)</span><span>{fmtVND(amount)}</span></div>
        <div className="cs-row"><span>Hoa hồng ký quỹ</span><span style={{ color: '#16a34a', fontWeight: 700 }}>Giảm 50% (còn 5%)</span></div>
        <div className="cs-row"><span>Ghim tin Featured tặng kèm</span><span style={{ color: '#16a34a', fontWeight: 700 }}>Miễn phí 1 tin/tháng</span></div>
        <div className="cs-row"><span>Trích Quỹ Bảo hiểm (10%)</span><span>{fmtVND(Math.round(amount * 0.1))}</span></div>
        <div className="cs-row total"><span>Tổng thanh toán</span><span>{fmtVND(amount)}</span></div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'rgba(22, 163, 74, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(22, 163, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <Icon name="wallet" width="18" height="18" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Số dư Ví SkillBridge</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Hiện có: <b>{fmtVND(state.balance)}</b>
            </div>
          </div>
        </div>
        <span className="badge badge-success" style={{ fontSize: 11 }}>Trừ từ ví</span>
      </div>

      {isInsufficient && (
        <div style={{ background: 'rgba(255, 92, 122, 0.12)', border: '1px solid var(--coral)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 13 }}>
          <b style={{ color: 'var(--coral)' }}>Số dư ví không đủ ({fmtVND(state.balance)} / {fmtVND(amount)})</b>
          <p style={{ marginTop: 4, color: 'var(--ink-soft)' }}>
            Bạn cần nạp thêm <b>{fmtVND(shortfall)}</b> vào ví để kích hoạt gói VIP.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => {
              onClose();
              openModal('topup', { initialOrder: { amount: shortfall } });
            }}
          >
            + Nạp thêm {fmtVND(shortfall)} vào ví
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="field-error" style={{ margin: '10px 0' }}>{errorMsg}</div>
      )}

      <div className="modal-actions">
        <button
          className="btn btn-primary"
          disabled={submitting || isInsufficient}
          onClick={confirm}
        >
          {submitting ? 'Đang kích hoạt...' : 'Thanh toán & Kích hoạt VIP'}
        </button>
        <button className="btn btn-outline" disabled={submitting} onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function HireModal({ onClose, jobId, applicantIdx, applicantName, applicant, job: propJob, onHired }) {
  const { state, hire } = useStore();
  const { openModal } = useModal();
  const localJob = state.myJobs.find((j) => String(j.id) === String(jobId));
  const job = propJob || localJob || { id: jobId, title: 'Công việc', budget: 150000 };
  const a = applicant || (applicantName ? { name: applicantName } : (job?.applicants?.[applicantIdx] || { name: 'Ứng viên' }));

  const rate = commissionRate(state);
  const commission = Math.round((job?.budget || 0) * rate);
  const total = job?.budget || 0;

  // Pre-fill số ngày từ cam kết lúc đăng job (giữa deadlineAt và postedAt)
  const committedDays = useMemo(() => {
    if (job?.deadlineAt && job?.postedAt) {
      const diffMs = new Date(job.deadlineAt).getTime() - new Date(job.postedAt).getTime();
      if (diffMs > 0) {
        return Math.max(1, Math.round(diffMs / 86400000));
      }
    }
    if (job?.deadlineAt) {
      const diffMs = new Date(job.deadlineAt).getTime() - Date.now();
      if (diffMs > 0) {
        return Math.max(1, Math.round(diffMs / 86400000));
      }
    }
    return 3;
  }, [job?.deadlineAt, job?.postedAt]);

  const [days, setDays] = useState(committedDays);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!job || !a) return null;

  const isWalletInsufficient = state.balance < total;
  const shortfall = total - state.balance;

  const confirm = async () => {
    setErrorMsg('');
    if (!days || days <= 0) {
      setErrorMsg('Vui lòng nhập số ngày hoàn thành hợp lệ.');
      return;
    }
    if (isWalletInsufficient) {
      setErrorMsg(`Số dư ví hiện tại (${fmtVND(state.balance)}) không đủ để ký quỹ ${fmtVND(total)}. Vui lòng nạp thêm tiền vào ví.`);
      return;
    }
    try {
      setSubmitting(true);
      await hire({
        jobId: job.id,
        applicantIdx,
        applicantName: a.name,
        applicant: a,
        applicationId: a.applicationId || a.id,
        days: Number(days),
        method: 'wallet'
      });
      if (typeof onHired === 'function') {
        await onHired();
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi thuê ứng viên.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopup = () => {
    onClose();
    openModal('topup', { initialOrder: { amount: shortfall > 0 ? shortfall : 200000 } });
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>Thuê & thanh toán ký quỹ</h3>
      <p>Bạn sắp thuê <b>{a.name}</b> cho công việc "<b>{job.title}</b>". Tiền sẽ được giữ an toàn (escrow) tại SkillBridge và chỉ giải ngân khi công việc hoàn thành.</p>
      <div className="checkout-summary">
        <div className="cs-row"><span>Ngân sách công việc (Ký quỹ)</span><span>{fmtVND(job.budget)}</span></div>
        <div className="cs-row" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          <span>Phí sàn ({Math.round(rate * 100)}%){state.vipBusiness ? ' · VIP Business' : ''}</span>
          <span style={{ color: '#16a34a', fontWeight: 500 }}>Khấu trừ từ thù lao SV ({fmtVND(commission)})</span>
        </div>
        <div className="cs-row total"><span>Tổng tiền ký quỹ cần thanh toán</span><span>{fmtVND(total)}</span></div>
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ margin: 0, fontWeight: 600 }}>Hạn hoàn thành (số ngày)</label>
          {committedDays > 0 && (
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" width="13" height="13" /> Cam kết lúc đăng job: {committedDays} ngày
            </span>
          )}
        </div>
        <input type="number" min="1" step="1" value={days} onChange={(e) => { setDays(e.target.value); setErrorMsg(''); }} />
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'rgba(22, 163, 74, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(22, 163, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <Icon name="wallet" width="18" height="18" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Số dư Ví SkillBridge</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Hiện có: <b>{fmtVND(state.balance)}</b>
            </div>
          </div>
        </div>
        <span className="badge badge-success" style={{ fontSize: 11 }}>Trừ từ ví</span>
      </div>

      {isWalletInsufficient && (
        <div style={{ background: 'rgba(255, 92, 122, 0.12)', border: '1px solid var(--coral)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 13 }}>
          <b style={{ color: 'var(--coral)' }}>Số dư ví không đủ ({fmtVND(state.balance)} / {fmtVND(total)})</b>
          <p style={{ marginTop: 4, color: 'var(--ink-soft)' }}>
            Bạn cần nạp thêm <b>{fmtVND(shortfall)}</b> vào ví để hoàn tất ký quỹ hợp đồng.
          </p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleTopup}>
            + Nạp thêm {fmtVND(shortfall)} vào ví
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="field-error" style={{ margin: '10px 0' }}>{errorMsg}</div>
      )}

      <div className="modal-actions">
        <button className="btn btn-primary" disabled={submitting || isWalletInsufficient} onClick={confirm}>
          {submitting ? 'Đang xử lý...' : 'Xác nhận thuê & ký quỹ'}
        </button>
        <button className="btn btn-outline" disabled={submitting} onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function ClaimModal({ onClose }) {
  const { state, submitClaim } = useStore();
  const eligibleApps = state.myApplications.filter((a) => ['hired', 'submitted', 'completed', 'cancelled'].includes(a.status));
  const [appId, setAppId] = useState(eligibleApps[0]?.id || '');
  const [desc, setDesc] = useState('');

  const confirm = () => {
    const app = eligibleApps.find((a) => a.id === appId);
    if (!desc.trim() || !app) return;
    submitClaim({ jobTitle: app.title, jobBudget: app.budget, desc: desc.trim() });
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>Gửi khiếu nại bồi thường</h3>
      <p>Quỹ Bảo hiểm Tương hỗ Cộng đồng có thể bồi thường 30–50% giá trị công việc nếu bạn bị quỵt tiền.</p>
      {eligibleApps.length === 0 ? (
        <div className="empty-state">Bạn chưa có công việc nào đủ điều kiện gửi khiếu nại.</div>
      ) : (
        <>
          <div className="field">
            <label>Công việc liên quan</label>
            <select value={appId} onChange={(e) => setAppId(e.target.value)}>
              {eligibleApps.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Mô tả bằng chứng / tình huống</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ví dụ: đã giao sản phẩm qua chat lúc 20h ngày X nhưng nhà tuyển dụng không phản hồi và không thanh toán..." />
          </div>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={eligibleApps.length === 0} onClick={confirm}>Gửi khiếu nại</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}
