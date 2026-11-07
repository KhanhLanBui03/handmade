import { ArrowUpRight, Flower } from '@phosphor-icons/react';
import { formatVND, getCover, parsePrice } from '../lib/format';

export function ProductCard({ product, onOpen }) {
  const cover = getCover(product);
  const category = product.categories?.name;

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="group flex w-full flex-col gap-3 text-left outline-none"
      aria-label={`Xem chi tiết ${product.name}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-paper-dim ring-1 ring-line group-focus-visible:ring-2 group-focus-visible:ring-brick">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-ink/15">
            <Flower size={56} weight="duotone" />
          </div>
        )}

        {category && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur">
            {category}
          </span>
        )}

        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 flex size-10 translate-y-2 items-center justify-center rounded-full bg-surface text-ink opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <ArrowUpRight size={18} weight="bold" />
        </span>
      </div>

      <div className="flex w-full items-start justify-between gap-3 px-0.5">
        <h3 className="line-clamp-2 font-medium leading-snug text-ink transition-colors group-hover:text-brick">
          {product.name}
        </h3>
        <p className="shrink-0 font-semibold text-ink">{formatVND(parsePrice(product.price))}</p>
      </div>
    </button>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse rounded-2xl bg-paper-dim" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-paper-dim" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-paper-dim" />
    </div>
  );
}
