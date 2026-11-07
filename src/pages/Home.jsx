import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useProducts, useProductModal } from '../lib/useProducts';
import HeroSlider from '../components/home/HeroSlider';
import ProductSection from '../components/home/ProductSection';
import ContactSection from '../components/home/ContactSection';
import ProductModal from '../components/home/ProductModal';

// Trang chủ: Banner → Sản phẩm mới → Liên hệ
export default function Home() {
  const { products, loading } = useProducts();
  const { openProduct, open, close } = useProductModal(products);
  const { hash } = useLocation();

  // Link dạng /#san-pham (từ trang khác): cuộn tới phần tương ứng sau khi dữ liệu tải xong
  useEffect(() => {
    if (!hash || loading) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, loading]);

  return (
    <>
      <HeroSlider />
      <ProductSection products={products} loading={loading} onOpen={open} />
      <ContactSection />

      <AnimatePresence>
        {openProduct && <ProductModal key={openProduct.id} product={openProduct} onClose={close} />}
      </AnimatePresence>
    </>
  );
}
