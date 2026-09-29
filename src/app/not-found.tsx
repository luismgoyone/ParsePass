import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <p className="font-mono text-xs text-subtle-foreground">404 · NO_SUCH_ROUTE</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist.</h1>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground hover:bg-primary-hover"
      >
        Check a resume
      </Link>
    </main>
  );
}
