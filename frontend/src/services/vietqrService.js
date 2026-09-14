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
    return {
      success: false,
      accountName: normalizedFallback,
      isFallback: true,
      message: 'Số tài khoản chưa đủ độ dài hợp lệ'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch('https://api.vietqr.io/v2/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bin: String(bin).trim(),
        accountNumber: String(accountNumber).trim()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: true,
        accountName: normalizedFallback,
        isFallback: true,
        message: 'Dùng tên hồ sơ chính chủ (VietQR offline)'
      };
    }

    const data = await res.json();
    if (data && (data.code === '00' || data.code === '200') && data.data?.accountName) {
      return {
        success: true,
        accountName: removeVietnameseTones(data.data.accountName),
        isFallback: false,
        message: 'Xác thực thành công từ ngân hàng thụ hưởng'
      };
    }

    // Khi không tìm thấy hoặc hết lượt test của VietQR
    return {
      success: true,
      accountName: normalizedFallback,
      isFallback: true,
      message: data?.desc || 'Tự động khóa theo tên chính chủ hồ sơ'
    };
  } catch {
    // Fallback an toàn khi lỗi mạng hoặc CORS
    return {
      success: true,
      accountName: normalizedFallback,
      isFallback: true,
      message: 'Khóa theo tên hồ sơ chính chủ'
    };
  }
}
