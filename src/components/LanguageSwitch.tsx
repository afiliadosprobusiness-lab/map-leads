import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { lang, setLang } = useLang();

  return (
    <div className={cn("flex items-center gap-1 bg-muted rounded-lg p-0.5", className)}>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("es")}
        className={cn(
          "px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          lang === "es" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        ES
      </button>
    </div>
  );
}

