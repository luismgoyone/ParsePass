import Link from "next/link";

export function SiteFooter({ privacy }: { privacy: string }) {
  return (
    <footer className="border-t border-border px-4 py-5 md:px-6">
      <div className="flex flex-col gap-2 font-mono text-xs text-subtle-foreground md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-sans text-sm font-semibold text-foreground">ParsePass</span>
          <span className="mx-2">·</span>
          Nothing is stored. {privacy}
        </p>
        <nav className="flex items-center gap-4">
          <a
            className="hover:text-foreground"
            href="https://github.com/luismgoyone/ParsePass"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
          <Link className="hover:text-foreground" href="/#ats-rules">
            ATS rules
          </Link>
        </nav>
      </div>
    </footer>
  );
}
