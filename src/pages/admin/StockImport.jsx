import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  X,
  CheckCircle,
  CircleNotch,
  WarningCircle,
  Database,
  Shapes,
  ArrowSquareOut,
  PencilSimple,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatVND, formatQty, isQtyExpression, parseQty, shortId } from '../../lib/format';
import { DateField, PageHeader } from '../../components/admin/ui';
import { UNITS, fixUnit, migrateOldUnits } from '../../lib/units';
import ImportHistory from '../../components/admin/ImportHistory';

const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

let lineSeq = 0;
const newLine = () => ({
  key: ++lineSeq,
  name: '',
  quantity: '',
  unit: 'cái',
  unit_price: '',
  material_id: null,
});
const today = () => format(new Date(), 'yyyy-MM-dd');

// Bảng chưa được tạo trong Supabase
const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /stock_imports/.test(error.message || ''));

const sortImports = (list) =>
  [...list].sort(
    (a, b) =>
      String(b.import_date).localeCompare(String(a.import_date)) ||
      String(b.created_at).localeCompare(String(a.created_at)),
  );

export default function StockImport() {
  const [materials, setMaterials] = useState([]);
  const [imports, setImports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [lines, setLines] = useState(() => [newLine()]);
  const [importDate, setImportDate] = useState(today);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null); // phiếu đang sửa (null = tạo phiếu mới)
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const firstInput = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      await migrateOldUnits(); // đổi đơn vị "bịch" cũ thành "xấp"
      const [matRes, impRes] = await Promise.all([
        supabase.from('materials').select('*').order('name'),
        supabase
          .from('stock_imports')
          .select('*')
          .order('import_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);
      if (matRes.data) setMaterials(matRes.data);
      if (isMissingTable(impRes.error)) setMissingTable(true);
      else if (impRes.data) setImports(impRes.data);
      setLoadingHistory(false);
    }
    fetchData();
  }, []);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const updateLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  const addLine = () => setLines((ls) => [...ls, newLine()]);

  // Gõ tên: nếu trùng nguyên liệu đã lưu thì tự điền đơn vị & đơn giá
  const handleNameChange = (line, value) => {
    const mat = materials.find((m) => sameName(m.name, value));
    if (mat) {
      updateLine(line.key, {
        name: value,
        unit: mat.unit || line.unit,
        unit_price: mat.default_price ? String(mat.default_price) : line.unit_price,
        material_id: mat.id,
      });
    } else {
      updateLine(line.key, { name: value, material_id: null });
    }
  };

  const filledLines = lines.filter((l) => l.name.trim());
  const lineTotal = (l) => Math.round(parseQty(l.quantity) * toNumber(l.unit_price));
  const total = filledLines.reduce((s, l) => s + lineTotal(l), 0);
  const invalid = filledLines.some((l) => parseQty(l.quantity) <= 0);
  const canSave = filledLines.length > 0 && !invalid && !saving && !missingTable;

  // Tên mới (chưa có trong danh mục nguyên liệu) sẽ được lưu vào danh mục
  const newMaterialNames = [
    ...new Map(
      filledLines
        .filter((l) => !materials.some((m) => sameName(m.name, l.name)))
        .map((l) => [l.name.trim().toLowerCase(), l]),
    ).values(),
  ];

  // Nhà cung cấp đã từng nhập — gợi ý để chọn lại
  const suppliers = useMemo(() => {
    const map = new Map();
    imports.forEach((r) => {
      const name = (r.supplier || '').trim();
      if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), name);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [imports]);

  const resetForm = () => {
    setLines([newLine()]);
    setSupplier('');
    setNote('');
    setImportDate(today());
    setEditing(null);
    firstInput.current?.focus();
  };

  const startEdit = (record) => {
    setEditing(record);
    setImportDate(record.import_date);
    setSupplier(record.supplier || '');
    setNote(record.note || '');
    const items = record.items || [];
    setLines(
      items.length
        ? items.map((it) => ({
            key: ++lineSeq,
            name: it.name || '',
            quantity: it.quantity != null ? formatQty(it.quantity) : '',
            unit: fixUnit(it.unit) || 'cái',
            unit_price: it.unit_price ? String(it.unit_price) : '',
            material_id: it.material_id || null,
          }))
        : [newLine()],
    );
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Lưu các nguyên liệu tự nhập tay vào danh mục; trả về danh sách nguyên liệu mới nhất
  const saveNewMaterials = async () => {
    if (newMaterialNames.length === 0) return { list: materials, added: 0 };
    const rows = newMaterialNames.map((l) => ({
      name: l.name.trim(),
      unit: l.unit,
      default_price: toNumber(l.unit_price),
    }));
    const { data, error } = await supabase
      .from('materials')
      .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
      .select();
    if (error) {
      showToast('error', 'Không tự lưu được nguyên liệu mới: ' + error.message);
      return { list: materials, added: 0 };
    }
    const list = [...materials, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    setMaterials(list);
    return { list, added: data?.length || 0 };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);

    const { list: matList, added } = await saveNewMaterials();

    const items = filledLines.map((l) => {
      const name = l.name.trim();
      const matchMat = matList.find((m) => sameName(m.name, name));
      return {
        name,
        material_id: l.material_id || matchMat?.id || null,
        quantity: parseQty(l.quantity),
        unit: l.unit,
        unit_price: toNumber(l.unit_price),
      };
    });

    const payload = {
      import_date: importDate,
      supplier: supplier.trim() || null,
      note: note.trim() || null,
      items,
      total_cost: total,
    };

    const query = editing
      ? supabase.from('stock_imports').update(payload).eq('id', editing.id)
      : supabase.from('stock_imports').insert([payload]);
    const { data, error } = await query.select().single();
    setSaving(false);

    if (error) {
      if (isMissingTable(error)) setMissingTable(true);
      showToast('error', 'Không lưu được: ' + error.message);
      return;
    }

    setImports((list) => sortImports(editing ? list.map((r) => (r.id === data.id ? data : r)) : [data, ...list]));
    const extra = added > 0 ? ` · thêm ${added} nguyên liệu mới vào danh mục` : '';
    showToast('success', `${editing ? 'Đã cập nhật' : 'Đã lưu'} phiếu nhập ${formatVND(total)}${extra}`);
    resetForm();
  };

  const handleDelete = async (record) => {
    if (
      !confirm(
        `Xóa phiếu nhập ngày ${format(new Date(`${record.import_date}T00:00:00`), 'dd-MM-yyyy')} (${formatVND(
          record.total_cost,
        )})?`,
      )
    )
      return;
    const { error } = await supabase.from('stock_imports').delete().eq('id', record.id);
    if (error) return showToast('error', 'Không xóa được: ' + error.message);
    setImports((list) => list.filter((r) => r.id !== record.id));
    if (editing?.id === record.id) resetForm();
  };

  return (
    <div>
      <PageHeader
        title="Nhập hàng"
        description="Ghi lại hàng hóa, nguyên liệu mua vào. Chọn từ danh mục nguyên liệu để tự động điền đơn vị và đơn giá."
        actions={
          <Link to="/admin/materials" className="btn btn-ghost btn-sm text-brick">
            <Shapes size={16} /> Quản lý danh mục nguyên liệu <ArrowSquareOut size={14} />
          </Link>
        }
      />

      {missingTable && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-sunflower/50 bg-sunflower/10 p-4 text-sm">
          <Database size={22} weight="duotone" className="shrink-0 text-[#9a6b00]" />
          <div>
            <p className="font-semibold">Chưa có bảng lưu phiếu nhập trong Supabase</p>
            <p className="mt-1 text-muted">
              Mở Supabase → <strong>SQL Editor</strong>, dán nội dung file{' '}
              <code className="rounded bg-paper-dim px-1">supabase/stock_imports.sql</code> và bấm <strong>Run</strong>, sau đó tải lại trang này.
            </p>
          </div>
        </div>
      )}

      {/* Phiếu nhập */}
      <form
        ref={formRef}
        onSubmit={handleSave}
        className={`card mb-10 scroll-mt-6 ${editing ? 'ring-2 ring-brick/60' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line px-5 py-4 gap-2">
          {editing ? (
            <h2 className="flex items-center gap-2 font-semibold text-lg">
              <PencilSimple size={20} className="text-brick" /> Sửa phiếu nhập #{shortId(editing.id)}
            </h2>
          ) : (
            <h2 className="font-semibold text-lg">Phiếu nhập mới</h2>
          )}
          {editing ? (
            <button type="button" onClick={resetForm} className="btn btn-ghost btn-sm text-muted">
              <X size={14} weight="bold" /> Hủy sửa
            </button>
          ) : (
            <span className="text-xs text-muted">
              {materials.length > 0
                ? `Đã có ${materials.length} nguyên liệu để chọn nhanh. Tên mới tự nhập sẽ được lưu vào danh mục.`
                : 'Tên nguyên liệu tự nhập sẽ được lưu vào danh mục khi lưu phiếu.'}
            </span>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="import-date" className="label">
                Ngày nhập
              </label>
              <DateField
                id="import-date"
                required
                value={importDate}
                max={today()}
                onChange={(v) => v && setImportDate(v)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="supplier" className="label">
                Nơi mua / nhà cung cấp <span className="font-normal text-muted">(không bắt buộc)</span>
              </label>
              <input
                id="supplier"
                type="text"
                list="supplier-names"
                autoComplete="off"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder={suppliers.length ? 'Gõ hoặc chọn nơi mua đã lưu...' : 'VD: Tiệm phụ liệu Chợ Lớn'}
                className="input"
              />
              <datalist id="supplier-names">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Dòng hàng */}
          <div>
            <div className="hidden grid-cols-12 gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
              <span className="col-span-4">Nguyên liệu</span>
              <span className="col-span-2">Số lượng</span>
              <span className="col-span-2">Đơn vị</span>
              <span className="col-span-2">Đơn giá nhập</span>
              <span className="col-span-2 text-right">Thành tiền</span>
            </div>

            <datalist id="all-names">
              {materials.map((m) => (
                <option key={`m-${m.id}`} value={m.name} label={`${formatVND(m.default_price)} / ${m.unit}`} />
              ))}
            </datalist>

            <ul className="space-y-3">
              {lines.map((l, idx) => {
                const qty = parseQty(l.quantity);
                const qtyMissing = l.name.trim() && qty <= 0;
                const isNew = l.name.trim() && newMaterialNames.some((n) => sameName(n.name, l.name));
                const unitOptions = UNITS.includes(l.unit) ? UNITS : [l.unit, ...UNITS];

                return (
                  <li
                    key={l.key}
                    className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-paper/50 p-3 md:grid-cols-12 md:items-start md:border-0 md:bg-transparent md:p-0"
                  >
                    {/* Cột 1: Một ô duy nhất — gõ tên mới hoặc chọn từ gợi ý nguyên liệu có sẵn */}
                    <div className="relative col-span-2 md:col-span-4">
                      <input
                        ref={idx === 0 ? firstInput : undefined}
                        type="text"
                        list="all-names"
                        value={l.name}
                        onChange={(e) => handleNameChange(l, e.target.value)}
                        placeholder="Gõ hoặc chọn nguyên liệu..."
                        aria-label={`Tên hàng dòng ${idx + 1}`}
                        className={`input font-medium ${isNew ? 'pr-16' : ''}`}
                      />
                      {isNew && (
                        <span
                          className="badge pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 bg-sage-soft text-xs text-sage"
                          title="Nguyên liệu mới — sẽ được lưu vào danh mục khi lưu phiếu"
                        >
                          Mới
                        </span>
                      )}
                    </div>

                    {/* Cột 2: Số lượng — nhận số thập phân và phép tính */}
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                        onBlur={() => {
                          if (isQtyExpression(l.quantity) && qty > 0) updateLine(l.key, { quantity: formatQty(qty) });
                        }}
                        placeholder="VD: 1,5 hoặc 2*3"
                        aria-label={`Số lượng dòng ${idx + 1}`}
                        aria-invalid={qtyMissing || undefined}
                        className={`input w-full ${qtyMissing ? 'border-brick' : ''}`}
                      />
                      {isQtyExpression(l.quantity) && (
                        <p className="mt-1 px-1 text-xs text-muted">= {qty > 0 ? formatQty(qty) : '?'}</p>
                      )}
                    </div>

                    {/* Cột 3: Đơn vị */}
                    <select
                      value={l.unit}
                      onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                      aria-label={`Đơn vị dòng ${idx + 1}`}
                      className="input md:col-span-2"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>

                    {/* Cột 4: Đơn giá nhập */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={l.unit_price ? toNumber(l.unit_price).toLocaleString('vi-VN') : ''}
                      onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                      placeholder="Đơn giá (đ)"
                      aria-label={`Đơn giá dòng ${idx + 1}`}
                      className="input md:col-span-2"
                    />

                    {/* Cột 5: Thành tiền & Nút xóa dòng */}
                    <div className="flex h-11 items-center justify-between gap-2 md:col-span-2 md:justify-end">
                      <span className="text-sm font-semibold">{formatVND(lineTotal(l))}</span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length === 1}
                        className="icon-btn size-9 shrink-0 hover:text-brick disabled:invisible"
                        aria-label={`Xóa dòng ${idx + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button type="button" onClick={addLine} className="btn btn-ghost btn-sm -ml-2 mt-3 text-brick">
              <Plus size={14} weight="bold" /> Thêm dòng
            </button>
            {invalid && (
              <p className="mt-2 text-sm text-brick">
                Vui lòng nhập số lượng lớn hơn 0 cho các dòng đã có tên hàng.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="note" className="label">
              Ghi chú <span className="font-normal text-muted">(không bắt buộc)</span>
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Mua thêm cho đơn đặt 20/10"
              className="input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-b-2xl border-t border-line bg-paper-dim/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">{filledLines.length} mặt hàng · Tổng tiền nhập</p>
            <p className="text-2xl font-semibold tracking-tight text-brick">{formatVND(total)}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {editing && (
              <button type="button" onClick={resetForm} className="btn btn-outline btn-lg rounded-xl">
                Hủy
              </button>
            )}
            <button type="submit" disabled={!canSave} className="btn btn-accent btn-lg rounded-xl">
              {saving ? <CircleNotch size={20} className="animate-spin" /> : <CheckCircle size={20} weight="fill" />}
              {editing ? 'Cập nhật phiếu nhập' : 'Lưu phiếu nhập'}
            </button>
          </div>
        </div>
      </form>

      <ImportHistory
        imports={imports}
        loading={loadingHistory}
        onDelete={handleDelete}
        onEdit={startEdit}
        editingId={editing?.id}
      />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-ink text-paper' : 'bg-brick text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} weight="fill" className="text-[#9fd08a]" />
          ) : (
            <WarningCircle size={20} weight="fill" />
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}
