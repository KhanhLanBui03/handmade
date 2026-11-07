import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { List, X, Phone, Flower } from '@phosphor-icons/react';
import { CONTACT } from '../lib/format';

// Các phần của trang chủ
const SECTIONS = [
  { id: 'gioi-thieu', label: 'Giới thiệu' },
  { id: 'san-pham', label: 'Sản phẩm' },
  { id: 'lien-he', label: 'Liên hệ' },
];

// Link tới một phần của trang chủ: đang ở trang chủ thì cuộn mượt, ở trang khác thì chuyển về trang chủ rồi cuộn
function SectionLink({ id, isHome, onNavigate, ...props }) {
  return (
    <Link
      to={`/#${id}`}
      onClick={(e) => {
        onNavigate?.();
        if (isHome) {
          e.preventDefault();
          document.getElementById(id)?.scrollIntoView();
        }
      }}
      {...props}
    />
  );
}

function Logo({ isHome }) {
  return (
    <SectionLink id="gioi-thieu" isHome={isHome} className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-full bg-brick text-white">
        <Flower size={20} weight="fill" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-xl font-medium tracking-tight">Trạm Hoa Nhỏ</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Hoa kẽm nhung</span>
      </span>
    </SectionLink>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);
  const { pathname, hash } = useLocation();
  const isHome = pathname === '/';
  const current = isHome ? active : pathname.startsWith('/san-pham') ? 'san-pham' : null;

  // Sang trang khác thì cuộn lên đầu
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Tô sáng mục menu theo phần đang xem
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome]);

  const linkClass = (id) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      current === id ? 'bg-ink/[0.06] text-ink' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled || menuOpen ? 'border-b border-line bg-paper/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo isHome={isHome} />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            {SECTIONS.map((s) => (
              <SectionLink key={s.id} id={s.id} isHome={isHome} className={linkClass(s.id)} aria-current={current === s.id ? 'true' : undefined}>
                {s.label}
              </SectionLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={`tel:${CONTACT.phone}`} className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Phone size={16} weight="bold" /> Đặt hoa
            </a>
            <button
              type="button"
              className="icon-btn text-ink md:hidden"
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
              className="overflow-hidden border-t border-line md:hidden"
              aria-label="Điều hướng di động"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                {SECTIONS.map((s) => (
                  <SectionLink
                    key={s.id}
                    id={s.id}
                    isHome={isHome}
                    onNavigate={() => setMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 font-medium ${current === s.id ? 'bg-ink/[0.06] text-ink' : 'text-muted'}`}
                  >
                    {s.label}
                  </SectionLink>
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

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} Trạm Hoa Nhỏ · Hoa kẽm nhung thủ công</p>
          <button type="button" onClick={() => window.scrollTo(0, 0)} className="text-left hover:text-ink">Lên đầu trang ↑</button>
        </div>
      </footer>
    </div>
  );
}
