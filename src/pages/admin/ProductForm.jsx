import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, UploadSimple, X, CircleNotch } from '@phosphor-icons/react';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category_id: '',
    description: '',
    features: [''], // Array of strings
    media: [] // Array of { type: 'image'|'video', src: '...' }
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: cats } = await supabase.from('categories').select('*');
      if (cats) setCategories(cats);

      if (isEdit) {
        const { data: prod } = await supabase.from('products').select('*').eq('id', id).single();
        if (prod) {
          setFormData({
            name: prod.name || '',
            price: prod.price || '',
            category_id: prod.category_id || '',
            description: prod.description || '',
            features: prod.features?.length > 0 ? prod.features : [''],
            media: prod.media || []
          });
        }
      }
      setInitialLoading(false);
    }
    init();
  }, [id, isEdit]);

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleFileUpload = async (e) => {
    try {
      setUploading(true);
      const files = Array.from(e.target.files);
      const newMedia = [...formData.media];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const isVideo = file.type.startsWith('video/');

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newMedia.push({
          type: isVideo ? 'video' : 'image',
          src: publicUrl
        });
      }

      setFormData({ ...formData, media: newMedia });
    } catch (error) {
      alert('Lỗi upload ảnh: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index) => {
    const newMedia = formData.media.filter((_, i) => i !== index);
    setFormData({ ...formData, media: newMedia });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanFeatures = formData.features.filter(f => f.trim() !== '');

    const productData = {
      name: formData.name,
      price: formData.price,
      category_id: formData.category_id || null,
      description: formData.description,
      features: cleanFeatures,
      media: formData.media
    };

    let error;
    if (isEdit) {
      const { error: err } = await supabase.from('products').update(productData).eq('id', id);
      error = err;
    } else {
      const { error: err } = await supabase.from('products').insert([productData]);
      error = err;
    }

    setLoading(false);
    if (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    } else {
      navigate('/admin/products');
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center py-20"><CircleNotch size={48} className="animate-spin text-ink/20" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-paper rounded-[32px] p-8 md:p-12 shadow-sm border border-ink/5">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/products" className="p-2 hover:bg-ink/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-3xl font-semibold">{isEdit ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm mới'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        
        {/* Thông tin cơ bản */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-2">Tên sản phẩm</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-paper-dim border border-ink/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block font-medium mb-2">Giá tiền</label>
            <input 
              required
              type="text" 
              placeholder="VD: 150.000đ"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full bg-paper-dim border border-ink/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-ink"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium mb-2">Danh mục</label>
            <select 
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value})}
              className="w-full bg-paper-dim border border-ink/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-ink appearance-none"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium mb-2">Mô tả sản phẩm</label>
            <textarea 
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-paper-dim border border-ink/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-ink resize-none"
            />
          </div>
        </div>

        {/* Đặc điểm cấu tạo */}
        <div className="border-t border-ink/10 pt-8">
          <label className="block font-medium mb-4">Chi tiết cấu tạo (Features)</label>
          <div className="flex flex-col gap-3">
            {formData.features.map((feat, idx) => (
              <div key={idx} className="flex gap-2">
                <input 
                  type="text" 
                  value={feat}
                  onChange={e => handleFeatureChange(idx, e.target.value)}
                  placeholder={`Đặc điểm ${idx + 1}`}
                  className="flex-1 bg-paper-dim border border-ink/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-ink"
                />
                {formData.features.length > 1 && (
                  <button type="button" onClick={() => removeFeature(idx)} className="p-3 text-brick/60 hover:text-brick hover:bg-brick/10 rounded-[12px] transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addFeature} className="text-left text-sm font-medium text-ink/60 hover:text-ink w-fit mt-2">
              + Thêm đặc điểm
            </button>
          </div>
        </div>

        {/* Hình ảnh và Video */}
        <div className="border-t border-ink/10 pt-8">
          <label className="block font-medium mb-4">Hình ảnh & Video</label>
          
          <div className="flex flex-wrap gap-4 mb-4">
            {formData.media.map((m, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-[16px] overflow-hidden border border-ink/10 group">
                {m.type === 'video' ? (
                  <video src={m.src} className="w-full h-full object-cover" />
                ) : (
                  <img src={m.src} className="w-full h-full object-cover" />
                )}
                <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-brick text-paper p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
            
            <label className="w-24 h-24 rounded-[16px] border-2 border-dashed border-ink/20 flex flex-col items-center justify-center cursor-pointer hover:border-ink/50 hover:bg-ink/5 transition-colors relative">
              {uploading ? <CircleNotch size={24} className="animate-spin text-ink/40" /> : <UploadSimple size={24} className="text-ink/40 mb-1" />}
              <span className="text-[10px] font-medium text-ink/40 uppercase tracking-wider">{uploading ? 'Đang tải' : 'Tải lên'}</span>
              <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || uploading}
          className="w-full bg-ink text-paper py-4 rounded-[16px] font-semibold text-lg mt-4 hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center"
        >
          {loading ? <CircleNotch size={24} className="animate-spin" /> : (isEdit ? 'Cập nhật' : 'Lưu sản phẩm')}
        </button>

      </form>
    </div>
  );
}
