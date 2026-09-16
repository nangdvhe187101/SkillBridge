export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
  return str.toUpperCase().trim();
}

/**
 * Tra cứu tên chủ tài khoản ngân hàng qua VietQR API
 * Sử dụng 25 lượt test khả dụng, tự động fallback về tên chính chủ không dấu nếu lỗi hoặc hết lượt.
 */
export async function lookupAccountName(bin, accountNumber, fallbackName = '') {
  const normalizedFallback = removeVietnameseTones(fallbackName);
  if (!bin || !accountNumber || accountNumber.trim().length < 6) {
    return null;
  }

  // Nếu chưa cấu hình VietQR API Key (môi trường dev/test), trực tiếp dùng cơ chế an toàn chính chủ
  // tránh gọi fetch gây lỗi 401 Unauthorized trong console trình duyệt
  const apiKey = import.meta.env?.VITE_VIETQR_API_KEY;
  const clientId = import.meta.env?.VITE_VIETQR_CLIENT_ID;

  if (!apiKey || !clientId) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch('https://api.vietqr.io/v2/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        bin: String(bin).trim(),
        accountNumber: String(accountNumber).trim()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    // Chỉ hiển thị kết quả khi thực sự tra cứu được từ cổng ngân hàng
    if (data && (data.code === '00' || data.code === '200') && data.data?.accountName) {
      const bankHolder = removeVietnameseTones(data.data.accountName);
      const isMatch = !normalizedFallback || bankHolder === normalizedFallback;
      return {
        success: isMatch,
        isVerifiedOnline: true,
        isMatch,
        status: isMatch ? 'matched' : 'mismatched',
        accountName: bankHolder,
        message: isMatch
          ? `Xác thực thành công từ ngân hàng: Trùng khớp chủ tài khoản (${normalizedFallback})`
          : `Không khớp tên: Tên tại ngân hàng (${bankHolder}) không trùng với tên hồ sơ (${normalizedFallback})`
      };
    }

    // Nếu là code 47 (gói Free không hỗ trợ) hoặc dịch vụ offline, trả về null để không hiển thị cảnh báo gây hiểu lầm
    return null;
  } catch {
    return null;
  }
}
