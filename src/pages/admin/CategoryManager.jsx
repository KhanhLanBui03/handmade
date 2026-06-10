import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash, PencilSimple, Check, X } from '@phosphor-icons/react';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCategoryName }])
      .select();
      
    if (!error && data) {
      setCategories([...categories, data[0]]);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Lưu ý: Xóa danh mục này sẽ khiến các sản phẩm thuộc danh mục này bị mất danh mục. Bạn có chắc chắn không?')) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleEditClick = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    await supabase.from('categories').update({ name: editName }).eq('id', id);
    setCategories(categories.map(c => c.id === id ? { ...c, name: editName } : c));
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-4xl font-semibold mb-10 tracking-tight">Quản lý Danh mục</h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form thêm mới */}
        <div className="lg:col-span-4">
          <div className="bg-paper rounded-[32px] p-8 border border-ink/5 shadow-sm sticky top-10">
            <h3 className="text-xl font-semibold mb-6">Thêm danh mục mới</h3>
            <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-ink/70">Tên danh mục</label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Vd: Hoa hướng dương..." 
                  className="w-full bg-paper-dim border border-ink/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-ink transition-colors"
                />
              </div>
              <button type="submit" className="w-full bg-ink text-paper px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:-translate-y-1 transition-transform">
                <Plus weight="bold" size={20} /> Tạo danh mục
              </button>
            </form>
          </div>
        </div>

        {/* Danh sách */}
        <div className="lg:col-span-8">
          <div className="bg-paper rounded-[32px] p-8 border border-ink/5 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Danh sách Danh mục</h3>
            
            {loading ? (
              <div className="text-ink/50 py-8">Đang tải...</div>
            ) : (
              <div className="divide-y divide-ink/5">
                {categories.map((cat, index) => (
                  <div key={cat.id} className="flex justify-between items-center py-5 group hover:bg-ink/[0.02] px-4 -mx-4 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-10 h-10 rounded-full bg-sunflower/20 text-sunflower font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      
                      {editingId === cat.id ? (
                        <div className="flex-1 flex gap-2 mr-4">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 bg-paper-dim border border-ink/20 rounded-xl px-4 py-2 focus:outline-none focus:border-ink"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(cat.id)} className="bg-ink text-paper p-2 rounded-xl hover:bg-ink/80"><Check size={20} /></button>
                          <button onClick={() => setEditingId(null)} className="bg-brick/10 text-brick p-2 rounded-xl hover:bg-brick/20"><X size={20} /></button>
                        </div>
                      ) : (
                        <span className="font-medium text-lg flex-1">{cat.name}</span>
                      )}
                    </div>
                    
                    {editingId !== cat.id && (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditClick(cat)} className="text-ink/40 p-3 hover:bg-ink/5 hover:text-ink rounded-2xl transition-colors">
                          <PencilSimple size={22} />
                        </button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-brick/50 p-3 hover:bg-brick/10 hover:text-brick rounded-2xl transition-colors">
                          <Trash size={22} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && <p className="text-ink/50 py-4">Chưa có danh mục nào.</p>}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
