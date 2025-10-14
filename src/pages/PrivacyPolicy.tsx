import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Información General</h2>
            <p className="text-muted-foreground">
              En cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, 
              de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que 
              respecta al tratamiento de datos personales (RGPD), y la Ley Orgánica 3/2018, de 5 
              de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), 
              KLEFF Barcelona informa a los usuarios de esta plataforma sobre su política de protección de datos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Responsable del Tratamiento</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona<br />
              Comunidad de juegos de mesa<br />
              Meetup: <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.meetup.com/kleff-bcn/</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Datos Recopilados</h2>
            <p className="text-muted-foreground mb-2">
              La plataforma recopila los siguientes datos personales:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Nombre de usuario</li>
              <li>Dirección de correo electrónico</li>
              <li>Información de participación en torneos</li>
              <li>Resultados y estadísticas de juego</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Finalidad del Tratamiento</h2>
            <p className="text-muted-foreground mb-2">
              Los datos personales se utilizan para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Gestión de torneos y eventos</li>
              <li>Registro y autenticación de usuarios</li>
              <li>Seguimiento de participación y resultados</li>
              <li>Comunicaciones relacionadas con los torneos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Base Legal</h2>
            <p className="text-muted-foreground">
              El tratamiento de datos se basa en el consentimiento del usuario al registrarse en la plataforma 
              y la ejecución del servicio de gestión de torneos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Derechos del Usuario</h2>
            <p className="text-muted-foreground mb-2">
              Los usuarios tienen derecho a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Acceso a sus datos personales</li>
              <li>Rectificación de datos inexactos</li>
              <li>Supresión de sus datos</li>
              <li>Limitación del tratamiento</li>
              <li>Portabilidad de datos</li>
              <li>Oposición al tratamiento</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Para ejercer estos derechos, contacte a través de los canales de Meetup de KLEFF Barcelona.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Seguridad de los Datos</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona implementa medidas técnicas y organizativas apropiadas para proteger 
              los datos personales contra el acceso no autorizado, pérdida o alteración.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Conservación de Datos</h2>
            <p className="text-muted-foreground">
              Los datos se conservarán mientras el usuario mantenga su cuenta activa y durante el 
              tiempo necesario para cumplir con las obligaciones legales.
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

export default PrivacyPolicy;
