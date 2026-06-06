import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Home",
  description:
    "MajiCast — ML-powered water quality monitoring and contamination risk prediction for Kenya. Meet the team, learn about our mission and vision.",
};

const TEAM = [
  { name: "Diana",    file: "diana.jpeg",   role: "Data Scientist" },
  { name: "Phanela",  file: "phanela.jpeg", role: "Data Scientist" },
  { name: "Lewis",    file: "lewis.jpeg",   role: "Data Scientist" },
  { name: "Margaret", file: "maggie.jpeg",  role: "Data Scientist" },
  { name: "Anthony",  file: "anthony.jpeg", role: "Data Scientist" },
];

const CONTACTS = [
  { label: "Email",    file: "email.jpeg",    href: "mailto:ngangaanthony31@gmail.com" },
  { label: "Phone",    file: "phone.jpeg",    href: "tel:+254718308860" },
  { label: "LinkedIn", file: "linkedin.jpeg", href: "https://www.linkedin.com/in/anthony-chege-76244124b/" },
  { label: "Website",  file: "website.png",   href: "https://anthonyngangachege.vercel.app" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-parchment">
      {/* ── Hero / About ─────────────────────────────────────────────── */}
      <section className="page-header">
        <div className="max-w-5xl mx-auto">
          <p className="text-earth-300 text-sm font-semibold tracking-widest uppercase mb-2">
            Water Intelligence Platform
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">
            MajiCast
          </h1>
          <p className="text-parchment-200 text-lg mt-3 max-w-2xl">
            Predicting contamination risk for water points across Kenya through
            machine learning, satellite data, and citizen science.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-20">

        {/* ── About ───────────────────────────────────────────────────── */}
        <section aria-labelledby="about-heading">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="relative rounded-panel overflow-hidden shadow-warm-lg aspect-[4/3]">
              <Image
                src="/images/about.jpeg"
                alt="Water point in Kenya"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-earth-600 text-sm font-semibold tracking-widest uppercase mb-3">
                About MajiCast
              </p>
              <h2 id="about-heading" className="text-3xl font-display font-bold text-forest-900 mb-5 leading-snug">
                When machines listen to water
              </h2>
              <div className="space-y-4 text-forest-800 leading-relaxed text-[0.97rem]">
                <p>
                  Water is life. Yet for millions, that life is silently threatened
                  every day by contaminated sources, failing infrastructure, and
                  overlooked early signs.
                </p>
                <p>
                  MajiCast was born from a simple but powerful idea: hidden within
                  scattered reports and environmental readings are stories that warn
                  us — if only we had the tools to hear them.
                </p>
                <p>
                  At the heart of MajiCast is a predictive engine for assessing water
                  point contamination risk. By combining environmental satellite data,
                  infrastructure reports, and machine learning, we identify high-risk
                  areas before crises unfold — providing communities, NGOs, and
                  policymakers with early warnings and enabling faster, targeted
                  responses.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission ─────────────────────────────────────────────────── */}
        <section aria-labelledby="mission-heading">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-earth-600 text-sm font-semibold tracking-widest uppercase mb-3">
                Our Mission
              </p>
              <h2 id="mission-heading" className="text-3xl font-display font-bold text-forest-900 mb-5 leading-snug">
                Data science in service of clean water
              </h2>
              <p className="text-forest-800 leading-relaxed text-[0.97rem]">
                To harness the power of Natural Language Processing, geospatial
                analysis, and data science to detect, visualise, and prevent water
                contamination risks — empowering communities and organisations with
                early, actionable insights that translate directly into safer water
                for all.
              </p>
            </div>
            <div className="relative rounded-panel overflow-hidden shadow-warm-lg aspect-[4/3]">
              <Image
                src="/images/mission.jpeg"
                alt="Mission — safe water access"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* ── Team ────────────────────────────────────────────────────── */}
        <section aria-labelledby="team-heading">
          <div className="text-center mb-10">
            <p className="text-earth-600 text-sm font-semibold tracking-widest uppercase mb-2">
              The People Behind MajiCast
            </p>
            <h2 id="team-heading" className="text-3xl font-display font-bold text-forest-900">
              Meet the Team
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {TEAM.map(({ name, file, role }) => (
              <div key={name} className="flex flex-col items-center text-center group">
                <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-warm ring-2 ring-earth-300 ring-offset-2 ring-offset-parchment transition-all duration-200 group-hover:ring-forest-700 group-hover:shadow-warm-lg mb-3">
                  <Image
                    src={`/images/${file}`}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <p className="font-semibold text-forest-900 text-sm">{name}</p>
                <p className="text-earth-600 text-xs mt-0.5">{role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Vision ──────────────────────────────────────────────────── */}
        <section aria-labelledby="vision-heading">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="relative rounded-panel overflow-hidden shadow-warm-lg aspect-[4/3]">
              <Image
                src="/images/vision.jpeg"
                alt="Vision — protecting water for future generations"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-earth-600 text-sm font-semibold tracking-widest uppercase mb-3">
                Our Vision
              </p>
              <h2 id="vision-heading" className="text-3xl font-display font-bold text-forest-900 mb-5 leading-snug">
                No community left vulnerable
              </h2>
              <p className="text-forest-800 leading-relaxed text-[0.97rem]">
                A world where no community is left vulnerable to water-related
                dangers because warnings were missed, unheard, or too late. A
                future where Artificial Intelligence doesn&apos;t just predict
                outcomes — it protects lives.
              </p>
            </div>
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <section aria-labelledby="contact-heading">
          <div className="panel text-center">
            <p className="text-earth-600 text-sm font-semibold tracking-widest uppercase mb-2">
              Get in Touch
            </p>
            <h2 id="contact-heading" className="text-2xl font-display font-bold text-forest-900 mb-8">
              Contact Us
            </h2>
            <div className="flex justify-center gap-10 flex-wrap">
              {CONTACTS.map(({ label, file, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 group"
                  aria-label={label}
                >
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden shadow-warm transition-all duration-200 group-hover:shadow-warm-lg group-hover:scale-105">
                    <Image
                      src={`/images/${file}`}
                      alt={label}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <span className="text-xs font-semibold text-forest-700 tracking-wide">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

      </div>

      <footer className="site-footer">
        2025 MajiCast. Data sourced from WPDx and other public datasets.
      </footer>
    </div>
  );
}
