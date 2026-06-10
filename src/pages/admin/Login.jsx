import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LockKey, Envelope, CircleNotch } from '@phosphor-icons/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-paper-dim border border-ink/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-ink text-paper rounded-[20px] flex items-center justify-center">
            <LockKey size={32} weight="bold" />
          </div>
        </div>
        
        <h1 className="text-3xl font-semibold text-center tracking-tight mb-2">Đăng nhập Admin</h1>
        <p className="text-ink/60 text-center mb-8">Quản lý kho hàng và danh mục sản phẩm của bạn.</p>

        {error && (
          <div className="bg-brick/10 text-brick p-4 rounded-[16px] text-sm mb-6 border border-brick/20">
            Đăng nhập thất bại: Kiểm tra lại email và mật khẩu.
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-ink/80">Email</label>
            <div className="relative">
              <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-paper border border-ink/10 rounded-[16px] py-3 pl-12 pr-4 focus:outline-none focus:border-ink transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-ink/80">Mật khẩu</label>
            <div className="relative">
              <LockKey className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-paper border border-ink/10 rounded-[16px] py-3 pl-12 pr-4 focus:outline-none focus:border-ink transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-ink text-paper py-4 rounded-[16px] font-semibold mt-4 hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center"
          >
            {loading ? <CircleNotch size={24} className="animate-spin" /> : 'Đăng nhập'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
