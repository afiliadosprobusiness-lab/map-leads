import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mes",
    description: "Perfecto para freelancers y pequeñas agencias.",
    leads: "2.000 leads/mes",
    features: [
      "2.000 leads por mes",
      "Búsquedas ilimitadas",
      "Exportar CSV",
      "Datos: nombre, teléfono, web, dirección",
      "Soporte por email",
    ],
    cta: "Empezar con Starter",
    highlighted: false,
    badge: null,
  },
  {
    name: "Growth",
    price: "$99",
    period: "/mes",
    description: "Para equipos de ventas en expansión.",
    leads: "5.000 leads/mes",
    features: [
      "5.000 leads por mes",
      "Todo lo del plan Starter",
      "✉️ Email enrichment incluido",
      "Historial completo de búsquedas",
      "Soporte prioritario",
    ],
    cta: "Empezar con Growth",
    highlighted: true,
    badge: "Más popular",
  },
  {
    name: "Pro",
    price: "$199",
    period: "/mes",
    description: "Para agencias y equipos avanzados.",
    leads: "15.000 leads/mes",
    features: [
      "15.000 leads por mes",
      "Todo lo del plan Growth",
      "🔄 Búsquedas recurrentes automáticas",
      "API access (próximamente)",
      "Soporte dedicado",
    ],
    cta: "Empezar con Pro",
    highlighted: false,
    badge: null,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            Planes simples y{" "}
            <span className="gradient-text">transparentes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sin costos ocultos. Paga por el plan que necesitas y escala cuando quieras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col transition-all ${
                plan.highlighted
                  ? "gradient-card glow-border shadow-glow scale-105"
                  : "gradient-card border border-border/50 hover:border-primary/20"
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 px-3 py-1">
                  <Zap className="w-3 h-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold font-display text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black font-display text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-primary">{plan.leads}</div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-11 font-semibold ${
                  plan.highlighted
                    ? "gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90"
                    : "border-border/60 hover:border-primary/40 hover:bg-primary/5"
                }`}
                variant={plan.highlighted ? "default" : "outline"}
                onClick={() => navigate("/auth?tab=register")}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          💳 Pago seguro con Stripe · Sin contrato · Cancela cuando quieras
        </p>
      </div>
    </section>
  );
}
