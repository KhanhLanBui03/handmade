import { motion, useReducedMotion } from 'motion/react';
import { Phone, ChatCircleDots, EnvelopeSimple, ArrowUpRight } from '@phosphor-icons/react';
import { CONTACT } from '../../lib/format';

const CHANNELS = [
  { icon: Phone, label: 'Gọi điện', value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phone}` },
  { icon: ChatCircleDots, label: 'Nhắn Zalo', value: CONTACT.phoneDisplay, href: CONTACT.zalo, external: true },
  { icon: EnvelopeSimple, label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}`, wide: true },
];

export default function ContactSection() {
  const reduce = useReducedMotion();

  return (
    <section id="lien-he" className="mx-auto max-w-7xl scroll-mt-18 px-4 pb-16 pt-20 sm:px-6 lg:px-10 lg:pt-28">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[2rem] bg-ink text-paper"
      >
        <div className="relative grid gap-12 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-14 lg:py-20">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sunflower">Liên hệ</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Đặt hoa cùng <em className="text-blush">Trạm Hoa Nhỏ</em>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-paper/70">
              Đặt mẫu có sẵn hoặc làm theo yêu cầu — gửi cho shop ảnh mẫu, màu sắc yêu thích hay vài dòng mô tả, mình sẽ tư vấn và báo giá cho bạn.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:self-center">
            {CHANNELS.map((c) => (
              <li key={c.label} className={c.wide ? 'sm:col-span-2' : ''}>
                <a
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="group flex h-full flex-col justify-between gap-8 rounded-2xl bg-paper/[0.06] p-5 transition-colors hover:bg-paper/[0.12]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-paper/10 text-blush">
                      <c.icon size={22} weight="duotone" />
                    </span>
                    <ArrowUpRight size={18} className="text-paper/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
                  </div>
                  <div>
                    <p className="text-sm text-paper/60">{c.label}</p>
                    <p className="mt-1 text-lg font-medium [overflow-wrap:anywhere]">{c.value}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
