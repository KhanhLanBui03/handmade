import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Faders, CaretDown, CircleNotch } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Products() {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [activePriceRange, setActivePriceRange] = useState("Tất cả mức giá");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const reduce = useReducedMotion();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'Tất cả' }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at'),
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false })
      ]);

      if (catRes.data) {
        setCategories([{ id: 'all', name: 'Tất cả' }, ...catRes.data]);
      }
      if (prodRes.data) {
        setProducts(prodRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const fadeIn = {
    hidden: reduce ? false : { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  };

  const priceRanges = ["Tất cả mức giá", "Dưới 100k", "100k - 150k", "150k - 200k", "Trên 200k"];

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    return Number(String(priceStr).replace(/[^\d]/g, '')) || 0;
  };

  const filteredProducts = products.filter(p => {
    // Category check
    const catName = p.categories?.name || "Chưa phân loại";
    if (activeCategory !== "Tất cả" && catName !== activeCategory) return false;
    
    // Price check
    if (activePriceRange !== "Tất cả mức giá") {
      const price = parsePrice(p.price);
      if (activePriceRange === "Dưới 100k" && price > 100000) return false;
      if (activePriceRange === "100k - 150k" && (price <= 100000 || price > 150000)) return false;
      if (activePriceRange === "150k - 200k" && (price <= 150000 || price > 200000)) return false;
      if (activePriceRange === "Trên 200k" && price <= 200000) return false;
    }
    
    return true;
  });

  return (
    <div className="px-6 md:px-12 py-24 max-w-[1400px] mx-auto min-h-[calc(100dvh-72px)]">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Tất cả sản phẩm</h1>
        <p className="text-lg text-ink/60 mt-4 max-w-xl">Khám phá toàn bộ bộ sưu tập hoa kẽm nhung thủ công của chúng tôi.</p>
      </motion.div>

      {/* Premium Filters Container */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="mb-14 relative z-20"
      >
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-paper-dim/50 border border-ink/5 p-2 md:p-4 rounded-[32px] backdrop-blur-md">
          
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2 w-full">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-6 py-3 rounded-[24px] text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat.name
                    ? 'bg-ink text-paper shadow-md'
                    : 'bg-transparent text-ink/60 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="hidden xl:block w-px h-10 bg-ink/10 flex-shrink-0 mx-2"></div>

          {/* Price Ranges Dropdown */}
          <div className="relative w-full xl:w-auto px-2 pb-2 xl:pb-0">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full xl:w-48 flex items-center justify-between gap-2 px-5 py-3 rounded-[24px] text-sm font-medium border border-ink/10 bg-paper hover:border-ink/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Faders size={18} className="text-ink/50" />
                <span>{activePriceRange}</span>
              </div>
              <CaretDown size={16} className={`text-ink/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 left-0 xl:left-auto top-full mt-3 w-full xl:w-56 bg-paper border border-ink/10 rounded-[24px] shadow-xl overflow-hidden py-2 z-30"
              >
                {priceRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => { 
                      setActivePriceRange(range); 
                      setIsDropdownOpen(false); 
                    }}
                    className={`w-full text-left px-6 py-3 text-sm transition-colors ${
                      activePriceRange === range ? 'bg-sunflower/20 text-ink font-semibold' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20"><CircleNotch size={48} className="animate-spin text-ink/20" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product, i) => {
            const imgUrl = product.media && product.media[0] ? product.media[0].src : '/placeholder.jpg';
            const catName = product.categories?.name || 'Không có';
            
            return (
              <motion.div
                key={product.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 4) * 0.05, duration: 0.4 }}
                className="group flex flex-col relative"
              >
                <Link to={`/product/${product.id}`} className="absolute inset-0 z-10"></Link>
                <div className="aspect-[4/5] rounded-[24px] overflow-hidden bg-paper-dim mb-4 relative border border-ink/5">
                  <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-paper/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium">
                    {catName}
                  </div>
                </div>
                <div className="flex justify-between items-start mt-auto">
                  <div>
                    <h3 className="font-medium text-lg leading-tight group-hover:text-brick transition-colors">{product.name}</h3>
                    <p className="text-ink/60 mt-1">{parsePrice(product.price).toLocaleString('vi-VN')} đ</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-paper-dim/30 rounded-[32px] border border-ink/5">
              <Faders size={48} className="text-ink/20 mb-4" />
              <p className="text-lg text-ink/60 font-medium">Không tìm thấy sản phẩm nào</p>
              <p className="text-sm text-ink/40 mt-1">Vui lòng thử chọn mức giá hoặc danh mục khác.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
