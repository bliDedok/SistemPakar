export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm text-muted-foreground">
            Sistem Pakar Anak
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Deteksi awal gangguan anak berbasis gejala
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Aplikasi ini membantu proses konsultasi awal berdasarkan gejala,
            aturan pakar, dan hasil diagnosis sementara.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/consultation"
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Mulai Konsultasi
            </a>
            <a
              href="/admin"
              className="rounded-xl border px-5 py-3 text-sm font-medium"
            >
              Kelola Basis Pengetahuan
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}