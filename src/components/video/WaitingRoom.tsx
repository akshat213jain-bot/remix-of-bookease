import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WaitingRoomProps {
    providerName: string;
    onLeave: () => void;
}

export const WaitingRoom = ({ providerName, onLeave }: WaitingRoomProps) => {
    return (
        <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
                {/* Animated waiting indicator */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                    <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                </div>

                {/* Waiting message */}
                <h2 className="text-xl font-semibold mb-2">Please wait...</h2>
                <p className="text-muted-foreground mb-6">
                    <span className="font-medium text-foreground">{providerName}</span>
                    {" "}will let you in shortly
                </p>

                {/* Leave button */}
                <Button variant="outline" onClick={onLeave} className="mb-6">
                    Leave Waiting Room
                </Button>

                {/* Tips section */}
                <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                        💡 <span className="font-medium">While you wait:</span>
                    </p>
                    <ul className="text-sm text-muted-foreground text-left space-y-1">
                        <li>• Check your camera and microphone</li>
                        <li>• Find a quiet, well-lit space</li>
                        <li>• Close unnecessary browser tabs</li>
                        <li>• Have any relevant documents ready</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};
