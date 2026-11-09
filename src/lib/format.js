// Tiện ích dùng chung cho storefront & admin

export const CONTACT = {
  zalo: 'https://zalo.me/0399176095',
  zaloDisplay: '0399 176 095',
  threads: 'https://www.threads.net/@nhiinhii_095',
  threadsDisplay: '@nhiinhii_095',
  email: 'vonguyetnhi3012@gmail.com',
  phone: '0399176095',
  phoneDisplay: '0399 176 095',
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

// Bỏ dấu để tìm "cam tu cau" vẫn ra "Cẩm tú cầu"
export function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

export function shortId(id) {
  return String(id || '').split('-')[0].toUpperCase();
}

// Đọc số lượng: nhận số thập phân ("1,5" hoặc "1.5") và phép tính đơn giản ("2*1,5+3", "10/4").
// Trả về 0 nếu không hợp lệ. Làm tròn 3 chữ số thập phân.
export function parseQty(input) {
  const s = String(input ?? '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[x×]/gi, '*')
    .replace(/:/g, '/');
  if (!s || !/^[\d.+\-*/()]+$/.test(s)) return 0;
  let i = 0;
  const expr = () => {
    let v = term();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = () => {
    let v = factor();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++];
      const r = factor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const factor = () => {
    if (s[i] === '-') { i++; return -factor(); }
    if (s[i] === '(') {
      i++;
      const v = expr();
      if (s[i++] !== ')') throw new Error('paren');
      return v;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error('num');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  try {
    const v = expr();
    if (i !== s.length || !Number.isFinite(v)) return 0;
    return Math.round(v * 1000) / 1000;
  } catch {
    return 0;
  }
}

// Có phải đang nhập phép tính (để hiện kết quả bên dưới ô nhập)
export const isQtyExpression = (input) => /\d\s*[-+*/x×:]\s*[\d(]/i.test(String(input ?? ''));

// 1.5 -> "1,5"; 1000 -> "1.000"
export function formatQty(n) {
  return Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

// Đọc số tiền thành chữ: 1250000 -> "Một triệu hai trăm năm mươi nghìn đồng"
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function readTriple(n, full) {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out = [];
  if (full || h > 0) out.push(DIGITS[h], 'trăm');
  if (t === 0) {
    if (u > 0) out.push(...(full || h > 0 ? ['linh', DIGITS[u]] : [DIGITS[u]]));
  } else if (t === 1) {
    out.push('mười');
    if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  } else {
    out.push(DIGITS[t], 'mươi');
    if (u === 1) out.push('mốt');
    else if (u === 4) out.push('tư');
    else if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  }
  return out.join(' ');
}
export function moneyToWords(value) {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    parts.push(readTriple(g, parts.length > 0), units[i] ?? '');
  }
  const text = parts.filter(Boolean).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + ' đồng';
}
