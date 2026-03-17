import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";

/**
 * Home page redirects to Dashboard.
 * The actual dashboard content is in Dashboard.tsx.
 */
export default function Home() {
  const { user, loading } = useAuth();
  return <Redirect to="/" />;
}
