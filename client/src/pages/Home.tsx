import { Redirect } from "wouter";

/**
 * Home page redirects to Dashboard.
 * The actual dashboard content is in Dashboard.tsx.
 */
export default function Home() {
  return <Redirect to="/" />;
}
