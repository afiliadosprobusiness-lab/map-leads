import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Building2, Phone, Globe } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const statItems = [
  { value: "50M+", label: "Negocios indexados" },
  { value: "195", label: "Países disponibles" },
  { value: "< 5min", label: "Tiempo de scraping" },
];

const floatingLeads = [
  { name: "Restaurante La Barca", city: "Barcelona", category: "Restaurant", phone: "+34 93 123 4567" },
  { name: "TechHub Madrid", city: "Madrid", category: "Technology", phone: "+34 91 987 6543" },
  { name: "Café Montmartre", city: "Paris", category: "Café", phone: "+33 1 23 45 67 89" },
];

const cardDelays = ["0s", "0.2s", "0.4s", "0.6s"];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="World map background" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-glow opacity-40" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--brand-blue) / 0.05)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--brand-cyan) / 0.05)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <Badge className="mb-6 inline-flex bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm font-medium">
              🗺️ Powered by Google Maps + Apify
            </Badge>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] mb-6 font-display">
              Encuentra clientes en{" "}
              <span className="gradient-text">cualquier ciudad</span>{" "}
              del mundo
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              Extrae leads de Google Maps con nombre, teléfono, dirección, web y email en minutos.
              Sin código. Sin límites geográficos.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 mb-10">
              {statItems.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-bold text-foreground font-display">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground border-0 shadow-glow h-12 px-8 text-base font-semibold hover:opacity-90 transition-opacity"
                onClick={() => navigate("/auth?tab=register")}
              >
                Empezar gratis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                Ver cómo funciona
              </Button>
            </div>
          </div>

          {/* Right: floating lead cards */}
          <div className="flex-1 w-full max-w-md">
            <div className="relative space-y-3">
              {floatingLeads.map((lead, i) => (
                <div
                  key={lead.name}
                  className="gradient-card glow-border rounded-xl p-4 flex items-start gap-3 shadow-lg animate-fade-up"
                  style={{ animationDelay: cardDelays[i] }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">{lead.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{lead.city}</span>
                      <span className="w-1 h-1 rounded-full bg-border inline-block" />
                      <span>{lead.category}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-success font-medium">✓ Lead</span>
                </div>
              ))}

              {/* Summary card */}
              <div
                className="gradient-card glow-border rounded-xl p-4 flex items-center justify-between shadow-lg animate-fade-up"
                style={{ animationDelay: cardDelays[3] }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Búsqueda completada</div>
                    <div className="text-xs text-muted-foreground">Restaurantes · Barcelona · España</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground font-display">248</div>
                  <div className="text-xs text-muted-foreground">leads encontrados</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
