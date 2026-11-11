import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UploadSimple,
  X,
  CircleNotch,
  Plus,
  VideoCamera,
  Star,
  Tag,
  ImageSquare,
  Calculator,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, parsePrice } from '../../lib/format';
import { Spinner } from '../../components/admin/ui';

const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;

let costSeq = 0;
const newCostLine = () => ({ key: ++costSeq, name: '', cost: '' });

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category_id: '',
    description: '',
    features: [''],
    media: [], // [{ type: 'image' | 'video', src }]
    variants: [], // [{ name, price, image }] — phân loại, mỗi loại một giá
  });
  const [hadVariants, setHadVariants] = useState(false);

  // Chi phí sản phẩm (tên + giá, nhập tay)
  const [costItems, setCostItems] = useState([]);
  const [costNames, setCostNames] = useState([]); // tên chi phí đã từng nhập → gợi ý [{ name, cost, count }]

  const set = (patch) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    async function init() {
      const { data: cats } = await supabase.from('categories').select('*').order('created_at');
      if (cats) setCategories(cats);

      // Gợi ý tên chi phí: lấy từ chi phí đã nhập ở các sản phẩm + danh mục nguyên liệu
      const [costRes, matRes] = await Promise.all([
        supabase.from('products').select('materials_cost, created_at').order('created_at', { ascending: false }),
        supabase.from('materials').select('name, default_price'),
      ]);
      const map = new Map();
      (costRes.data || []).forEach((p) =>
        (Array.isArray(p.materials_cost) ? p.materials_cost : []).forEach((m) => {
          const name = String(m?.name || '').trim();
          if (!name || name === '(Không tên)') return;
          const key = name.toLowerCase();
          if (!map.has(key)) map.set(key, { name, cost: Number(m.cost) || 0, count: 0 }); // sản phẩm mới nhất trước
          map.get(key).count += 1;
        }),
      );
      (matRes.data || []).forEach((m) => {
        const name = String(m.name || '').trim();
        const key = name.toLowerCase();
        if (name && !map.has(key)) map.set(key, { name, cost: Number(m.default_price) || 0, count: 0 });
      });
      setCostNames([...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi')));

      if (isEdit) {
        const { data: prod } = await supabase.from('products').select('*').eq('id', id).single();
        if (prod) {
          setFormData({
            name: prod.name || '',
            price: prod.price || '',
            category_id: prod.category_id || '',
            description: prod.description || '',
            features: prod.features?.length > 0 ? prod.features : [''],
            media: prod.media || [],
            variants: (prod.variants || []).map((v) => ({
              name: v.name || '',
              price: v.price ? String(v.price) : '',
              image: v.image || null,
              cost: v.cost ? String(v.cost) : '',
            })),
          });
          setHadVariants((prod.variants || []).length > 0);

          if (prod.materials_cost && Array.isArray(prod.materials_cost)) {
            setCostItems(
              prod.materials_cost.map((m) => ({
                key: ++costSeq,
                name: m.name || '',
                cost: m.cost ? String(m.cost) : (m.unit_price && m.quantity ? String(toNumber(m.unit_price) * toNumber(m.quantity)) : ''),
              })),
            );
          } else if (prod.cost && Number(prod.cost) > 0) {
            setCostItems([{ key: ++costSeq, name: 'Chi phí', cost: String(prod.cost) }]);
          }
        }
      }
      setInitialLoading(false);
    }
    init();
  }, [id, isEdit]);

  const handleFeatureChange = (index, value) =>
    set({ features: formData.features.map((f, i) => (i === index ? value : f)) });
  const addFeature = () => set({ features: [...formData.features, ''] });
  const removeFeature = (index) => set({ features: formData.features.filter((_, i) => i !== index) });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Math.random()}.${fileExt}`;
        const isVideo = file.type.startsWith('video/');

        const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('product-images').getPublicUrl(filePath);
        uploaded.push({ type: isVideo ? 'video' : 'image', src: publicUrl });
      }
      setFormData((f) => ({ ...f, media: [...f.media, ...uploaded] }));
    } catch (error) {
      alert('Lỗi upload ảnh: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index) => {
    const removed = formData.media[index];
    set({
      media: formData.media.filter((_, i) => i !== index),
      variants: formData.variants.map((v) => (v.image === removed?.src ? { ...v, image: null } : v)),
    });
  };

  // Quản lý phân loại
  const updateVariant = (index, patch) =>
    set({ variants: formData.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const addVariant = () => set({ variants: [...formData.variants, { name: '', price: '', image: null, cost: '' }] });
  const removeVariant = (index) => set({ variants: formData.variants.filter((_, i) => i !== index) });
  const makeCover = (index) => {
    const media = [...formData.media];
    const [item] = media.splice(index, 1);
    set({ media: [item, ...media] });
  };

  // Quản lý dòng chi phí
  const addCostItem = () => setCostItems((list) => [...list, newCostLine()]);
  const removeCostItem = (key) => setCostItems((list) => list.filter((c) => c.key !== key));
  const updateCostItem = (key, patch) =>
    setCostItems((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  // Tổng chi phí
  const totalCost = useMemo(() => {
    return costItems.reduce((sum, c) => sum + toNumber(c.cost), 0);
  }, [costItems]);

  const pricePreview = parsePrice(formData.price);
  const firstImageIdx = formData.media.findIndex((m) => m.type !== 'video');
  const imageList = formData.media.filter((m) => m.type !== 'video');
  const namedVariants = formData.variants.filter((v) => v.name.trim());
  const hasVariants = namedVariants.length > 0;
  const variantPrices = namedVariants.map((v) => toNumber(v.price));
  const minVariant = hasVariants ? Math.min(...variantPrices) : 0;
  const maxVariant = hasVariants ? Math.max(...variantPrices) : 0;

  // Lợi nhuận ước tính mỗi món
  const basePrice = hasVariants ? minVariant : pricePreview;
  const estimatedProfit = basePrice - totalCost;
  const profitPercent = basePrice > 0 ? Math.round((estimatedProfit / basePrice) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missingPrice = formData.variants.find((v) => v.name.trim() && !toNumber(v.price));
    if (missingPrice) {
      alert(`Phân loại “${missingPrice.name.trim()}” chưa có giá.`);
      return;
    }
    setLoading(true);

    const variants = formData.variants
      .filter((v) => v.name.trim())
      .map((v) => ({ name: v.name.trim(), price: toNumber(v.price), image: v.image || null, cost: toNumber(v.cost) }));

    const cleanMaterialsCost = costItems
      .filter((c) => c.name.trim() || toNumber(c.cost) > 0)
      .map((c) => ({
        name: c.name.trim() || '(Không tên)',
        cost: toNumber(c.cost),
      }));

    const productData = {
      name: formData.name,
      price: variants.length ? String(Math.min(...variants.map((v) => v.price))) : formData.price,
      category_id: formData.category_id || null,
      description: formData.description,
      features: formData.features.filter((f) => f.trim() !== ''),
      media: formData.media,
      cost: totalCost,
      materials_cost: cleanMaterialsCost,
    };

    if (variants.length || hadVariants) productData.variants = variants;

    const { error } = isEdit
      ? await supabase.from('products').update(productData).eq('id', id)
      : await supabase.from('products').insert([productData]);

    setLoading(false);
    if (error) {
      if (/materials_cost|cost/.test(error.message || '')) {
        alert(
          'Chưa có cột chi phí nguyên liệu trong Supabase. Mở SQL Editor, chạy file supabase/products_cost.sql rồi thử lại.',
        );
      } else if (/variants/.test(error.message || '')) {
        alert('Chưa có cột phân loại. Mở Supabase → SQL Editor, chạy file supabase/products_variants.sql rồi lưu lại.');
      } else {
        alert('Có lỗi xảy ra: ' + error.message);
      }
    } else {
      navigate('/admin/products');
    }
  };

  if (initialLoading) return <Spinner />;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="icon-btn border border-line bg-surface text-ink"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h1>
            <p className="text-sm text-muted">
              {isEdit ? formData.name : 'Điền thông tin, nguyên liệu cấu thành và giá bán cho sản phẩm.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/products" className="btn btn-outline">
            Hủy
          </Link>
          <button type="submit" disabled={loading || uploading} className="btn btn-primary min-w-32">
            {loading ? <CircleNotch size={18} className="animate-spin" /> : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Thông tin chung */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Thông tin chung</h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="name" className="label">
                  Tên sản phẩm
                </label>
                <input
                  id="name"
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="VD: Bó cẩm tú cầu xanh 7 bông"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="description" className="label">
                  Mô tả
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Kể ngắn gọn về sản phẩm, kích thước, ý nghĩa…"
                  className="input resize-y"
                />
              </div>
            </div>
          </section>

          {/* Hình ảnh & Video */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Hình ảnh & video</h2>
              <p className="text-xs text-muted">Ảnh đầu tiên là ảnh bìa</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {formData.media.map((m, idx) => (
                <div
                  key={m.src + idx}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-paper-dim ring-1 ring-line"
                >
                  {m.type === 'video' ? (
                    <>
                      <video src={m.src} className="size-full object-cover" muted />
                      <span className="absolute bottom-2 left-2 badge bg-ink/70 text-white">
                        <VideoCamera size={12} weight="fill" /> Video
                      </span>
                    </>
                  ) : (
                    <img src={m.src} alt="" className="size-full object-cover" />
                  )}
                  {idx === firstImageIdx && (
                    <span className="absolute left-2 top-2 badge bg-surface text-ink">
                      <Star size={12} weight="fill" className="text-sunflower" /> Bìa
                    </span>
                  )}
                  <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {m.type !== 'video' && idx !== firstImageIdx && (
                      <button
                        type="button"
                        onClick={() => makeCover(idx)}
                        className="badge bg-surface text-ink hover:bg-paper-dim"
                      >
                        Đặt bìa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      aria-label="Xóa tệp"
                      className="flex size-7 items-center justify-center rounded-full bg-brick text-white hover:bg-brick-dark"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}

              <label
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-muted transition-colors hover:border-brick hover:bg-blush/30 hover:text-brick ${
                  uploading ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {uploading ? <CircleNotch size={24} className="animate-spin" /> : <UploadSimple size={24} />}
                <span className="text-xs font-medium">{uploading ? 'Đang tải…' : 'Tải lên'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={uploading}
                />
              </label>
            </div>
          </section>

          {/* Phân loại & giá bán */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Tag size={18} className="text-brick" /> Phân loại & giá bán
              </h2>
              <p className="text-xs text-muted">VD: 50 bông · 75 bông · 100 bông</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              Mỗi phân loại một giá riêng. Gắn ảnh để khi khách chọn phân loại, ảnh sẽ tự chuyển tới đúng mẫu.
            </p>

            {formData.variants.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
                  <span className="col-span-3">Tên phân loại</span>
                  <span className="col-span-2">Giá bán</span>
                  <span className="col-span-2">Giá vốn</span>
                  <span className="col-span-4">Ảnh gắn kèm</span>
                </div>
                {formData.variants.map((v, idx) => {
                  const imgIdx = imageList.findIndex((m) => m.src === v.image);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 rounded-xl border border-line p-2 sm:border-0 sm:p-0"
                    >
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariant(idx, { name: e.target.value })}
                        placeholder="VD: 50 bông"
                        aria-label={`Tên phân loại ${idx + 1}`}
                        className="input col-span-12 sm:col-span-3"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toNumber(v.price) ? toNumber(v.price).toLocaleString('vi-VN') : ''}
                        onChange={(e) => updateVariant(idx, { price: e.target.value })}
                        placeholder="Giá bán"
                        aria-label={`Giá bán phân loại ${idx + 1}`}
                        className={`input col-span-6 sm:col-span-2 ${
                          v.name.trim() && !toNumber(v.price) ? 'border-brick' : ''
                        }`}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toNumber(v.cost) ? toNumber(v.cost).toLocaleString('vi-VN') : ''}
                        onChange={(e) => updateVariant(idx, { cost: e.target.value })}
                        placeholder="Giá vốn"
                        aria-label={`Giá vốn phân loại ${idx + 1}`}
                        className="input col-span-6 sm:col-span-2"
                      />
                      <div className="col-span-11 flex items-center gap-2 sm:col-span-4">
                        <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-paper-dim ring-1 ring-line">
                          {v.image ? (
                            <img src={v.image} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-muted/60">
                              <ImageSquare size={18} />
                            </span>
                          )}
                        </span>
                        <select
                          value={imgIdx >= 0 ? String(imgIdx) : ''}
                          onChange={(e) =>
                            updateVariant(idx, {
                              image: e.target.value === '' ? null : imageList[Number(e.target.value)]?.src || null,
                            })
                          }
                          aria-label={`Ảnh gắn với phân loại ${idx + 1}`}
                          className="input min-w-0 text-sm"
                          disabled={!imageList.length}
                        >
                          <option value="">{imageList.length ? 'Không gắn ảnh' : 'Chưa có ảnh'}</option>
                          {imageList.map((m, i) => (
                            <option key={m.src} value={String(i)}>
                              Ảnh {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="icon-btn col-span-1 size-10 justify-self-end hover:text-brick"
                        aria-label={`Xóa phân loại ${idx + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
                <p className="px-1 text-xs text-muted">
                  Để trống <strong>Giá vốn</strong> của phân loại thì sẽ dùng giá vốn chung ở mục “Chi phí (Giá vốn)” bên dưới.
                </p>
              </div>
            )}

            <button type="button" onClick={addVariant} className="btn btn-ghost btn-sm -ml-2 mt-3 text-brick">
              <Plus size={14} weight="bold" />{' '}
              {formData.variants.length ? 'Thêm phân loại' : 'Thêm phân loại (nhiều mức giá)'}
            </button>
          </section>

          {/* MỤC CHI PHÍ (GIÁ VỐN) & TÍNH LỢI NHUẬN */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blush text-brick">
                <Calculator size={18} weight="duotone" />
              </span>
              <h2 className="font-semibold text-lg">Chi phí (Giá vốn)</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Nhập các khoản chi phí để làm ra sản phẩm này. Hệ thống sẽ tự tính tiền lời.
            </p>

            {/* Header cột */}
            {costItems.length > 0 && (
              <div className="mt-5 hidden grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
                <span className="col-span-7">Tên chi phí</span>
                <span className="col-span-4">Số tiền</span>
              </div>
            )}

            {/* Danh sách dòng chi phí */}
            <div className="mt-3 space-y-2">
              {costItems.map((c) => (
                <div key={c.key} className="grid grid-cols-12 items-center gap-2">
                  <input
                    type="text"
                    list="cost-names"
                    autoComplete="off"
                    value={c.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      // Chọn lại tên đã dùng → tự điền số tiền lần trước (nếu ô tiền đang trống)
                      const hit = costNames.find((n) => n.name.toLowerCase() === v.trim().toLowerCase());
                      updateCostItem(c.key, hit && hit.cost && !toNumber(c.cost) ? { name: v, cost: String(hit.cost) } : { name: v });
                    }}
                    placeholder="VD: Kẽm nhung, Cúp, Băng keo…"
                    aria-label="Tên chi phí"
                    className="input col-span-7 text-sm"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={toNumber(c.cost) ? toNumber(c.cost).toLocaleString('vi-VN') : ''}
                    onChange={(e) => updateCostItem(c.key, { cost: e.target.value })}
                    placeholder="0"
                    className="input col-span-4 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeCostItem(c.key)}
                    className="icon-btn col-span-1 size-9 justify-self-end hover:text-brick"
                    title="Xóa dòng"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addCostItem} className="btn btn-ghost btn-sm -ml-2 mt-3 text-brick">
              <Plus size={14} weight="bold" /> Thêm dòng chi phí
            </button>

            <datalist id="cost-names">
              {costNames.map((n) => (
                <option key={n.name} value={n.name} label={n.cost ? formatVND(n.cost) : undefined} />
              ))}
            </datalist>

            {/* Dòng tổng */}
            <div className="mt-4 rounded-xl border border-line bg-paper-dim/60 p-4">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Giá bán {hasVariants ? '(phân loại thấp nhất)' : ''}:</span>
                <span className="font-semibold text-ink">{formatVND(basePrice)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted">
                <span>Tổng chi phí:</span>
                <span className="font-semibold text-brick">
                  {totalCost > 0 ? `- ${formatVND(totalCost)}` : '0 đ'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="font-bold text-ink">Tiền lời:</span>
                <span className={`text-xl font-extrabold ${estimatedProfit >= 0 ? 'text-emerald-600' : 'text-brick'}`}>
                  {estimatedProfit >= 0 ? `+${formatVND(estimatedProfit)}` : formatVND(estimatedProfit)}
                  {basePrice > 0 && totalCost > 0 && (
                    <span className="ml-2 text-xs font-semibold text-muted">({profitPercent}%)</span>
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Chi tiết cấu tạo */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Chi tiết cấu tạo</h2>
            <p className="mt-1 text-sm text-muted">Hiển thị dạng danh sách gạch đầu dòng trên trang sản phẩm.</p>
            <div className="mt-5 space-y-2.5">
              {formData.features.map((feat, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                    placeholder={`VD: Chất liệu kẽm nhung cao cấp`}
                    aria-label={`Đặc điểm ${idx + 1}`}
                    className="input"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="icon-btn size-11 shrink-0 hover:text-brick"
                      aria-label={`Xóa đặc điểm ${idx + 1}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addFeature} className="btn btn-ghost btn-sm -ml-2 text-brick">
                <Plus size={14} weight="bold" /> Thêm đặc điểm
              </button>
            </div>
          </section>
        </div>

        {/* Cột phải */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Giá & phân loại</h2>
            <div className="mt-5 space-y-5">
              {hasVariants ? (
                <div>
                  <p className="label">Giá bán</p>
                  <p className="rounded-xl bg-blush px-4 py-3 text-sm">
                    Theo phân loại:{' '}
                    <strong className="text-brick">
                      {minVariant === maxVariant
                        ? formatVND(minVariant)
                        : `${formatVND(minVariant)} – ${formatVND(maxVariant)}`}
                    </strong>
                  </p>
                  <p className="mt-1.5 text-xs text-muted">
                    {namedVariants.length} phân loại. Trang chủ hiển thị{' '}
                    {minVariant === maxVariant ? 'giá này' : `“Từ ${formatVND(minVariant)}”`}.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="price" className="label">
                    Giá bán
                  </label>
                  <input
                    id="price"
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="VD: 150000"
                    value={formData.price}
                    onChange={(e) => set({ price: e.target.value })}
                    className="input"
                  />
                  {pricePreview > 0 && (
                    <p className="mt-1.5 text-xs text-muted">
                      Hiển thị: <strong className="text-ink">{formatVND(pricePreview)}</strong>
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted">Có nhiều mức giá? Thêm ở mục “Phân loại & giá bán”.</p>
                </div>
              )}
              <div>
                <label htmlFor="category" className="label">
                  Danh mục
                </label>
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => set({ category_id: e.target.value })}
                  className="input"
                >
                  <option value="">— Chưa phân loại —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Link to="/admin/categories" className="mt-1.5 inline-block text-xs text-muted hover:text-brick">
                  Quản lý danh mục →
                </Link>
              </div>
            </div>
          </section>

          {/* Hộp tóm tắt Lợi nhuận cột phải */}
          <section className="card p-5 bg-paper-dim/50 border border-line">
            <h3 className="font-semibold text-sm flex items-center gap-1.5 text-ink">
              <Calculator size={16} className="text-brick" /> Tóm tắt lợi nhuận
            </h3>
            <div className="mt-3 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Giá vốn:</span>
                <span className="font-semibold text-brick">{formatVND(totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Giá bán:</span>
                <span className="font-semibold text-ink">{formatVND(basePrice)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-line text-sm">
                <span className="font-bold text-ink">Tiền lời:</span>
                <span className={`font-bold ${estimatedProfit >= 0 ? 'text-emerald-600' : 'text-brick'}`}>
                  {estimatedProfit >= 0 ? `+${formatVND(estimatedProfit)}` : formatVND(estimatedProfit)}
                </span>
              </div>
            </div>
          </section>

          <button type="submit" disabled={loading || uploading} className="btn btn-accent btn-lg w-full rounded-xl">
            {loading ? <CircleNotch size={20} className="animate-spin" /> : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </button>
        </div>
      </div>
    </form>
  );
}
