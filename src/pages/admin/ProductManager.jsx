import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash, PencilSimple, MagnifyingGlass, Package, ArrowSquareOut } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, getCover, parsePrice } from '../../lib/format';
import { PageHeader, Spinner, EmptyState, Thumb } from '../../components/admin/ui';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const handleDelete = async (product) => {
    if (!confirm(`Xóa sản phẩm "${product.name}"? Thao tác này không thể hoàn tác.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) return alert('Không xóa được: ' + error.message);
    setProducts((list) => list.filter((p) => p.id !== product.id));
  };

  const categoryNames = useMemo(
    () => [...new Set(products.map((p) => p.categories?.name || 'Chưa phân loại'))],
    [products],
  );

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return products.filter((p) => {
      const cat = p.categories?.name || 'Chưa phân loại';
      if (category !== 'all' && cat !== category) return false;
      return !q || normalize(p.name).includes(q);
    });
  }, [products, search, category]);

  return (
    <div>
      <PageHeader
        title="Sản phẩm"
        description={`${products.length} sản phẩm trong cửa hàng`}
        actions={
          <Link to="/admin/product/new" className="btn btn-primary">
            <Plus weight="bold" /> Thêm sản phẩm
          </Link>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm…"
              aria-label="Tìm sản phẩm"
              className="input pl-10"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc danh mục" className="input sm:w-56">
            <option value="all">Tất cả danh mục</option>
            {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
            text={products.length ? 'Thử từ khóa hoặc danh mục khác.' : 'Hãy thêm sản phẩm đầu tiên cho cửa hàng.'}
            action={!products.length && <Link to="/admin/product/new" className="btn btn-primary"><Plus weight="bold" /> Thêm sản phẩm</Link>}
          />
        ) : (
          <>
            {/* Bảng — desktop */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="bg-paper-dim/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-5 py-3 font-semibold">Danh mục</th>
                  <th className="px-5 py-3 font-semibold">Ảnh/Video</th>
                  <th className="px-5 py-3 text-right font-semibold">Giá</th>
                  <th className="px-5 py-3 text-right font-semibold"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-paper/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb src={getCover(p)} />
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge bg-paper-dim text-muted">{p.categories?.name || 'Chưa phân loại'}</span>
                    </td>
                    <td className="px-5 py-3 text-muted">{(p.media || []).length}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatVND(parsePrice(p.price))}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/product/${p.id}`} target="_blank" className="icon-btn" aria-label={`Xem ${p.name} trên cửa hàng`} title="Xem trên cửa hàng">
                          <ArrowSquareOut size={18} />
                        </Link>
                        <Link to={`/admin/product/edit/${p.id}`} className="icon-btn" aria-label={`Sửa ${p.name}`} title="Sửa">
                          <PencilSimple size={18} />
                        </Link>
                        <button type="button" onClick={() => handleDelete(p)} className="icon-btn hover:bg-brick/10 hover:text-brick" aria-label={`Xóa ${p.name}`} title="Xóa">
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Danh sách — mobile */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-4">
                  <Thumb src={getCover(p)} className="size-14" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-sm text-muted">{p.categories?.name || 'Chưa phân loại'} · {formatVND(parsePrice(p.price))}</p>
                  </div>
                  <Link to={`/admin/product/edit/${p.id}`} className="icon-btn" aria-label={`Sửa ${p.name}`}>
                    <PencilSimple size={18} />
                  </Link>
                  <button type="button" onClick={() => handleDelete(p)} className="icon-btn hover:text-brick" aria-label={`Xóa ${p.name}`}>
                    <Trash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
