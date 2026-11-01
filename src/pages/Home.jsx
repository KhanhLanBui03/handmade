import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight, ArrowUpRight, HandHeart, Sparkle, Infinity as InfinityIcon, Gift, Phone, ChatCircleDots,
  Cake, Heart, GraduationCap, Flower, HouseLine, Confetti, Star,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CONTACT, formatVND, getCover, parsePrice } from '../lib/format';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';

const COLLECTIONS = [
  { n: '01', title: 'Cẩm Tú Cầu', q: 'cẩm tú cầu', note: 'Sắc xanh tím dịu mát, bồng bềnh như mây.', img: '/hero_hydrangea.png', bg: 'bg-[#dfe4f0]' },
  { n: '02', title: 'Hướng Dương', q: 'hướng dương', note: 'Rực rỡ, luôn hướng về phía mặt trời.', img: '/product_sunflower.png', bg: 'bg-[#f6e7c4]' },
  { n: '03', title: 'Hoa Hồng', q: 'hồng', note: 'Ngọt ngào, nồng nàn — lời yêu không lời.', img: '/product_rose.png', bg: 'bg-blush' },
];

const MARQUEE = ['Cẩm tú cầu', 'Hướng dương', 'Hoa hồng', 'Tulip', 'Hoa cúc', 'Bó hoa quà tặng', 'Làm theo yêu cầu'];

const OCCASIONS = [
  { icon: Cake, title: 'Sinh nhật', text: 'Một bó hoa không tàn cho tuổi mới' },
  { icon: Heart, title: 'Kỷ niệm & Valentine', text: 'Gửi lời thương bền lâu' },
  { icon: GraduationCap, title: 'Tốt nghiệp', text: 'Chúc mừng cột mốc đáng nhớ' },
  { icon: Flower, title: '8/3 & 20/10', text: 'Dành tặng những người phụ nữ thân yêu' },
  { icon: Confetti, title: 'Khai trương', text: 'Rực rỡ cho khởi đầu mới' },
  { icon: HouseLine, title: 'Trang trí nhà', text: 'Góc nhỏ luôn tươi, chẳng cần tưới' },
];

const STEPS = [
  { n: '01', title: 'Chọn chất liệu', text: 'Kẽm nhung mềm mịn, màu sắc được phối riêng cho từng loài hoa.' },
  { n: '02', title: 'Uốn & tạo hình', text: 'Mỗi cánh hoa được cuộn, uốn và ghép tỉ mỉ thành bông hoàn chỉnh.' },
  { n: '03', title: 'Bó & gói quà', text: 'Hoàn thiện bó hoa, gói giấy, sẵn sàng trao tận tay người nhận.' },
];

/* Đường cong như một sợi kẽm nhung uốn lượn */
function WireCurl({ className = '', reduce }) {
  return (
    <svg viewBox="0 0 600 200" fill="none" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <motion.path
        d="M5 150 C 80 40, 150 40, 170 110 S 250 190, 290 110 S 330 10, 380 60 S 420 170, 470 120 S 540 30, 595 70"
        stroke="currentColor"
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, delay: 0.4, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export default function Home() {
  const reduce = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchLatest();
  }, []);

  const rise = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  });

  const spotlight = products[0];
  const rest = products.slice(1, 5);

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        {/* nền chấm nhẹ */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
          <motion.div {...rise()} className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm font-medium text-muted backdrop-blur">
              <Sparkle weight="fill" className="text-sunflower" /> Hoa kẽm nhung · làm thủ công từng cánh
            </p>
            <h1 className="mt-6 font-display text-[3rem] leading-[1] tracking-tight sm:text-7xl lg:text-[6.25rem]">
              Những đóa hoa
              <br />
              <em className="relative inline-block text-brick">
                không bao giờ héo
                <WireCurl reduce={reduce} className="absolute -bottom-3 left-0 h-5 w-full text-sunflower sm:-bottom-5 sm:h-7" />
              </em>
            </h1>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted">
              Từ sợi kẽm nhung mềm mịn, chúng mình uốn nên cẩm tú cầu, hướng dương, hoa hồng — món quà tinh tế giữ trọn vẻ đẹp theo năm tháng.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/products" className="btn btn-accent btn-lg">
                Khám phá cửa hàng <ArrowRight weight="bold" />
              </Link>
              <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">
                <ChatCircleDots weight="bold" /> Đặt theo yêu cầu
              </a>
            </div>
          </motion.div>

          {/* Collage ảnh */}
          <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-12 items-end gap-3 sm:gap-5 lg:mt-20">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 60, rotate: -8 }}
              animate={{ opacity: 1, y: 0, rotate: -4 }}
              transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="col-span-4 mb-10 aspect-[3/4] overflow-hidden rounded-3xl bg-blush shadow-[0_30px_60px_-30px_rgba(36,30,25,0.45)]"
            >
              <img src="/product_rose.png" alt="Hoa hồng kẽm nhung" className="size-full object-cover" />
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative col-span-4 aspect-[3/4.4] overflow-hidden rounded-t-[999px] rounded-b-3xl bg-[#dfe4f0] shadow-[0_40px_80px_-30px_rgba(36,30,25,0.5)]"
            >
              <img src="/hero_hydrangea.png" alt="Bó cẩm tú cầu kẽm nhung" className="size-full object-cover" />
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 60, rotate: 8 }}
              animate={{ opacity: 1, y: 0, rotate: 4 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="col-span-4 mb-16 aspect-[3/4] overflow-hidden rounded-3xl bg-[#f6e7c4] shadow-[0_30px_60px_-30px_rgba(36,30,25,0.45)]"
            >
              <img src="/product_sunflower.png" alt="Hoa hướng dương kẽm nhung" className="size-full object-cover" />
            </motion.div>

            {/* Huy hiệu xoay */}
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-6 right-[6%] hidden size-28 sm:block lg:-top-10 lg:size-32"
              aria-hidden="true"
            >
              <div className="relative size-full rounded-full bg-ink text-paper">
                <svg viewBox="0 0 100 100" className="absolute inset-0 size-full motion-safe:animate-[spin_18s_linear_infinite]">
                  <defs>
                    <path id="circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
                  </defs>
                  <text className="fill-current text-[9px] font-semibold uppercase">
                    <textPath href="#circle" textLength="228" lengthAdjust="spacing">Handmade · Trạm Hoa Nhỏ · </textPath>
                  </text>
                </svg>
                <Flower size={30} weight="fill" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sunflower" />
              </div>
            </motion.div>

            {/* Thẻ nổi */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="absolute bottom-4 left-[2%] hidden items-center gap-3 rounded-2xl bg-surface/95 p-3 pr-5 shadow-[0_16px_40px_-16px_rgba(36,30,25,0.35)] backdrop-blur md:flex motion-safe:animate-float"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-sage-soft text-sage">
                <HandHeart size={20} weight="fill" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold">Mỗi bó là duy nhất</p>
                <p className="text-xs text-muted">Uốn tay từng cánh hoa</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── MARQUEE ───────── */}
      <div className="overflow-hidden py-6 mt-10 lg:mt-18" aria-hidden="true">
      <div className="-mx-4 -rotate-1 bg-ink py-4 text-paper">
        <div className="flex w-max motion-safe:animate-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {MARQUEE.map((t) => (
                <span key={t + k} className="flex items-center gap-8 pr-8 font-display text-2xl italic sm:text-3xl">
                  {t} <Flower size={20} weight="fill" className="not-italic text-sunflower" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* ───────── BỘ SƯU TẬP ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <motion.div {...rise()} className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow">Bộ sưu tập</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Mỗi loài hoa,<br /> <em className="text-brick">một câu chuyện</em>
            </h2>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-muted lg:justify-self-end">
            Chọn loài hoa bạn thương — mỗi bó đều có thể đổi màu, đổi số bông theo ý bạn.
          </p>
        </motion.div>

        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {COLLECTIONS.map((c, i) => (
            <motion.div key={c.title} {...rise(i * 0.1)} className={`w-[78%] shrink-0 snap-start md:w-auto ${i === 1 ? 'md:mt-16' : ''}`}>
              <Link to={`/products?q=${encodeURIComponent(c.q)}`} className="group block">
                <div className={`relative aspect-[3/4] overflow-hidden rounded-[2rem] ${c.bg}`}>
                  <img
                    src={c.img}
                    alt=""
                    className="size-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.06]"
                  />
                  <span className="absolute left-5 top-5 font-display text-5xl text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.25)]">
                    {c.n}
                  </span>
                  <span className="absolute bottom-5 right-5 flex size-14 items-center justify-center rounded-full bg-surface text-ink transition-all duration-500 group-hover:rotate-45 group-hover:bg-brick group-hover:text-white">
                    <ArrowUpRight size={22} weight="bold" />
                  </span>
                </div>
                <div className="mt-5 px-1">
                  <h3 className="font-display text-3xl tracking-tight transition-colors group-hover:text-brick">{c.title}</h3>
                  <p className="mt-1 text-muted">{c.note}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── SẢN PHẨM NỔI BẬT + MỚI ───────── */}
      <section className="bg-paper-dim">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <motion.div {...rise()} className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Vừa rời bàn làm việc</p>
              <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-6xl">Sản phẩm mới</h2>
            </div>
            <Link to="/products" className="btn btn-primary self-start sm:self-auto">
              Xem tất cả <ArrowRight />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-paper" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            </div>
          ) : products.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line bg-surface/50 py-16 text-center text-muted">
              Những bó hoa mới đang được hoàn thiện, bạn quay lại sau nhé!
            </p>
          ) : (
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              {/* Spotlight */}
              {spotlight && (
                <motion.div {...rise()} className="lg:col-span-6">
                  <Link to={`/product/${spotlight.id}`} className="group relative block h-full min-h-[420px] overflow-hidden rounded-[2rem] bg-ink">
                    {getCover(spotlight) && (
                      <img
                        src={getCover(spotlight)}
                        alt={spotlight.name}
                        className="absolute inset-0 size-full object-cover opacity-90 transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                    <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-sunflower px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink">
                      <Star weight="fill" /> Mới nhất
                    </span>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-8">
                      <div className="min-w-0">
                        {spotlight.categories?.name && <p className="text-sm text-white/70">{spotlight.categories.name}</p>}
                        <h3 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{spotlight.name}</h3>
                        <p className="mt-2 text-xl font-semibold text-sunflower">{formatVND(parsePrice(spotlight.price))}</p>
                      </div>
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform duration-500 group-hover:rotate-45">
                        <ArrowUpRight size={22} weight="bold" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:col-span-6">
                {rest.map((p, i) => (
                  <motion.div key={p.id} {...rise(i * 0.06)}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── DỊP TẶNG ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <motion.div {...rise()} className="lg:col-span-4">
            <p className="eyebrow">Gợi ý quà tặng</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Hoa cho <em className="text-brick">mọi dịp</em> đáng nhớ
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed text-muted">
              Kể cho chúng mình về dịp đặc biệt của bạn — mình sẽ gợi ý màu sắc, loài hoa và cách gói phù hợp.
            </p>
            <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-primary btn-lg mt-8">
              <Gift weight="bold" /> Nhờ tư vấn qua Zalo
            </a>
          </motion.div>

          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-8 lg:grid-cols-3">
            {OCCASIONS.map((o, i) => (
              <motion.li key={o.title} {...rise(i * 0.05)}>
                <div className="group h-full rounded-3xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-brick/30 hover:bg-blush/40 sm:p-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-paper-dim text-brick transition-colors duration-300 group-hover:bg-brick group-hover:text-white">
                    <o.icon size={24} weight="duotone" />
                  </span>
                  <h3 className="mt-5 font-semibold sm:text-lg">{o.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{o.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── QUY TRÌNH ───────── */}
      <section className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.5rem] bg-ink text-paper lg:grid-cols-2">
          <motion.div {...rise()} className="relative min-h-[320px] lg:min-h-full">
            <img src="/product_sunflower.png" alt="Hoa hướng dương kẽm nhung cận cảnh" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/30" />
          </motion.div>

          <div className="px-6 py-14 sm:px-12 lg:py-20">
            <motion.div {...rise()}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunflower">Quy trình</p>
              <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                Một bó hoa ra đời <em className="text-blush">như thế nào?</em>
              </h2>
            </motion.div>

            <ol className="mt-10 space-y-2">
              {STEPS.map((s, i) => (
                <motion.li key={s.n} {...rise(i * 0.1)} className="flex gap-5 border-t border-paper/15 py-6">
                  <span className="font-display text-3xl text-sunflower">{s.n}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 leading-relaxed text-paper/65">{s.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-paper/15 pt-8">
              {[
                [HandHeart, '100%', 'Làm thủ công'],
                [InfinityIcon, '∞', 'Không héo úa'],
                [Gift, '1:1', 'Thiết kế riêng'],
              ].map(([Icon, v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="flex items-center gap-2 font-display text-3xl">
                    <Icon size={20} weight="duotone" className="text-sunflower" /> {v}
                  </dd>
                  <dd className="mt-1 text-sm text-paper/60">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-10 lg:pt-28">
        <motion.div {...rise()} className="relative overflow-hidden rounded-[2.5rem] bg-blush px-6 py-16 text-center sm:px-12 lg:py-24">
          <Flower aria-hidden="true" size={220} weight="duotone" className="pointer-events-none absolute -left-12 -top-12 text-brick/10" />
          <Flower aria-hidden="true" size={180} weight="duotone" className="pointer-events-none absolute -bottom-10 -right-8 rotate-45 text-brick/10" />
          <h2 className="relative mx-auto max-w-3xl font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            Bạn có ý tưởng riêng? <em className="text-brick">Kể cho chúng mình nghe.</em>
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-lg text-muted">
            Gửi ảnh mẫu, màu sắc yêu thích hay chỉ một vài dòng mô tả — mình sẽ làm nên bó hoa ấy.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <a href={`tel:${CONTACT.phone}`} className="btn btn-primary btn-lg">
              <Phone weight="bold" /> {CONTACT.phoneDisplay}
            </a>
            <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">
              <ChatCircleDots weight="bold" /> Nhắn Zalo
            </a>
          </div>
        </motion.div>
      </section>
    </>
  );
}
