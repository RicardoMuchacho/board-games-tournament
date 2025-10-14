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
            Back
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Cookies Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What are Cookies?</h2>
            <p className="text-muted-foreground">
              Cookies are small text files that are stored on your device when you visit a website. 
              They are widely used to make websites work more efficiently and to provide information to site owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Cookies Used</h2>
            <p className="text-muted-foreground mb-4">
              This platform uses the following cookies:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Strictly Necessary Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies are essential for the platform to function:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Authentication session cookies</li>
                  <li>Security cookies</li>
                  <li>User preference cookies</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Functional Cookies</h3>
                <p className="text-muted-foreground">
                  Allow remembering your preferences:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Language preferences</li>
                  <li>Display theme (light/dark)</li>
                  <li>Interface settings</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Legal Basis</h2>
            <p className="text-muted-foreground">
              Cookie usage complies with Spanish Law 34/2002 of 11 July on information society services 
              and electronic commerce (LSSI-CE) and GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cookie Management</h2>
            <p className="text-muted-foreground mb-2">
              You can manage cookies through your browser settings:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
              <li><strong>Firefox:</strong> Options → Privacy and security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Privacy → Cookies</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Please note that disabling cookies may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              This platform may use third-party services that install cookies for their operation. 
              These third parties have their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Updates</h2>
            <p className="text-muted-foreground">
              This cookie policy may be updated periodically. We recommend reviewing it regularly 
              to stay informed about how we protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              For any questions about this cookie policy, you can contact us through our Meetup group:{" "}
              <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KLEFF Barcelona</a>
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiesPolicy;
