import PolicyLayout from './PolicyLayout';
import Icon from '../../components/Icon';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: 'I. Mục đích thu thập dữ liệu cá nhân',
      content: (
        <div>
          <p>
            SkillBridge cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng theo quy định của <b>Nghị định 13/2023/NĐ-CP</b>. Việc thu thập dữ liệu chỉ nhằm các mục đích minh bạch sau:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '30%' }}>Mục đích</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Mô tả cụ thể</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Cung cấp dịch vụ</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Tạo tài khoản, kết nối hồ sơ sinh viên với các công việc vi mô phù hợp, hiển thị portfolio.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Xác minh danh tính</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Xác thực email trường (.edu.vn), thẻ sinh viên hoặc CCCD để xây dựng huy hiệu tin cậy.</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Xử lý tài chính & Ký quỹ</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Xử lý nạp tiền, rút tiền, giải ngân ký quỹ và đối soát giao dịch tự động qua SePay VietQR.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Hỗ trợ & Thông báo</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Gửi thông báo tiến độ công việc, tin nhắn từ khách hàng và hỗ trợ giải quyết khiếu nại.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'II. Loại thông tin thu thập & Lưu trữ',
      content: (
        <div>
          <p>SkillBridge chỉ thu thập các thông tin cần thiết tối thiểu cho hoạt động của nền tảng:</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '28%' }}>Nhóm dữ liệu</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Các trường thông tin thu thập</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Thông tin cơ bản</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Họ và tên, địa chỉ email, số điện thoại, ảnh đại diện đại diện.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Thông tin học tập</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Trường Đại học/Cao đẳng, chuyên ngành, năm đào tạo, CV và kỹ năng nghề nghiệp.</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Thông tin tài chính</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Số tài khoản ngân hàng, tên ngân hàng nhận tiền. Chúng tôi <b>không</b> lưu mật khẩu ngân hàng hay mã OTP của bạn.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nhật ký kỹ thuật</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Địa chỉ IP, trình duyệt truy cập và thời gian đăng nhập nhằm bảo vệ tài khoản khỏi xâm nhập trái phép.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'III. Cam kết an toàn & Đối tác tiếp cận',
      content: (
        <div>
          <p>
            Chúng tôi cam kết <b>không bao giờ bán hoặc chia sẻ thông tin người dùng</b> cho bên thứ ba vì mục đích quảng cáo rác. Dữ liệu chỉ được chia sẻ trong các trường hợp giới hạn:
          </p>

          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li><b>Đối tác tài chính (SePay / VietQR):</b> Truyền tải thông tin mã đơn hàng và số tiền để ghi nhận giao dịch chuyển khoản vào ví.</li>
            <li><b>Thành viên trong giao dịch:</b> Nhà tuyển dụng xem hồ sơ năng lực của sinh viên để đánh giá mức độ phù hợp khi tuyển dụng.</li>
            <li><b>Cơ quan thực thi pháp luật:</b> Cung cấp khi có yêu cầu bằng văn bản phục vụ điều tra theo đúng quy định pháp luật Việt Nam.</li>
          </ul>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
            <b style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="lock" width="14" height="14" /> Tiêu chuẩn bảo mật:
            </b>
            <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: 13 }}>
              Hệ thống áp dụng mã hóa đường truyền SSL/TLS 256-Bit tiêu chuẩn ngân hàng, kết hợp lưu trữ phân tán và khóa dòng dữ liệu chống rò rỉ.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'IV. Quyền của người dùng với dữ liệu cá nhân',
      content: (
        <div>
          <p>Thành viên tham gia nền tảng có đầy đủ các quyền lợi đối với thông tin của mình:</p>
          <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Quyền được biết & tra cứu:</b> Xem toàn bộ thông tin cá nhân và lịch sử giao dịch tại mục Cài đặt tài khoản.</li>
            <li><b>Quyền chỉnh sửa:</b> Cập nhật số điện thoại, kỹ năng, tài khoản ngân hàng bất cứ lúc nào.</li>
            <li><b>Quyền yêu cầu xóa:</b> Yêu cầu khóa hoặc xóa vĩnh viễn dữ liệu tài khoản khi không còn nhu cầu sử dụng thông qua email hỗ trợ <code>privacy@skillbridge.vn</code>.</li>
          </ol>
        </div>
      )
    }
  ];

  return (
    <PolicyLayout
      title="Chính Sách Bảo Mật Dữ Liệu Cá Nhân"
      breadcrumbTitle="Chính sách bảo mật"
      introText="SkillBridge cam kết bảo đảm an toàn dữ liệu cá nhân và bảo mật thông tin người dùng theo đúng tiêu chuẩn Nghị định 13/2023/NĐ-CP của Chính phủ."
      sections={sections}
    />
  );
}
