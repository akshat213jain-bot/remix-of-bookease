import React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export const ThemeProvider = React.forwardRef<HTMLDivElement, ThemeProviderProps>(
  ({ children, ...props }, ref) => (
    <NextThemesProvider {...props}>
      <div ref={ref}>{children}</div>
    </NextThemesProvider>
  )
);
ThemeProvider.displayName = "ThemeProvider";
