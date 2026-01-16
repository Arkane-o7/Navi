import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-[#dde2ee] dark:bg-[#0b0c0e] pt-20 pb-10 text-[#19191d] dark:text-white">
            <div className="mx-auto max-w-7xl px-5 md:px-8">
                <div className="flex flex-col lg:flex-row lg:justify-between gap-12">
                    <div>
                        <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
                            Navi
                        </Link>
                    </div>

                    <div className="flex gap-8">
                        <div>
                            <h3 className="font-medium mb-4">Project</h3>
                            <ul className="flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                                <li><Link href="https://github.com/Arkane-o7/Navi" target="_blank" className="hover:text-blue-500 transition-colors">GitHub</Link></li>
                                <li><Link href="https://github.com/Arkane-o7/Navi/releases" target="_blank" className="hover:text-blue-500 transition-colors">Releases</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-zinc-500">© 2025 Navi. All rights reserved.</p>

                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
