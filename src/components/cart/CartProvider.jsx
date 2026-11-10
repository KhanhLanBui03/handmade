import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartContext } from '../../lib/cart-context';
import CartDrawer from './CartDrawer';

const KEY = 'tramhoanho:cart';

const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((i) => i && i.id && i.quantity > 0) : [];
  } catch {
    return [];
  }
};

export default function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);

  // Lưu giỏ trong trình duyệt để khách quay lại vẫn còn
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* trình duyệt chặn lưu trữ — bỏ qua */
    }
  }, [items]);

  const add = useCallback((product, quantity = 1) => {
    setItems((list) => {
      const found = list.find((i) => i.id === product.id);
      if (found) return list.map((i) => (i.id === product.id ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i));
      return [
        ...list,
        {
          id: product.id, // mã dòng trong giỏ (sản phẩm + phân loại)
          product_id: product.product_id ?? product.id,
          variant: product.variant || null,
          name: product.name,
          price: product.price,
          image: product.image || null,
          quantity,
        },
      ];
    });
  }, []);

  const setQty = useCallback((id, quantity) => {
    setItems((list) =>
      quantity <= 0 ? list.filter((i) => i.id !== id) : list.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.quantity * i.price, 0),
      isOpen: open,
      openCart,
      closeCart,
    }),
    [items, add, setQty, remove, clear, open, openCart, closeCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}
