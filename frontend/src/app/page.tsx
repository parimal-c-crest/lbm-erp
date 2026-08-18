import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="bg-background text-foreground flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">LBM ERP</h1>
      <p className="text-text-secondary">Design tokens + shadcn/ui wiring smoke test.</p>
      <div className="flex gap-4">
        <Button variant="primary">Primary CTA</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </main>
  );
}
