import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  CalendarCheck,
  Video,
  Clock,
  Shield,
  CreditCard,
  Users,
  Star,
  Bell,
  ChevronRight,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Find Your Provider",
    description:
      "Browse our network of verified healthcare professionals. Filter by specialty, location, availability, and ratings to find the perfect match.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: CalendarCheck,
    title: "Book an Appointment",
    description:
      "Choose a convenient time slot from real-time availability. Book instantly with just a few clicks—no phone calls needed.",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    icon: Video,
    title: "Attend Your Session",
    description:
      "Meet in-person or join a secure video consultation from anywhere. Get reminders so you never miss an appointment.",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
];

const patientBenefits = [
  {
    icon: Clock,
    title: "Save Time",
    description: "No more waiting on hold. Book appointments 24/7 in seconds.",
  },
  {
    icon: Shield,
    title: "Verified Providers",
    description: "All providers are vetted and reviewed by real patients.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get email and SMS reminders so you never miss an appointment.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Pay securely online with transparent pricing—no surprises.",
  },
];

const providerBenefits = [
  {
    icon: Users,
    title: "Grow Your Practice",
    description: "Reach new patients actively searching for your services.",
  },
  {
    icon: CalendarCheck,
    title: "Manage Scheduling",
    description: "Set your availability and let patients book directly.",
  },
  {
    icon: Star,
    title: "Build Reputation",
    description: "Collect reviews and showcase your expertise.",
  },
  {
    icon: CreditCard,
    title: "Get Paid Easily",
    description: "Receive payments directly to your account with Stripe.",
  },
];

const faqs = [
  {
    question: "Is BookEase free for patients?",
    answer:
      "Yes! Signing up and browsing providers is completely free. You only pay for the appointment itself, and pricing is set by each provider.",
  },
  {
    question: "How do I cancel or reschedule an appointment?",
    answer:
      "You can cancel or request a reschedule directly from your dashboard. Cancellation policies vary by provider, so check their terms before booking.",
  },
  {
    question: "Are video consultations secure?",
    answer:
      "Absolutely. We use end-to-end encrypted video rooms to ensure your conversations remain private and HIPAA-compliant.",
  },
  {
    question: "How do providers get paid?",
    answer:
      "Providers connect their Stripe account to receive payments. Funds are transferred automatically after each completed appointment.",
  },
  {
    question: "Can I see reviews before booking?",
    answer:
      "Yes! Every provider has a public profile with ratings and reviews from verified patients who've had appointments.",
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            How BookEase Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Book appointments with trusted professionals in three simple steps.
            No hassle, no phone calls—just seamless scheduling.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`p-3 rounded-xl ${step.color}`}
                    >
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-bold text-muted-foreground/30">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Split Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Patients */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                For Patients
              </h2>
              <div className="grid gap-4">
                {patientBenefits.map((benefit) => (
                  <Card key={benefit.title} className="bg-background">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{benefit.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Link to="/providers" className="inline-block mt-6">
                <Button>
                  Browse Providers
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* For Providers */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                For Providers
              </h2>
              <div className="grid gap-4">
                {providerBenefits.map((benefit) => (
                  <Card key={benefit.title} className="bg-background">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{benefit.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Link to="/auth?mode=signup&role=provider" className="inline-block mt-6">
                <Button variant="outline">
                  Join as Provider
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of patients and providers already using BookEase for
            seamless appointment scheduling.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary">
                Sign Up Free
              </Button>
            </Link>
            <Link to="/providers">
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
              >
                Browse Providers
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;
