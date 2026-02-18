import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLang } from "@/contexts/LanguageContext";

const faqKeys = ["faq.q1","faq.q2","faq.q3","faq.q4","faq.q5","faq.q6","faq.q7"] as const;
const faqAnswerKeys = ["faq.a1","faq.a2","faq.a3","faq.a4","faq.a5","faq.a6","faq.a7"] as const;

export function FAQSection() {
  const { t } = useLang();

  return (
    <section id="faq" className="py-24 border-t border-border/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            {t("faq.title1")} <span className="gradient-text">{t("faq.title2")}</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqKeys.map((qk, i) => (
            <AccordionItem
              key={qk}
              value={`item-${i}`}
              className="gradient-card border border-border/50 rounded-xl px-6 hover:border-primary/20 transition-colors"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                {t(qk)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                {t(faqAnswerKeys[i])}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
