// Tiện ích dùng chung cho storefront & admin

export const CONTACT = {
  phone: '0399176095',
  phoneDisplay: '0399 176 095',
  email: 'vonguyetnhi3012@gmail.com',
  zalo: 'https://zalo.me/0399176095',
};

// "150.000đ" -> 150000 (giá đang lưu dạng chuỗi trong DB)
export function parsePrice(price) {
  if (price === null || price === undefined) return 0;
  return Number(String(price).replace(/[^\d]/g, '')) || 0;
}

export function formatVND(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

// Ảnh bìa: ưu tiên ảnh đầu tiên, bỏ qua video
export function getCover(product) {
  const media = product?.media || [];
  return media.find((m) => m.type !== 'video')?.src || null;
}

export function shortId(id) {
  return String(id || '').split('-')[0].toUpperCase();
}
