import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold font-display text-foreground">
              Map<span className="text-brand">Leads</span>
            </span>
          </Link>

          <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precios</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidad</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Términos</Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            © 2025 MapLeads · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
