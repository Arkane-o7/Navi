
import Image from "next/image";

export function TranscriptionStats() {
    return (
        <section className="py-20 bg-white dark:bg-black overflow-hidden relative">
            <div className="absolute inset-x-0 bottom-0 z-0 h-[376px] w-full bg-[linear-gradient(180deg,#FFFFFF_0%,#DDE2EE_37.04%)] md:h-[520px] lg:h-[600px] opacity-50" aria-hidden="true"></div>

            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-x-18 lg:flex-row relative z-10">
                {/* Image Section */}
                <div className="shadow-inner-white/10 mx-10 mb-10 hidden rounded-3xl pt-8 pr-3 pb-4 pl-5 shadow-inner inset-ring-1 inset-ring-white/50 backdrop-blur [background:radial-gradient(92.09%_126.39%_at_50%_100%,#DDE2EE_58.91%,#BBC5DD_100%)] lg:mx-0 lg:mb-0 lg:block border border-white/20">
                    <Image
                        src="/images/image_29.png"
                        alt="Real-time transcript"
                        width={450}
                        height={569}
                        className="pointer-events-none select-none"
                    />
                </div>

                {/* Content Section */}
                <div className="mx-20 -mt-30 flex flex-col gap-y-20 lg:mx-0 lg:mt-0 lg:pl-20">
                    <h2 className="bg-gradient-to-r from-[#19191D] to-[#31343E] bg-clip-text text-3xl leading-[1.25] font-medium tracking-[-1.28px] text-transparent lg:text-5xl dark:from-white dark:to-zinc-400">
                        High-performance Architecture
                    </h2>

                    <div className="-mt-10 flex flex-col gap-y-8 lg:mt-0">
                        {/* Stat 1 */}
                        <div className="flex flex-col items-start gap-x-27 lg:flex-row border-b border-zinc-200/50 pb-8 last:border-0 last:pb-0">
                            <div className="mt-2 text-5xl font-medium text-zinc-900 dark:text-white min-w-[120px]">300<span className="text-3xl">ms</span></div>
                            <div className="flex flex-col gap-y-1">
                                <span className="text-3xl font-light text-zinc-800 dark:text-zinc-200">Response time</span>
                                <span className="text-lg text-zinc-500/70">
                                    Powered by Groq's LLaMA 3.3. Experience near-instant <br className="hidden lg:block" />
                                    AI responses without the wait.
                                </span>
                            </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="flex flex-col items-start gap-x-27 lg:flex-row border-b border-zinc-200/50 pb-8 last:border-0 last:pb-0">
                            <div className="mt-2 text-5xl font-medium text-zinc-900 dark:text-white min-w-[120px]">70<span className="text-3xl">B</span></div>
                            <div className="flex flex-col gap-y-1">
                                <span className="text-3xl font-light text-zinc-800 dark:text-zinc-200">Parameters</span>
                                <span className="text-lg text-zinc-500/70">
                                    Advanced reasoning capabilities rivalling GPT-4. <br className="hidden lg:block" />
                                    Running locally felt, cloud powered.
                                </span>
                            </div>
                        </div>

                        {/* Stat 3 */}
                        <div className="flex flex-col items-start gap-x-27 lg:flex-row pb-8 last:border-0 last:pb-0">
                            <div className="mt-2 text-5xl font-medium text-zinc-900 dark:text-white min-w-[120px]">100%</div>
                            <div className="flex flex-col gap-y-1">
                                <span className="text-3xl font-light text-zinc-800 dark:text-zinc-200">Secure</span>
                                <span className="text-lg text-zinc-500/70">
                                    Enterprise-grade authentication via WorkOS. <br className="hidden lg:block" />
                                    Your data remains yours.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
