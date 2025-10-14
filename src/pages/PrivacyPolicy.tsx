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
            Back
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. General Information</h2>
            <p className="text-muted-foreground">
              In compliance with Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 
              on the protection of natural persons with regard to the processing of personal data (GDPR), and Spanish 
              Organic Law 3/2018 of 5 December on the Protection of Personal Data and guarantee of digital rights (LOPDGDD), 
              KLEFF Barcelona informs users of this platform about its data protection policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona<br />
              Board game community<br />
              Meetup: <a href="https://www.meetup.com/kleff-bcn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.meetup.com/kleff-bcn/</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Collected</h2>
            <p className="text-muted-foreground mb-2">
              The platform collects the following personal data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Username</li>
              <li>Email address</li>
              <li>Tournament participation information</li>
              <li>Game results and statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Purpose of Processing</h2>
            <p className="text-muted-foreground mb-2">
              Personal data is used for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Tournament and event management</li>
              <li>User registration and authentication</li>
              <li>Participation and results tracking</li>
              <li>Tournament-related communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Legal Basis</h2>
            <p className="text-muted-foreground">
              Data processing is based on user consent upon registration and the execution of the tournament management service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. User Rights</h2>
            <p className="text-muted-foreground mb-2">
              Users have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access their personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Delete their data</li>
              <li>Limit processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              To exercise these rights, contact us through KLEFF Barcelona's Meetup channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-muted-foreground">
              KLEFF Barcelona implements appropriate technical and organizational measures to protect personal data 
              against unauthorized access, loss, or alteration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground">
              Data will be retained while the user maintains an active account and for the time necessary to 
              comply with legal obligations.
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

export default PrivacyPolicy;
