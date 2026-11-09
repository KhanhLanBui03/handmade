import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './supabase';

// Tải toàn bộ sản phẩm + danh mục cho trang khách
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at'),
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (catRes.data) setCategories(catRes.data);
      // Sản phẩm bị ẩn trong admin thì không hiện cho khách
      if (prodRes.data) setProducts(prodRes.data.filter((p) => !p.is_hidden));
      setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, categories, loading };
}

// Cửa sổ chi tiết sản phẩm: id nằm trên URL (?sp=<id>) để chia sẻ được và nút Back đóng được
export function useProductModal(products) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const openedHere = useRef(false);

  const openId = params.get('sp');
  const openProduct = openId ? products.find((p) => String(p.id) === openId) || null : null;

  const open = useCallback(
    (product) => {
      openedHere.current = true;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('sp', product.id);
          return next;
        },
        { preventScrollReset: true },
      );
    },
    [setParams],
  );

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      navigate(-1);
    } else {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('sp');
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    }
  }, [navigate, setParams]);

  return { openProduct, open, close };
}
