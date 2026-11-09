import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  Shapes,
  CurrencyCircleDollar,
  Stack,
  ClockCounterClockwise,
  Database,
  MagnifyingGlass,
  CaretDown,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { formatVND, formatQty, normalizeText } from '../../lib/format';
import Pagination from '../../components/Pagination';

const PER_PAGE = 10;
import { UNITS, migrateOldUnits } from '../../lib/units';
import { PageHeader, StatCard, Spinner, EmptyState } from '../../components/admin/ui';

const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;

const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /materials/.test(error.message || ''));

export default function MaterialManager() {
  const [materials, setMaterials] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);
  const setSearch = (v) => { setSearchRaw(v); setPage(1); };
  const [openStats, setOpenStats] = useState(() => new Set()); // nguyên liệu đang mở thống kê
  const toggleStats = (id) =>
    setOpenStats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Form thêm mới
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('cái');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  // Trạng thái sửa
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit: 'cái', default_price: '', note: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      await migrateOldUnits(); // đổi đơn vị "bịch" cũ thành "xấp"
      const [matRes, impRes] = await Promise.all([
        supabase.from('materials').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_imports').select('id, import_date, items'),
      ]);

      if (isMissingTable(matRes.error)) {
        setMissingTable(true);
      } else if (matRes.data) {
        setMaterials(matRes.data);
      }

      if (impRes.data) {
        setImports(impRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Tính toán số liệu cộng dồn từ trước tới nay cho từng nguyên liệu
  const materialStats = useMemo(() => {
    const stats = {};
    imports.forEach((imp) => {
      (imp.items || []).forEach((it) => {
        const key = (it.name || '').trim().toLowerCase();
        if (!key) return;
        if (!stats[key]) {
          stats[key] = { totalQty: 0, totalCost: 0, importCount: 0, lastDate: imp.import_date };
        }
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        stats[key].totalQty += qty;
        stats[key].totalCost += Math.round(qty * price);
        stats[key].importCount += 1;
        if (!stats[key].lastDate || imp.import_date > stats[key].lastDate) {
          stats[key].lastDate = imp.import_date;
        }
      });
    });
    return stats;
  }, [imports]);

  // Tổng toàn bộ tiền nguyên liệu & số lượng đã nhập trong hệ thống
  const overallStats = useMemo(() => {
    let grandCost = 0;
    let grandQty = 0;
    Object.values(materialStats).forEach((s) => {
      grandCost += s.totalCost;
      grandQty += s.totalQty;
    });
    return { grandCost, grandQty };
  }, [materialStats]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setAdding(true);
    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
          name: trimmedName,
          unit,
          default_price: toNumber(defaultPrice),
          note: note.trim() || null,
        },
      ])
      .select()
      .single();

    setAdding(false);
    if (error) {
      if (isMissingTable(error)) setMissingTable(true);
      return alert('Không thêm được nguyên liệu: ' + error.message);
    }

    if (data) {
      setMaterials((list) => [data, ...list]);
      setName('');
      setDefaultPrice('');
      setNote('');
      setUnit('cái');
    }
  };

  const startEdit = (mat) => {
    setEditingId(mat.id);
    setEditForm({
      name: mat.name,
      unit: mat.unit || 'cái',
      default_price: mat.default_price ? String(mat.default_price) : '',
      note: mat.note || '',
    });
  };

  const saveEdit = async (id) => {
    const trimmedName = editForm.name.trim();
    if (!trimmedName) return;

    setSavingEdit(true);
    const { error } = await supabase
      .from('materials')
      .update({
        name: trimmedName,
        unit: editForm.unit,
        default_price: toNumber(editForm.default_price),
        note: editForm.note.trim() || null,
      })
      .eq('id', id);

    setSavingEdit(false);
    if (error) return alert('Không lưu được: ' + error.message);

    setMaterials((list) =>
      list.map((m) =>
        m.id === id
          ? {
              ...m,
              name: trimmedName,
              unit: editForm.unit,
              default_price: toNumber(editForm.default_price),
              note: editForm.note.trim() || null,
            }
          : m,
      ),
    );
    setEditingId(null);
  };

  const handleDelete = async (mat) => {
    const stats = materialStats[mat.name.trim().toLowerCase()];
    const extraWarn =
      stats && stats.importCount > 0
        ? `\nChú ý: Nguyên liệu này đã có ${stats.importCount} lần nhập hàng trong lịch sử (tổng ${formatQty(stats.totalQty)} ${mat.unit}).`
        : '';

    if (!confirm(`Xóa nguyên liệu "${mat.name}"?${extraWarn}`)) return;

    const { error } = await supabase.from('materials').delete().eq('id', mat.id);
    if (error) return alert('Không xóa được: ' + error.message);
    setMaterials((list) => list.filter((m) => m.id !== mat.id));
  };

  const filteredMaterials = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return materials;
    return materials.filter((m) => normalizeText(`${m.name} ${m.note || ''}`).includes(q));
  }, [materials, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const pageMaterials = filteredMaterials.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Danh mục nguyên liệu"
        description="Quản lý danh sách nguyên liệu, cố định đơn giá nhập mặc định và theo dõi số lượng cộng dồn từ trước đến nay."
        actions={
          <Link to="/admin/imports" className="btn btn-ghost btn-sm text-brick">
            Vào trang Nhập hàng <ArrowSquareOut size={16} />
          </Link>
        }
      />

      {missingTable && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-sunflower/50 bg-sunflower/10 p-4 text-sm">
          <Database size={22} weight="duotone" className="shrink-0 text-[#9a6b00]" />
          <div>
            <p className="font-semibold">Chưa có bảng lưu nguyên liệu trong Supabase</p>
            <p className="mt-1 text-muted">
              Mở Supabase → <strong>SQL Editor</strong>, dán nội dung file <code className="rounded bg-paper-dim px-1">supabase/materials.sql</code> và bấm <strong>Run</strong>, sau đó tải lại trang này.
            </p>
          </div>
        </div>
      )}

      {/* Thống kê nhanh toàn bộ nguyên liệu */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Shapes} label="Số loại nguyên liệu" value={materials.length} tone="brick" />
        <StatCard icon={CurrencyCircleDollar} label="Tổng tiền đã chi mua" value={formatVND(overallStats.grandCost)} tone="sage" hint="Tính từ tất cả phiếu nhập" />
        <StatCard icon={Stack} label="Tổng số lượng đã nhập" value={formatQty(overallStats.grandQty)} tone="sun" hint="Tổng các món đã nhập về" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Form thêm mới nguyên liệu */}
        <form onSubmit={handleAdd} className="card p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="font-semibold text-lg">Thêm nguyên liệu mới</h2>
          <p className="mt-1 text-xs text-muted">Cố định đơn vị và giá nhập để khi tạo phiếu nhập chỉ cần nhập số lượng.</p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="mat-name" className="label">
                Tên nguyên liệu <span className="text-brick">*</span>
              </label>
              <input
                id="mat-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cúp, Kẽm nhung, Ruy băng..."
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mat-unit" className="label">Đơn vị tính</label>
                <select id="mat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mat-price" className="label">Đơn giá nhập cố định</label>
                <input
                  id="mat-price"
                  type="text"
                  inputMode="numeric"
                  value={defaultPrice ? toNumber(defaultPrice).toLocaleString('vi-VN') : ''}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="VD: 25.000"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mat-note" className="label">
                Ghi chú / Quy cách <span className="font-normal text-muted">(không bắt buộc)</span>
              </label>
              <input
                id="mat-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Size 10cm, gói 50 cái..."
                className="input"
              />
            </div>

            <button type="submit" disabled={adding || !name.trim()} className="btn btn-primary mt-2 w-full rounded-xl">
              <Plus weight="bold" /> Thêm nguyên liệu
            </button>
          </div>
        </form>

        {/* Danh sách nguyên liệu & Thống kê cộng dồn */}
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Danh sách nguyên liệu</h2>
              <span className="badge bg-paper-dim text-muted">{filteredMaterials.length}</span>
            </div>

            <div className="relative w-full sm:w-64">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                className="input h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : filteredMaterials.length === 0 ? (
            <EmptyState
              icon={Shapes}
              title={search ? 'Không tìm thấy nguyên liệu' : 'Chưa có nguyên liệu nào'}
              text={search ? 'Thử tìm với từ khóa khác.' : 'Điền form bên cạnh để thêm nguyên liệu đầu tiên.'}
            />
          ) : (
            <ul className="divide-y divide-line">
              {pageMaterials.map((mat) => {
                const isEditing = editingId === mat.id;
                const stats = materialStats[mat.name.trim().toLowerCase()] || {
                  totalQty: 0,
                  totalCost: 0,
                  importCount: 0,
                  lastDate: null,
                };

                return (
                  <li key={mat.id} className="p-4 transition-colors hover:bg-paper-dim/40 sm:p-5">
                    {isEditing ? (
                      /* Chế độ chỉnh sửa */
                      <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-1">
                            <label className="label text-xs">Tên nguyên liệu</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="input h-10"
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Đơn vị</label>
                            <select
                              value={editForm.unit}
                              onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                              className="input h-10"
                            >
                              {UNITS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label text-xs">Đơn giá nhập cố định</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editForm.default_price ? toNumber(editForm.default_price).toLocaleString('vi-VN') : ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, default_price: e.target.value }))}
                              className="input h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label text-xs">Ghi chú</label>
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                            placeholder="Ghi chú/quy cách"
                            className="input h-10"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn btn-ghost btn-sm"
                            disabled={savingEdit}
                          >
                            <X size={16} /> Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(mat.id)}
                            className="btn btn-primary btn-sm rounded-lg"
                            disabled={savingEdit || !editForm.name.trim()}
                          >
                            <Check size={16} weight="bold" /> Lưu thay đổi
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Chế độ hiển thị bình thường */
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blush text-brick">
                              <Shapes size={20} weight="duotone" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-ink text-base">{mat.name}</h3>
                                <span className="badge bg-paper-dim text-xs font-medium text-muted">
                                  {mat.unit}
                                </span>
                              </div>
                              {mat.note && <p className="text-xs text-muted">{mat.note}</p>}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted">
                              Đơn giá cố định:{' '}
                              <strong className="text-ink font-semibold">
                                {mat.default_price > 0 ? `${formatVND(mat.default_price)} / ${mat.unit}` : 'Chưa đặt'}
                              </strong>
                            </span>
                          </div>

                          {/* KHỐI THỐNG KÊ CỘNG DỒN — bấm để ẩn/hiện */}
                          <button
                            type="button"
                            onClick={() => toggleStats(mat.id)}
                            aria-expanded={openStats.has(mat.id)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink sm:text-sm"
                          >
                            <ClockCounterClockwise size={16} />
                            {openStats.has(mat.id) ? 'Ẩn thống kê cộng dồn' : 'Xem thống kê cộng dồn'}
                            {stats.importCount > 0 && !openStats.has(mat.id) && (
                              <span className="font-normal">· {stats.importCount} lần nhập</span>
                            )}
                            <CaretDown size={14} className={`transition-transform ${openStats.has(mat.id) ? 'rotate-180' : ''}`} />
                          </button>
                          {openStats.has(mat.id) && (
                          <div className="mt-2 rounded-xl border border-line bg-paper-dim/60 p-3 text-xs sm:text-sm">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                              <div>
                                <span className="text-muted block text-xs">Tổng đã nhập:</span>
                                <span className="text-base font-bold text-ink">
                                  {formatQty(stats.totalQty)} {mat.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted block text-xs">Tổng tiền đã chi:</span>
                                <span className="text-base font-bold text-brick">
                                  {formatVND(stats.totalCost)}
                                </span>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <span className="text-muted block text-xs">Số lần nhập hàng:</span>
                                <span className="text-sm font-semibold text-ink">
                                  {stats.importCount} lần
                                  {stats.lastDate && (
                                    <span className="text-xs text-muted font-normal">
                                      {' '}(gần nhất: {format(parseISO(stats.lastDate), 'dd-MM-yyyy')})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>

                        {/* Các nút thao tác */}
                        <div className="flex items-center justify-end gap-1 sm:self-start">
                          <button
                            type="button"
                            onClick={() => startEdit(mat)}
                            className="icon-btn"
                            title={`Sửa nguyên liệu ${mat.name}`}
                          >
                            <PencilSimple size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(mat)}
                            className="icon-btn hover:bg-brick/10 hover:text-brick"
                            title={`Xóa nguyên liệu ${mat.name}`}
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && totalPages > 1 && (
            <div className="border-t border-line px-4 py-4">
              <Pagination page={curPage} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

