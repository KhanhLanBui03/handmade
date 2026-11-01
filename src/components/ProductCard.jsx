import { Link } from 'react-router-dom';
import { ArrowUpRight, Flower } from '@phosphor-icons/react';
import { formatVND, getCover, parsePrice } from '../lib/format';

export function ProductCard({ product, showCategory = true }) {
  const cover = getCover(product);
  const category = product.categories?.name;

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col gap-3 outline-none">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-dim ring-1 ring-line group-focus-visible:ring-2 group-focus-visible:ring-brick">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full flex items-center justify-center text-ink/15">
            <Flower size={56} weight="duotone" />
          </div>
        )}

        {showCategory && category && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 backdrop-blur px-3 py-1 text-xs font-medium text-ink">
            {category}
          </span>
        )}

        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-surface text-ink opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
        >
          <ArrowUpRight size={18} weight="bold" />
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 px-0.5">
        <h3 className="font-medium leading-snug text-ink line-clamp-2 group-hover:text-brick transition-colors">
          {product.name}
        </h3>
        <p className="shrink-0 font-semibold text-ink">{formatVND(parsePrice(product.price))}</p>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="aspect-[4/5] rounded-2xl bg-paper-dim animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-paper-dim animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-paper-dim animate-pulse" />
    </div>
  );
}
