import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash, Image as ImageIcon, PencilSimple } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-semibold tracking-tight">Quản lý Sản phẩm</h2>
        <Link to="/admin/product/new" className="bg-ink text-paper px-6 py-3.5 rounded-full font-medium flex items-center gap-3 hover:-translate-y-1 transition-transform shadow-lg shadow-ink/20">
          <Plus weight="bold" /> Thêm sản phẩm
        </Link>
      </div>

      <div className="bg-paper rounded-[32px] p-8 border border-ink/5 shadow-sm">
        {loading ? (
          <div className="text-ink/50 py-12 text-center">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/10 text-ink/50 text-xs uppercase tracking-widest">
                  <th className="py-5 font-semibold">Sản phẩm</th>
                  <th className="py-5 font-semibold">Danh mục</th>
                  <th className="py-5 font-semibold">Giá</th>
                  <th className="py-5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {products.map(product => (
                  <tr key={product.id} className="group hover:bg-ink/[0.02] transition-colors">
                    <td className="py-5">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[16px] bg-paper-dim overflow-hidden flex-shrink-0 flex items-center justify-center border border-ink/5 shadow-sm">
                          {product.media && product.media[0] ? (
                            <img src={product.media[0].src} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="text-ink/20" size={24} />
                          )}
                        </div>
                        <span className="font-medium text-lg">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-5">
                      <span className="bg-paper-dim px-3 py-1.5 rounded-lg text-sm text-ink/70 font-medium">
                        {product.categories?.name || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td className="py-5 font-semibold text-lg">{product.price}</td>
                    <td className="py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/product/edit/${product.id}`} className="p-3 text-ink/40 hover:text-ink hover:bg-ink/5 rounded-2xl transition-colors">
                          <PencilSimple size={22} />
                        </Link>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-3 text-brick/60 hover:text-brick hover:bg-brick/10 rounded-2xl transition-colors">
                          <Trash size={22} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center text-ink/50 py-12 text-lg">Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
