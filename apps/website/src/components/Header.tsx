import Link from "next/link";
import Image from "next/image";
import { Laptop } from "lucide-react";

export function Header() {
    return (
        <header className="absolute top-0 z-50 flex w-full pt-2.5">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full px-5 md:px-8">
                <div className="flex items-center justify-center gap-1 rounded-2xl px-3 py-1 lg:gap-7">
                    <Link
                        className="inline-flex shrink-0 translate-y-0.5 items-center justify-center rounded lg:mr-7"
                        href="/"
                    >
                        <span className="text-2xl font-serif font-medium text-white tracking-tight">Navi</span>
                    </Link>
                    <div className="hidden items-center md:flex text-sm font-medium text-white/90">
                        <Link className="flex items-center justify-center gap-x-1.5 px-3.5 py-2 hover:text-white transition-colors" href="https://github.com/Arkane-o7/Navi" target="_blank">
                            <span>GitHub</span>
                        </Link>
                        <Link className="flex items-center justify-center gap-x-1.5 px-3.5 py-2 hover:text-white transition-colors" href="https://github.com/Arkane-o7/Navi/releases" target="_blank">
                            <span>Releases</span>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="https://github.com/Arkane-o7/Navi/releases" target="_blank" className="purple-gradient-button rounded-xl flex items-center gap-2 text-white font-medium text-sm px-4 py-2 relative overflow-hidden transition-transform hover:scale-[1.02]">
                        <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]">
                            <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                        </span>
                        <Laptop className="w-4 h-4" />
                        <span>Download</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
