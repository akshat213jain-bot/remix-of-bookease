import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "hi", name: "हिंदी", flag: "🇮🇳" },
];

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);

    const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
                    <span className="sm:hidden">{currentLang.flag}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="gap-2"
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {i18n.language === lang.code && (
                            <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSwitcher;
