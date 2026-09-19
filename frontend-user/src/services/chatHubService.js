import { HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { getAccessToken } from '../api/tokenStore';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5004');

const HUB_URL = `${BASE_URL}/hubs/chat`;

/**
 * Quản lý kết nối SignalR thời gian thực cho hệ thống nhắn tin (Chat & Messaging)
 * @param {object} callbacks
 * @param {Function} [callbacks.onReceiveMessage] Bắt sự kiện khi có tin nhắn mới
 * @param {Function} [callbacks.onConversationUpdated] Bắt sự kiện khi danh sách hội thoại cập nhật tin nhắn cuối / số unread
 * @param {Function} [callbacks.onConversationRead] Bắt sự kiện khi đối phương đọc tin nhắn
 * @param {Function} [callbacks.onReconnected] Callback khi kết nối lại thành công
 * @param {Function} [callbacks.onError] Callback khi gặp lỗi kết nối
 * @returns {object} Object chứa connection và các hàm join, leave, stop
 */
export function connectChatRealtime({
  onReceiveMessage,
  onConversationUpdated,
  onConversationRead,
  onUserStatusChanged,
  onOnlineUsersList,
  onReconnected,
  onError,
} = {}) {
  const token = getAccessToken();
  if (!token) {
    return {
      connection: null,
      joinConversation: async () => {},
      leaveConversation: async () => {},
      stop: async () => {},
    };
  }

  let isStopped = false;

  const connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() || '',
      skipNegotiation: false,
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .configureLogging(LogLevel.Warning)
    .build();

  // Đăng ký sự kiện từ Server
  connection.on('ReceiveMessage', (message) => {
    if (isStopped) return;
    if (typeof onReceiveMessage === 'function') {
      onReceiveMessage(message);
    }
  });

  connection.on('ConversationUpdated', (conversation) => {
    if (isStopped) return;
    if (typeof onConversationUpdated === 'function') {
      onConversationUpdated(conversation);
    }
  });

  connection.on('ConversationRead', (data) => {
    if (isStopped) return;
    if (typeof onConversationRead === 'function') {
      onConversationRead(data);
    }
  });

  connection.on('UserStatusChanged', (status) => {
    if (isStopped) return;
    if (typeof onUserStatusChanged === 'function') {
      onUserStatusChanged(status);
    }
  });

  connection.on('OnlineUsersList', (onlineUserIds) => {
    if (isStopped) return;
    if (typeof onOnlineUsersList === 'function') {
      onOnlineUsersList(onlineUserIds);
    }
  });

  connection.onreconnected(() => {
    if (isStopped) return;
    if (typeof onReconnected === 'function') {
      onReconnected();
    }
  });

  const startPromise = (async () => {
    try {
      await connection.start();
    } catch (err) {
      if (!isStopped && typeof onError === 'function') {
        onError(err);
      }
    }
  })();

  return {
    connection,
    joinConversation: async (conversationId) => {
      if (!conversationId) return;
      try {
        await startPromise;
        if (connection.state === 'Connected') {
          await connection.invoke('JoinConversation', Number(conversationId));
        }
      } catch (err) {
        console.warn('Lỗi khi tham gia group chat:', err);
      }
    },
    leaveConversation: async (conversationId) => {
      if (!conversationId) return;
      try {
        if (connection.state === 'Connected') {
          await connection.invoke('LeaveConversation', Number(conversationId));
        }
      } catch {
        // Silent cleanup
      }
    },
    stop: async () => {
      isStopped = true;
      try {
        await startPromise;
        await connection.stop();
      } catch {
        // Silent cleanup
      }
    },
  };
}
