import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CaretLeft, CaretRight, Pause, Play, ChatCircleDots } from '@phosphor-icons/react';
import { CONTACT } from '../../lib/format';

const SLIDES = [
  {
    img: '/hero_hydrangea.png',
    alt: 'Bó cẩm tú cầu làm từ kẽm nhung',
    eyebrow: 'Hoa kẽm nhung thủ công',
    title: (<>Những đóa hoa <em className="text-hydrangea">không bao giờ héo</em></>),
    text: 'Từ sợi kẽm nhung mềm mịn, Trạm Hoa Nhỏ uốn nên từng cánh hoa — giữ trọn vẻ đẹp cho góc nhỏ của bạn theo năm tháng.',
  },
  {
    img: '/product_sunflower.png',
    alt: 'Hoa hướng dương kẽm nhung',
    eyebrow: 'Quà tặng ý nghĩa',
    title: (<>Rực rỡ như nắng, <em className="text-sunflower">bền lâu</em> như lời chúc</>),
    text: 'Sinh nhật, tốt nghiệp, kỷ niệm hay chỉ là một ngày bình thường — một bó hoa nhỏ luôn khiến ai đó mỉm cười.',
  },
  {
    img: '/product_rose.png',
    alt: 'Hoa hồng đỏ kẽm nhung',
    eyebrow: 'Nhận làm theo yêu cầu',
    title: (<>Bó hoa <em className="text-hydrangea">của riêng bạn</em></>),
    text: 'Chọn loài hoa, màu sắc và kiểu gói bạn thích — mình sẽ làm nên bó hoa đúng như bạn hình dung.',
  },
];

const DURATION = 5000;

export default function HeroSlider() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const paused = userPaused || hovered || reduce;

  const go = (dir) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  // Tự chuyển slide
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [index, paused]);

  const slide = SLIDES[index];

  return (
    <section
      id="gioi-thieu"
      className="mx-auto max-w-7xl scroll-mt-18 px-4 pt-2 sm:px-6 lg:px-10"
      aria-roledescription="carousel"
      aria-label="Giới thiệu Trạm Hoa Nhỏ"
    >
      <div
        className="relative h-[min(80svh,720px)] min-h-[520px] overflow-hidden rounded-[2rem] bg-ink text-white"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {/* Ảnh nền */}
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
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
              initial={reduce ? false : { scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 6, ease: 'easeOut' }}
            />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10 md:bg-gradient-to-r md:from-ink/85 md:via-ink/45 md:to-transparent" />

        {/* Nội dung */}
        <div className="pointer-events-none relative flex h-full flex-col justify-end p-6 pb-24 sm:p-10 sm:pb-28 md:justify-center md:pb-10 lg:p-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto max-w-xl"
              aria-live={paused ? 'polite' : 'off'}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sunflower">{slide.eyebrow}</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">{slide.title}</h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">{slide.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#san-pham" className="btn btn-lg bg-white text-ink hover:bg-paper">
                  Xem sản phẩm <ArrowRight weight="bold" />
                </a>
                <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
                  <ChatCircleDots weight="bold" /> Nhắn Zalo
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Điều khiển */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 p-6 sm:px-10 lg:px-16">
          <div className="flex items-center gap-2" role="tablist" aria-label="Chọn slide">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
                onClick={() => setIndex(i)}
                className={`relative h-1.5 overflow-hidden rounded-full bg-white/40 transition-all duration-500 ${i === index ? 'w-12' : 'w-6 hover:bg-white/50'}`}
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    initial={{ width: paused ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: paused ? 0 : DURATION / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? 'Tiếp tục tự chuyển' : 'Tạm dừng tự chuyển'}
              className="flex size-10 items-center justify-center rounded-full bg-ink/40 backdrop-blur transition hover:bg-ink/60"
            >
              {userPaused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}
            </button>
            <button type="button" onClick={() => go(-1)} aria-label="Slide trước"
              className="flex size-10 items-center justify-center rounded-full bg-ink/40 backdrop-blur transition hover:bg-ink/60">
              <CaretLeft size={18} weight="bold" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Slide tiếp theo"
              className="flex size-10 items-center justify-center rounded-full bg-white text-ink transition hover:bg-paper">
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
