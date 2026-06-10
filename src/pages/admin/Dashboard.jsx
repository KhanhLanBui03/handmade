import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calculator, CheckCircle, CircleNotch, Image as ImageIcon } from '@phosphor-icons/react';

// Hàm hỗ trợ lọc lấy phần số từ chuỗi giá (vd: "150.000đ" -> 150000)
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const numStr = String(priceStr).replace(/[^\d]/g, '');
  return Number(numStr) || 0;
};

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState({}); // { product_id: quantity }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleInputChange = (productId, value) => {
    setOrderItems(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    products.forEach(p => {
      const q = Number(orderItems[p.id]) || 0;
      const price = parsePrice(p.price);
      total += (q * price);
    });
    return total;
  };

  const handleSaveOrder = async () => {
    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      alert("Vui lòng nhập ít nhất 1 sản phẩm có số lượng > 0 để lưu đơn hàng.");
      return;
    }

    setSaving(true);
    
    const itemsToSave = [];
    products.forEach(p => {
      const q = Number(orderItems[p.id]) || 0;
      if (q > 0) {
        itemsToSave.push({
          product_id: p.id,
          product_name: p.name,
          quantity: q,
          price: parsePrice(p.price)
        });
      }
    });

    const { error } = await supabase.from('orders').insert([
      {
        total_amount: totalAmount,
        items: itemsToSave
      }
    ]);

    setSaving(false);
    if (error) {
      alert("Lỗi lưu đơn hàng: " + error.message);
    } else {
      setSuccessMsg('Đã lưu hóa đơn thành công!');
      setOrderItems({}); // Reset form
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const total = calculateTotal();

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-4xl font-semibold tracking-tight">Thu Ngân (POS)</h2>
        {successMsg && (
          <div className="bg-green-100 text-green-800 px-6 py-3 rounded-full font-medium flex items-center gap-2 animate-pulse">
            <CheckCircle weight="fill" size={24} /> {successMsg}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20"><CircleNotch size={48} className="animate-spin text-ink/20" /></div>
      ) : (
        <div className="bg-paper rounded-[32px] border border-ink/5 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          
          <div className="flex-1 overflow-x-auto p-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/10 text-ink/50 text-xs uppercase tracking-widest">
                  <th className="py-4 font-semibold w-16 text-center">ID</th>
                  <th className="py-4 font-semibold">Tên sản phẩm</th>
                  <th className="py-4 font-semibold w-48 text-right">Giá bán</th>
                  <th className="py-4 font-semibold w-40 text-center">Số lượng</th>
                  <th className="py-4 font-semibold text-right w-48">Thành tiền (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {products.map((product, idx) => {
                  const q = Number(orderItems[product.id]) || 0;
                  const price = parsePrice(product.price);
                  const rowTotal = q * price;

                  return (
                    <tr key={product.id} className="group hover:bg-ink/[0.02] transition-colors">
                      <td className="py-4 text-center font-medium text-ink/40">{idx + 1}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[12px] bg-paper-dim overflow-hidden flex-shrink-0 flex items-center justify-center border border-ink/5 shadow-sm">
                            {product.media && product.media[0] ? (
                              <img src={product.media[0].src} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="text-ink/20" size={20} />
                            )}
                          </div>
                          <span className="font-medium text-lg">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right font-medium text-ink/60">{price.toLocaleString('vi-VN')} đ</td>
                      <td className="py-4 px-4">
                        <input 
                          type="number"
                          min="0"
                          placeholder="0"
                          value={orderItems[product.id] || ''}
                          onChange={(e) => handleInputChange(product.id, e.target.value)}
                          className="w-full bg-paper-dim border border-ink/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-ink font-bold text-lg"
                        />
                      </td>
                      <td className="py-4 text-right font-semibold text-lg text-brick">
                        {rowTotal > 0 ? rowTotal.toLocaleString('vi-VN') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-ink text-paper p-8 flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-paper/60 uppercase tracking-widest text-sm font-medium mb-1">Tổng tiền thanh toán</span>
              <span className="text-5xl font-bold tracking-tight text-sunflower">{total.toLocaleString('vi-VN')} đ</span>
            </div>
            
            <button 
              onClick={handleSaveOrder}
              disabled={saving || total <= 0}
              className="bg-sunflower text-ink px-10 py-5 rounded-2xl font-bold text-xl flex items-center gap-3 hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? <CircleNotch size={28} className="animate-spin" /> : <Calculator size={28} weight="fill" />}
              Lưu Đơn Hàng
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
