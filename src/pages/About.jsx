import { motion } from 'motion/react';
import { Phone, EnvelopeSimple, MapPin } from '@phosphor-icons/react';

export default function About() {
  return (
    <div className="min-h-[calc(100dvh-72px)] bg-paper flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] aspect-square bg-sunflower/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] aspect-square bg-brick/10 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl w-full bg-paper/80 backdrop-blur-xl border border-ink/5 rounded-[48px] p-12 md:p-20 text-center shadow-xl relative z-10"
      >
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter mb-8">Về Chúng Tôi</h1>
        <p className="text-lg md:text-xl text-ink/70 mb-16 max-w-lg mx-auto leading-relaxed">
          Kẽm Nhung Studio là không gian sáng tạo mang đến những sản phẩm hoa thủ công tỉ mỉ, giúp điểm tô không gian sống của bạn bằng vẻ đẹp vĩnh cửu.
        </p>
        
        <div className="flex flex-col gap-8 items-center w-fit mx-auto">
          <a href="tel:0399176095" className="flex items-center gap-6 text-xl md:text-2xl font-medium hover:text-brick transition-colors group">
            <div className="w-16 h-16 rounded-[20px] bg-paper-dim border border-ink/5 text-brick flex items-center justify-center group-hover:-translate-y-2 group-hover:shadow-lg transition-all duration-300">
              <Phone weight="fill" size={32} />
            </div>
            0399176095
          </a>
          
          <a href="mailto:vonguyetnhi3012@gmail.com" className="flex items-center gap-6 text-xl md:text-2xl font-medium hover:text-brick transition-colors group">
            <div className="w-16 h-16 rounded-[20px] bg-paper-dim border border-ink/5 text-brick flex items-center justify-center group-hover:-translate-y-2 group-hover:shadow-lg transition-all duration-300">
              <EnvelopeSimple weight="fill" size={32} />
            </div>
            vonguyetnhi3012@gmail.com
          </a>
        </div>
      </motion.div>
    </div>
  );
}
