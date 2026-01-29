import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholderSrc?: string;
    className?: string;
}

/**
 * Lazy loading image component with placeholder support
 * Uses Intersection Observer for performance
 */
export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    placeholderSrc,
    className,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: "100px", // Start loading 100px before entering viewport
                threshold: 0.1,
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const defaultPlaceholder =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3C/svg%3E";

    return (
        <div className={cn("relative overflow-hidden", className)}>
            {/* Placeholder */}
            {!isLoaded && (
                <img
                    src={placeholderSrc || defaultPlaceholder}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-sm"
                    aria-hidden="true"
                />
            )}

            {/* Actual image */}
            <img
                ref={imgRef}
                src={isInView ? src : defaultPlaceholder}
                alt={alt}
                onLoad={handleLoad}
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                loading="lazy"
                {...props}
            />
        </div>
    );
};

export default LazyImage;
