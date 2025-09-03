import Link from "next/link";
import TechDropdown from "./TechDropdown";

export default function Header() {
  return (
    <header className="border-b border-neutral-700 bg-neutral-900 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-neutral-100">
              Rig Troubleshooter
            </Link>
            <nav className="ml-10 flex space-x-8">
              <Link href="/rigs" className="text-neutral-300 hover:text-neutral-100 px-3 py-2 text-sm">
                Rigs
              </Link>
              <Link href="/sessions/new" className="text-neutral-300 hover:text-neutral-100 px-3 py-2 text-sm">
                New Session
              </Link>
              <Link href="/upload" className="text-neutral-300 hover:text-neutral-100 px-3 py-2 text-sm">
                Upload
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <TechDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
