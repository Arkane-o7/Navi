import Image from "next/image";
import { Laptop } from "lucide-react";

export function Hero() {
    return (
        <div className="hero-v2 relative flex flex-col items-center gap-8 lg:gap-16 pb-20 overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 -z-10 w-full h-full overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-0 left-0 w-full h-full object-cover"
                >
                    <source src="/media/hero-bg.mp4" type="video/mp4" />
                </video>
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/40" />
            </div>
            <div className="relative w-full pt-32 lg:pt-40">
                <section className="flex h-full items-start justify-center">
                    <div className="flex flex-col items-center gap-8 z-10 relative">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex flex-col items-center gap-4 lg:gap-3">
                                <h1 className="font-serif text-center text-[56px] leading-[102%] font-medium tracking-tight text-white lg:text-[80px]">
                                    <span className="block">
                                        Your AI Copilot
                                    </span>
                                    <span className="block">
                                        One Keystroke Away
                                    </span>
                                </h1>

                                <div className="hidden lg:block h-px w-96 bg-gradient-to-r from-transparent via-white/30 to-transparent my-2" />

                                <h2 className="text-center leading-[140%] font-medium text-white/90 text-lg lg:text-[19px] max-w-xl mx-auto">
                                    A Spotlight-style AI assistant for your desktop. Instant access to LLaMA 3.3 70B and real-time web search with a single shortcut.
                                </h2>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 mt-4">
                            <button className="purple-gradient-button rounded-xl flex items-center gap-2 text-white font-medium text-base px-6 py-3 relative overflow-hidden transition-transform hover:scale-[1.02] shadow-2xl">
                                <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]">
                                    <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                                </span>
                                <Laptop className="w-5 h-5" />
                                <span>Download for macOS</span>
                            </button>
                            <p className="text-xs text-white/40">Also available on Windows and Linux</p>
                        </div>
                    </div>
                </section>
            </div>

            <div className="relative w-full px-4 md:px-12 flex justify-center perspective-midrange">
                <div className="relative w-full max-w-6xl aspect-[1.7] rounded-[13px] shadow-2xl border border-white/10 overflow-hidden group">
                    <Image
                        src="/images/image_12.png"
                        alt="Navi App Interface"
                        fill
                        className="object-cover"
                    />

                    {/* Floating Icons */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-2">
                        <div className="w-10 h-10 relative"><Image src="/images/image_3.png" alt="Icon" fill className="object-contain" /></div>
                        <div className="w-10 h-10 relative"><Image src="/images/image_5.png" alt="Icon" fill className="object-contain" /></div>
                        <div className="w-10 h-10 relative"><Image src="/images/image_14.png" alt="Icon" fill className="object-contain" /></div>
                        <div className="w-10 h-10 relative"><Image src="/images/image_2.png" alt="Icon" fill className="object-contain" /></div>
                        <div className="w-10 h-10 relative"><Image src="/images/image_16.png" alt="Icon" fill className="object-contain" /></div>
                        <div className="w-10 h-10 relative"><Image src="/images/image_15.png" alt="Icon" fill className="object-contain" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
