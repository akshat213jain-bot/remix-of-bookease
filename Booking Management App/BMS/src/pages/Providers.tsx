import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Star, Loader2, Stethoscope, Scale, Scissors, Brain, Briefcase, Sparkles } from "lucide-react";
import { useProviders } from "@/hooks/useProviders";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import { VerificationBadge } from "@/components/providers/VerificationBadge";

const categoryIcons = [
  { value: "doctor", label: "Doctors", icon: Stethoscope },
  { value: "lawyer", label: "Lawyers", icon: Scale },
  { value: "barber", label: "Barbers", icon: Scissors },
  { value: "therapist", label: "Therapists", icon: Brain },
  { value: "consultant", label: "Consultants", icon: Briefcase },
  { value: "stylist", label: "Stylists", icon: Sparkles },
];

const categories = [
  { value: "all", label: "All Categories" },
  { value: "General Physician", label: "General Physician" },
  { value: "Cardiologist", label: "Cardiologist" },
  { value: "Dermatologist", label: "Dermatologist" },
  { value: "Pediatrician", label: "Pediatrician" },
  { value: "Math Tutor", label: "Math Tutor" },
  { value: "Science Tutor", label: "Science Tutor" },
  { value: "Business Consultant", label: "Business Consultant" },
  { value: "Financial Advisor", label: "Financial Advisor" },
  { value: "Fitness Trainer", label: "Fitness Trainer" },
];

const Providers = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState("recommended");

  // Always fetch providers - show all by default
  const { data: providers, isLoading, error } = useProviders(
    selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
    searchQuery
  );

  const currency = useCurrencySettings();

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Sort providers
  const sortedProviders = [...(providers || [])].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (a.consultation_fee || 0) - (b.consultation_fee || 0);
      case "price-high":
        return (b.consultation_fee || 0) - (a.consultation_fee || 0);
      case "experience":
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      default:
        return 0;
    }
  });

  const formatPrice = (amount: number | null) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Find Your Perfect Professional</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Book appointments with top doctors, lawyers, barbers, and more
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
            <Button size="lg" className="h-12 px-8">
              Search
            </Button>
          </div>
        </div>

        {/* Browse by Category */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6 text-center">Browse by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categoryIcons.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:border-primary hover:bg-primary/5 ${
                  selectedCategory === category.value ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <category.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="experience">Most Experienced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load providers. Please try again.</p>
          </div>
        )}

        {/* Providers List */}
        {!isLoading && !error && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Featured Professionals</h2>
              <p className="text-sm text-muted-foreground">
                {sortedProviders.length} provider{sortedProviders.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {sortedProviders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No providers found matching your criteria.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedProviders.map((provider) => (
                  <Card key={provider.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    <CardContent className="p-6">
                      {/* Provider Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/20">
                          <AvatarImage src={provider.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-lg bg-primary/10 text-primary">
                            {getInitials(provider.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg truncate">
                              {provider.profile?.full_name || "Provider"}
                            </h3>
                            <VerificationBadge 
                              isVerified={(provider as any).is_verified || false}
                              verificationType={(provider as any).verification_type}
                              size="sm"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.profession}
                          </p>
                          {(provider.average_rating ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-medium">{provider.average_rating?.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">({provider.total_reviews})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-border mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Experience</p>
                          <p className="font-medium">
                            {provider.years_of_experience ? `${provider.years_of_experience} years` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Next Available</p>
                          <p className="font-medium text-primary">Today</p>
                        </div>
                      </div>

                      {/* Book Button */}
                      <Link to={`/providers/${provider.id}`} className="block">
                        <Button className="w-full">
                          Book Appointment • {formatPrice(provider.consultation_fee)}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Providers;
