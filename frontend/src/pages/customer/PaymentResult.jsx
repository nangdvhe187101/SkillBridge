import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getPaymentOrderStatus } from '../../api/paymentApi';
import { useStore, fmtVND } from '../../context/StoreContext';
import { connectPaymentRealtime } from '../../services/paymentSignalR';
import Icon from '../../components/Icon';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshWallet } = useStore();

  const orderCode = searchParams.get('orderCode');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const pollTimerRef = useRef(null);

  const handlePaymentSuccess = useCallback(async (payload) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (typeof refreshWallet === 'function') {
      await refreshWallet();
    }
    try {
      if (orderCode) {
        const data = await getPaymentOrderStatus(orderCode);
        setOrder(data);
      }
    } catch {
      setOrder((prev) => ({
        ...(prev || {}),
        status: 'paid',
        paidAt: payload?.paidAt || new Date().toISOString(),
      }));
    }
  }, [orderCode, refreshWallet]);

  const fetchStatus = useCallback(async () => {
    if (!orderCode) {
      setError('Không tìm thấy mã đơn hàng trong đường dẫn.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await getPaymentOrderStatus(orderCode);
      setOrder(data);

      if (data?.status === 'paid') {
        if (typeof refreshWallet === 'function') {
          await refreshWallet();
        }
      } else if (data?.status === 'pending' && retryCount < 10) {
        pollTimerRef.current = setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 3000);
      }
    } catch (err) {
      setError(err?.message || 'Không thể tra cứu trạng thái đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [orderCode, retryCount, refreshWallet]);

  // Initial fetch and poll timer cleanup
  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [fetchStatus]);

  const fetchStatusRef = useRef(fetchStatus);
  fetchStatusRef.current = fetchStatus;

  const handlePaymentSuccessRef = useRef(handlePaymentSuccess);
  handlePaymentSuccessRef.current = handlePaymentSuccess;

  // Realtime SignalR connection fallback (giữ kết nối liên tục, không tạo lại handshake khi retryCount thay đổi)
  useEffect(() => {
    if (!orderCode || order?.status === 'paid') return;

    const signalR = connectPaymentRealtime(orderCode, {
      onPaymentSuccess: (payload) => {
        handlePaymentSuccessRef.current?.(payload);
      },
      onReconnected: () => {
        fetchStatusRef.current?.();
      },
    });

    return () => {
      signalR.stop();
    };
  }, [orderCode, order?.status]);

  return (
    <div className="page wrap" style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
      <div
        className="pcard"
        style={{
          textAlign: 'center',
          padding: '40px 24px',
          borderRadius: 20,
          boxShadow: '0 12px 36px rgba(0,0,0,0.06)'
        }}
      >
        {loading && !order ? (
          <div style={{ padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0, fontSize: 18 }}>Đang kiểm tra kết quả thanh toán...</h3>
            <p style={{ color: 'var(--ink-soft)', marginTop: 8, fontSize: 13 }}>
              Vui lòng đợi giây lát trong khi hệ thống xác thực giao dịch từ cổng thanh toán.
            </p>
          </div>
        ) : error ? (
          <div>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.12)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Icon name="x" width="32" height="32" />
            </div>
            <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Không thể tra cứu đơn hàng</h3>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 24, fontSize: 14 }}>{error}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={fetchStatus}>Thử lại</button>
              <Link to="/wallet" className="btn btn-outline">Quay về Ví tiền</Link>
            </div>
          </div>
        ) : order?.status === 'paid' ? (
          <div>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(22, 163, 74, 0.12)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 0 8px rgba(22, 163, 74, 0.05)'
            }}>
              <Icon name="check" width="36" height="36" />
            </div>
            <h2 style={{ color: '#16a34a', margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>
              Thanh toán thành công!
            </h2>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 24, fontSize: 14 }}>
              Giao dịch đã được xác nhận thành công và cộng vào số dư ví SkillBridge của bạn.
            </p>

            <div style={{
              background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
              border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
              borderRadius: 12,
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: 28
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Số tiền nạp:</span>
                <b style={{ color: 'var(--primary)', fontSize: 16 }}>{fmtVND(order.amount)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Cổng thanh toán:</span>
                <b>{order.provider}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Mã đơn hàng:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.orderCode}</span>
              </div>
              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Thời gian hoàn tất:</span>
                  <span>{new Date(order.paidAt).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/wallet" className="btn btn-primary" style={{ minWidth: 160 }}>
                Quay về Ví của tôi
              </Link>
              <Link to="/" className="btn btn-outline">
                Trang chủ
              </Link>
            </div>
          </div>
        ) : order?.status === 'pending' ? (
          <div>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Icon name="hourglass" width="32" height="32" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Đang chờ xác nhận giao dịch</h3>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 24, fontSize: 13.5 }}>
              Cổng thanh toán đang xử lý giao dịch của bạn. Quá trình này thường diễn ra trong vài giây.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setRetryCount(0);
                  fetchStatus();
                }}
              >
                Kiểm tra lại ngay
              </button>
              <Link to="/wallet" className="btn btn-outline">
                Quay về Ví tiền
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.12)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Icon name="x" width="32" height="32" />
            </div>
            <h3 style={{ color: '#dc2626', margin: '0 0 8px 0', fontSize: 20 }}>
              {order?.status === 'expired' ? 'Đơn hàng đã hết hạn' : 'Thanh toán không thành công'}
            </h3>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 24, fontSize: 13.5 }}>
              Giao dịch chưa hoàn tất hoặc đã bị hủy từ phía ngân hàng.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/wallet" className="btn btn-primary">
                Nạp lại tiền
              </Link>
              <Link to="/" className="btn btn-outline">
                Trang chủ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
