import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About KLEFF */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/assets/kleffLogoSmall.png" alt="Kleff" className="h-6" />
              <h3 className="font-semibold text-lg">About KLEFF Barcelona</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Tournament management platform created by KLEFF Barcelona, 
              the board game enthusiasts community.
            </p>
            <a 
              href="https://www.meetup.com/kleff-bcn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Visit our Meetup →
            </a>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cookies Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Contact</h3>
            <p className="text-sm text-muted-foreground">
              Questions or suggestions?
            </p>
            <Link to="/contact" className="text-sm text-primary hover:underline inline-block mt-2">
              Contact us →
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              <a 
                href="https://www.meetup.com/kleff-bcn/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Find us at our Meetup events
              </a>
            </p>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KLEFF Barcelona. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
