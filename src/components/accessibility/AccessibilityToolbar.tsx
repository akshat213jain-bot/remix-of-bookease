import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Accessibility,
    Eye,
    ZoomIn,
    ZoomOut,
    Pause,
    Type,
    Contrast,
    Keyboard,
} from "lucide-react";

interface AccessibilityPreferences {
    high_contrast_mode: boolean;
    font_size: string;
    reduced_motion: boolean;
    color_blind_mode: string;
    screen_reader_optimized: boolean;
    keyboard_navigation: boolean;
    focus_indicators_enhanced: boolean;
    dyslexia_font: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
    high_contrast_mode: false,
    font_size: "medium",
    reduced_motion: false,
    color_blind_mode: "none",
    screen_reader_optimized: false,
    keyboard_navigation: true,
    focus_indicators_enhanced: false,
    dyslexia_font: false,
};

const fontSizeMap: Record<string, string> = {
    small: "14px",
    medium: "16px",
    large: "18px",
    "extra-large": "20px",
};

export function AccessibilityToolbar() {
    const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadPreferences();
    }, []);

    useEffect(() => {
        applyPreferences(preferences);
    }, [preferences]);

    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase.functions.invoke("accessibility", {
                body: { action: "get" },
            });

            if (error) throw error;

            if (data.preferences) {
                setPreferences({ ...defaultPreferences, ...data.preferences });
            }
        } catch (error) {
            console.error("Failed to load accessibility preferences:", error);
        }
    };

    const savePreferences = async (newPrefs: Partial<AccessibilityPreferences>) => {
        const updatedPrefs = { ...preferences, ...newPrefs };
        setPreferences(updatedPrefs);

        try {
            setLoading(true);
            const { error } = await supabase.functions.invoke("accessibility", {
                body: { action: "update", preferences: updatedPrefs },
            });

            if (error) throw error;
        } catch (error) {
            console.error("Failed to save preferences:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyPreferences = (prefs: AccessibilityPreferences) => {
        const root = document.documentElement;

        // High contrast mode
        if (prefs.high_contrast_mode) {
            root.classList.add("high-contrast");
        } else {
            root.classList.remove("high-contrast");
        }

        // Font size
        root.style.setProperty("--base-font-size", fontSizeMap[prefs.font_size] || "16px");

        // Reduced motion
        if (prefs.reduced_motion) {
            root.classList.add("reduce-motion");
        } else {
            root.classList.remove("reduce-motion");
        }

        // Color blind mode
        root.setAttribute("data-color-blind", prefs.color_blind_mode);

        // Enhanced focus indicators
        if (prefs.focus_indicators_enhanced) {
            root.classList.add("enhanced-focus");
        } else {
            root.classList.remove("enhanced-focus");
        }

        // Dyslexia font
        if (prefs.dyslexia_font) {
            root.classList.add("dyslexia-font");
        } else {
            root.classList.remove("dyslexia-font");
        }
    };

    const toggleSetting = (key: keyof AccessibilityPreferences) => {
        if (typeof preferences[key] === "boolean") {
            savePreferences({ [key]: !preferences[key] });
        }
    };

    const changeFontSize = (direction: "increase" | "decrease") => {
        const sizes = ["small", "medium", "large", "extra-large"];
        const currentIndex = sizes.indexOf(preferences.font_size);
        let newIndex: number;

        if (direction === "increase") {
            newIndex = Math.min(currentIndex + 1, sizes.length - 1);
        } else {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        savePreferences({ font_size: sizes[newIndex] });
    };

    return (
        <>
            {/* Skip to main content link - visible on focus */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
            >
                Skip to main content
            </a>

            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg"
                        aria-label="Accessibility options"
                    >
                        <Accessibility className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Accessibility className="h-4 w-4" />
                        Accessibility Settings
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Font Size */}
                    <div className="p-2">
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                            <Type className="h-4 w-4" />
                            Text Size: {preferences.font_size}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => changeFontSize("decrease")}
                                disabled={preferences.font_size === "small"}
                                aria-label="Decrease text size"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 text-center text-sm">
                                A → A
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => changeFontSize("increase")}
                                disabled={preferences.font_size === "extra-large"}
                                aria-label="Increase text size"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* High Contrast Mode */}
                    <div className="flex items-center justify-between p-2">
                        <Label htmlFor="high-contrast" className="flex items-center gap-2 cursor-pointer">
                            <Contrast className="h-4 w-4" />
                            High Contrast
                        </Label>
                        <Switch
                            id="high-contrast"
                            checked={preferences.high_contrast_mode}
                            onCheckedChange={() => toggleSetting("high_contrast_mode")}
                        />
                    </div>

                    {/* Reduced Motion */}
                    <div className="flex items-center justify-between p-2">
                        <Label htmlFor="reduced-motion" className="flex items-center gap-2 cursor-pointer">
                            <Pause className="h-4 w-4" />
                            Reduce Motion
                        </Label>
                        <Switch
                            id="reduced-motion"
                            checked={preferences.reduced_motion}
                            onCheckedChange={() => toggleSetting("reduced_motion")}
                        />
                    </div>

                    {/* Enhanced Focus */}
                    <div className="flex items-center justify-between p-2">
                        <Label htmlFor="enhanced-focus" className="flex items-center gap-2 cursor-pointer">
                            <Eye className="h-4 w-4" />
                            Enhanced Focus
                        </Label>
                        <Switch
                            id="enhanced-focus"
                            checked={preferences.focus_indicators_enhanced}
                            onCheckedChange={() => toggleSetting("focus_indicators_enhanced")}
                        />
                    </div>

                    {/* Keyboard Navigation */}
                    <div className="flex items-center justify-between p-2">
                        <Label htmlFor="keyboard-nav" className="flex items-center gap-2 cursor-pointer">
                            <Keyboard className="h-4 w-4" />
                            Keyboard Nav
                        </Label>
                        <Switch
                            id="keyboard-nav"
                            checked={preferences.keyboard_navigation}
                            onCheckedChange={() => toggleSetting("keyboard_navigation")}
                        />
                    </div>

                    {/* Dyslexia Font */}
                    <div className="flex items-center justify-between p-2">
                        <Label htmlFor="dyslexia-font" className="flex items-center gap-2 cursor-pointer">
                            <Type className="h-4 w-4" />
                            Dyslexia Font
                        </Label>
                        <Switch
                            id="dyslexia-font"
                            checked={preferences.dyslexia_font}
                            onCheckedChange={() => toggleSetting("dyslexia_font")}
                        />
                    </div>

                    <DropdownMenuSeparator />

                    <div className="p-2 text-xs text-muted-foreground">
                        Press <kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> to navigate with keyboard
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* CSS for accessibility features */}
            <style>{`
        :root {
          --base-font-size: 16px;
        }

        html {
          font-size: var(--base-font-size);
        }

        /* High Contrast Mode */
        .high-contrast {
          --background: 0 0% 0%;
          --foreground: 0 0% 100%;
          --primary: 60 100% 50%;
          --primary-foreground: 0 0% 0%;
        }
        .high-contrast * {
          border-color: currentColor !important;
        }

        /* Reduced Motion */
        .reduce-motion,
        .reduce-motion * {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }

        /* Enhanced Focus */
        .enhanced-focus *:focus {
          outline: 3px solid #FF6B00 !important;
          outline-offset: 3px !important;
        }
        .enhanced-focus *:focus-visible {
          outline: 4px solid #FF6B00 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 6px rgba(255, 107, 0, 0.3) !important;
        }

        /* Dyslexia Font */
        .dyslexia-font {
          font-family: 'OpenDyslexic', sans-serif !important;
          letter-spacing: 0.05em;
          word-spacing: 0.1em;
          line-height: 1.8;
        }

        /* Color Blind Modes */
        [data-color-blind="protanopia"] {
          filter: url('#protanopia');
        }
        [data-color-blind="deuteranopia"] {
          filter: url('#deuteranopia');
        }
        [data-color-blind="tritanopia"] {
          filter: url('#tritanopia');
        }
        [data-color-blind="monochromacy"] {
          filter: grayscale(100%);
        }
      `}</style>
        </>
    );
}

export default AccessibilityToolbar;
