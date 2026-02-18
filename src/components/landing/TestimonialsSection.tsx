import { useLang } from "@/contexts/LanguageContext";
import { Quote } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
}

const englishTestimonials: Testimonial[] = [
  {
    name: "Olivia Grant",
    role: "Growth Lead",
    company: "Northline Media",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80",
    quote: "We launched three outbound campaigns in one week using city-by-city lead exports from MapLeads.",
  },
  {
    name: "Marcus Doyle",
    role: "Founder",
    company: "Doyle Digital",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80",
    quote: "The quality of local business data is consistently better than the lists we used to buy.",
  },
  {
    name: "Sofia Marin",
    role: "Sales Ops Manager",
    company: "Blue Orbit Ads",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=180&q=80",
    quote: "Our reps now start each Monday with fresh leads instead of spending half the day researching.",
  },
  {
    name: "Daniel Kim",
    role: "Agency Owner",
    company: "Outreach Forge",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=80",
    quote: "The CSV output is clean and CRM-ready. We reduced manual prep work by around 70 percent.",
  },
  {
    name: "Jasmine Reed",
    role: "BDR Team Lead",
    company: "Peak Revenue Labs",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=180&q=80",
    quote: "Being able to filter by city and niche gave us a much sharper outbound strategy.",
  },
  {
    name: "Ethan Cole",
    role: "Head of Partnerships",
    company: "ScaleStone",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=180&q=80",
    quote: "MapLeads is now part of our weekly workflow for prospecting new local partners.",
  },
];

const spanishTestimonials: Testimonial[] = [
  {
    name: "Olivia Grant",
    role: "Lider de Growth",
    company: "Northline Media",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80",
    quote: "Lanzamos tres campanas outbound en una semana usando exportaciones por ciudad desde MapLeads.",
  },
  {
    name: "Marcus Doyle",
    role: "Fundador",
    company: "Doyle Digital",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80",
    quote: "La calidad de datos locales es mejor que las listas que comprabamos antes.",
  },
  {
    name: "Sofia Marin",
    role: "Manager de Sales Ops",
    company: "Blue Orbit Ads",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=180&q=80",
    quote: "Nuestros reps empiezan cada semana con leads frescos en lugar de investigar manualmente.",
  },
  {
    name: "Daniel Kim",
    role: "Owner de Agencia",
    company: "Outreach Forge",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=80",
    quote: "El CSV sale limpio y listo para CRM. Reducimos trabajo manual cerca del 70 por ciento.",
  },
  {
    name: "Jasmine Reed",
    role: "Lider BDR",
    company: "Peak Revenue Labs",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=180&q=80",
    quote: "Filtrar por ciudad y nicho nos dio una estrategia outbound mucho mas precisa.",
  },
  {
    name: "Ethan Cole",
    role: "Head of Partnerships",
    company: "ScaleStone",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=180&q=80",
    quote: "MapLeads ya es parte de nuestro flujo semanal para prospectar nuevos socios locales.",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="gradient-card glow-border rounded-2xl p-6 w-[320px] sm:w-[360px] flex-shrink-0">
      <Quote className="h-5 w-5 text-primary mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{testimonial.quote}</p>
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={testimonial.avatar}
          alt={`${testimonial.name} avatar`}
          loading="lazy"
          className="h-11 w-11 rounded-full object-cover border border-border/60"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground truncate">{testimonial.role}</p>
          <p className="text-xs text-primary/90 truncate">{testimonial.company}</p>
        </div>
      </div>
    </article>
  );
}

export function TestimonialsSection() {
  const { lang, t } = useLang();
  const testimonials = lang === "es" ? spanishTestimonials : englishTestimonials;
  const desktopTrack = [...testimonials, ...testimonials];

  return (
    <section id="testimonials" className="py-24 border-t border-border/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            {t("testimonials.title1")} <span className="gradient-text">{t("testimonials.title2")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("testimonials.subtitle")}</p>
        </div>

        <div className="hidden md:block relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex gap-5 w-max animate-testimonial-scroll hover:[animation-play-state:paused]">
            {desktopTrack.map((testimonial, index) => (
              <TestimonialCard key={`${testimonial.name}-${index}`} testimonial={testimonial} />
            ))}
          </div>
        </div>

        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="snap-start">
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

