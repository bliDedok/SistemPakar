import Link from "next/link";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function HomePage() {
  return (
    <main
      className={`min-h-screen bg-white flex items-center justify-center text-gray-900 overflow-hidden relative ${nunito.className}`}
    >
      <div 
        className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] -top-10 -left-10 md:-top-16 md:-left-16 lg:-top-20 lg:-left-20 z-0 drop-shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 164, 154, 0.6) 0%, rgba(139, 164, 154, 0.3) 100%)', 
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', 
          filter: 'blur(10px)', 
        }}
      />

      <div 
        className="hidden md:block absolute w-[300px] h-[300px] -bottom-16 -right-16 lg:-bottom-20 lg:-right-20 z-0 drop-shadow-md"
        style={{
          background: 'linear-gradient(135deg, rgba(219, 195, 190, 0.6) 0%, rgba(219, 195, 190, 0.3) 100%)', 
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', 
          filter: 'blur(10px)', 
        }}
      />
      
      <section className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-10 md:py-16 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        
        <div className="w-full lg:w-[55%] flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1">
          

          <div className="inline-block bg-[#8BA49A]/20 px-3 py-1.5 md:px-4 md:py-2 rounded-full mb-4 lg:mb-6 shadow-inner">
            <span className="text-xs md:text-sm font-semibold text-gray-800 md:text-[15px]">
              Sistem Pakar Penyakit Umum Anak
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.3] lg:leading-[1.2] mb-4 lg:mb-5 text-[#2A332F] tracking-tight">
            Teman Konsultasi Pintar <br className="hidden md:block" />
            untuk Kesehatan Anak Anda.
          </h1>


          <p className="text-sm sm:text-base md:text-[17px] text-gray-600 lg:text-gray-700 leading-[1.6] lg:leading-[1.7] mb-8 text-center lg:text-justify max-w-[90%] md:max-w-[500px] lg:max-w-[420px]">
            Jangan panik saat anak sakit. Ceritakan gejala yang dialami si kecil
            layaknya mengobrol, dan dapatkan analisis awal berdasarkan pengetahuan
            pakar medis secara instan.
          </p>

          <Link
            href="/consultation"
            className="md:text-[20px] inline-block bg-[#E2E8E5] hover:bg-[#8BA49A]/40 transition-colors duration-300 text-gray-900 font-bold px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm md:text-base shadow-sm hover:shadow-md"
          >
            Mulai Konsultasi!
          </Link>
        </div>

        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="relative w-full max-w-[260px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-md">
            <img
              src="/online-doctor-animate.svg"
              alt="Ilustrasi Dokter Online"
              className="w-full h-auto object-contain drop-shadow-sm"
            />
          </div>
        </div>

      </section>
    </main>
  );
}