import { Search, Zap, Download } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const steps = [
  { icon: Search, stepNum: "01", titleKey: "how.step1.title", descKey: "how.step1.desc", colorClass: "text-primary", bgClass: "bg-primary/10" },
  { icon: Zap, stepNum: "02", titleKey: "how.step2.title", descKey: "how.step2.desc", colorClass: "text-cyan", bgClass: "bg-cyan-500/10" },
  { icon: Download, stepNum: "03", titleKey: "how.step3.title", descKey: "how.step3.desc", colorClass: "text-success", bgClass: "bg-green-500/10" },
];

export function HowItWorksSection() {
  const { t } = useLang();

  return (
    <section id="how-it-works" className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            {t("how.title1")}{" "}
            <span className="gradient-text">{t("how.title2")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("how.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <div
              key={step.stepNum}
              className="relative gradient-card border border-border/50 rounded-2xl p-8 hover:border-primary/30 transition-all hover:shadow-glow-sm group"
            >
              <div className="text-6xl font-black text-border/30 font-display absolute top-4 right-6 select-none">
                {step.stepNum}
              </div>

              <div className={`w-14 h-14 rounded-xl ${step.bgClass} flex items-center justify-center mb-6`}>
                <step.icon className={`w-7 h-7 ${step.colorClass}`} />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-3 font-display">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(step.descKey)}</p>

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
