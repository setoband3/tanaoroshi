import Link from "next/link";
import pkg from "../../package.json";

export function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            棚卸しレポート
          </Link>
          <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            v{pkg.version}
          </span>
        </div>
        <nav className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            一覧
          </Link>
        </nav>
      </div>
    </header>
  );
}
