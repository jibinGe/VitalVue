import React from "react";
import { Navigate } from "react-router-dom";
import { isFeatureEnabled } from "@/utilities/featureFlags";

// Renders its children only when the feature flag is on; otherwise redirects (for routes)
// or renders nothing.
export default function FeatureGate({ flag, redirectTo = null, children }) {
  if (isFeatureEnabled(flag)) return children;
  return redirectTo ? <Navigate to={redirectTo} replace /> : null;
}
