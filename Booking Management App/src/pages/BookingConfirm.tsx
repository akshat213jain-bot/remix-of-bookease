import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";

const BookingConfirm = () => {
  return (
    <Layout>
      <div className="container py-16">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Booking Request Submitted!</h1>
            <p className="text-muted-foreground mb-8">
              Your appointment request has been sent to the provider. You'll receive a notification once it's confirmed.
            </p>

            <div className="space-y-3">
              <Link to="/dashboard/user">
                <Button className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  View My Appointments
                </Button>
              </Link>
              <Link to="/providers">
                <Button variant="outline" className="w-full">
                  Book Another Appointment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BookingConfirm;
