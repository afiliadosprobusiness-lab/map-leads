import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">
              Map<span className="text-brand">Leads</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Precios</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Iniciar sesión
            </Button>
            <Button size="sm" className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 transition-opacity" onClick={() => navigate("/auth?tab=register")}>
              Comenzar gratis
            </Button>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-muted-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-4">
          <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Cómo funciona</a>
          <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Precios</a>
          <a href="#faq" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>FAQ</a>
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => { navigate("/auth"); setOpen(false); }}>Iniciar sesión</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground border-0" onClick={() => { navigate("/auth?tab=register"); setOpen(false); }}>Comenzar gratis</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
