import PolicyLayout from './PolicyLayout';
import Icon from '../../components/Icon';

export default function PaymentRefundPolicy() {
  const sections = [
    {
      title: 'I. Phương thức thanh toán & Nạp ví',
      content: (
        <div>
          <p>
            SkillBridge cung cấp phương thức thanh toán an toàn, minh bạch, bảo vệ quyền lợi cả Nhà tuyển dụng và Sinh viên Freelancer:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '30%' }}>Phương thức</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Đặc điểm & Thời gian xử lý</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                  Chuyển khoản VietQR (SePay)
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                    <Icon name="bolt" width="12" height="12" /> Khuyên dùng · 24/7
                  </span>
                </td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ (MB, Vietcombank, Techcombank...). Tiền vào ví tự động sau 1 - 3 giây, miễn phí giao dịch.
                </td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                  Cổng thanh toán VNPAY
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>
                    <Icon name="hourglass" width="12" height="12" /> Đang xin cấp phép
                  </span>
                </td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Hỗ trợ Thẻ ATM nội địa, Thẻ quốc tế Visa/Mastercard/JCB. Đang hoàn tất thủ tục cấp phép để kích hoạt trong thời gian tới.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Số dư Ví SkillBridge</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Thanh toán ký quỹ ngay lập tức khi số dư khả dụng trong ví đủ chi trả ngân sách công việc.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'II. Cơ chế Ký quỹ Escrow bảo lãnh 2 chiều',
      content: (
        <div>
          <p>
            Nhằm xóa bỏ hoàn toàn nỗi lo "bùng tiền" hoặc "không giao sản phẩm", 100% công việc tuyển dụng bắt buộc áp dụng cơ chế Ký quỹ Escrow:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '22%' }}>Giai đoạn</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '30%' }}>Hành động</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Quy định bảo lãnh</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>1. Khóa tiền</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nhà tuyển dụng bấm "Thuê"</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>100% ngân sách thù lao được khóa an toàn tại SkillBridge.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>2. Làm việc</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Sinh viên triển khai</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Sinh viên yên tâm thực hiện vì tiền đã được bảo lãnh chắc chắn.</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>3. Bàn giao</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nộp sản phẩm (deliverable)</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Nhà tuyển dụng có 72 giờ để kiểm tra và duyệt sản phẩm.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>4. Giải ngân</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Bấm "Nghiệm thu"</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Tiền chuyển vào ví sinh viên ngay lập tức. Sau 72h không khiếu nại sẽ tự duyệt.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'III. Chính sách Hoàn tiền (Refund Policy)',
      content: (
        <div>
          <p>
            Quy định hoàn tiền chi tiết áp dụng cho các trường hợp hủy công việc hoặc phát sinh bất đồng:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '32%' }}>Trường hợp</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '22%' }}>Tỷ lệ hoàn tiền</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Thời gian xử lý</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Ứng viên từ chối / rút đơn trước khi làm</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', color: '#16a34a', fontWeight: 700 }}>Hoàn 100%</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Ngay lập tức về ví SkillBridge</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Quá hạn cam kết mà không nộp bài</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', color: '#16a34a', fontWeight: 700 }}>Hoàn 100%</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Sau 24 giờ kể từ khi báo cáo</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Hủy việc khi đã làm một phần tiến độ</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Thương lượng (30% - 70%)</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Trong vòng 24 - 48 giờ</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Rút tiền từ ví về tài khoản ngân hàng</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', color: '#16a34a', fontWeight: 700 }}>100% số dư khả dụng</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Trong 24 giờ làm việc</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'IV. Giải quyết tranh chấp & Quỹ Bảo hiểm',
      content: (
        <div>
          <p>
            Trường hợp sản phẩm bàn giao không đúng yêu cầu ban đầu hoặc một bên có dấu hiệu vi phạm cam kết:
          </p>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li><b>Bước 1 — Mở khiếu nại (Dispute):</b> Nhà tuyển dụng hoặc Sinh viên bấm nút "Yêu cầu trợ giúp / Khiếu nại" trong trang chi tiết công việc.</li>
            <li><b>Bước 2 — Ban quản trị thẩm định:</b> Chuyên viên đối soát của SkillBridge sẽ so sánh yêu cầu đăng tuyển ban đầu và sản phẩm bàn giao để ra quyết định phân chia tiền ký quỹ.</li>
            <li><b>Bước 3 — Quỹ Bảo hiểm Tương hỗ Cộng đồng:</b> Nếu phát hiện hành vi cố tình gian lận quỵt thù lao, Quỹ Bảo hiểm SkillBridge sẽ trích quỹ bồi thường <b>30% đến 50%</b> cho sinh viên bị thiệt hại.</li>
          </ol>
        </div>
      )
    }
  ];

  return (
    <PolicyLayout
      title="Chính Sách Thanh Toán, Ký Quỹ Escrow & Hoàn Tiền"
      breadcrumbTitle="Chính sách thanh toán & hoàn tiền"
      introText="Thông tin minh bạch về cơ chế Ký quỹ bảo lãnh thanh toán 2 chiều (Escrow), phương thức nạp tiền VietQR và quy định hoàn tiền khi hủy việc tại SkillBridge."
      sections={sections}
    />
  );
}
