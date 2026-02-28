import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  MapPin,
  DollarSign,
  Briefcase,
  Loader2,
  Video,
  Star,
} from "lucide-react";
import { useProvider } from "@/hooks/useProviders";
import { useAvailableSlots, useAppointments, RecurrencePattern } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay } from "date-fns";
import RecurringBookingOptions from "@/components/booking/RecurringBookingOptions";
import JoinWaitlistDialog from "@/components/waitlist/JoinWaitlistDialog";
import ProviderReviewsList from "@/components/reviews/ProviderReviewsList";
import { VerificationBadge } from "@/components/providers/VerificationBadge";
import { formatCurrencyValue } from "@/lib/currency";

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: provider, isLoading, error } = useProvider(id);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ start: string; end: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [isVideoConsultation, setIsVideoConsultation] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(id, selectedDate);
  const { createAppointmentAsync, isCreating } = useAppointments();

  // Check if provider offers video consultations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoEnabled = (provider as any)?.video_enabled;

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleBooking = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!id || !selectedDate || !selectedTime) return;

    try {
      // Get consultation fee
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fee = isVideoConsultation && (provider as any)?.video_consultation_fee
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (provider as any).video_consultation_fee
        : provider?.consultation_fee;

      // Create the appointment first
      const appointment = await createAppointmentAsync({
        provider_id: id,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedTime.start,
        end_time: selectedTime.end,
        notes: notes || undefined,
        is_video_consultation: isVideoConsultation,
        recurrence_pattern: recurrencePattern,
        recurrence_end_date: recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : undefined,
      });

      // If there's a consultation fee, process payment
      if (fee && fee > 0) {
        setIsProcessingPayment(true);
        try {
          const { data, error: paymentError } = await supabase.functions.invoke("create-appointment-payment", {
            body: {
              appointment_id: appointment.id,
              amount: Math.round(fee * 100), // Convert to cents
              provider_name: provider?.profile?.full_name || "Provider",
              appointment_date: format(selectedDate, "MMM d, yyyy"),
              start_time: selectedTime.start,
            },
          });

          if (paymentError) throw paymentError;

          if (data?.url) {
            // Redirect to Stripe Checkout
            window.open(data.url, "_blank");
            navigate("/booking/confirm");
          } else {
            navigate("/booking/confirm");
          }
        } catch (err) {
          console.error("Payment error:", err);
          toast({
            title: "Payment Setup",
            description: "Your appointment has been booked. Payment can be completed later.",
          });
          navigate("/booking/confirm");
        } finally {
          setIsProcessingPayment(false);
        }
      } else {
        navigate("/booking/confirm");
      }
    } catch {
      // Error is handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !provider) {
    return (
      <Layout>
        <div className="container py-8">
          <Link
            to="/providers"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to providers
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Provider not found.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <Link
          to="/providers"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to providers
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={provider.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(provider.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl font-bold">
                        {provider.profile?.full_name || "Provider"}
                      </h1>
                      <VerificationBadge
                        isVerified={(provider as any).is_verified || false}
                        verificationType={(provider as any).verification_type}
                        size="md"
                        showLabel
                      />
                    </div>
                    <p className="text-lg text-muted-foreground mb-4">
                      {provider.profession}
                      {provider.specialty && ` • ${provider.specialty}`}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {provider.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{provider.location}</span>
                        </div>
                      )}
                      {provider.years_of_experience && provider.years_of_experience > 0 && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span>{provider.years_of_experience} years experience</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {provider.consultation_fee
                            ? `${formatCurrencyValue(provider.consultation_fee)} per session`
                            : "Free consultation"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="about">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="reviews" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {provider.bio ? (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {provider.bio}
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No bio provided yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{provider.profession}</h4>
                          {provider.specialty && (
                            <p className="text-sm text-muted-foreground">
                              Specializing in {provider.specialty}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {provider.consultation_fee
                              ? formatCurrencyValue(provider.consultation_fee)
                              : "Free"}
                          </p>
                          <p className="text-xs text-muted-foreground">per session</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <ProviderReviewsList
                  providerId={id || ""}
                  averageRating={(provider as any)?.average_rating}
                  totalReviews={(provider as any)?.total_reviews || 0}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book an Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    className="rounded-md border w-full"
                    disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 60)}
                  />
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <Label className="mb-2 block">Available Times</Label>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : slots && slots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <Button
                            key={slot.start}
                            variant={
                              selectedTime?.start === slot.start
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            disabled={!slot.available}
                            onClick={() =>
                              setSelectedTime({ start: slot.start, end: slot.end })
                            }
                            className="text-xs"
                          >
                            {slot.start}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No available slots for this date.
                      </p>
                    )}
                  </div>
                )}

                {/* Video Consultation Toggle */}
                {selectedTime && videoEnabled && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <div>
                        <Label htmlFor="video" className="text-sm font-medium">
                          Video Consultation
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Join via video call instead of in-person
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="video"
                      checked={isVideoConsultation}
                      onCheckedChange={setIsVideoConsultation}
                    />
                  </div>
                )}

                {/* Recurring Booking Options */}
                {selectedTime && (
                  <RecurringBookingOptions
                    recurrencePattern={recurrencePattern}
                    onRecurrencePatternChange={setRecurrencePattern}
                    recurrenceEndDate={recurrenceEndDate}
                    onRecurrenceEndDateChange={setRecurrenceEndDate}
                    selectedDate={selectedDate}
                  />
                )}

                {/* Notes */}
                {selectedTime && (
                  <div>
                    <Label htmlFor="notes" className="mb-2 block">
                      Notes (optional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific concerns or information for the provider..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Book Button */}
                <Button
                  className="w-full"
                  disabled={!selectedDate || !selectedTime || isCreating || isProcessingPayment}
                  onClick={handleBooking}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : !user ? (
                    "Sign in to Book"
                  ) : (
                    "Book Appointment"
                  )}
                </Button>

                {selectedDate && selectedTime && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime.start}
                    </p>
                    {isVideoConsultation && (
                      <p className="flex items-center justify-center gap-1 text-primary mt-1">
                        <Video className="h-3 w-3" />
                        Video Consultation
                      </p>
                    )}
                    {(() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const fee = isVideoConsultation && (provider as any)?.video_consultation_fee
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ? (provider as any).video_consultation_fee
                        : provider?.consultation_fee;
                      return fee && fee > 0 ? (
                        <p className="font-medium text-foreground mt-1">
                          Total: {formatCurrencyValue(fee)}
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Waitlist Option */}
                {!selectedTime && user && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Can't find a suitable time?
                    </p>
                    <JoinWaitlistDialog
                      providerId={id || ""}
                      providerName={provider?.profile?.full_name || "this provider"}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProviderDetail;
