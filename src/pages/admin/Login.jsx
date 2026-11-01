import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LockKey, Envelope, CircleNotch, Flower, ArrowLeft, WarningCircle } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-2">
      {/* Ảnh minh họa */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/hero_hydrangea.png" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="max-w-md font-display text-4xl leading-tight">
            Quản lý cửa hàng hoa <em className="text-blush">nhẹ nhàng</em> như cách bạn uốn từng cánh hoa.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Về cửa hàng
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="m-auto w-full max-w-sm py-12"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brick text-white">
            <Flower size={26} weight="fill" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Đăng nhập quản trị</h1>
          <p className="mt-2 text-muted">Quản lý sản phẩm, danh mục và hóa đơn bán hàng.</p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-brick/20 bg-blush/60 p-3 text-sm text-brick-dark">
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
              Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Envelope size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com" required className="input h-12 pl-10" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="label">Mật khẩu</label>
              <div className="relative">
                <LockKey size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input h-12 pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full rounded-xl">
              {loading ? <CircleNotch size={20} className="animate-spin" /> : 'Đăng nhập'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
