import { Redirect } from 'expo-router';

// Any unknown route just redirects home silently
export default function NotFound() {
  return <Redirect href="/" />;
}
