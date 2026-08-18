import { redirect } from 'next/navigation';

// Root has no page of its own — send to login. (`(dashboard)` layout/pages don't check auth yet,
// so this isn't a real auth gate, just routing the app's front door somewhere sensible.)
export default function Home() {
  redirect('/login');
}
