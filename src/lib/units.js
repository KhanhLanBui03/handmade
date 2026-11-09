import { supabase } from './supabase';

// Đơn vị tính dùng chung cho Nguyên liệu & Nhập hàng
export const UNITS = ['cái', 'cuộn', 'bó', 'cây', 'xấp', 'tờ', 'hộp', 'kg', 'mét', 'gói'];

// Đổi đơn vị cũ sang đơn vị mới trong dữ liệu đã lưu
const RENAMED = { bịch: 'xấp' };

/**
 * Chuyển các nguyên liệu và dòng phiếu nhập còn dùng đơn vị cũ ("bịch") sang đơn vị mới ("xấp").
 * Chạy được nhiều lần: khi không còn dữ liệu cũ thì không làm gì.
 */
export async function migrateOldUnits() {
  for (const [from, to] of Object.entries(RENAMED)) {
    await supabase.from('materials').update({ unit: to }).eq('unit', from);

    const { data } = await supabase
      .from('stock_imports')
      .select('id, items')
      .contains('items', [{ unit: from }]);
    for (const rec of data || []) {
      const items = (rec.items || []).map((it) => (it.unit === from ? { ...it, unit: to } : it));
      await supabase.from('stock_imports').update({ items }).eq('id', rec.id);
    }
  }
}

export const fixUnit = (unit) => RENAMED[unit] || unit;
