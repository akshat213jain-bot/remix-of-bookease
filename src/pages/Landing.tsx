import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { 
  Calendar, 
  Clock, 
  Shield, 
  Star, 
  CheckCircle2, 
  Users, 
  Stethoscope, 
  GraduationCap, 
  Briefcase, 
  Wrench,
  ArrowRight
} from "lucide-react";

const categories = [
  { icon: Stethoscope, label: "Healthcare", count: "2,500+ providers" },
  { icon: GraduationCap, label: "Education", count: "1,200+ tutors" },
  { icon: Briefcase, label: "Consulting", count: "800+ consultants" },
  { icon: Wrench, label: "Services", count: "1,500+ professionals" },
];

const features = [
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Book appointments in just a few clicks with real-time availability.",
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "No more phone calls or waiting. Instant booking confirmation.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Your data is protected with enterprise-grade security.",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Patient",
    content: "BookEase has made scheduling doctor appointments so much easier. I love being able to see available slots in real-time!",
    rating: 5,
  },
  {
    name: "Dr. Michael Chen",
    role: "Healthcare Provider",
    content: "Managing my practice schedule has never been simpler. Fewer no-shows and happier patients.",
    rating: 5,
  },
  {
    name: "Emily Davis",
    role: "Student",
    content: "Finding and booking tutoring sessions is now a breeze. Highly recommend!",
    rating: 5,
  },
];

const stats = [
  { value: "50K+", label: "Appointments Booked" },
  { value: "5K+", label: "Verified Providers" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Availability" },
];

const Landing = () => {
  const { user, role, isLoading } = useAuth();

  // Show loader while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect authenticated users to their appropriate dashboard
  if (user && role) {
    const dashboardPath = role === "admin" 
      ? "/dashboard/admin" 
      : role === "provider" 
      ? "/dashboard/provider" 
      : "/dashboard/user";
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Trusted by thousands of users
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Book Appointments with{" "}
              <span className="text-primary">Trusted Professionals</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find and book appointments with doctors, tutors, consultants, and service 
              professionals in your area. Simple, fast, and secure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/providers">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Find a Provider
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=provider">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Join as Provider
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the right professional for your needs across various categories
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.label} to={`/providers?category=${category.label.toLowerCase()}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <category.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">{category.count}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose BookEase?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make appointment booking simple, efficient, and stress-free
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-none bg-transparent">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Book your appointment in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Find a Provider", description: "Search for providers by specialty, location, or availability" },
              { step: "2", title: "Choose a Time", description: "Select from available time slots that work for your schedule" },
              { step: "3", title: "Book & Confirm", description: "Confirm your appointment and receive instant confirmation" },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied users who trust BookEase
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                Join thousands of users who have simplified their appointment booking experience with BookEase.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=signup">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/providers">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                    Browse Providers
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Landing;
