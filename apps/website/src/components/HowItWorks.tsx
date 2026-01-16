
import Image from "next/image";

export function HowItWorks() {
    return (
        <section className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-5 md:px-8">
                <div className="flex flex-col items-center gap-y-2 mb-16 text-center">
                    <h2 className="text-3xl lg:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600">
                        Get started in seconds
                    </h2>
                    <p className="text-zinc-500 text-lg lg:text-xl max-w-2xl">
                        No complex setup. Just install and start asking.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                    <div className="flex flex-col items-center text-center lg:text-left lg:items-start gap-6">
                        <div className="relative w-[300px] h-[300px]">
                            <Image
                                src="/images/image_11.png"
                                alt="Start Navi"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-light flex items-center gap-3">
                                <span className="opacity-40">1</span>
                                <span>Download App</span>
                            </h3>
                            <p className="text-zinc-400 pl-7">
                                Get the latest release for macOS, Windows, or Linux.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center text-center lg:text-left lg:items-start gap-6 pt-12 lg:pt-0">
                        <div className="relative w-[300px] h-[300px]">
                            <Image
                                src="/images/image_22.png"
                                alt="End Navi"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-light flex items-center gap-3">
                                <span className="opacity-40">2</span>
                                <span>Summon Navi</span>
                            </h3>
                            <p className="text-zinc-400 pl-7">
                                Press `Cmd + /` (or your custom shortcut) to open the command palette.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center text-center lg:text-left lg:items-start gap-6">
                        <div className="relative w-[300px] h-[300px]">
                            <Image
                                src="/images/image_17.png"
                                alt="Get notes"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-light flex items-center gap-3">
                                <span className="opacity-40">3</span>
                                <span>Ask Anything</span>
                            </h3>
                            <p className="text-zinc-400 pl-7">
                                Chat with LLaMA 3.3 or search the web instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
