import React from 'react';
import { format, parseISO } from 'date-fns';

export const InvoicePrint = React.forwardRef(({ order }, ref) => {
  if (!order) return <div ref={ref}></div>;

  return (
    <div ref={ref} className="p-10 text-black bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold uppercase mb-2 tracking-widest">HÓA ĐƠN MUA HÀNG</h1>
        <p className="text-lg text-gray-700 font-medium">Cửa hàng Kẽm Nhung Handmade</p>
        <p className="text-sm text-gray-500 mt-2">Ngày in: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <p className="text-sm text-gray-500">Mã đơn: #{order.id.split('-')[0].toUpperCase()}</p>
      </div>

      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-black text-sm uppercase tracking-wider text-gray-600">
            <th className="py-3">Tên sản phẩm</th>
            <th className="py-3 text-center">SL</th>
            <th className="py-3 text-right">Đơn giá</th>
            <th className="py-3 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="py-4 font-medium">{item.product_name}</td>
              <td className="py-4 text-center">{item.quantity}</td>
              <td className="py-4 text-right">{Number(item.price).toLocaleString('vi-VN')}đ</td>
              <td className="py-4 text-right font-medium">{(item.quantity * item.price).toLocaleString('vi-VN')}đ</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-black pt-6">
        <div className="w-1/2">
          <div className="flex justify-between items-center mb-2 text-lg">
            <span className="font-semibold">TỔNG CỘNG:</span>
            <span className="font-bold text-2xl">{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-20 pt-8 border-t border-gray-300">
        <p className="font-medium italic">Cảm ơn quý khách đã mua hàng!</p>
        <p className="text-sm text-gray-500 mt-1">Hẹn gặp lại quý khách lần sau</p>
      </div>
    </div>
  );
});
