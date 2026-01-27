import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, LANGUAGES, Language } from "@/lib/i18n";

interface LanguageSelectorProps {
  showLabel?: boolean;
}

export const LanguageSelector = ({ showLabel = true }: LanguageSelectorProps) => {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {showLabel && <Globe className="h-4 w-4 text-muted-foreground" />}
      <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span>{lang.nativeName}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
