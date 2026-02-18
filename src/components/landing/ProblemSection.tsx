import { XCircle, CheckCircle } from "lucide-react";

const problems = [
  "Listas de leads desactualizadas y costosas",
  "Datos incompletos: sin teléfono ni web",
  "Cobertura geográfica limitada",
  "Scraping manual que tarda horas",
  "Precios por lead individuales que disparan costos",
];

const solutions = [
  "Datos en tiempo real desde Google Maps",
  "Nombre, teléfono, web y email incluidos",
  "195+ países sin restricciones geográficas",
  "Resultados listos en menos de 5 minutos",
  "Planes planos con miles de leads incluidos",
];

export function ProblemSection() {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            El problema con la{" "}
            <span className="gradient-text">prospección tradicional</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Las empresas pierden semanas buscando leads manualmente. MapLeads lo resuelve en minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Problems */}
          <div className="gradient-card border border-destructive/20 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Sin MapLeads</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="gradient-card glow-border rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Con MapLeads</h3>
            </div>
            <ul className="space-y-4">
              {solutions.map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
