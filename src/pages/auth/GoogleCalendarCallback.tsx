import { useEffect } from "react";

const GoogleCalendarCallback = () => {
  useEffect(() => {
    // Parse the hash fragment for OAuth token
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get("access_token");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (accessToken) {
      // Send success message to opener window
      if (window.opener) {
        window.opener.postMessage(
          { type: "google-oauth-success", access_token: accessToken },
          window.location.origin
        );
        window.close();
      } else {
        // Fallback: store token and redirect
        sessionStorage.setItem("google_calendar_token", accessToken);
        window.location.href = "/dashboard/user";
      }
    } else if (error) {
      // Send error message to opener window
      if (window.opener) {
        window.opener.postMessage(
          { type: "google-oauth-error", error: errorDescription || error },
          window.location.origin
        );
        window.close();
      } else {
        window.location.href = "/dashboard/user?calendar_error=true";
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting your calendar...</p>
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
