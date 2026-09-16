export const VIETNAM_BANKS = [
  { bin: '970422', code: 'MB', name: 'MB Bank', shortName: 'MB', fullName: 'Ngân hàng Quân Đội' },
  { bin: '970436', code: 'VCB', name: 'Vietcombank', shortName: 'Vietcombank', fullName: 'Ngân hàng Ngoại Thương Việt Nam' },
  { bin: '970407', code: 'TCB', name: 'Techcombank', shortName: 'Techcombank', fullName: 'Ngân hàng Kỹ Thương Việt Nam' },
  { bin: '970415', code: 'CTG', name: 'VietinBank', shortName: 'VietinBank', fullName: 'Ngân hàng Công Thương Việt Nam' },
  { bin: '970418', code: 'BIDV', name: 'BIDV', shortName: 'BIDV', fullName: 'Ngân hàng Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', code: 'VBA', name: 'Agribank', shortName: 'Agribank', fullName: 'Ngân hàng Nông nghiệp & PT Nông thôn' },
  { bin: '970432', code: 'VPB', name: 'VPBank', shortName: 'VPBank', fullName: 'Ngân hàng Việt Nam Thịnh Vượng' },
  { bin: '970423', code: 'TPB', name: 'TPBank', shortName: 'TPBank', fullName: 'Ngân hàng Tiên Phong' },
  { bin: '970416', code: 'ACB', name: 'ACB', shortName: 'ACB', fullName: 'Ngân hàng Á Châu' },
  { bin: '970403', code: 'STB', name: 'Sacombank', shortName: 'Sacombank', fullName: 'Ngân hàng Sài Gòn Thương Tín' },
  { bin: '970437', code: 'HDB', name: 'HDBank', shortName: 'HDBank', fullName: 'Ngân hàng Phát triển TP.HCM' },
  { bin: '970441', code: 'VIB', name: 'VIB', shortName: 'VIB', fullName: 'Ngân hàng Quốc tế' },
  { bin: '970443', code: 'SHB', name: 'SHB', shortName: 'SHB', fullName: 'Ngân hàng Sài Gòn - Hà Nội' },
  { bin: '970428', code: 'NAB', name: 'NamABank', shortName: 'Nam A Bank', fullName: 'Ngân hàng Nam Á' },
  { bin: '970448', code: 'OCB', name: 'OCB', shortName: 'OCB', fullName: 'Ngân hàng Phương Đông' }
];

export function findBankByBin(bin) {
  return VIETNAM_BANKS.find((b) => b.bin === bin) || null;
}

export function findBankByName(name) {
  if (!name) return null;
  return VIETNAM_BANKS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase() ||
           b.code.toLowerCase() === name.toLowerCase() ||
           name.toLowerCase().includes(b.shortName.toLowerCase())
  ) || null;
}
