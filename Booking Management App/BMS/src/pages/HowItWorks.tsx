import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin,
  Filter,
  CheckCircle,
  Lock,
  Mail,
  Smartphone,
  BarChart3,
  RefreshCw,
  MessageSquare,
  Receipt,
  Wallet,
  Calendar,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Search,
    title: "Find Your Provider",
    description:
      "Browse our network of verified healthcare professionals. Filter by specialty, location, availability, and ratings to find the perfect match.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    details: [
      "Search by specialty (Cardiologist, Dermatologist, Therapist, etc.)",
      "Filter by location, ratings, and availability",
      "Compare providers side-by-side",
      "Read verified patient reviews",
    ],
  },
  {
    icon: CalendarCheck,
    title: "Book an Appointment",
    description:
      "Choose a convenient time slot from real-time availability. Select in-person or video consultation based on your preference.",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    details: [
      "View real-time calendar availability",
      "Choose between in-person or video consultation",
      "Select your preferred date and time slot",
      "Add notes for your provider",
    ],
  },
  {
    icon: CreditCard,
    title: "Pay Securely",
    description:
      "Complete your payment online through our secure Stripe integration. Different fees apply for in-person and video consultations.",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    details: [
      "Secure payment via Stripe",
      "Transparent pricing before booking",
      "Different rates for video vs in-person",
      "Digital receipts and invoices",
    ],
  },
  {
    icon: Video,
    title: "Attend Your Session",
    description:
      "Meet in-person or join a secure video consultation from anywhere. Get reminders so you never miss an appointment.",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    details: [
      "Join video calls directly from your dashboard",
      "HIPAA-compliant encrypted video rooms",
      "Automatic appointment reminders",
      "Easy rescheduling if needed",
    ],
  },
];

const patientFeatures = [
  {
    icon: Search,
    title: "Smart Provider Search",
    description:
      "Find the right healthcare professional with our powerful search. Filter by specialty, location, availability, ratings, and consultation type.",
    highlights: ["50+ specialties", "Location-based search", "Real-time availability"],
  },
  {
    icon: Video,
    title: "Video Consultations",
    description:
      "Consult from the comfort of your home with secure, HIPAA-compliant video calls. No downloads required—just click and connect.",
    highlights: ["Browser-based", "End-to-end encrypted", "HD video quality"],
  },
  {
    icon: CreditCard,
    title: "Transparent Pricing",
    description:
      "See exact fees before you book. Providers set separate rates for in-person and video consultations so you always know what you're paying.",
    highlights: ["No hidden fees", "Secure Stripe payments", "Digital invoices"],
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Never miss an appointment with automated email reminders. Get notified about booking confirmations, upcoming appointments, and payment receipts.",
    highlights: ["Email reminders", "Booking confirmations", "Payment alerts"],
  },
  {
    icon: RefreshCw,
    title: "Easy Rescheduling",
    description:
      "Plans change—we get it. Request to reschedule appointments directly from your dashboard. Providers can also propose alternative times.",
    highlights: ["One-click requests", "Provider proposals", "Flexible booking"],
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description:
      "Read authentic reviews from real patients who've had appointments. Only verified patients can leave reviews, ensuring trustworthy feedback.",
    highlights: ["Verified patients only", "Detailed ratings", "Honest feedback"],
  },
];

const providerFeatures = [
  {
    icon: Calendar,
    title: "Availability Management",
    description:
      "Set your working hours, break times, and days off. Patients can only book during your available slots, giving you full control over your schedule.",
    highlights: ["Custom schedules", "Block time off", "Flexible hours"],
  },
  {
    icon: Wallet,
    title: "Dual Pricing Options",
    description:
      "Set different consultation fees for in-person and video appointments. Reflect your costs accurately and let patients choose what works for them.",
    highlights: ["In-person rates", "Video rates", "Automatic calculation"],
  },
  {
    icon: BarChart3,
    title: "Earnings Dashboard",
    description:
      "Track your revenue in real-time. View completed payments, pending invoices, total earnings, and send payment reminders to patients.",
    highlights: ["Revenue tracking", "Payment status", "Financial reports"],
  },
  {
    icon: Mail,
    title: "Payment Reminders",
    description:
      "Send professional payment reminder emails to patients with unpaid appointments. Customize your message and track email delivery.",
    highlights: ["One-click reminders", "Custom messages", "Email tracking"],
  },
  {
    icon: Shield,
    title: "Profile Verification",
    description:
      "Build trust with a verified profile badge. Our team reviews credentials to ensure patients can book with confidence.",
    highlights: ["Credential review", "Trust badge", "Patient confidence"],
  },
  {
    icon: MessageSquare,
    title: "Patient Reviews",
    description:
      "Collect reviews from satisfied patients to build your online reputation. Respond to feedback and showcase your expertise.",
    highlights: ["Verified reviews", "Ratings display", "Reputation building"],
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Secure Payments",
    description: "All payments processed through Stripe with PCI-DSS compliance.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Video consultations meet healthcare privacy standards.",
  },
  {
    icon: CheckCircle,
    title: "Verified Providers",
    description: "All healthcare professionals are vetted before joining.",
  },
  {
    icon: Globe,
    title: "Data Encryption",
    description: "End-to-end encryption for all sensitive information.",
  },
];

const faqs = [
  {
    question: "Is BookEase free for patients?",
    answer:
      "Yes! Signing up, browsing providers, and using the platform is completely free for patients. You only pay for the appointment itself, and pricing is set by each provider. There are no hidden fees or subscription costs.",
  },
  {
    question: "Are video and in-person appointments priced differently?",
    answer:
      "Yes, providers can set separate fees for in-person consultations and video consultations. This allows providers to reflect different costs (office overhead, travel time, etc.) in their pricing. You'll see the exact fee before booking based on your selected appointment type.",
  },
  {
    question: "How do I cancel or reschedule an appointment?",
    answer:
      "You can cancel or request a reschedule directly from your dashboard under 'My Appointments'. Simply click the menu on your appointment card and select your option. Cancellation policies vary by provider, so check their terms before booking. Some providers may charge a cancellation fee for late cancellations.",
  },
  {
    question: "Are video consultations secure?",
    answer:
      "Absolutely. We use end-to-end encrypted video rooms to ensure your conversations remain private. Our platform is HIPAA-compliant, meaning we meet strict healthcare privacy standards. No recordings are made, and video sessions are completely private between you and your provider.",
  },
  {
    question: "How do providers get paid?",
    answer:
      "Providers connect their Stripe account during onboarding to receive payments directly. After a patient pays, funds are transferred to the provider's account. Providers can track all earnings, view pending payments, and send payment reminders to patients directly from their dashboard.",
  },
  {
    question: "What if I forget to pay for my appointment?",
    answer:
      "Your provider can send you a friendly payment reminder via email directly from their dashboard. You'll also receive notifications in your BookEase dashboard about any pending payments. Simply click the 'Pay' button on your appointment card to complete the payment.",
  },
  {
    question: "Can I see reviews before booking?",
    answer:
      "Yes! Every provider has a public profile with ratings and reviews from verified patients who've had appointments. Only patients who actually visited the provider can leave reviews, ensuring all feedback is authentic and trustworthy.",
  },
  {
    question: "How do I become a provider on BookEase?",
    answer:
      "Sign up as a provider using the 'Join as Provider' button. Complete your profile with your specialty, qualifications, and set your availability and consultation fees. Our team will review your credentials, and once verified, you'll start appearing in patient searches.",
  },
  {
    question: "What specialties are available on BookEase?",
    answer:
      "BookEase supports a wide range of healthcare specialties including General Practice, Cardiology, Dermatology, Psychiatry, Psychology, Nutrition, Physiotherapy, Pediatrics, Gynecology, Orthopedics, and many more. New specialties are added regularly based on demand.",
  },
  {
    question: "Can I book recurring appointments?",
    answer:
      "Currently, each appointment is booked individually. However, you can easily book follow-up appointments with the same provider from their profile. We're working on a recurring appointment feature for future updates.",
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <Badge className="mb-4 text-sm" variant="secondary">
            Simple • Secure • Seamless
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            How BookEase Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Book appointments with trusted healthcare professionals in four simple steps.
            No hassle, no phone calls—just seamless scheduling and secure payments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/providers">
              <Button size="lg">
                <Search className="mr-2 h-4 w-4" />
                Find a Provider
              </Button>
            </Link>
            <Link to="/auth?mode=signup&role=provider">
              <Button size="lg" variant="outline">
                Join as Provider
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps Section with Details */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">Four Simple Steps</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            From finding the right provider to attending your appointment, we've made every step intuitive and hassle-free.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${step.color}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-bold text-muted-foreground/30">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Patient Features Deep Dive */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Users className="h-3 w-3 mr-1" />
              For Patients
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Everything You Need as a Patient</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BookEase gives you complete control over your healthcare journey with powerful features designed for convenience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patientFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/providers">
              <Button size="lg">
                Start Browsing Providers
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Provider Features Deep Dive */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Star className="h-3 w-3 mr-1" />
              For Providers
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Powerful Tools for Healthcare Providers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Grow your practice, manage appointments, track earnings, and build your reputation—all from one dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providerFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/auth?mode=signup&role=provider">
              <Button size="lg" variant="outline">
                Join as Provider
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              Security & Trust
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Your Security is Our Priority</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We employ industry-leading security measures to protect your data and ensure safe transactions.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Got questions? We've got answers. Find everything you need to know about using BookEase.
          </p>
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
            seamless appointment scheduling. It's free to sign up!
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
