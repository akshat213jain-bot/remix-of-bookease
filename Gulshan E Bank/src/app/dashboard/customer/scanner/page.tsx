
"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QrCode, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const QR_READER_ID = "qr-reader";

export default function ScannerPage() {
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const startScan = async () => {
    setError(null);
    setIsScanning(true);
    try {
      const qrScanner = new Html5Qrcode(QR_READER_ID);
      setScanner(qrScanner);

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScanResult(decodedText);
          stopScan(qrScanner);
        },
        (errorMessage) => {
          // This callback is called frequently, ignore common errors
          if (!errorMessage.includes("No QR code found")) {
            console.warn(`QR Code no longer in view: ${errorMessage}`);
          }
        }
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      let friendlyError = "Could not start the QR scanner. Please ensure you have a camera and have granted permission.";
      if (err.name === "NotAllowedError") {
          friendlyError = "Camera access was denied. Please enable camera permissions in your browser settings.";
      } else if (err.name === "NotFoundError") {
          friendlyError = "No camera found on this device. Please use a device with a camera.";
      }
      setError(friendlyError);
      setIsScanning(false);
    }
  };

  const stopScan = (scannerInstance: Html5Qrcode | null = scanner) => {
    if (scannerInstance && scannerInstance.getState() === Html5QrcodeScannerState.SCANNING) {
      scannerInstance.stop()
        .then(() => {
            console.log("Scanner stopped.");
            setIsScanning(false);
            if (scannerInstance === scanner) {
              setScanner(null);
            }
        })
        .catch(err => console.error("Error stopping scanner:", err));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, [scanner]);


  const handlePayment = () => {
    toast({
      title: "Payment Confirmed",
      description: `Payment initiated for: ${scanResult}`,
    });
    setScanResult(null);
  };
  
  const handleModalClose = () => {
    setScanResult(null);
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Scan & Pay</h1>
      <Card>
        <CardContent className="p-6">
           <div className="relative aspect-square max-w-lg mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
              <div id={QR_READER_ID} className="w-full"></div>
              
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 z-10">
                  {error ? (
                     <Alert variant="destructive" className="bg-red-500/90 text-white border-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <QrCode className="w-24 h-24 mb-4" />
                      <h2 className="text-2xl font-semibold mb-2">Ready to Scan</h2>
                      <p className="text-center mb-6">Click the button below to start your camera and scan a QR code for payment.</p>
                      <Button onClick={startScan} size="lg">
                        Start Scanner
                      </Button>
                    </>
                  )}
                </div>
              )}

               {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                    <div className="w-64 h-64 border-4 border-dashed border-primary/80 rounded-lg"></div>
                    <p className="mt-4 text-white bg-black/50 px-3 py-1 rounded-md flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                    </p>
                </div>
               )}
           </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!scanResult} onOpenChange={ (open) => !open && handleModalClose() }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              You are about to make a payment based on the scanned QR code. Please confirm the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <p className="text-sm text-muted-foreground">Scanned Data:</p>
             <div className="p-4 bg-secondary rounded-md break-all">
                <code>{scanResult}</code>
             </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePayment}>Confirm & Pay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
