import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { List, X, ChatCircleDots, At, ShoppingBag } from '@phosphor-icons/react';
import { CONTACT } from '../lib/format';
import { BrandLogo } from './BrandLogo';
import CartProvider from './cart/CartProvider';
import { useCart } from '../lib/cart-context';

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
    <SectionLink id="gioi-thieu" isHome={isHome} className="flex items-center" aria-label="Trạm Hoa Nhỏ — về đầu trang">
      <BrandLogo />
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
    <CartProvider>
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
            <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <ChatCircleDots size={16} weight="bold" /> Nhắn Zalo
            </a>
            <a href={CONTACT.threads} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm hidden lg:inline-flex text-ink">
              <At size={16} weight="bold" /> Threads
            </a>
            <CartButton />
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
                <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-primary mt-2">
                  <ChatCircleDots size={16} weight="bold" /> Nhắn Zalo đặt hoa
                </a>
                <a href={CONTACT.threads} target="_blank" rel="noreferrer" className="btn btn-outline">
                  <At size={16} weight="bold" /> Nhắn Threads @nhiinhii_095
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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} Trạm Hoa Nhỏ · Hoa kẽm nhung thủ công</p>
          <div className="flex items-center gap-4 text-xs">
            <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
              <ChatCircleDots size={14} /> Zalo
            </a>
            <span>·</span>
            <a href={CONTACT.threads} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
              <At size={14} /> Threads
            </a>
            <span>·</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-left hover:text-ink">
              Lên đầu trang ↑
            </button>
          </div>
        </div>
      </footer>
    </div>
    </CartProvider>
  );
}

// Nút giỏ hàng trên thanh đầu trang, có số món
function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      className="icon-btn relative text-ink"
      aria-label={count ? `Giỏ hàng, ${count} sản phẩm` : 'Giỏ hàng'}
    >
      <ShoppingBag size={22} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brick px-1 text-[11px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
