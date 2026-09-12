import { HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { getAccessToken } from '../api/tokenStore';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5004');

const HUB_URL = `${BASE_URL}/hubs/payment`;

/**
 * Quản lý kết nối SignalR thời gian thực cho đơn hàng nạp tiền
 * @param {string} orderCode Mã đơn hàng SB...
 * @param {object} callbacks
 * @param {Function} callbacks.onPaymentSuccess Callback khi nhận sự kiện thanh toán thành công
 * @param {Function} callbacks.onReconnected Callback khi kết nối lại thành công để đồng bộ dữ liệu
 * @param {Function} callbacks.onError Callback khi gặp lỗi kết nối
 * @returns {object} Object chứa hàm stop() để hủy kết nối
 */
export function connectPaymentRealtime(orderCode, { onPaymentSuccess, onReconnected, onError } = {}) {
  if (!orderCode) return { stop: () => {} };

  let isStopped = false;

  const connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() || '',
      skipNegotiation: false,
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();

  // Bắt sự kiện PaymentSuccess từ Server / Redis PubSub
  connection.on('PaymentSuccess', (payload) => {
    if (isStopped) return;
    if (typeof onPaymentSuccess === 'function') {
      onPaymentSuccess(payload);
    }
  });

  // Khi reconnect thành công: Re-join group và báo cho UI kiểm tra sync
  connection.onreconnected(async () => {
    if (isStopped) return;
    try {
      await connection.invoke('SubscribeOrder', orderCode);
    } catch {
      // Ignore join error
    }
    if (typeof onReconnected === 'function') {
      onReconnected();
    }
  });

  // Bắt đầu kết nối
  const startPromise = (async () => {
    try {
      await connection.start();
      if (isStopped) {
        await connection.stop();
        return;
      }
      await connection.invoke('SubscribeOrder', orderCode);
    } catch (err) {
      if (!isStopped && typeof onError === 'function') {
        onError(err);
      }
    }
  })();

  return {
    connection,
    stop: async () => {
      isStopped = true;
      try {
        await startPromise;
        if (connection.state === 'Connected') {
          await connection.invoke('UnsubscribeOrder', orderCode).catch(() => {});
        }
        await connection.stop();
      } catch {
        // Silent cleanup
      }
    }
  };
}
