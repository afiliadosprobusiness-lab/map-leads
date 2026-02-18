import { XCircle, CheckCircle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const problemKeys = ["problem.p1","problem.p2","problem.p3","problem.p4","problem.p5"] as const;
const solutionKeys = ["problem.s1","problem.s2","problem.s3","problem.s4","problem.s5"] as const;

export function ProblemSection() {
  const { t } = useLang();

  return (
    <section className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            {t("problem.title1")}{" "}
            <span className="gradient-text">{t("problem.title2")}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("problem.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="gradient-card border border-destructive/20 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">{t("problem.withoutTitle")}</h3>
            </div>
            <ul className="space-y-4">
              {problemKeys.map((k) => (
                <li key={k} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>

          <div className="gradient-card glow-border rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{t("problem.withTitle")}</h3>
            </div>
            <ul className="space-y-4">
              {solutionKeys.map((k) => (
                <li key={k} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
