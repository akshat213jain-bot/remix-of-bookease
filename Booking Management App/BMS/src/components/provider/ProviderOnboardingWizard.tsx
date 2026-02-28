import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Briefcase,
    Clock,
    CreditCard,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Upload,
} from "lucide-react";

interface ProviderOnboardingData {
    // Step 1: Profile
    fullName: string;
    avatarUrl: string;
    bio: string;

    // Step 2: Professional
    profession: string;
    specialty: string;
    yearsOfExperience: number;
    location: string;

    // Step 3: Availability
    workDays: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;

    // Step 4: Pricing
    consultationFee: number;
    videoEnabled: boolean;
    videoConsultationFee: number;
}

interface ProviderOnboardingWizardProps {
    onComplete: (data: ProviderOnboardingData) => void;
    initialData?: Partial<ProviderOnboardingData>;
}

const STEPS = [
    { id: 1, title: "Profile", icon: User, description: "Basic information" },
    { id: 2, title: "Professional", icon: Briefcase, description: "Your expertise" },
    { id: 3, title: "Availability", icon: Clock, description: "Working hours" },
    { id: 4, title: "Pricing", icon: CreditCard, description: "Consultation fees" },
    { id: 5, title: "Review", icon: CheckCircle, description: "Confirm details" },
];

const PROFESSIONS = [
    "Doctor",
    "Dentist",
    "Therapist",
    "Consultant",
    "Lawyer",
    "Accountant",
    "Fitness Trainer",
    "Tutor",
    "Other",
];

const DAYS = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
];

export const ProviderOnboardingWizard = ({
    onComplete,
    initialData,
}: ProviderOnboardingWizardProps) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<ProviderOnboardingData>({
        fullName: initialData?.fullName || "",
        avatarUrl: initialData?.avatarUrl || "",
        bio: initialData?.bio || "",
        profession: initialData?.profession || "",
        specialty: initialData?.specialty || "",
        yearsOfExperience: initialData?.yearsOfExperience || 0,
        location: initialData?.location || "",
        workDays: initialData?.workDays || [1, 2, 3, 4, 5],
        startTime: initialData?.startTime || "09:00",
        endTime: initialData?.endTime || "17:00",
        slotDuration: initialData?.slotDuration || 30,
        consultationFee: initialData?.consultationFee || 500,
        videoEnabled: initialData?.videoEnabled || false,
        videoConsultationFee: initialData?.videoConsultationFee || 400,
    });

    const updateData = (updates: Partial<ProviderOnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return data.fullName.length >= 2;
            case 2:
                return data.profession.length > 0;
            case 3:
                return data.workDays.length > 0;
            case 4:
                return data.consultationFee >= 0;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete(data);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleDay = (day: number) => {
        if (data.workDays.includes(day)) {
            updateData({ workDays: data.workDays.filter((d) => d !== day) });
        } else {
            updateData({ workDays: [...data.workDays, day].sort() });
        }
    };

    const progress = (currentStep / 5) * 100;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="mb-8">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-4">
                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center ${step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                                }`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${step.id < currentStep
                                        ? "bg-primary text-primary-foreground"
                                        : step.id === currentStep
                                            ? "border-2 border-primary"
                                            : "border-2 border-muted"
                                    }`}
                            >
                                {step.id < currentStep ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <step.icon className="h-4 w-4" />
                                )}
                            </div>
                            <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                    <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Profile */}
                    {currentStep === 1 && (
                        <>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={data.avatarUrl || undefined} />
                                    <AvatarFallback>
                                        {data.fullName.split(" ").map((n) => n[0]).join("") || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Photo
                                </Button>
                            </div>
                            <div>
                                <Label>Full Name *</Label>
                                <Input
                                    value={data.fullName}
                                    onChange={(e) => updateData({ fullName: e.target.value })}
                                    placeholder="Dr. John Doe"
                                />
                            </div>
                            <div>
                                <Label>Bio</Label>
                                <Textarea
                                    value={data.bio}
                                    onChange={(e) => updateData({ bio: e.target.value })}
                                    placeholder="Tell potential clients about yourself..."
                                    rows={4}
                                />
                            </div>
                        </>
                    )}

                    {/* Step 2: Professional */}
                    {currentStep === 2 && (
                        <>
                            <div>
                                <Label>Profession *</Label>
                                <Select
                                    value={data.profession}
                                    onValueChange={(v) => updateData({ profession: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select profession" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROFESSIONS.map((p) => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Specialty</Label>
                                <Input
                                    value={data.specialty}
                                    onChange={(e) => updateData({ specialty: e.target.value })}
                                    placeholder="e.g., Cardiology, Family Law"
                                />
                            </div>
                            <div>
                                <Label>Years of Experience</Label>
                                <Input
                                    type="number"
                                    value={data.yearsOfExperience}
                                    onChange={(e) => updateData({ yearsOfExperience: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>
                            <div>
                                <Label>Location</Label>
                                <Input
                                    value={data.location}
                                    onChange={(e) => updateData({ location: e.target.value })}
                                    placeholder="City, Country"
                                />
                            </div>
                        </>
                    )}

                    {/* Step 3: Availability */}
                    {currentStep === 3 && (
                        <>
                            <div>
                                <Label className="mb-3 block">Working Days *</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS.map((day) => (
                                        <Badge
                                            key={day.value}
                                            variant={data.workDays.includes(day.value) ? "default" : "outline"}
                                            className="cursor-pointer px-3 py-1"
                                            onClick={() => toggleDay(day.value)}
                                        >
                                            {day.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Start Time</Label>
                                    <Input
                                        type="time"
                                        value={data.startTime}
                                        onChange={(e) => updateData({ startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>End Time</Label>
                                    <Input
                                        type="time"
                                        value={data.endTime}
                                        onChange={(e) => updateData({ endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Slot Duration (minutes)</Label>
                                <Select
                                    value={data.slotDuration.toString()}
                                    onValueChange={(v) => updateData({ slotDuration: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="45">45 minutes</SelectItem>
                                        <SelectItem value="60">60 minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* Step 4: Pricing */}
                    {currentStep === 4 && (
                        <>
                            <div>
                                <Label>Consultation Fee (₹)</Label>
                                <Input
                                    type="number"
                                    value={data.consultationFee}
                                    onChange={(e) => updateData({ consultationFee: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Enable Video Consultations</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Allow patients to book video calls
                                    </p>
                                </div>
                                <Switch
                                    checked={data.videoEnabled}
                                    onCheckedChange={(v) => updateData({ videoEnabled: v })}
                                />
                            </div>
                            {data.videoEnabled && (
                                <div>
                                    <Label>Video Consultation Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        value={data.videoConsultationFee}
                                        onChange={(e) => updateData({ videoConsultationFee: parseInt(e.target.value) || 0 })}
                                        min={0}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 5: Review */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Profile</h4>
                                <p>{data.fullName}</p>
                                {data.bio && <p className="text-sm text-muted-foreground mt-1">{data.bio}</p>}
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Professional</h4>
                                <p>{data.profession} {data.specialty && `• ${data.specialty}`}</p>
                                <p className="text-sm text-muted-foreground">{data.yearsOfExperience} years experience • {data.location}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Availability</h4>
                                <p>{data.workDays.map((d) => DAYS[d].label).join(", ")}</p>
                                <p className="text-sm text-muted-foreground">{data.startTime} - {data.endTime} • {data.slotDuration}min slots</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Pricing</h4>
                                <p>₹{data.consultationFee} per session</p>
                                {data.videoEnabled && (
                                    <p className="text-sm text-muted-foreground">Video: ₹{data.videoConsultationFee}</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Button onClick={handleNext} disabled={!canProceed()}>
                    {currentStep === 5 ? "Complete Setup" : "Next"}
                    {currentStep < 5 && <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
};

export default ProviderOnboardingWizard;
