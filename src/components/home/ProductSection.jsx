import { Link } from 'react-router-dom';
import { ArrowRight, FlowerTulip } from '@phosphor-icons/react';
import { ProductCard, ProductCardSkeleton } from '../ProductCard';

const FEATURED = 8;

// Trang chủ: chỉ hiện các mẫu mới nhất, phần còn lại ở trang "Tất cả sản phẩm"
export default function ProductSection({ products, loading, onOpen }) {
  const featured = products.slice(0, FEATURED);

  return (
    <section id="san-pham" className="mx-auto max-w-7xl scroll-mt-18 px-4 pt-20 sm:px-6 lg:px-10 lg:pt-28">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Sản phẩm mới</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-6xl">Sản phẩm</h2>
          <p className="mt-3 max-w-xl text-muted">
            Bấm vào một bó hoa để xem chi tiết và đặt hàng — mỗi mẫu đều có thể đổi màu, đổi số bông theo ý bạn.
          </p>
        </div>
        {products.length > 0 && (
          <Link to="/san-pham" className="btn btn-outline self-start sm:self-auto">
            Tất cả ({products.length}) <ArrowRight weight="bold" />
          </Link>
        )}
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {loading
          ? Array.from({ length: FEATURED }).map((_, i) => <ProductCardSkeleton key={i} />)
          : featured.map((p) => <ProductCard key={p.id} product={p} onOpen={onOpen} />)}
      </div>

      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-blush text-brick">
            <FlowerTulip size={30} weight="duotone" />
          </span>
          <h3 className="mt-5 font-display text-2xl">Sản phẩm đang được hoàn thiện</h3>
          <p className="mt-2 max-w-sm text-muted">Bạn quay lại sau, hoặc nhắn cho shop để đặt mẫu riêng nhé!</p>
        </div>
      )}

      {!loading && products.length > FEATURED && (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Đang hiển thị {FEATURED} / {products.length} sản phẩm</p>
          <Link to="/san-pham" className="btn btn-primary btn-lg">
            Xem tất cả sản phẩm <ArrowRight weight="bold" />
          </Link>
        </div>
      )}
    </section>
  );
}
