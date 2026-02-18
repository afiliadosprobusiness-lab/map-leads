import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();

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
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.howItWorks")}</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.testimonials")}</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.faq")}</a>
          </div>

          {/* Right side: lang switch + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitch />

            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              {t("nav.login")}
            </Button>
            <Button
              size="sm"
              className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 transition-opacity"
              onClick={() => navigate("/auth?tab=register")}
            >
              {t("nav.cta")}
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
          <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.howItWorks")}</a>
          <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.pricing")}</a>
          <a href="#testimonials" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.testimonials")}</a>
          <a href="#faq" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t("nav.faq")}</a>

          <LanguageSwitch className="w-fit" />

          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => { navigate("/auth"); setOpen(false); }}>{t("nav.login")}</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground border-0" onClick={() => { navigate("/auth?tab=register"); setOpen(false); }}>{t("nav.cta")}</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
