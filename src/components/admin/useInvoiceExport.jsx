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

  const generatePng = async (o) => {
    render(o);
    const dataUrl = await toPng(ref.current, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      cacheBust: true,
    });
    const name = `hoa-don-${shortId(o.id)}.png`;
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, blob, name };
  };

  const download = async (o) => {
    setBusy(true);
    try {
      const { blob, name, dataUrl } = await generatePng(o);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      return 'downloaded';
    } catch (err) {
      alert('Không tải được ảnh: ' + (err?.message || err));
      return 'error';
    } finally {
      setBusy(false);
    }
  };

  const share = async (o) => {
    setBusy(true);
    try {
      const { blob, name, dataUrl } = await generatePng(o);
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Hóa đơn Trạm Hoa Nhỏ' });
          return 'shared';
        } catch (err) {
          if (err?.name === 'AbortError') return 'cancelled';
        }
      }
      // Không hỗ trợ Web Share thì tải file về
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = name;
      a.click();
      return 'downloaded';
    } catch (err) {
      alert('Không chia sẻ được ảnh: ' + (err?.message || err));
      return 'error';
    } finally {
      setBusy(false);
    }
  };

  const sendImage = async (o) => {
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    if (isTouch && navigator.canShare) return share(o);
    return download(o);
  };

  const element = (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -9999,
        opacity: 0,
      }}
    >
      <div style={{ width: 720 }}>
        <InvoicePrint ref={ref} order={order} />
      </div>
    </div>
  );

  return { print, sendImage, download, share, busy, element };
}
