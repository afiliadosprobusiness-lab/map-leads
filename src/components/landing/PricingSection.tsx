import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export function PricingSection() {
  const navigate = useNavigate();
  const { t } = useLang();

  const plans = [
    {
      name: "Starter",
      price: "$49",
      leadsKey: "pricing.starter",
      features: ["pricing.starter.f1","pricing.starter.f2","pricing.starter.f3","pricing.starter.f4","pricing.starter.f5"],
      ctaKey: "pricing.starter.cta",
      highlighted: false,
      badge: null,
    },
    {
      name: "Growth",
      price: "$99",
      leadsKey: "pricing.growth",
      features: ["pricing.growth.f1","pricing.growth.f2","pricing.growth.f3","pricing.growth.f4","pricing.growth.f5"],
      ctaKey: "pricing.growth.cta",
      highlighted: true,
      badge: "pricing.popular",
    },
    {
      name: "Pro",
      price: "$199",
      leadsKey: "pricing.pro",
      features: ["pricing.pro.f1","pricing.pro.f2","pricing.pro.f3","pricing.pro.f4","pricing.pro.f5"],
      ctaKey: "pricing.pro.cta",
      highlighted: false,
      badge: null,
    },
  ];

  return (
    <section id="pricing" className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            {t("pricing.title1")}{" "}
            <span className="gradient-text">{t("pricing.title2")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
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
                  {t(plan.badge)}
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold font-display text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t(`${plan.leadsKey}.desc`)}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black font-display text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-primary">
                  {t(`${plan.leadsKey}.f1`).split(" ").slice(0, 2).join(" ")} {t("pricing.leadsMonth")}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((fk) => (
                  <li key={fk} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {t(fk)}
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
                {t(plan.ctaKey)}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("pricing.footer")}
        </p>
      </div>
    </section>
  );
}
