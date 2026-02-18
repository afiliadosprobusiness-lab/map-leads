import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "¿De dónde provienen los datos?",
    a: "MapLeads utiliza Apify para extraer datos públicos de Google Maps. Todos los datos son de acceso público y se obtienen respetando los términos de uso aplicables.",
  },
  {
    q: "¿Es legal usar MapLeads?",
    a: "Sí. MapLeads extrae información públicamente disponible en Google Maps (nombre, dirección, teléfono, web). El uso de los datos para contacto comercial está sujeto a las leyes de privacidad de cada país (GDPR, CCPA, etc.). El usuario es responsable del uso que hace de los datos obtenidos.",
  },
  {
    q: "¿Cuánto tiempo tarda una búsqueda?",
    a: "La mayoría de búsquedas se completan en 2-5 minutos dependiendo del número de resultados solicitados y la disponibilidad del servicio.",
  },
  {
    q: "¿Qué incluye el email enrichment?",
    a: "Los planes Growth y Pro incluyen extracción de emails desde las webs de los negocios encontrados. Es un proceso adicional que escanea las páginas web en busca de direcciones de contacto.",
  },
  {
    q: "¿Puedo cancelar mi suscripción?",
    a: "Sí, puedes cancelar en cualquier momento desde tu dashboard. Mantendrás acceso hasta el final del período de facturación actual.",
  },
  {
    q: "¿Los leads se resetean cada mes?",
    a: "Sí. El contador de leads_used se resetea automáticamente cada mes al inicio del nuevo período de facturación. Los leads almacenados anteriormente se mantienen.",
  },
  {
    q: "¿Cómo se procesan los pagos?",
    a: "Todos los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas de crédito en nuestros servidores.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 border-t border-border/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold font-display mb-4">
            Preguntas <span className="gradient-text">frecuentes</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="gradient-card border border-border/50 rounded-xl px-6 hover:border-primary/20 transition-colors"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
