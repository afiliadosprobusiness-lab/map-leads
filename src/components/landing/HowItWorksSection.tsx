import { Search, Zap, Download } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Define tu búsqueda",
    description: "Introduce la keyword, ciudad y país. Por ejemplo: 'restaurantes', 'Barcelona', 'España'. MapLeads hace el resto.",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    icon: Zap,
    step: "02",
    title: "Extracción automática",
    description: "Nuestro motor basado en Apify analiza Google Maps y extrae todos los datos disponibles: nombre, teléfono, web, dirección, reseñas.",
    colorClass: "text-cyan",
    bgClass: "bg-cyan-500/10",
  },
  {
    icon: Download,
    step: "03",
    title: "Exporta y actúa",
    description: "Descarga tus leads en CSV con un clic. Úsalos en tu CRM, email marketing o llama directamente a tus prospectos.",
    colorClass: "text-success",
    bgClass: "bg-green-500/10",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            Cómo funciona{" "}
            <span className="gradient-text">en 3 pasos</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sin instalaciones, sin código, sin complicaciones. Empieza a generar leads en minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className="relative gradient-card border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all hover:shadow-glow-sm group"
            >
              {/* Step number */}
              <div className="text-6xl font-black text-border/30 font-display absolute top-4 right-6 select-none">
                {step.step}
              </div>

              <div className={`w-14 h-14 rounded-xl ${step.bgClass} flex items-center justify-center mb-6`}>
                <step.icon className={`w-7 h-7 ${step.colorClass}`} />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-3 font-display">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>

              {i < steps.length - 1 && (
                <div className="md:hidden w-px h-8 bg-gradient-to-b from-border to-transparent mx-auto mt-6" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
