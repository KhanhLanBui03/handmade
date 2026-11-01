import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Phone, EnvelopeSimple, ChatCircleDots, ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { CONTACT } from '../lib/format';

const CHANNELS = [
  { icon: Phone, label: 'Điện thoại', value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phone}` },
  { icon: ChatCircleDots, label: 'Zalo', value: CONTACT.phoneDisplay, href: CONTACT.zalo, external: true },
  { icon: EnvelopeSimple, label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
];

export default function About() {
  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <section className="grid items-center gap-12 lg:grid-cols-12">
        <motion.div {...rise()} className="lg:col-span-6">
          <p className="eyebrow">Về chúng tôi</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Một góc nhỏ, <em className="text-brick">nơi hoa được uốn</em> bằng sự kiên nhẫn.
          </h1>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
            <p>
              Trạm Hoa Nhỏ là không gian sáng tạo mang đến những sản phẩm hoa thủ công tỉ mỉ, giúp điểm tô không gian sống của bạn bằng vẻ đẹp vĩnh cửu.
            </p>
            <p>
              Từ một sợi kẽm nhung mềm, chúng mình cuộn, uốn và ghép từng cánh — để mỗi bó hoa mang một nét riêng, như chính người được nhận.
            </p>
          </div>
          <Link to="/products" className="btn btn-primary btn-lg mt-8">
            Xem sản phẩm <ArrowRight weight="bold" />
          </Link>
        </motion.div>

        <motion.div {...rise(0.15)} className="grid grid-cols-2 gap-4 lg:col-span-6">
          <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-blush">
            <img src="/product_rose.png" alt="Hoa hồng kẽm nhung" className="size-full object-cover" />
          </div>
          <div className="mt-12 aspect-[3/4] overflow-hidden rounded-3xl bg-paper-dim">
            <img src="/product_sunflower.png" alt="Hoa hướng dương kẽm nhung" className="size-full object-cover" />
          </div>
        </motion.div>
      </section>

      <motion.section {...rise(0.2)} className="mt-24 rounded-[2rem] bg-ink px-6 py-12 text-paper sm:px-10 lg:px-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-4xl tracking-tight">Liên hệ đặt hoa</h2>
            <p className="mt-3 max-w-sm text-paper/70">
              Đặt mẫu có sẵn hoặc làm theo yêu cầu — chúng mình thường phản hồi trong vòng vài giờ.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
            {CHANNELS.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="group flex h-full flex-col justify-between gap-8 rounded-2xl bg-paper/[0.06] p-5 transition-colors hover:bg-paper/[0.12]"
                >
                  <div className="flex items-center justify-between">
                    <c.icon size={26} weight="duotone" className="text-blush" />
                    <ArrowUpRight size={18} className="text-paper/40 transition group-hover:text-paper" />
                  </div>
                  <div>
                    <p className="text-sm text-paper/60">{c.label}</p>
                    <p className="mt-1 break-all font-medium">{c.value}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>
    </div>
  );
}
