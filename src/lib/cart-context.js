import { createContext, useContext } from 'react';

export const CartContext = createContext(null);

// Giỏ hàng của khách: items, add, setQty, remove, clear, count, total, open/close ngăn giỏ hàng
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong <CartProvider>');
  return ctx;
}
