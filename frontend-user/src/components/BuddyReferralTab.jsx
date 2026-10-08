import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';

// Hàm sinh mã giới thiệu ngẫu nhiên hoàn toàn bằng chữ cái in hoa (A-Z, 6 chữ cái)
function getOrGenerateAlphabetReferralCode(user) {
  const userId = user?.id || (user?.email ? user.email.split('@')[0] : 'guest');
  const storageKey = `sb_alphabet_ref_code_${userId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing && /^[A-Z]{6}$/.test(existing)) {
    return existing;
  }

  // Bảng chữ cái tiếng Anh in hoa (26 chữ cái)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  localStorage.setItem(storageKey, randomCode);
  return randomCode;
}

export default function BuddyReferralTab({ currentUser, publicConfigs }) {
  const { addToast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mã giới thiệu ngẫu nhiên theo bảng chữ cái (VD: KJHXMT)
  const [myReferralCode, setMyReferralCode] = useState('');

  // Trạng thái nhập mã của người khác
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [linkedFriend, setLinkedFriend] = useState(() => {
    const saved = localStorage.getItem(`sb_linked_friend_${currentUser?.id || 'guest'}`);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const code = getOrGenerateAlphabetReferralCode(currentUser);
    setMyReferralCode(code);
  }, [currentUser]);

  // Tự động nhận diện domain chính thức khi deploy (https://skillbridge.id.vn)
  const siteUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1'))
    ? window.location.origin
    : (import.meta.env?.VITE_PUBLIC_SITE_URL || 'https://skillbridge.id.vn');

  const inviteLink = `${siteUrl}/register?ref=${myReferralCode}`;

  const rewardType = publicConfigs?.referralRewardType || 'trial_days';
  const rewardValue = publicConfigs?.referralRewardValue || 3;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    setCopiedCode(true);
    addToast('Đã sao chép mã giới thiệu vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    addToast('Đã sao chép đường dẫn mời bạn bè!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Xử lý khi người dùng nhập mã giới thiệu của bạn mình
  const handleConnectFriend = (e) => {
    e.preventDefault();
    const cleanCode = friendCodeInput.trim().toUpperCase();

    if (!cleanCode) {
      addToast('Vui lòng nhập mã giới thiệu 6 chữ cái của bạn bè.', 'error');
      return;
    }

    if (cleanCode.length !== 6 || !/^[A-Z]+$/.test(cleanCode)) {
      addToast('Mã giới thiệu không hợp lệ (cần đúng 6 chữ cái in hoa, ví dụ: KJHXMT).', 'error');
      return;
    }

    if (cleanCode === myReferralCode) {
      addToast('Bạn không thể tự nhập mã giới thiệu của chính mình!', 'error');
      return;
    }

    const linkData = {
      code: cleanCode,
      linkedAt: new Date().toLocaleDateString('vi-VN'),
      status: 'pending_verify', // pending_verify | rewarded
    };

    setLinkedFriend(linkData);
    localStorage.setItem(`sb_linked_friend_${currentUser?.id || 'guest'}`, JSON.stringify(linkData));
    setFriendCodeInput('');
    addToast(`Kết nối thành công với người bạn mang mã [${cleanCode}]!`, 'success');
  };

  return (
    <div className="acct-section">
      <div className="acct-section-head" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>
          🤝 Mời Bạn Đồng Hành 1 - 1 (Buddy Program)
        </h2>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
          Mỗi thành viên sở hữu duy nhất <b>01 vé mời VIP</b>. Bạn có thể gửi mã cho bạn thân, hoặc nhập mã từ bạn bè nếu bạn chưa liên kết.
        </p>
      </div>

      {/* Hero Banner Highlight */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1.5px solid rgba(14, 165, 233, 0.25)',
          borderRadius: 16,
          padding: '22px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
              Đặc Quyền Kép Cho Cả Bạn Và Người Bạn Thân
            </h3>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {rewardType === 'trial_days'
                ? `Cả hai bạn cùng nhận ngay ${rewardValue} ngày trải nghiệm Gói VIP Pro hoàn toàn miễn phí!`
                : `Cả hai bạn được miễn phí 100% hoa hồng sàn cho ${rewardValue} hợp đồng việc làm đầu tiên!`}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 16 }}>
          <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>HẠN MỨC LỜI MỜI</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 2 }}>Duy Nhất 1 Bạn (1/1)</div>
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Mã 6 chữ cái ngẫu nhiên dùng 1 lần</span>
          </div>

          <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>ĐIỀU KIỆN NHẬN QUÀ</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0ea5e9', marginTop: 2 }}>Xác Minh Thẻ Sinh Viên</div>
            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Nhận quà ngay khi bạn bè được duyệt thẻ</span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Box Song Song (Mã Của Bạn VÀ Nhập Mã Bạn Bè) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        
        {/* BOX 1: VÉ MỜI CỦA BẠN (GỬI CHO BẠN BÈ) */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🎫</span>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Vé Mời Cá Nhân Của Bạn</h4>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
            Mã gồm <b>6 chữ cái ngẫu nhiên</b> dành riêng cho bạn để gửi tặng người bạn thân:
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Mã giới thiệu 6 chữ cái:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={myReferralCode}
                style={{
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: 3,
                  color: 'var(--primary)',
                  background: 'var(--surface-2, #f8fafc)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  width: '100%',
                  textAlign: 'center',
                }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCopyCode}
                style={{ whiteSpace: 'nowrap', borderRadius: 10, padding: '0 16px' }}
              >
                {copiedCode ? 'Đã chép!' : 'Chép mã'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Đường dẫn mời trực tiếp:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={inviteLink}
                style={{
                  padding: '9px 12px',
                  fontSize: 12.5,
                  color: 'var(--ink)',
                  background: 'var(--surface-2, #f8fafc)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  width: '100%',
                }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCopyLink}
                style={{ whiteSpace: 'nowrap', borderRadius: 10, padding: '0 14px' }}
              >
                {copiedLink ? 'Đã chép!' : 'Chép link'}
              </button>
            </div>
          </div>
        </div>

        {/* BOX 2: NƠI NHẬP MÃ CỦA BẠN BÈ (NẾU BẠN ĐƯỢC MỜI) */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📥</span>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              Bạn Được Bạn Bè Mời? (Nhập Mã)
            </h4>
          </div>

          {linkedFriend ? (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>
                  Đã liên kết đôi bạn thành công!
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#15803d' }}>
                Bạn đã nhập mã của bạn bè: <code style={{ fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{linkedFriend.code}</code> (kết nối ngày {linkedFriend.linkedAt}).
              </p>
              <div style={{ fontSize: 12, color: '#166534', background: '#dcfce7', padding: '8px 12px', borderRadius: 8 }}>
                ⏳ Đang chờ xác minh thẻ sinh viên để hệ thống tự động mở khóa phần thưởng cho cả hai bạn!
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
                Nếu lúc đăng ký bạn quên nhập mã của bạn bè, bạn có thể nhập bù tại đây (mỗi người chỉ được nhập 1 lần duy nhất):
              </p>

              <form onSubmit={handleConnectFriend}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Nhập mã 6 chữ cái của bạn thân:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="VD: KJHXMT"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontFamily: 'monospace',
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      border: '1.5px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--surface)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                    Chỉ gồm 6 chữ cái in hoa (A-Z) từ vé mời của bạn bè.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 16px', borderRadius: 10, fontWeight: 800 }}
                >
                  Xác Nhận Liên Kết Đôi Bạn
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Guide Steps */}
      <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.02))', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
        <h5 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
          📋 Người Khác Nhập Mã Của Bạn Ở Đâu?
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div style={{ fontSize: 13, background: 'var(--surface)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
            <b style={{ color: '#0ea5e9' }}>Cách 1 (Khi Đăng ký tài khoản):</b>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)' }}>
              Người bạn đó vào trang <b>Đăng ký</b> và gõ mã 6 chữ cái vào ô <i>"Mã giới thiệu bạn đồng hành"</i> (hoặc bấm thẳng vào link bạn gửi để tự điền).
            </p>
          </div>
          <div style={{ fontSize: 13, background: 'var(--surface)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
            <b style={{ color: '#10b981' }}>Cách 2 (Sau khi đã có tài khoản):</b>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)' }}>
              Nếu lúc đăng ký họ quên nhập, họ chỉ cần vào mục <b>Cài đặt ➔ Bạn đồng hành (1/1)</b> và gõ mã vào ô <i>"Bạn Được Bạn Bè Mời?"</i> bên trên.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
