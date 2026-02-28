import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Target,
  Lightbulb,
  Users,
  Calendar,
  Star,
  CheckCircle,
  ChevronRight,
  Linkedin,
  Twitter,
  Shield,
  Video,
  CreditCard,
  Clock,
  Globe,
  Zap,
  Lock,
  Smartphone,
  TrendingUp,
  Award,
  Building,
  Stethoscope,
  Brain,
  Sparkles,
  Github,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Core values that drive BookEase
const coreValues = [
  {
    icon: Heart,
    title: "Patient-First Approach",
    description:
      "Every feature, every decision, every line of code is designed with the patient experience in mind. Healthcare should be accessible, transparent, and stress-free for everyone.",
  },
  {
    icon: Target,
    title: "Quality Without Compromise",
    description:
      "We partner only with verified, qualified healthcare professionals who meet our rigorous standards. Your health deserves nothing less than excellence.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Innovation",
    description:
      "Technology evolves, and so do we. We continuously improve our platform with cutting-edge features to make healthcare scheduling effortless and intuitive.",
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description:
      "Your data is sacred. We employ industry-leading security measures, HIPAA compliance, and encrypted communications to protect your privacy.",
  },
];

// Platform statistics
const stats = [
  { value: "50,000+", label: "Appointments Booked", description: "Successful consultations facilitated" },
  { value: "1,200+", label: "Verified Providers", description: "Trusted healthcare professionals" },
  { value: "98%", label: "Patient Satisfaction", description: "Based on post-appointment reviews" },
  { value: "24/7", label: "Online Booking", description: "Book anytime, anywhere" },
  { value: "50+", label: "Specialties", description: "From general practice to specialists" },
  { value: "<2 min", label: "Average Booking Time", description: "Quick and hassle-free" },
];

// What makes BookEase different
const differentiators = [
  {
    icon: Video,
    title: "Integrated Video Consultations",
    description:
      "No external apps needed. Join secure, HIPAA-compliant video calls directly from your browser with end-to-end encryption.",
  },
  {
    icon: CreditCard,
    title: "Transparent Pricing",
    description:
      "See exact fees before booking. Providers set different rates for in-person and video consultations—no hidden charges, ever.",
  },
  {
    icon: Clock,
    title: "Real-Time Availability",
    description:
      "No more phone tag. See live availability and book instantly. Get immediate confirmation without waiting for callbacks.",
  },
  {
    icon: Shield,
    title: "Verified Providers Only",
    description:
      "Every healthcare professional on our platform is credential-verified. Read authentic reviews from real patients.",
  },
  {
    icon: Zap,
    title: "Smart Payment System",
    description:
      "Secure Stripe payments, automated receipts, provider earnings dashboard, and payment reminder system all built-in.",
  },
  {
    icon: Globe,
    title: "Access From Anywhere",
    description:
      "Whether you're at home, traveling, or at work—book appointments and attend video consultations from any device.",
  },
];

// Technology stack highlights
const techFeatures = [
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "PCI-DSS compliant payments, HIPAA-ready video, SOC 2 audit logging, and encrypted data storage.",
  },
  {
    icon: Smartphone,
    title: "Modern Architecture",
    description: "Built with React, TypeScript, and Supabase for a fast, reliable, and scalable experience.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Providers get detailed earnings dashboards, patient analytics, and business intelligence tools.",
  },
  {
    icon: Sparkles,
    title: "Intelligent Features",
    description: "Smart reminders, automated notifications, reschedule requests, and streamlined workflows.",
  },
];

// Specialties supported
const specialties = [
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Psychiatry",
  "Psychology",
  "Nutrition",
  "Physiotherapy",
  "Pediatrics",
  "Gynecology",
  "Orthopedics",
  "Neurology",
  "Endocrinology",
  "ENT",
  "Ophthalmology",
  "Dentistry",
  "And Many More...",
];

// Journey milestones
const milestones = [
  {
    year: "2025",
    quarter: "Q1",
    title: "The Beginning",
    event: "BookEase founded by Akshat Jain with a mission to simplify healthcare access and eliminate the frustration of appointment scheduling.",
  },
  {
    year: "2025",
    quarter: "Q2",
    title: "Platform Launch",
    event: "Launched the core booking platform with provider profiles, real-time availability, and integrated video consultations.",
  },
  {
    year: "2025",
    quarter: "Q4",
    title: "Payment Integration",
    event: "Introduced secure Stripe payments with transparent pricing, different rates for video vs in-person consultations.",
  },
  {
    year: "2026",
    quarter: "Q1",
    title: "Provider Tools",
    event: "Launched comprehensive provider dashboard with earnings tracking, pending payments management, and email payment reminders.",
  },
  {
    year: "2026",
    quarter: "Future",
    title: "What's Next",
    event: "AI-powered provider matching, mobile apps, recurring appointments, and expanded specialty coverage on the roadmap.",
  },
];

// Founder information
const founder = {
  name: "Akshat Jain",
  role: "Founder & CEO",
  bio: "Akshat Jain is the visionary entrepreneur behind BookEase. Driven by a passion for making healthcare accessible to everyone, he identified the pain points in traditional appointment booking—long wait times, phone tag, lack of transparency—and set out to solve them with technology.",
  longBio: [
    "With a background in software development and a deep understanding of user experience, Akshat built BookEase from the ground up to be the platform he wished existed when trying to book his own healthcare appointments.",
    "His vision goes beyond just booking—he's building an ecosystem where patients can easily find trusted providers, consult via video from anywhere, pay transparently, and receive quality care without the traditional healthcare scheduling hassles.",
    "Under his leadership, BookEase has grown to support thousands of appointments, hundreds of verified providers across 50+ specialties, all while maintaining a 98% patient satisfaction rate.",
  ],
  initials: "AJ",
};

// Problem and solution
const problemSolution = {
  problems: [
    "Spending hours on hold trying to book an appointment",
    "Playing phone tag with clinics for days",
    "No visibility into provider availability",
    "Surprise bills with hidden fees",
    "Difficulty finding specialists in your area",
    "No option for video consultations",
  ],
  solutions: [
    "Book appointments in under 2 minutes, 24/7",
    "Instant confirmation—no callbacks needed",
    "Real-time calendar with live availability",
    "Transparent pricing shown before booking",
    "Search and filter across 50+ specialties",
    "Integrated HIPAA-compliant video calls",
  ],
};

const About = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <Badge className="mb-4" variant="secondary">
            Transforming Healthcare Access
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            About BookEase
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            We're on a mission to eliminate the frustration of healthcare scheduling.
            BookEase connects patients with trusted providers through seamless online booking,
            secure video consultations, and transparent pricing—making quality healthcare accessible to everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/how-it-works">
              <Button size="lg">
                See How It Works
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/providers">
              <Button size="lg" variant="outline">
                Browse Providers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Problem We're Solving</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Traditional healthcare scheduling is broken. We built BookEase to fix it.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="text-2xl">😤</span> The Old Way
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {problemSolution.problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-red-500 mt-1">✗</span>
                      {problem}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <span className="text-2xl">😊</span> The BookEase Way
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {problemSolution.solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      {solution}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Core Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make and every feature we build.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value) => (
              <Card key={value.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />
              Why BookEase
            </Badge>
            <h2 className="text-3xl font-bold mb-4">What Makes Us Different</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're not just another booking platform. Here's what sets BookEase apart.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentiators.map((item) => (
              <Card key={item.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            BookEase by the Numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/90 font-medium text-sm">
                  {stat.label}
                </div>
                <div className="text-primary-foreground/60 text-xs mt-1">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Stethoscope className="h-3 w-3 mr-1" />
              Wide Coverage
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Specialties We Support</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find providers across a wide range of healthcare specialties, with more being added regularly.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {specialties.map((specialty) => (
              <Badge
                key={specialty}
                variant="secondary"
                className="text-sm py-2 px-4"
              >
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Brain className="h-3 w-3 mr-1" />
              Built for Scale
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Technology & Security</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with modern technology and enterprise-grade security to ensure reliability, speed, and privacy.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techFeatures.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardContent className="p-6">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
            <p className="text-muted-foreground">
              From idea to a platform trusted by thousands—here's how we got here.
            </p>
          </div>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={`${milestone.year}-${milestone.quarter}`} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex flex-col items-center justify-center font-bold text-sm">
                    <span>{milestone.year}</span>
                    <span className="text-xs opacity-80">{milestone.quarter}</span>
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                <div className="pb-8 flex-1">
                  <h3 className="font-semibold text-lg mb-1">{milestone.title}</h3>
                  <p className="text-muted-foreground">{milestone.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Award className="h-3 w-3 mr-1" />
              Leadership
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Meet the Founder</h2>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div className="flex-shrink-0">
                  <Avatar className="h-32 w-32">
                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                      {founder.initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-1">{founder.name}</h3>
                  <p className="text-primary font-medium mb-4">{founder.role}</p>
                  <p className="text-muted-foreground mb-4">{founder.bio}</p>
                  {founder.longBio.map((paragraph, index) => (
                    <p key={index} className="text-muted-foreground mb-3 text-sm">
                      {paragraph}
                    </p>
                  ))}
                  <div className="flex gap-2 justify-center md:justify-start mt-4">
                    <Button variant="outline" size="icon">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Github className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Join the BookEase Community</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Whether you're a patient looking for quality care or a provider ready to
            grow your practice, BookEase is here to help. Sign up today—it's free!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary">
                Get Started Free
              </Button>
            </Link>
            <Link to="/auth?mode=signup&role=provider">
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
              >
                Join as Provider
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
