import { useState, useEffect } from 'react';
import { Plus, Trash, PencilSimple, Check, X, Folders } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { PageHeader, Spinner, EmptyState } from '../../components/admin/ui';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('category_id'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) {
        const c = {};
        prodRes.data.forEach((p) => {
          if (p.category_id) c[p.category_id] = (c[p.category_id] || 0) + 1;
        });
        setCounts(c);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setAdding(true);
    const { data, error } = await supabase.from('categories').insert([{ name }]).select();
    setAdding(false);
    if (error) return alert('Không thêm được: ' + error.message);
    if (data) {
      setCategories((list) => [...list, data[0]]);
      setNewCategoryName('');
    }
  };

  const handleDelete = async (cat) => {
    const n = counts[cat.id] || 0;
    const warn = n > 0 ? `\n${n} sản phẩm thuộc danh mục này sẽ trở thành "Chưa phân loại".` : '';
    if (!confirm(`Xóa danh mục "${cat.name}"?${warn}`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) return alert('Không xóa được: ' + error.message);
    setCategories((list) => list.filter((c) => c.id !== cat.id));
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveEdit = async (id) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) return alert('Không lưu được: ' + error.message);
    setCategories((list) => list.map((c) => (c.id === id ? { ...c, name } : c)));
    setEditingId(null);
  };

  return (
    <div>
      <PageHeader title="Danh mục" description="Nhóm sản phẩm để khách dễ lọc trên cửa hàng." />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <form onSubmit={handleAdd} className="card p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="font-semibold">Thêm danh mục</h2>
          <label htmlFor="new-cat" className="label mt-5">Tên danh mục</label>
          <input
            id="new-cat"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="VD: Hoa hướng dương"
            className="input"
          />
          <button type="submit" disabled={adding || !newCategoryName.trim()} className="btn btn-primary mt-4 w-full rounded-xl">
            <Plus weight="bold" /> Tạo danh mục
          </button>
        </form>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Tất cả danh mục</h2>
            <span className="badge bg-paper-dim text-muted">{categories.length}</span>
          </div>

          {loading ? (
            <Spinner />
          ) : categories.length === 0 ? (
            <EmptyState icon={Folders} title="Chưa có danh mục nào" text="Tạo danh mục đầu tiên ở khung bên cạnh." />
          ) : (
            <ul className="divide-y divide-line">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blush text-brick">
                    <Folders size={18} weight="duotone" />
                  </span>

                  {editingId === cat.id ? (
                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); saveEdit(cat.id); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        aria-label="Tên danh mục"
                        className="input h-10"
                        autoFocus
                      />
                      <button type="button" onClick={() => saveEdit(cat.id)} className="icon-btn bg-ink text-paper hover:bg-ink/85 hover:text-paper" aria-label="Lưu">
                        <Check size={18} weight="bold" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="icon-btn" aria-label="Hủy">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{cat.name}</p>
                        <p className="text-xs text-muted">{counts[cat.id] || 0} sản phẩm</p>
                      </div>
                      <button type="button" onClick={() => startEdit(cat)} className="icon-btn" aria-label={`Đổi tên ${cat.name}`}>
                        <PencilSimple size={18} />
                      </button>
                      <button type="button" onClick={() => handleDelete(cat)} className="icon-btn hover:bg-brick/10 hover:text-brick" aria-label={`Xóa ${cat.name}`}>
                        <Trash size={18} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
