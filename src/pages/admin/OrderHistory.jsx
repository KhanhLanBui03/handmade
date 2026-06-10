import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Printer, CalendarBlank, Receipt } from '@phosphor-icons/react';
import { InvoicePrint } from '../../components/InvoicePrint';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  
  // Ref cho máy in
  const printRef = useRef();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Hoa_Don_Kem_Nhung',
  });

  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (dateFilter) {
      const selectedDate = new Date(dateFilter);
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  };

  const triggerPrint = (order) => {
    setSelectedOrder(order);
  };

  // Sử dụng useEffect để trigger in khi selectedOrder đã được cập nhật vào DOM
  useEffect(() => {
    if (selectedOrder) {
      handlePrint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <h2 className="text-4xl font-semibold tracking-tight flex items-center gap-4">
          <Receipt size={40} className="text-brick" weight="fill" /> 
          Lịch sử Đơn Hàng
        </h2>
        
        <div className="flex items-center gap-4 bg-paper rounded-2xl px-5 py-3 border border-ink/10 shadow-sm">
          <CalendarBlank size={24} className="text-ink/50" />
          <div className="flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold mb-1">Lọc theo ngày</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent font-medium focus:outline-none"
            />
          </div>
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="ml-4 text-sm text-brick hover:underline font-medium">Xóa lọc</button>
          )}
        </div>
      </div>

      <div className="bg-paper rounded-[32px] p-8 border border-ink/5 shadow-sm">
        {loading ? (
          <div className="text-ink/50 py-12 text-center">Đang tải lịch sử...</div>
        ) : (
          <div className="divide-y divide-ink/5">
            {orders.map(order => (
              <div key={order.id} className="py-8 first:pt-4 last:pb-4 flex flex-col lg:flex-row gap-8 justify-between">
                
                {/* Thông tin đơn */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-ink/5 text-ink px-3 py-1 rounded-lg text-sm font-semibold tracking-wider">#{order.id.split('-')[0].toUpperCase()}</span>
                    <span className="text-ink/50 font-medium">{format(parseISO(order.created_at), 'dd/MM/yyyy - HH:mm')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-lg">
                        <span className="font-medium text-ink/80">{item.quantity} x {item.product_name}</span>
                        <span className="text-ink/60">{(item.quantity * item.price).toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tổng tiền & In */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 border-ink/10 pt-6 lg:pt-0 pl-0 lg:pl-8 lg:border-l">
                  <div className="text-left lg:text-right mb-0 lg:mb-6">
                    <p className="text-ink/50 uppercase tracking-widest text-xs font-semibold mb-1">Tổng cộng</p>
                    <p className="text-3xl font-bold text-brick">{Number(order.total_amount).toLocaleString('vi-VN')} đ</p>
                  </div>
                  <button 
                    onClick={() => triggerPrint(order)}
                    className="bg-ink text-paper px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:-translate-y-1 transition-transform shadow-lg shadow-ink/20"
                  >
                    <Printer size={22} weight="fill" /> Xuất PDF
                  </button>
                </div>

              </div>
            ))}

            {orders.length === 0 && (
              <div className="py-20 text-center">
                <Receipt size={64} className="mx-auto text-ink/10 mb-4" weight="fill" />
                <p className="text-xl font-medium text-ink/50">Không tìm thấy đơn hàng nào.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Component For Printing */}
      <div className="absolute -left-[9999px] top-0 overflow-hidden w-0 h-0">
        <InvoicePrint ref={printRef} order={selectedOrder} />
      </div>
    </div>
  );
}
