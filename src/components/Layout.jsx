import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { List, X, Phone, EnvelopeSimple, ChatCircleDots, Flower } from '@phosphor-icons/react';
import { CONTACT } from '../lib/format';

const NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/products', label: 'Cửa hàng' },
  { to: '/about', label: 'Về chúng tôi' },
];

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-full bg-brick text-white">
        <Flower size={20} weight="fill" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-xl font-medium tracking-tight">Trạm Hoa Nhỏ</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-muted mt-0.5">Hoa kẽm nhung</span>
      </span>
    </Link>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Cuộn lên đầu khi đổi trang
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-clip">
      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled || menuOpen ? 'bg-paper/90 backdrop-blur-md border-b border-line' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo />

          <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-ink/[0.06] text-ink' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={`tel:${CONTACT.phone}`} className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Phone size={16} weight="bold" /> Đặt hoa
            </a>
            <button
              type="button"
              className="icon-btn md:hidden text-ink"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-line"
              aria-label="Điều hướng di động"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-3 font-medium ${isActive ? 'bg-ink/[0.06] text-ink' : 'text-muted'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <a href={`tel:${CONTACT.phone}`} className="btn btn-primary mt-2">
                  <Phone size={16} weight="bold" /> Gọi đặt hoa · {CONTACT.phoneDisplay}
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-24 bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-16 pb-8">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-display text-3xl sm:text-4xl leading-tight tracking-tight">
                Những đóa hoa <em className="text-blush">không bao giờ héo</em>, làm bằng đôi tay.
              </p>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/50 mb-4">Khám phá</h2>
              <ul className="space-y-2.5 text-paper/80">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="hover:text-white transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/50 mb-4">Liên hệ</h2>
              <ul className="space-y-2.5 text-paper/80">
                <li>
                  <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                    <Phone size={16} /> {CONTACT.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                    <ChatCircleDots size={16} /> Nhắn Zalo
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 break-all hover:text-white transition-colors">
                    <EnvelopeSimple size={16} className="shrink-0" /> {CONTACT.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-col-reverse gap-4 border-t border-paper/10 pt-6 text-sm text-paper/50 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Trạm Hoa Nhỏ. Tất cả quyền được bảo lưu.</p>
            <p>Thủ công tại Việt Nam</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
