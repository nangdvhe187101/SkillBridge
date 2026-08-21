import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Footer from '../../components/Footer';
import useReveal from '../../hooks/useReveal';
import useCounter from '../../hooks/useCounter';
import HomeAdCarousel from '../../components/HomeAdCarousel';
import FaqItem from '../../components/FaqItem';
import Avatar from '../../components/Avatar';

function Counter({ target, suffix }) {
  const [ref, display] = useCounter(target, suffix);
  return <b ref={ref} className="counter">{display}</b>;
}

const faqs = [
  {
    q: 'SkillBridge không giữ tiền hộ, vậy làm sao đảm bảo an toàn?',
    a: 'Nền tảng thay thế escrow bằng Quỹ Bảo hiểm Tương hỗ Cộng đồng — trích một phần doanh thu để bồi thường một phần giá trị công việc nếu sinh viên bị quỵt tiền, cùng với hệ thống Reliability Score và Blacklist Board công khai.',
  },
  {
    q: 'Làm sao để xác thực tài khoản sinh viên?',
    a: 'Bạn đăng ký bằng email đại học chính thức (ví dụ @fpt.edu.vn). Hệ thống eKYC sẽ tự động xác minh để loại bỏ tài khoản ảo và tin tuyển dụng giả mạo.',
  },
  {
    q: 'Phí nền tảng được tính như thế nào?',
    a: 'SkillBridge thu hoa hồng 5–10% trên mỗi công việc hoàn thành, cùng phí Featured Listing 20.000đ cho tin đăng cần tuyển gấp. Nhà tuyển dụng khối lượng lớn có thể nâng cấp gói VIP Business Suite để giảm phí xuống còn 5%.',
  },
  {
    q: 'Điểm Reliability hoạt động ra sao?',
    a: 'Mỗi tài khoản bắt đầu ở 100 điểm. Nếu bỏ dở công việc, bạn sẽ bị trừ 30 điểm; dưới 50 điểm sẽ bị tạm ngưng quyền ứng tuyển các việc cao cấp — cơ chế này thay thế vai trò của khoản đặt cọc tiền mặt.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  useReveal();

  return (
    <div className="page active">
      <section className="hero">
        <div className="mesh mesh-1" />
        <div className="mesh mesh-2" />
        <div className="wrap">
          <div>
            <div className="eyebrow"><span className="dot" /> Dành riêng cho sinh viên Việt Nam</div>
            <h1>
              Biến kỹ năng sinh viên<br />thành <span className="hl">thu nhập thật</span>
            </h1>
            <p className="lede">
              SkillBridge kết nối sinh viên với các công việc micro-job ngắn hạn — được xác thực bằng
              email trường, minh bạch và không cần kinh nghiệm dày dạn để bắt đầu.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-lime" onClick={() => navigate('/auth?tab=register')}>
                Tôi là sinh viên <Icon name="arrow" style={{ width: 16, height: 16 }} />
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/post-job')}>
                Tôi là nhà tuyển dụng
              </button>
            </div>
            <div className="stat-row">
              <div className="stat">
                <Counter target={71.4} suffix="%" />
                <span>sinh viên tìm việc qua Facebook Group</span>
              </div>
              <div className="stat"><b>&lt;15 phút</b><span>thời gian ghép việc trung bình</span></div>
              <div className="stat">
                <Counter target={88.8} suffix="%" />
                <span>sinh viên sẵn sàng nâng cấp Premium</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hv-card hv1">
              <div className="r">
                <Avatar name="Trà Sữa Mộc" className="avatar" fontSize={13} />
                <div><div className="name">Trà Sữa Mộc</div><div className="sub">Đã xác thực · TP.HCM</div></div>
              </div>
              <div className="title">Dựng video TikTok quảng cáo 30s</div>
              <div className="foot"><span className="chip chip-lime">Video Editing</span><span className="price">250K</span></div>
            </div>
            <div className="hv-card hv2">
              <div className="r">
                <Avatar name="Minh Anh" className="avatar" fontSize={13} />
                <div><div className="name">Minh Anh · Sinh viên</div><div className="sub">Reliability 96 điểm</div></div>
              </div>
              <div className="title">Đã hoàn thành 32 công việc · 5.0★</div>
              <div className="foot">
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>
                  Gold Tier
                </span>
              </div>
            </div>
            <div className="hv-card hv3">
              <div className="r">
                <Avatar name="Cỏ May Agency" className="avatar" fontSize={13} />
                <div><div className="name">Cỏ May Agency</div><div className="sub">Đã xác thực · Hà Nội</div></div>
              </div>
              <div className="title">Thiết kế poster sự kiện trường</div>
              <div className="foot"><span className="chip chip-coral">Gấp</span><span className="price">180K</span></div>
            </div>
            <div className="stamp hv-stamp"><Icon name="check" /></div>
          </div>
        </div>
      </section>

      <div className="trustbar">
        <div className="wrap">
          <span className="lbl">Được tin dùng bởi sinh viên từ</span>
          <span className="uni">FPT University</span>
          <span className="uni">UEH</span>
          <span className="uni">RMIT Vietnam</span>
          <span className="uni">Ngoại Thương</span>
          <span className="uni">Bách Khoa</span>
        </div>
      </div>

      <section className="wrap">
        <div className="sec-head reveal">
          <div className="sec-eyebrow">Vì sao SkillBridge</div>
          <h2>Dành cho cả hai phía của thị trường</h2>
          <p>Một hệ sinh thái minh bạch, nơi uy tín thay thế vai trò giữ tiền — bảo vệ cả sinh viên lẫn nhà tuyển dụng.</p>
        </div>
        <div className="forwho">
          <div className="fw-card fw-student reveal">
            <span className="fw-tag">DÀNH CHO SINH VIÊN</span>
            <h3>Bắt đầu sự nghiệp freelance đầu tiên</h3>
            <ul className="fw-list">
              <li><Icon name="check" /> Việc micro-job rào cản thấp, phù hợp người mới</li>
              <li><Icon name="check" /> Portfolio tự động dựng từ dự án đã hoàn thành</li>
              <li><Icon name="check" /> Quỹ Bảo hiểm Tương hỗ Cộng đồng bảo vệ khi bị quỵt tiền</li>
              <li><Icon name="check" /> Huy hiệu kỹ năng & xếp hạng Bronze → Gold</li>
            </ul>
          </div>
          <div className="fw-card reveal reveal-d1">
            <span className="fw-tag">DÀNH CHO NHÀ TUYỂN DỤNG</span>
            <h3>Tiếp cận nhân lực sinh viên đã xác thực</h3>
            <ul className="fw-list">
              <li><Icon name="check" /> Ghép việc trong dưới 15 phút</li>
              <li><Icon name="check" /> Hồ sơ xác thực qua email đại học</li>
              <li><Icon name="check" /> Miễn phí hoa hồng 3 tin đăng đầu tiên</li>
              <li><Icon name="check" /> Điểm Reliability giúp lọc ứng viên đáng tin</li>
            </ul>
          </div>
          <div className="fw-card reveal reveal-d2">
            <span className="fw-tag">DÀNH CHO DOANH NGHIỆP LỚN</span>
            <h3>Quảng cáo Affiliate trả theo lượt click (CPC)</h3>
            <ul className="fw-list">
              <li><Icon name="check" /> Chỉ trả $0.10 (~2.400đ) mỗi lượt ứng viên quan tâm</li>
              <li><Icon name="check" /> Không cần đăng & quản lý từng tin riêng lẻ</li>
              <li><Icon name="check" /> Hồ sơ tự động gửi về qua One-Touch Portfolio Generator</li>
              <li><Icon name="check" /> 50 lượt click chất lượng cao đầu tiên miễn phí</li>
            </ul>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => navigate('/dashboard')}>
              Xem demo quảng cáo <Icon name="arrow" style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">Lĩnh vực nổi bật</div>
            <h2>4 nhóm kỹ năng nhu cầu cao nhất</h2>
          </div>
          <div className="cat-grid">
            <div className="cat-card reveal">
              <div className="cat-icon"><Icon name="film" /></div>
              <h4>Video Editing</h4>
              <p>TikTok, Reels, video ngắn cho thương hiệu.</p>
            </div>
            <div className="cat-card reveal reveal-d1">
              <div className="cat-icon"><Icon name="brush" /></div>
              <h4>Graphic Design</h4>
              <p>Banner, poster, slide thuyết trình.</p>
            </div>
            <div className="cat-card reveal reveal-d2">
              <div className="cat-icon"><Icon name="megaphone" /></div>
              <h4>Content Marketing</h4>
              <p>Bài đăng mạng xã hội, caption, nội dung.</p>
            </div>
            <div className="cat-card reveal reveal-d3">
              <div className="cat-icon"><Icon name="database" /></div>
              <h4>Data Entry</h4>
              <p>Nhập liệu, quản lý bảng tính, hỗ trợ hành chính.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <HomeAdCarousel />
      </section>

      <section className="wrap">
        <div className="sec-head reveal">
          <div className="sec-eyebrow">Quy trình</div>
          <h2>Cách hoạt động</h2>
        </div>
        <div className="steps">
          <div className="step reveal"><span className="num">01</span>
            <h4>Đăng ký & xác thực</h4>
            <p>Tạo tài khoản bằng email đại học chính thức để được xác thực tự động.</p>
          </div>
          <div className="step reveal reveal-d1"><span className="num">02</span>
            <h4>Khám phá công việc</h4>
            <p>Duyệt hoặc được gợi ý các micro-job phù hợp kỹ năng của bạn.</p>
          </div>
          <div className="step reveal reveal-d2"><span className="num">03</span>
            <h4>Thực hiện & giao việc</h4>
            <p>Trao đổi trực tiếp, hoàn thành và nộp sản phẩm trên nền tảng.</p>
          </div>
          <div className="step reveal reveal-d3"><span className="num">04</span>
            <h4>Nhận đánh giá & thu nhập</h4>
            <p>Được đánh giá hai chiều, tích lũy uy tín và nhận thanh toán.</p>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">Gamification</div>
            <h2>Càng uy tín, càng nhiều cơ hội</h2>
            <p>Hệ thống hạng bậc tự động dựa trên lịch sử hoàn thành công việc — mở khoá vị trí hiển thị ưu tiên trong tìm kiếm của nhà tuyển dụng.</p>
          </div>
          <div className="tiers">
            <div className="tier-card reveal">
              <div className="stamp stamp-bronze"><Icon name="check" /></div>
              <h4>Bronze</h4>
              <p>Mới bắt đầu, đang xây dựng uy tín</p>
              <div className="perk">Hiển thị tiêu chuẩn trong tìm kiếm</div>
            </div>
            <div className="tier-card reveal reveal-d1">
              <div className="stamp stamp-silver"><Icon name="check" /></div>
              <h4>Silver</h4>
              <p>Hoàn thành ổn định, đúng hạn</p>
              <div className="perk">Ưu tiên hiển thị + huy hiệu Silver</div>
            </div>
            <div className="tier-card reveal reveal-d2">
              <div className="stamp stamp-gold"><Icon name="check" /></div>
              <h4>Gold</h4>
              <p>Reliability cao, được tin tưởng nhất</p>
              <div className="perk">Top tìm kiếm + truy cập việc sớm 20 phút</div>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="sec-head center reveal">
          <div className="sec-eyebrow">Cộng đồng nói gì</div>
          <h2>Được tin dùng bởi sinh viên & nhà tuyển dụng</h2>
        </div>
        <div className="test-grid">
          <div className="test-card reveal">
            <div className="test-stars">★★★★★</div>
            <p className="test-quote">Chỉ sau 3 ngày đăng ký mình đã nhận việc dựng video đầu tiên, có thêm portfolio thật để xin thực tập.</p>
            <div className="test-person">
              <Avatar name="Thu Hà" className="test-av" fontSize={16} />
              <div><b>Thu Hà</b><span>Sinh viên FPT University</span></div>
            </div>
          </div>
          <div className="test-card reveal reveal-d1">
            <div className="test-stars">★★★★★</div>
            <p className="test-quote">Đăng tin buổi sáng, đầu giờ chiều đã có ứng viên phù hợp. Tiết kiệm rất nhiều thời gian so với đăng Facebook Group.</p>
            <div className="test-person">
              <Avatar name="Chị Lan" className="test-av" fontSize={16} />
              <div><b>Chị Lan</b><span>Chủ shop Trà Sữa Mộc</span></div>
            </div>
          </div>
          <div className="test-card reveal reveal-d2">
            <div className="test-stars">★★★★★</div>
            <p className="test-quote">Điểm Reliability giúp mình yên tâm giao việc cho sinh viên mới, không còn lo bị bùng deadline như trước.</p>
            <div className="test-person">
              <Avatar name="Cỏ May Agency" className="test-av" fontSize={16} />
              <div><b>Cỏ May Agency</b><span>Đối tác doanh nghiệp</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="wrap">
          <div className="sec-head center reveal">
            <div className="sec-eyebrow">Giải đáp</div>
            <h2>Câu hỏi thường gặp</h2>
          </div>
          <div className="faq reveal" style={{ margin: '0 auto' }}>
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="cta-banner reveal">
          <div>
            <h3>Sẵn sàng biến kỹ năng thành thu nhập?</h3>
            <p>Tham gia cộng đồng sinh viên freelancer đầu tiên được xác thực toàn diện tại Việt Nam.</p>
          </div>
          <button className="btn btn-lime" onClick={() => navigate('/auth?tab=register')}>
            Đăng ký ngay — miễn phí
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
