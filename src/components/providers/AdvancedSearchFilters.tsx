import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Filter, Star, X } from "lucide-react";

export interface SearchFilters {
    priceRange: [number, number];
    minRating: number;
    availableToday: boolean;
    videoEnabled: boolean;
    verified: boolean;
}

interface AdvancedSearchFiltersProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    onReset: () => void;
}

export const defaultFilters: SearchFilters = {
    priceRange: [0, 5000],
    minRating: 0,
    availableToday: false,
    videoEnabled: false,
    verified: false,
};

export const AdvancedSearchFilters = ({
    filters,
    onFiltersChange,
    onReset,
}: AdvancedSearchFiltersProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const activeFiltersCount = [
        filters.priceRange[0] > 0 || filters.priceRange[1] < 5000,
        filters.minRating > 0,
        filters.availableToday,
        filters.videoEnabled,
        filters.verified,
    ].filter(Boolean).length;

    const handlePriceChange = (value: number[]) => {
        onFiltersChange({
            ...filters,
            priceRange: [value[0], value[1]],
        });
    };

    const handleRatingChange = (rating: number) => {
        onFiltersChange({
            ...filters,
            minRating: filters.minRating === rating ? 0 : rating,
        });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center gap-2 mb-4">
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {activeFiltersCount}
                            </Badge>
                        )}
                        <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                    </Button>
                </CollapsibleTrigger>

                {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
                        <X className="h-4 w-4" />
                        Clear all
                    </Button>
                )}
            </div>

            <CollapsibleContent>
                <Card className="mb-4">
                    <CardContent className="p-4 space-y-6">
                        {/* Price Range */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Price Range</Label>
                            <div className="px-2">
                                <Slider
                                    value={[filters.priceRange[0], filters.priceRange[1]]}
                                    onValueChange={handlePriceChange}
                                    max={5000}
                                    step={100}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>₹{filters.priceRange[0]}</span>
                                <span>₹{filters.priceRange[1]}</span>
                            </div>
                        </div>

                        {/* Rating Filter */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Minimum Rating</Label>
                            <div className="flex gap-2">
                                {[4, 3, 2].map((rating) => (
                                    <Button
                                        key={rating}
                                        variant={filters.minRating === rating ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleRatingChange(rating)}
                                        className="gap-1"
                                    >
                                        <Star className="h-3 w-3 fill-current" />
                                        {rating}+
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Toggle Filters */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Available Today</Label>
                                <Switch
                                    checked={filters.availableToday}
                                    onCheckedChange={(checked) =>
                                        onFiltersChange({ ...filters, availableToday: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Video Consultation</Label>
                                <Switch
                                    checked={filters.videoEnabled}
                                    onCheckedChange={(checked) =>
                                        onFiltersChange({ ...filters, videoEnabled: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Verified Providers Only</Label>
                                <Switch
                                    checked={filters.verified}
                                    onCheckedChange={(checked) =>
                                        onFiltersChange({ ...filters, verified: checked })
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default AdvancedSearchFilters;
