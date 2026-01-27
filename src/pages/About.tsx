import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const values = [
  {
    icon: Heart,
    title: "Patient-First",
    description:
      "Every decision we make prioritizes the patient experience. Healthcare should be accessible, transparent, and stress-free.",
  },
  {
    icon: Target,
    title: "Quality Care",
    description:
      "We partner only with verified, qualified professionals who meet our rigorous standards for excellence.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We continuously improve our platform with cutting-edge technology to make healthcare scheduling effortless.",
  },
];

const stats = [
  { value: "50,000+", label: "Appointments Booked" },
  { value: "1,200+", label: "Verified Providers" },
  { value: "98%", label: "Patient Satisfaction" },
  { value: "24/7", label: "Online Booking" },
];

const team = [
  {
    name: "Dr. Sarah Chen",
    role: "CEO & Co-Founder",
    bio: "Former healthcare executive with 15+ years transforming patient experiences.",
    initials: "SC",
  },
  {
    name: "Michael Torres",
    role: "CTO & Co-Founder",
    bio: "Tech veteran who built scalable platforms at leading healthcare startups.",
    initials: "MT",
  },
  {
    name: "Emily Watson",
    role: "Head of Operations",
    bio: "Operations expert ensuring seamless experiences for patients and providers.",
    initials: "EW",
  },
  {
    name: "James Kim",
    role: "Head of Provider Success",
    bio: "Dedicated to helping healthcare professionals grow their practices.",
    initials: "JK",
  },
];

const milestones = [
  { year: "2022", event: "BookEase founded with a mission to simplify healthcare access" },
  { year: "2023", event: "Launched video consultations and reached 10,000 bookings" },
  { year: "2024", event: "Expanded to 1,000+ providers across multiple specialties" },
  { year: "2025", event: "Introduced AI-powered scheduling and waitlist features" },
];

const About = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            About BookEase
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to make healthcare accessible by connecting
            patients with trusted providers through seamless online booking.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                Healthcare scheduling shouldn't be complicated. We believe
                everyone deserves easy access to quality care without the
                frustration of long wait times, phone tag, or confusing
                processes.
              </p>
              <p className="text-muted-foreground mb-6">
                BookEase was born from a simple idea: what if booking a doctor's
                appointment was as easy as booking a dinner reservation? Today,
                we're making that vision a reality for thousands of patients and
                providers.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  "Instant online booking",
                  "Verified providers",
                  "Secure video calls",
                  "Smart reminders",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {values.map((value) => (
                <Card
                  key={value.title}
                  className={`${
                    value.title === "Innovation" ? "col-span-2" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
                      <value.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            BookEase by the Numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Journey</h2>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {milestone.year}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <p className="text-muted-foreground">{milestone.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">Meet Our Team</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            We're a passionate team of healthcare and technology experts
            dedicated to transforming how people access care.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <Card key={member.name} className="text-center">
                <CardContent className="p-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {member.bio}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Join the BookEase Community</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Whether you're a patient looking for care or a provider ready to
            grow your practice, we're here to help.
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
