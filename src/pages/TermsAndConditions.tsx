import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground">
              Al acceder y utilizar esta plataforma de gestión de torneos, usted acepta estar sujeto 
              a estos términos y condiciones de uso. Si no está de acuerdo con alguno de estos términos, 
              no debe utilizar esta plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Descripción del Servicio</h2>
            <p className="text-muted-foreground">
              Esta plataforma, creada por KLEFF Barcelona, proporciona herramientas para la gestión 
              de torneos de juegos de mesa, incluyendo registro de participantes, emparejamiento, 
              seguimiento de resultados y clasificaciones.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Registro de Usuario</h2>
            <p className="text-muted-foreground mb-2">
              Para utilizar ciertas funciones de la plataforma, debe registrarse proporcionando:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Información veraz y actualizada</li>
              <li>Una dirección de correo electrónico válida</li>
              <li>Un nombre de usuario único</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Uso Aceptable</h2>
            <p className="text-muted-foreground mb-2">
              Al utilizar esta plataforma, se compromete a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>No proporcionar información falsa o engañosa</li>
              <li>No interferir con el funcionamiento de la plataforma</li>
              <li>Respetar a otros usuarios y participantes</li>
              <li>No utilizar la plataforma para fines ilegales</li>
              <li>Cumplir con las reglas de los torneos organizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Propiedad Intelectual</h2>
            <p className="text-muted-foreground">
              Todo el contenido de esta plataforma, incluyendo diseño, código, textos y logotipos, 
              es propiedad de KLEFF Barcelona y está protegido por las leyes de propiedad intelectual españolas 
              y europeas. Queda prohibida su reproducción sin autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacidad y Protección de Datos</h2>
            <p className="text-muted-foreground">
              El tratamiento de sus datos personales se rige por nuestra{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Política de Privacidad
              </Link>
              , en cumplimiento del RGPD y la LOPDGDD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona no se hace responsable de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Interrupciones temporales del servicio</li>
              <li>Pérdida de datos debido a causas técnicas</li>
              <li>Disputas entre usuarios o participantes</li>
              <li>Contenido generado por los usuarios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Modificaciones del Servicio</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona se reserva el derecho de modificar, suspender o discontinuar cualquier 
              aspecto de la plataforma en cualquier momento, con o sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Suspensión de Cuenta</h2>
            <p className="text-muted-foreground">
              Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos 
              o que se utilicen de manera inapropiada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Ley Aplicable y Jurisdicción</h2>
            <p className="text-muted-foreground">
              Estos términos se rigen por la legislación española. Para cualquier controversia, 
              las partes se someten a los juzgados y tribunales de Barcelona, España.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contacto</h2>
            <p className="text-muted-foreground">
              Para cualquier consulta sobre estos términos y condiciones, puede contactarnos a través de:{" "}
              <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                KLEFF Barcelona Meetup
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Modificaciones de los Términos</h2>
            <p className="text-muted-foreground">
              Estos términos y condiciones pueden actualizarse periódicamente. El uso continuado 
              de la plataforma tras la publicación de cambios constituye su aceptación de los mismos.
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

export default TermsAndConditions;
