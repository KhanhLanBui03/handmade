import { getCover, parsePrice } from './format';

// Phân loại hợp lệ của sản phẩm: [{ name, price, image, cost }]
export function getVariants(product) {
  const list = Array.isArray(product?.variants) ? product.variants : [];
  return list
    .filter((v) => v && String(v.name || '').trim())
    .map((v) => ({ name: String(v.name).trim(), price: Number(v.price) || 0, image: v.image || null, cost: Number(v.cost) || 0 }));
}

// Giá vốn của một phân loại: có giá vốn riêng (> 0) thì dùng, không thì lấy giá vốn chung của sản phẩm
export function variantCost(product, variantName) {
  if (!product) return 0;
  if (variantName) {
    const v = (product.variants || []).find((x) => x && String(x.name).trim() === String(variantName).trim());
    if (v && Number(v.cost) > 0) return Number(v.cost);
  }
  return Number(product.cost) || 0;
}

// Tạo hàm tra giá vốn cho một dòng hàng trong hóa đơn (theo product_id + phân loại)
export function makeCostOf(products) {
  const list = products || [];
  const byId = new Map(list.map((p) => [String(p.id), p]));
  const byName = new Map(list.map((p) => [String(p.name || '').trim().toLowerCase(), p]));
  return (item) => {
    const baseName = String(item?.product_name || '').replace(/\s*—\s*.*$/, '').trim().toLowerCase();
    const p = byId.get(String(item?.product_id)) || byName.get(baseName);
    return variantCost(p, item?.variant);
  };
}

// Giá hiển thị: có phân loại thì lấy giá thấp nhất
export function minPrice(product) {
  const vs = getVariants(product);
  return vs.length ? Math.min(...vs.map((v) => v.price)) : parsePrice(product?.price);
}

// Có nhiều mức giá khác nhau → hiện "Từ ..."
export const hasPriceRange = (product) => new Set(getVariants(product).map((v) => v.price)).size > 1;

/**
 * Các "món bán được" của một sản phẩm: mỗi phân loại là một món riêng (giá riêng);
 * sản phẩm không có phân loại là một món.
 */
export function sellablesOf(product) {
  const vs = getVariants(product);
  const cover = getCover(product);
  if (!vs.length) {
    return [{ key: String(product.id), product, variant: null, label: product.name, price: parsePrice(product.price), image: cover }];
  }
  return vs.map((v) => ({
    key: `${product.id}::${v.name}`,
    product,
    variant: v.name,
    label: `${product.name} — ${v.name}`,
    price: v.price,
    image: v.image || cover,
  }));
}
