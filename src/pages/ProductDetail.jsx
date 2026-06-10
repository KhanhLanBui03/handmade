import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, CircleNotch } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single();
        
      if (data) setProduct(data);
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-72px)] flex items-center justify-center bg-paper">
        <CircleNotch size={48} className="animate-spin text-ink/20" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[calc(100dvh-72px)] flex flex-col items-center justify-center bg-paper gap-4">
        <h2 className="text-3xl font-semibold">Sản phẩm không tồn tại</h2>
        <Link to="/products" className="text-brick hover:underline">Quay lại cửa hàng</Link>
      </div>
    );
  }

  const images = (product.media || []).filter(m => m.type === 'image');
  const videos = (product.media || []).filter(m => m.type === 'video');
  const price = Number(String(product.price).replace(/[^\d]/g, '')) || 0;

  return (
    <div className="bg-paper text-ink min-h-[calc(100dvh-72px)] pb-32">
      
      {/* Top Nav / Breadcrumb */}
      <div className="px-6 md:px-12 py-8 max-w-[1200px] mx-auto">
        <Link to="/products" className="inline-flex items-center gap-2 text-ink/50 hover:text-ink transition-colors font-medium text-sm">
          <ArrowLeft weight="bold" /> Trở lại cửa hàng
        </Link>
      </div>

      <div className="px-6 md:px-12 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Media Gallery */}
          <div className="lg:col-span-5 flex flex-col">
            
            {/* Main Image */}
            {images.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full rounded-[24px] overflow-hidden bg-paper-dim mb-4 aspect-square relative border border-ink/5"
              >
                <img 
                  src={images[activeImageIdx].src} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                />
              </motion.div>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-20 h-20 rounded-[16px] overflow-hidden flex-shrink-0 transition-all ${
                      activeImageIdx === idx 
                        ? 'border-[3px] border-ink opacity-100 scale-100 shadow-md' 
                        : 'border-2 border-transparent opacity-50 hover:opacity-100 scale-95 hover:scale-100'
                    }`}
                  >
                    <img src={img.src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Product Info */}
          <div className="lg:col-span-6 lg:col-start-7 relative">
            <div className="lg:sticky lg:top-32 flex flex-col items-start pt-4 lg:pt-0">
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40 mb-6"
              >
                {product.categories?.name || 'Chưa phân loại'}
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-5xl lg:text-5xl font-medium tracking-tighter leading-[1.1] mb-6"
              >
                {product.name}
              </motion.h1>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-5xl text-brick font-semibold tracking-tight mb-12"
              >
                {price.toLocaleString('vi-VN')} đ
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full divide-y divide-ink/10 border-t border-ink/10"
              >
                <div className="py-8">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40 mb-5">Mô tả</h3>
                  <p className="text-lg text-ink/80 leading-relaxed max-w-[45ch] whitespace-pre-wrap">
                    {product.description || 'Chưa có mô tả cho sản phẩm này.'}
                  </p>
                </div>

                {product.features && product.features.length > 0 && (
                  <div className="py-8">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40 mb-5">Chi tiết cấu tạo</h3>
                    <ul className="grid grid-cols-1 gap-y-4">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-4 text-ink/80">
                          <div className="w-1.5 h-1.5 rounded-full bg-ink mt-2.5 flex-shrink-0"></div>
                          <span className="leading-relaxed text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
              
            </div>
          </div>

        </div>

        {/* Video Section (Full Width) */}
        {videos.length > 0 && (
          <div className="mt-20 pt-16 border-t border-ink/10">
            <h3 className="text-2xl font-semibold mb-8 flex items-center justify-center gap-3">
              <PlayCircle size={32} className="text-brick" weight="fill" /> Video Thực Tế
            </h3>
            <div className="max-w-4xl mx-auto flex flex-col gap-12">
              {videos.map((vid, idx) => (
                <div key={idx} className="w-full bg-ink/5 rounded-[32px] flex justify-center border border-ink/5 shadow-inner">
                  <video 
                    src={vid.src} 
                    controls 
                    className="w-full max-h-[75vh] object-contain rounded-[32px]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
