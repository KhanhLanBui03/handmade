import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShoppingBag, ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Home() {
  const reduce = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(3);
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchLatest();
  }, []);

  const fadeIn = {
    hidden: reduce ? false : { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      {/* Hero Section */}
      <section className="px-6 md:px-12 max-w-[1400px] mx-auto min-h-[calc(100dvh-72px)] flex items-center pt-12 md:pt-24 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeIn} 
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start gap-6"
          >
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.05] max-w-[15ch]">
              Hoa thủ công tỉ mỉ đến từng chi tiết.
            </h1>
            <p className="text-lg md:text-xl text-ink/70 leading-relaxed max-w-[42ch]">
              Những đóa cẩm tú cầu, hướng dương và hoa hồng được tạo hình nghệ thuật từ kẽm nhung cao cấp, mang lại vẻ đẹp vĩnh cửu cho không gian của bạn.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link to="/products" className="bg-sunflower text-ink px-8 py-4 rounded-full font-semibold hover:-translate-y-[2px] transition-transform flex items-center gap-2">
                Khám phá ngay <ArrowRight weight="bold" />
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full aspect-[4/5] md:aspect-square rounded-[32px] overflow-hidden bg-paper-dim"
          >
            <img src="/hero_hydrangea.png" alt="Bó hoa cẩm tú cầu kẽm nhung" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Categories */}
      <section id="categories" className="px-6 md:px-12 py-24 bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Bộ Sưu Tập Tiêu Biểu</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">
            {/* Cell 1: Hydrangea (Span 2 cols on md) */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              className="md:col-span-2 relative rounded-[32px] overflow-hidden bg-hydrangea/20 flex flex-col justify-end p-8 group cursor-pointer"
            >
              <Link to="/products" className="absolute inset-0 z-20"></Link>
              <img src="/hero_hydrangea.png" alt="Cẩm tú cầu" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="text-3xl font-medium mb-2">Cẩm Tú Cầu</h3>
                <p className="text-paper/80">Sắc xanh dịu mát, bồng bềnh.</p>
              </div>
            </motion.div>

            {/* Cell 2: Sunflower */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              className="relative rounded-[32px] overflow-hidden bg-sunflower/20 flex flex-col justify-end p-8 group cursor-pointer"
            >
              <Link to="/products" className="absolute inset-0 z-20"></Link>
              <img src="/product_sunflower.png" alt="Hướng dương" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="text-3xl font-medium mb-2 text-sunflower">Hướng Dương</h3>
                <p className="text-paper/80">Rực rỡ và tràn đầy năng lượng.</p>
              </div>
            </motion.div>

            {/* Cell 3: Rose */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              className="md:col-span-3 relative rounded-[32px] overflow-hidden bg-brick/20 flex flex-col justify-end p-8 h-[300px] group cursor-pointer"
            >
              <Link to="/products" className="absolute inset-0 z-20"></Link>
              <img src="/product_rose.png" alt="Hoa hồng" className="absolute inset-0 w-full h-full object-cover object-center opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="text-3xl font-medium mb-2 text-brick">Hoa Hồng Đỏ</h3>
                <p className="text-paper/80">Biểu tượng của tình yêu nồng cháy.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="shop" className="px-6 md:px-12 py-32 max-w-[1400px] mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Sản phẩm mới</h2>
            <p className="text-lg text-ink/60 mt-4 max-w-xl">Những thiết kế hoa kẽm nhung vừa được hoàn thiện, sẵn sàng tô điểm cho không gian sống của bạn.</p>
          </div>
          <Link to="/products" className="font-medium flex items-center gap-2 hover:text-brick transition-colors">
            Xem tất cả <ArrowRight />
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><CircleNotch size={32} className="animate-spin text-ink/20" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {products.map((product, i) => {
              const imgUrl = product.media && product.media[0] ? product.media[0].src : '/placeholder.jpg';
              return (
                <motion.div
                  key={product.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }
                  }}
                  className="group flex flex-col relative"
                >
                  <Link to={`/product/${product.id}`} className="absolute inset-0 z-10"></Link>
                  <div className="aspect-[4/5] rounded-[24px] overflow-hidden bg-paper-dim mb-4 relative border border-ink/5">
                    <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex justify-between items-start mt-auto">
                    <div>
                      <h3 className="font-medium text-lg leading-tight group-hover:text-brick transition-colors">{product.name}</h3>
                      <p className="text-ink/60 mt-1">{Number(product.price.replace(/[^\d]/g, '')).toLocaleString('vi-VN')} đ</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
