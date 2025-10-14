import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About KLEFF */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Sobre KLEFF Barcelona</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Plataforma de gestión de torneos creada por KLEFF Barcelona, 
              la comunidad de entusiastas de juegos de mesa.
            </p>
            <a 
              href="https://www.meetup.com/kleff-bcn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Visita nuestro Meetup →
            </a>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link to="/cookies-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Contacto</h3>
            <p className="text-sm text-muted-foreground">
              ¿Preguntas o sugerencias?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Encuéntranos en nuestros eventos de Meetup
            </p>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KLEFF Barcelona. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
