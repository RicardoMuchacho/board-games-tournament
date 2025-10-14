import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CookiesPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Política de Cookies</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. ¿Qué son las Cookies?</h2>
            <p className="text-muted-foreground">
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando 
              visita un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen 
              de manera más eficiente y para proporcionar información a los propietarios del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Cookies Utilizadas</h2>
            <p className="text-muted-foreground mb-4">
              Esta plataforma utiliza las siguientes cookies:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Cookies Estrictamente Necesarias</h3>
                <p className="text-muted-foreground">
                  Estas cookies son esenciales para el funcionamiento de la plataforma:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Cookies de sesión de autenticación</li>
                  <li>Cookies de seguridad</li>
                  <li>Cookies de preferencias de usuario</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Cookies Funcionales</h3>
                <p className="text-muted-foreground">
                  Permiten recordar sus preferencias:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Preferencias de idioma</li>
                  <li>Tema de visualización (claro/oscuro)</li>
                  <li>Configuración de la interfaz</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Base Legal</h2>
            <p className="text-muted-foreground">
              El uso de cookies se realiza conforme a la Ley 34/2002, de 11 de julio, de servicios 
              de la sociedad de la información y de comercio electrónico (LSSI-CE) y el RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Gestión de Cookies</h2>
            <p className="text-muted-foreground mb-2">
              Puede gestionar las cookies a través de la configuración de su navegador:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
              <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
              <li><strong>Edge:</strong> Configuración → Privacidad → Cookies</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Tenga en cuenta que deshabilitar las cookies puede afectar la funcionalidad de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies de Terceros</h2>
            <p className="text-muted-foreground">
              Esta plataforma puede utilizar servicios de terceros que instalan cookies para su funcionamiento. 
              Estos terceros tienen sus propias políticas de privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Actualizaciones</h2>
            <p className="text-muted-foreground">
              Esta política de cookies puede actualizarse periódicamente. Le recomendamos revisarla 
              regularmente para estar informado sobre cómo protegemos su información.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contacto</h2>
            <p className="text-muted-foreground">
              Para cualquier consulta sobre esta política de cookies, puede contactarnos a través 
              de nuestro grupo de Meetup: <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KLEFF Barcelona</a>
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiesPolicy;
