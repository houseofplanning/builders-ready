'use client';

import { useEffect, useState } from 'react';

/**
 * Time-of-day greeting. Rendered "Welcome back" on the server, then upgraded
 * to a local-time greeting on the client (avoids server-timezone mismatch).
 */
export function DashboardGreeting({ firstName }: { firstName: string | null }) {
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    setGreeting(firstName ? `${g}, ${firstName}` : g);
  }, [firstName]);

  return <h1 className="text-2xl font-extrabold tracking-tight">{greeting}</h1>;
}
