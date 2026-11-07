import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  X,
  CheckCircle,
  CircleNotch,
  WarningCircle,
  Database,
  Shapes,
  PencilSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatVND } from '../../lib/format';
import { PageHeader } from '../../components/admin/ui';
import ImportHistory from '../../components/admin/ImportHistory';

const UNITS = ['cái', 'cuộn', 'bó', 'cây', 'bịch', 'tờ', 'hộp', 'kg', 'mét', 'gói'];
const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;

let lineSeq = 0;
const newLine = () => ({
  key: ++lineSeq,
  name: '',
  quantity: '',
  unit: 'cái',
  unit_price: '',
  material_id: null,
  isCustom: false,
});
const today = () => format(new Date(), 'yyyy-MM-dd');

// Bảng chưa được tạo trong Supabase
const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /stock_imports/.test(error.message || ''));

export default function StockImport() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [imports, setImports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [lines, setLines] = useState(() => [newLine()]);
  const [importDate, setImportDate] = useState(today);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const firstInput = useRef(null);

  useEffect(() => {
    async function fetchData() {
      const [prodRes, matRes, impRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('materials').select('*').order('name'),
        supabase
          .from('stock_imports')
          .select('*')
          .order('import_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
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

  // Xử lý khi chọn một nguyên liệu từ danh mục
  const handleSelectMaterial = (key, materialName) => {
    if (materialName === '__custom__') {
      updateLine(key, { isCustom: true, name: '', material_id: null });
      return;
    }
    const mat = materials.find((m) => m.name === materialName);
    if (mat) {
      updateLine(key, {
        name: mat.name,
        unit: mat.unit || 'cái',
        unit_price: mat.default_price ? String(mat.default_price) : '',
        material_id: mat.id,
        isCustom: false,
      });
    } else {
      updateLine(key, { name: '', material_id: null, isCustom: false });
    }
  };

  const filledLines = lines.filter((l) => l.name.trim());
  const total = filledLines.reduce((s, l) => s + toNumber(l.quantity) * toNumber(l.unit_price), 0);
  const invalid = filledLines.some((l) => toNumber(l.quantity) <= 0);
  const canSave = filledLines.length > 0 && !invalid && !saving && !missingTable;

  const resetForm = () => {
    setLines([newLine()]);
    setSupplier('');
    setNote('');
    setImportDate(today());
    firstInput.current?.focus();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);

    const items = filledLines.map((l) => {
      const name = l.name.trim();
      const matchMat = materials.find((m) => m.name.toLowerCase() === name.toLowerCase());
      const matchProd = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
      return {
        name,
        material_id: l.material_id || matchMat?.id || null,
        product_id: matchProd?.id || null,
        quantity: toNumber(l.quantity),
        unit: l.unit,
        unit_price: toNumber(l.unit_price),
      };
    });

    const { data, error } = await supabase
      .from('stock_imports')
      .insert([
        {
          import_date: importDate,
          supplier: supplier.trim() || null,
          note: note.trim() || null,
          items,
          total_cost: total,
        },
      ])
      .select()
      .single();
    setSaving(false);

    if (error) {
      if (isMissingTable(error)) setMissingTable(true);
      showToast('error', 'Không lưu được: ' + error.message);
      return;
    }
    // Thêm phiếu mới lên đầu lịch sử
    setImports((list) =>
      [data, ...list].sort(
        (a, b) =>
          String(b.import_date).localeCompare(String(a.import_date)) ||
          String(b.created_at).localeCompare(String(a.created_at)),
      ),
    );
    showToast('success', `Đã lưu phiếu nhập ${formatVND(total)}`);
    resetForm();
  };

  const handleDelete = async (record) => {
    if (
      !confirm(
        `Xóa phiếu nhập ngày ${format(new Date(`${record.import_date}T00:00:00`), 'dd/MM/yyyy')} (${formatVND(
          record.total_cost,
        )})?`,
      )
    )
      return;
    const { error } = await supabase.from('stock_imports').delete().eq('id', record.id);
    if (error) return showToast('error', 'Không xóa được: ' + error.message);
    setImports((list) => list.filter((r) => r.id !== record.id));
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
      <form onSubmit={handleSave} className="card mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line px-5 py-4 gap-2">
          <h2 className="font-semibold text-lg">Phiếu nhập mới</h2>
          <span className="text-xs text-muted">
            {materials.length > 0 ? (
              <span>Đã có {materials.length} nguyên liệu sẵn sàng để chọn nhanh.</span>
            ) : (
              <Link to="/admin/materials" className="text-brick hover:underline">
                + Thêm nguyên liệu để chọn nhanh và cố định giá
              </Link>
            )}
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="import-date" className="label">
                Ngày nhập
              </label>
              <input
                id="import-date"
                type="date"
                required
                value={importDate}
                max={today()}
                onChange={(e) => setImportDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="supplier" className="label">
                Nơi mua / nhà cung cấp <span className="font-normal text-muted">(không bắt buộc)</span>
              </label>
              <input
                id="supplier"
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="VD: Tiệm phụ liệu Chợ Lớn"
                className="input"
              />
            </div>
          </div>

          {/* Dòng hàng */}
          <div>
            <div className="hidden grid-cols-12 gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
              <span className="col-span-4">Tên hàng / Nguyên liệu</span>
              <span className="col-span-2">Số lượng</span>
              <span className="col-span-2">Đơn vị</span>
              <span className="col-span-2">Đơn giá nhập</span>
              <span className="col-span-2 text-right">Thành tiền</span>
            </div>

            <datalist id="all-names">
              {materials.map((m) => (
                <option key={`m-${m.id}`} value={m.name} />
              ))}
              {products.map((p) => (
                <option key={`p-${p.id}`} value={p.name} />
              ))}
            </datalist>

            <ul className="space-y-3">
              {lines.map((l, idx) => {
                const qtyMissing = l.name.trim() && toNumber(l.quantity) <= 0;
                const isSavedMaterial = materials.some((m) => m.name === l.name);

                return (
                  <li
                    key={l.key}
                    className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-paper/50 p-3 md:grid-cols-12 md:items-center md:border-0 md:bg-transparent md:p-0"
                  >
                    {/* Cột 1: Tên hàng / Chọn nguyên liệu */}
                    <div className="col-span-2 md:col-span-4 flex items-center gap-1.5">
                      {materials.length > 0 && !l.isCustom ? (
                        <div className="flex-1 flex gap-1">
                          <select
                            ref={idx === 0 ? firstInput : undefined}
                            value={isSavedMaterial ? l.name : l.name ? '__custom__' : ''}
                            onChange={(e) => handleSelectMaterial(l.key, e.target.value)}
                            aria-label={`Chọn nguyên liệu dòng ${idx + 1}`}
                            className="input font-medium"
                          >
                            <option value="">-- Chọn nguyên liệu (Cúp, Kẽm...) --</option>
                            <optgroup label="Danh mục nguyên liệu đã lưu">
                              {materials.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({formatVND(m.default_price)} / {m.unit})
                                </option>
                              ))}
                            </optgroup>
                            <option value="__custom__">✍️ Tự gõ nguyên liệu khác...</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex-1 flex gap-1 items-center">
                          <input
                            ref={idx === 0 ? firstInput : undefined}
                            type="text"
                            list="all-names"
                            value={l.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matchedMat = materials.find(
                                (m) => m.name.toLowerCase() === val.trim().toLowerCase(),
                              );
                              if (matchedMat) {
                                updateLine(l.key, {
                                  name: val,
                                  unit: matchedMat.unit || l.unit,
                                  unit_price: matchedMat.default_price
                                    ? String(matchedMat.default_price)
                                    : l.unit_price,
                                  material_id: matchedMat.id,
                                });
                              } else {
                                updateLine(l.key, { name: val });
                              }
                            }}
                            placeholder="Tên hàng, VD: Kẽm nhung, Cúp..."
                            aria-label={`Tên hàng dòng ${idx + 1}`}
                            className="input"
                          />
                          {materials.length > 0 && (
                            <button
                              type="button"
                              onClick={() => updateLine(l.key, { isCustom: false })}
                              className="btn btn-ghost btn-sm px-2 text-xs text-muted"
                              title="Chọn từ danh sách đã lưu"
                            >
                              <Shapes size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Số lượng (chỉ cần nhập số lượng khi đã chọn nguyên liệu) */}
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                      placeholder="Số lượng"
                      aria-label={`Số lượng dòng ${idx + 1}`}
                      aria-invalid={qtyMissing || undefined}
                      className={`input md:col-span-2 ${qtyMissing ? 'border-brick' : ''}`}
                    />

                    {/* Cột 3: Đơn vị (tự động cố định theo nguyên liệu) */}
                    <select
                      value={l.unit}
                      onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                      aria-label={`Đơn vị dòng ${idx + 1}`}
                      className="input md:col-span-2"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>

                    {/* Cột 4: Đơn giá nhập (tự động điền giá cố định của nguyên liệu) */}
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
                    <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                      <span className="text-sm font-semibold">
                        {formatVND(toNumber(l.quantity) * toNumber(l.unit_price))}
                      </span>
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
          <button type="submit" disabled={!canSave} className="btn btn-accent btn-lg rounded-xl">
            {saving ? <CircleNotch size={20} className="animate-spin" /> : <CheckCircle size={20} weight="fill" />}
            Lưu phiếu nhập
          </button>
        </div>
      </form>

      <ImportHistory imports={imports} loading={loadingHistory} onDelete={handleDelete} />

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
