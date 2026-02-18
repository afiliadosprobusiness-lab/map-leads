import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="gradient-card glow-border rounded-3xl p-12 sm:p-16 relative overflow-hidden">
          {/* Glow bg */}
          <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />

          <div className="relative z-10">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
              <MapPin className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
              Empieza a generar leads{" "}
              <span className="gradient-text">hoy mismo</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Únete a cientos de equipos de ventas que ya usan MapLeads para encontrar nuevos clientes cada día.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground border-0 shadow-glow h-14 px-10 text-base font-semibold hover:opacity-90 transition-opacity"
                onClick={() => navigate("/auth?tab=register")}
              >
                Comenzar gratis ahora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Sin tarjeta de crédito para comenzar · Cancela cuando quieras
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
