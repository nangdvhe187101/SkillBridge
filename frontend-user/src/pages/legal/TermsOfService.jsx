import PolicyLayout from './PolicyLayout';

export default function TermsOfService() {
  const sections = [
    {
      title: 'I. Định nghĩa & Phạm vi áp dụng',
      content: (
        <div>
          <p>
            Chào mừng bạn đến với <b>Sàn Giao Dịch Thương Mại Điện Tử Việc Làm Vi Mô SkillBridge</b>. Các định nghĩa cơ bản được hiểu như sau:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '28%' }}>Thuật ngữ</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Ý nghĩa & Phạm vi áp dụng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Sàn SkillBridge</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Nền tảng kết nối trực tuyến cho phép đăng tin tuyển dụng và tìm kiếm các công việc vi mô (micro-jobs).</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nhà tuyển dụng (Employer)</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Cá nhân, tổ chức, doanh nghiệp có nhu cầu thuê sinh viên thực hiện công việc ngắn hạn, thời vụ.</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Sinh viên Freelancer</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Sinh viên đang theo học tại các trường Đại học, Cao đẳng được xác thực qua email trường hoặc eKYC.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Cơ chế Ký quỹ Escrow</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Cơ chế bảo lãnh độc lập: tiền của nhà tuyển dụng được giữ an toàn tại sàn và chỉ giải ngân khi việc hoàn thành đạt yêu cầu.</td>
              </tr>
            </tbody>
          </table>

          <p>
            Mọi thành viên tham gia giao dịch trên sàn đều đồng ý chịu sự điều chỉnh của bản Quy chế này và các quy định pháp luật liên quan của Việt Nam.
          </p>
        </div>
      )
    },
    {
      title: 'II. Quản lý tài khoản & Xác thực sinh viên',
      content: (
        <div>
          <p>
            Nhằm xây dựng môi trường việc làm minh bạch, uy tín và loại bỏ hoàn toàn các đối tượng lừa đảo, quy định tài khoản được áp dụng như sau:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '30%' }}>Đối tượng</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Yêu cầu xác thực & Bảo mật</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Sinh viên Freelancer</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Bắt buộc xác thực qua địa chỉ Email do trường Đại học/Cao đẳng cấp (đuôi <code>.edu.vn</code>) hoặc tải lên Thẻ sinh viên / CCCD chính chủ.
                </td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nhà tuyển dụng</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Xác thực số điện thoại OTP, thông tin doanh nghiệp hoặc danh tính người đại diện tuyển dụng.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Bảo mật tài khoản</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  Không được phép chia sẻ, cho thuê tài khoản. Thành viên tự chịu trách nhiệm với các hoạt động phát sinh dưới tài khoản của mình.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'III. Quy trình giao kết hợp đồng & Ký quỹ',
      content: (
        <div>
          <p>
            Mọi hợp đồng dịch vụ vi mô trên SkillBridge đều được thực hiện theo quy trình chuẩn hóa 4 bước để đảm bảo tính an toàn tài chính tuyệt đối:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 13.5, border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ background: '#e2f0d9', color: '#274e13', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '22%' }}>Bước</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0', width: '28%' }}>Thao tác</th>
                <th style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Quy định chi tiết</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>Bước 1</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Đăng tin & Báo giá</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Nhà tuyển dụng công khai ngân sách và thời hạn. Sinh viên gửi báo giá kèm portfolio.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>Bước 2</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Ký quỹ Escrow 100%</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Tiền thù lao được khóa an toàn tại SkillBridge qua VietQR. Sinh viên an tâm làm việc.</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>Bước 3</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Thực hiện & Bàn giao</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Sinh viên nộp sản phẩm hoàn thiện (deliverable) qua website trước hạn đã cam kết.</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>Bước 4</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>Nghiệm thu & Giải ngân</td>
                <td style={{ padding: '12px 14px', border: '1px solid #e2e8f0' }}>Nhà tuyển dụng có 72 giờ để duyệt. Tiền chuyển về ví sinh viên ngay sau khi nghiệm thu.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      title: 'IV. Các hành vi nghiêm cấm & Xử lý vi phạm',
      content: (
        <div>
          <p>
            SkillBridge áp dụng chính sách <b>Không khoan nhượng (Zero-Tolerance)</b> đối với các hành vi xâm phạm quyền lợi của người dùng:
          </p>

          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li><b>Lừa đảo thu tiền trước:</b> Yêu cầu ứng viên đóng tiền đặt cọc, phí hồ sơ, phí đào tạo hoặc mua khóa học trước khi nhận việc.</li>
            <li><b>Giao dịch ngoài sàn (Bypass Escrow):</b> Cố ý trao đổi số điện thoại, tài khoản ngân hàng riêng để thanh toán ngoài sàn nhằm trốn phí hoặc quỵt thù lao. Mọi trường hợp giao dịch ngoài sàn sẽ bị khóa vĩnh viễn và không được bảo vệ tài chính.</li>
            <li><b>Đăng việc vi phạm pháp luật:</b> Tuyển dụng tham gia cá độ, cờ bạc, đa cấp biến tướng, viết bài xúc phạm tổ chức hoặc cá nhân.</li>
            <li><b>Giao bài kém chất lượng hoặc sao chép đạo văn:</b> Nộp bài không đúng cam kết hoặc sử dụng sản phẩm có tranh chấp bản quyền sở hữu trí tuệ.</li>
          </ul>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
            <b style={{ color: '#dc2626' }}>Hình thức chế tài:</b>
            <p style={{ margin: '4px 0 0 0', color: '#991b1b', fontSize: 13 }}>
              Tùy mức độ vi phạm, tài khoản có thể bị trừ điểm tín nhiệm (Reliability Score), đóng băng số dư ký quỹ đang tranh chấp hoặc khóa tài khoản vĩnh viễn và chuyển thông tin cho cơ quan chức năng.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'V. Giải quyết khiếu nại & Luật áp dụng',
      content: (
        <div>
          <p>
            Mọi thỏa thuận và quan hệ giao dịch trên nền tảng được điều chỉnh bởi <b>Luật Thương mại và Pháp luật Việt Nam</b>.
          </p>
          <p>
            Khi phát sinh tranh chấp, quy trình giải quyết được tiến hành theo 3 cấp độ:
          </p>
          <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Thương lượng trực tiếp:</b> Hai bên chủ động trao đổi và chỉnh sửa sản phẩm qua khung chat trong tối đa 48 giờ.</li>
            <li><b>Ban quản trị phân xử:</b> Nếu không tìm được tiếng nói chung, đội ngũ Dispute Resolution của SkillBridge sẽ vào cuộc thẩm định sản phẩm và ra phán quyết hoàn tiền hoặc giải ngân trong 24 giờ.</li>
            <li><b>Tòa án có thẩm quyền:</b> Trường hợp một bên không đồng thuận với phán quyết của sàn, tranh chấp sẽ được đưa ra Tòa án nhân dân có thẩm quyền tại TP. Hà Nội.</li>
          </ol>
        </div>
      )
    }
  ];

  return (
    <PolicyLayout
      title="Điều Khoản Dịch Vụ & Quy Chế Hoạt Động"
      breadcrumbTitle="Điều khoản dịch vụ"
      introText="Dưới đây là chi tiết các điều khoản giao kết hợp đồng dịch vụ trực tuyến và quy chế bảo đảm quyền lợi cho thành viên trên sàn giao dịch việc làm vi mô SkillBridge."
      sections={sections}
    />
  );
}
