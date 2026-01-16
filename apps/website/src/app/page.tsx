import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { Undetectable } from "@/components/Undetectable";
import { TranscriptionStats } from "@/components/TranscriptionStats";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { Laptop } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col bg-black overflow-x-hidden">
            <Header />

            <Hero />



            <FeatureGrid />

            <HowItWorks />

            <Undetectable />

            <TranscriptionStats />

            <FAQ />

            {/* CTA Section */}
            <section className="relative z-20 overflow-x-hidden pt-32 pb-16 md:pt-[174px] md:pb-[160px] lg:pb-[210px] xl:pt-[220px] bg-white dark:bg-black">
                <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
                    <div className="max-w-[575px] md:max-w-[492px] lg:max-w-[575px]">
                        <h3 className="inline text-[20px] leading-tight font-medium -tracking-[0.04em] text-zinc-900 dark:text-white sm:block sm:text-[28px] md:text-[24px] lg:text-[28px]">
                            Your desktop deserves an upgrade.
                        </h3>
                        <p className="inline text-[20px] leading-tight font-medium -tracking-[0.04em] text-zinc-500 sm:block sm:text-[28px] md:text-[24px] lg:text-[28px]">
                            Download Navi and start asking.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 md:mt-6 lg:mt-7 xl:mt-7">
                            <button className="purple-gradient-button rounded-xl flex items-center gap-2 text-white font-medium text-lg px-8 py-3 relative overflow-hidden transition-transform hover:scale-[1.02] shadow-2xl w-fit">
                                <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]">
                                    <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                                </span>
                                <Laptop className="w-5 h-5" />
                                <span>Download for macOS</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[376px] w-full bg-[linear-gradient(180deg,#FFFFFF_0%,#DDE2EE_37.04%)] dark:opacity-10 md:h-[520px] lg:h-[600px]" aria-hidden="true" />
            </section>

            <Footer />
        </main>
    );
}
