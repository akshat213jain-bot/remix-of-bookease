"use client";

import { useState, useEffect, ChangeEvent, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Loader2, Sparkles, Film, Upload } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { generateAvatar } from "@/ai/flows/generate-avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // State for editable fields
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  
  // State for UI and functionality
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Effect to populate form when user data is available
  useEffect(() => {
    if (user) {
      setName(user.displayName ?? "");
      setPhotoURL(user.photoURL ?? "");
    }
  }, [user]);

  // Handle form submission
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Firebase Auth has a limit on the URL length.
    if (photoURL && photoURL.length > 2048) {
      toast({
        title: "Image Too Large",
        description: "The selected image is too large to be saved. Please choose a smaller image.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoURL,
      });

      refreshUser(); // Refresh the user state in the auth context

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file input change
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result.length > 2048 * 1.5) { // Estimate final length, as base64 is ~33% larger
             toast({
                title: "Image Too Large",
                description: "This image is too large. Please select a file smaller than 1MB.",
                variant: "destructive"
            });
            return;
        }
        setPhotoURL(result);
         toast({
          title: "Image selected",
          description: "Click 'Save Changes' to update your profile picture."
        })
      };
      reader.readAsDataURL(file);
      e.target.value = ""; // Reset input value
    }
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for your avatar.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAvatar({ prompt: avatarPrompt });
      setPhotoURL(result.avatarDataUri);
      toast({
        title: "Avatar Generated!",
        description: "Your new avatar has been created. Don't forget to save your profile.",
      })
    } catch (error: any) {
      console.error("Avatar generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "An unexpected error occurred while generating the avatar.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsGenerateModalOpen(false);
    }
  };

  const isVideo = photoURL && photoURL.startsWith('data:video');

  return (
    <>
      <div className="grid gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your avatar. This will be visible to other users.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative">
                        <Avatar className="h-24 w-24 cursor-pointer">
                          {isVideo ? (
                            <video src={photoURL} autoPlay loop muted playsInline className="aspect-square h-full w-full object-cover" />
                          ) : (
                            <AvatarImage src={photoURL || undefined} data-ai-hint="user avatar" />
                          )}
                          <AvatarFallback>
                            <User className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold rounded-full opacity-0 hover:opacity-100 transition-opacity">
                            Change
                        </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsGenerateModalOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="space-y-1">
                    <h3 className="font-semibold">{name}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="w-full text-xs text-muted-foreground pt-2">Click the avatar to upload an image or generate a new one with AI.</p>
                </div>
                
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg"
                    onChange={onFileChange}
                  />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
              </div>
            </CardContent>
             <CardFooter className="flex justify-end">
                 <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
             </CardFooter>
          </Card>
        </form>

        <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Your account-specific information.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value="**** **** 0000"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kycStatus">KYC Status</Label>
                   <div className="flex items-center pt-2">
                     <Badge variant="secondary" className="bg-green-200 text-green-800">
                        Verified
                      </Badge>
                   </div>
                </div>
            </CardContent>
        </Card>
      </div>

       <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Avatar</DialogTitle>
            <DialogDescription>Describe the avatar you want to create. Be creative!</DialogDescription>
          </DialogHeader>
            <div className="space-y-4 py-4">
            <Label htmlFor="avatar-prompt">Prompt</Label>
            <Textarea 
              id="avatar-prompt" 
              placeholder="e.g., A majestic lion wearing a crown, in a pop art style" 
              value={avatarPrompt}
              onChange={(e) => setAvatarPrompt(e.target.value)}
              rows={3}
            />
            </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isGenerating}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleGenerateAvatar} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
