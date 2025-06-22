
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to /login instead of /dashboard initially
  // The login page or protected layout will handle further redirection
  redirect('/login');
  return null; 
}
