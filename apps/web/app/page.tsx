import Link from "next/link";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function SakuraFall() {
  const petals = Array.from({ length: 45 }); 
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {petals.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 10;
        const duration = 7 + Math.random() * 10;
        const size = 10 + Math.random() * 15;
        
        return (
          <div
            key={i}
            className="absolute bg-[#DBC3BE] opacity-60 animate-sakura-fall"
            style={{
              left: `${left}%`,
              top: '-10%',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '100% 0% 100% 0% / 100% 0% 100% 0%',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className={`min-h-screen bg-[#F9FAFB] flex items-center justify-center text-gray-900 overflow-hidden relative ${nunito.className}`}
    >
      <SakuraFall />
      <div className="pointer-events-none absolute inset-0 -z-0 h-full w-full">
        <div 
          className="absolute w-[300px] h-[300px] md:w-[600px] md:h-[600px] -top-20 -left-20 opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(219, 195, 190, 0.6) 0%, rgba(219, 195, 190, 0) 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] md:w-[700px] md:h-[700px] bottom-0 -right-20 opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(139, 164, 154, 0.3) 0%, rgba(219, 195, 190, 0.5) 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <section className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-10 md:py-16 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        
        <div className="w-full lg:w-[55%] flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1">
          <div className="inline-block bg-[#DBC3BE]/20 px-3 py-1.5 md:px-4 md:py-2 rounded-full mb-4 lg:mb-6 shadow-sm border border-[#DBC3BE]/40">
            <span className="text-xs md:text-sm font-bold text-gray-800 md:text-[15px] tracking-wide">
            Sistem Pakar Penyakit Umum Anak
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.2] mb-4 lg:mb-6 text-[#2A332F] tracking-tight">
            Teman Konsultasi Pintar <br className="hidden md:block" />
            Kesehatan Si Kecil.
          </h1>

          <p className="text-sm sm:text-base md:text-[18px] text-gray-600 lg:text-gray-700 leading-relaxed mb-8 text-center lg:text-justify max-w-[90%] md:max-w-[500px] lg:max-w-[450px]">
            Ceritakan gejala yang dialami si kecil layaknya mengobrol dengan dokter. 
            Dapatkan analisis awal instan berbasis sistem pakar medis yang akurat.
          </p>

          <Link
            href="/consultation"
            className="md:text-[20px] inline-block bg-gradient-to-r from-[#8BA49A] to-[#9FABA3] hover:from-[#9FABA3] hover:to-[#8BA49A] transition-all duration-500 text-white font-bold px-10 py-4 rounded-full text-sm md:text-base shadow-lg shadow-[#8BA49A]/30 hover:scale-105"
          >
            Mulai Konsultasi!
          </Link>
        </div>

        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[450px]">
            <div className="absolute inset-0 bg-[#DBC3BE]/40 blur-[60px] rounded-full -z-10 animate-pulse"></div>
            <img
              src="/online-doctor-animate.svg"
              alt="Ilustrasi Dokter Online"
              className="w-full h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>

      </section>
    </main>
  );
}