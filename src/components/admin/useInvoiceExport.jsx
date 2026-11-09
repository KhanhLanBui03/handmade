import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';
import { InvoicePrint } from '../InvoicePrint';
import { shortId } from '../../lib/format';

/**
 * Xuất hóa đơn để gửi cho khách:
 *  - sendImage(order): tạo ảnh PNG. Trên điện thoại mở bảng chia sẻ (gửi thẳng qua Zalo/Messenger),
 *    trên máy tính tải ảnh về để kéo vào khung chat.
 *  - print(order): in hoặc lưu PDF.
 * Gắn {element} vào trang (bản hóa đơn ẩn dùng để chụp/in).
 */
export function useInvoiceExport() {
  const ref = useRef(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const doPrint = useReactToPrint({ contentRef: ref, documentTitle: 'Hoa_don_Tram_Hoa_Nho' });

  const render = (o) => flushSync(() => setOrder(o));

  const print = (o) => {
    render(o);
    doPrint();
  };

  const sendImage = async (o) => {
    setBusy(true);
    try {
      render(o);
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        cacheBust: true,
      });
      const name = `hoa-don-${shortId(o.id)}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], name, { type: 'image/png' });

      // Điện thoại: mở bảng chia sẻ để gửi thẳng cho khách
      const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
      if (isTouch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Hóa đơn Trạm Hoa Nhỏ' });
          return 'shared';
        } catch (err) {
          if (err?.name === 'AbortError') return 'cancelled';
        }
      }

      // Máy tính (hoặc không chia sẻ được): tải ảnh về
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = name;
      a.click();
      return 'downloaded';
    } catch (err) {
      alert('Không tạo được ảnh hóa đơn: ' + (err?.message || err));
      return 'error';
    } finally {
      setBusy(false);
    }
  };

  const element = (
    <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 w-[720px]">
      <InvoicePrint ref={ref} order={order} />
    </div>
  );

  return { print, sendImage, busy, element };
}
