import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CaretLeft, CaretRight, ChatCircleDots, CheckCircle } from '@phosphor-icons/react';
import { CONTACT } from '../../lib/format';

const SLIDES = [
  {
    img: '/hero_bo_hoa.jpg',
    pos: '50% 55%', // khung ngang trên điện thoại: giữ phần hoa ở giữa
    alt: 'Bó hoa ly và tulip kẽm nhung hồng trắng, gói giấy trắng',
    eyebrow: 'Hoa kẽm nhung thủ công',
    title: (<>Những đóa hoa <em className="text-brick">không bao giờ héo</em></>),
    text: 'Từ sợi kẽm nhung mềm mịn, Trạm Hoa Nhỏ uốn nên từng cánh hoa — giữ trọn vẻ đẹp cho góc nhỏ của bạn theo năm tháng.',
  },
  {
    img: '/hero_hoa_ly.jpg',
    pos: '50% 40%',
    alt: 'Những bông hoa ly kẽm nhung màu hồng trắng đính đá',
    eyebrow: 'Quà tặng ý nghĩa',
    title: (<>Dịu dàng như hoa, <em className="text-brick">bền lâu</em> như lời chúc</>),
    text: 'Sinh nhật, tốt nghiệp, kỷ niệm hay chỉ là một ngày bình thường — một bó hoa nhỏ luôn khiến ai đó mỉm cười.',
  },
  {
    img: '/hero_moc_khoa.jpg',
    pos: '50% 62%',
    alt: 'Móc khóa kẽm nhung hình các bé đội mũ thỏ, gấu, vịt, ếch',
    eyebrow: 'Móc khóa kẽm nhung',
    title: (<>Móc khóa <em className="text-brick">xinh xắn</em> mang theo mỗi ngày</>),
    text: 'Uốn tay từ kẽm nhung — treo balo, chìa khóa hay làm quà tặng đều đáng yêu.',
  },
];

const PERKS = ['100% làm bằng tay', 'Không héo, không phai', 'Nhận làm theo yêu cầu'];
const DURATION = 6000;

export default function HeroSlider() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const paused = hovered || reduce;

  const go = (dir) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  // Tự chuyển slide (dừng khi rê chuột / đang thao tác)
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [index, paused]);

  const slide = SLIDES[index];

  return (
    <section
      id="gioi-thieu"
      className="mx-auto max-w-7xl scroll-mt-18 px-4 pb-6 pt-2 sm:px-6 lg:px-10"
      aria-roledescription="carousel"
      aria-label="Giới thiệu Trạm Hoa Nhỏ"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="grid items-center gap-8 md:grid-cols-12 lg:gap-14">
        {/* Ảnh — khung bo góc, không chữ đè lên */}
        <div className="relative md:order-2 md:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[calc(76svh*4/5)] overflow-hidden rounded-[2rem] bg-paper-dim shadow-[0_30px_60px_-30px_rgba(11,30,51,0.35)] md:max-w-[min(100%,calc(78svh*4/5),520px)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={index}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) go(1);
                  else if (info.offset.x > 60) go(-1);
                }}
              >
                <motion.img
                  src={slide.img}
                  alt={slide.alt}
                  draggable={false}
                  className="size-full select-none object-cover"
                  style={{ objectPosition: slide.pos }}
                  initial={reduce ? false : { scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 6, ease: 'easeOut' }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Số thứ tự slide */}
            <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold tabular-nums text-ink backdrop-blur">
              {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Nội dung */}
        <div className="md:order-1 md:col-span-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              aria-live={paused ? 'polite' : 'off'}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-brick">
                <span className="size-1.5 rounded-full bg-brick" />
                {slide.eyebrow}
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.6rem]">
                {slide.title}
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">{slide.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex">
            <a href="#san-pham" className="btn btn-accent sm:h-13 sm:px-7 sm:text-base">
              Xem sản phẩm <ArrowRight weight="bold" />
            </a>
            <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-outline sm:h-13 sm:px-7 sm:text-base">
              <ChatCircleDots weight="bold" /> Nhắn Zalo
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <CheckCircle size={18} weight="fill" className="text-brick" /> {p}
              </li>
            ))}
          </ul>

          {/* Điều khiển slide */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="Chọn slide">
              {SLIDES.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
                  onClick={() => setIndex(i)}
                  className={`relative h-1.5 overflow-hidden rounded-full bg-ink/10 transition-all duration-500 ${
                    i === index ? 'w-12' : 'w-6 hover:bg-ink/20'
                  }`}
                >
                  {i === index && (
                    <motion.span
                      key={`${index}-${paused}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-brick"
                      initial={{ width: paused ? '100%' : '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: paused ? 0 : DURATION / 1000, ease: 'linear' }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2 md:ml-0">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Slide trước"
                className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-ink/30"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Slide tiếp theo"
                className="flex size-10 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink/85"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
