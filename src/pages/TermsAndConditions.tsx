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
            Back
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using this tournament management platform, you agree to be bound by these terms 
              and conditions. If you do not agree with any of these terms, you should not use this platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-muted-foreground">
              This platform, created by KLEFF Barcelona, provides tools for managing board game tournaments, 
              including participant registration, match pairings, result tracking, and leaderboards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Registration</h2>
            <p className="text-muted-foreground mb-2">
              To use certain features of the platform, you must register by providing:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Truthful and up-to-date information</li>
              <li>A valid email address</li>
              <li>A unique username</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              You are responsible for maintaining the confidentiality of your account and password.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">
              By using this platform, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Not provide false or misleading information</li>
              <li>Not interfere with the platform's operation</li>
              <li>Respect other users and participants</li>
              <li>Not use the platform for illegal purposes</li>
              <li>Comply with tournament rules</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on this platform, including design, code, text, and logos, is the property of 
              KLEFF Barcelona and is protected by Spanish and European intellectual property laws. 
              Reproduction without express authorization is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data Protection</h2>
            <p className="text-muted-foreground">
              The processing of your personal data is governed by our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              , in compliance with GDPR and LOPDGDD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona is not responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Temporary service interruptions</li>
              <li>Data loss due to technical causes</li>
              <li>Disputes between users or participants</li>
              <li>User-generated content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Service Modifications</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona reserves the right to modify, suspend, or discontinue any aspect of the 
              platform at any time, with or without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Account Suspension</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or delete accounts that violate these terms or are used inappropriately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Applicable Law and Jurisdiction</h2>
            <p className="text-muted-foreground">
              These terms are governed by Spanish law. For any disputes, the parties submit to the courts 
              and tribunals of Barcelona, Spain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p className="text-muted-foreground">
              For any questions about these terms and conditions, you can contact us through:{" "}
              <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                KLEFF Barcelona Meetup
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              These terms and conditions may be updated periodically. Continued use of the platform after 
              the publication of changes constitutes acceptance of those changes.
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

export default TermsAndConditions;
