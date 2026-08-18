// No sidebar/top bar — auth screens sit outside the logged-in app shell.
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">{children}</div>
  );
}
