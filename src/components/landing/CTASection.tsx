import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export function CTASection() {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <section className="py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="gradient-card glow-border rounded-3xl p-12 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />

          <div className="relative z-10">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
              <MapPin className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
              {t("cta.title1")}{" "}
              <span className="gradient-text">{t("cta.title2")}</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground border-0 shadow-glow h-14 px-10 text-base font-semibold hover:opacity-90 transition-opacity"
                onClick={() => navigate("/auth?tab=register")}
              >
                {t("cta.btn")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">{t("cta.footer")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
