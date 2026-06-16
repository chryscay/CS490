export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">
      {/* NAVBAR */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="text-lg font-semibold tracking-wide">
          Claude Scholars
        </div>

        <div className="flex items-center gap-3 text-sm">
          <a
            href="/login"
            className="text-white/70 hover:text-white transition"
          >
            Login
          </a>

          <a
            href="/register"
            className="px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-white/90 transition"
          >
            Sign up
          </a>
        </div>
      </header>

      {/* HERO */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
          Tailor your resume to pass ATS filters instantly
        </h1>

        <p className="mt-6 text-white/60 max-w-xl text-base md:text-lg">
          We analyze job descriptions and optimize your resume to match
          recruiter screening systems and keyword scoring logic.
        </p>

        <div className="mt-10 flex gap-4">
          <a
            href="/register"
            className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90"
          >
            Get started
          </a>

          <a
            href="/login"
            className="px-6 py-3 rounded-xl border border-white/20 hover:border-white/40"
          >
            Sign in
          </a>
        </div>

        {/* FAKE LOGO STRIP */}
        <div className="mt-16 text-white/30 text-sm">
          Trusted by modern hiring tools & recruiters
        </div>
      </main>
    </div>
  );
}
