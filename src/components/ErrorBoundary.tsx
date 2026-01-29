import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { captureError } from "@/lib/sentry";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });

        // Report to Sentry
        captureError(error, {
            componentStack: errorInfo.componentStack,
        });

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error("Error caught by boundary:", error);
            console.error("Component stack:", errorInfo.componentStack);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="max-w-md w-full">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                            </div>
                            <CardTitle>Something went wrong</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-center text-muted-foreground">
                                We encountered an unexpected error. Our team has been notified
                                and is working to fix it.
                            </p>

                            {import.meta.env.DEV && this.state.error && (
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="text-xs font-mono text-destructive break-all">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={this.handleReset}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button className="flex-1" onClick={this.handleGoHome}>
                                    <Home className="h-4 w-4 mr-2" />
                                    Go Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
