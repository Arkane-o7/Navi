
import Image from "next/image";
import { Check } from "lucide-react";

export function Undetectable() {
    return (
        <section className="relative overflow-hidden pt-24 md:pt-[296px] lg:pt-20 xl:pt-32">
            <div className="mx-auto max-w-[90%] px-5 md:max-w-[600px] md:px-8 lg:max-w-[1008px] xl:max-w-[1114px] 2xl:max-w-[1208px]">
                <div className="flex flex-col items-center justify-start text-center">
                    <div className="relative mt-3 md:mt-3.5 lg:mt-4.5">
                        <h2 className="relative z-10 text-3xl font-medium tracking-[-1.28px] md:max-w-[508px] md:text-[52px] md:leading-[80px] lg:max-w-[626px] lg:text-[64px] xl:max-w-[704px] xl:text-[72px] text-zinc-900 dark:text-white">
                            Stop switching tabs. <br /> Start doing.
                        </h2>
                    </div>
                    <div className="mt-4.5 text-base leading-snug tracking-tight text-blue-500 md:mt-6 md:max-w-[450px] md:text-lg lg:max-w-[536px] lg:text-xl xl:max-w-[540px]">
                        The power of 70B models, native on your desktop.
                    </div>

                    <div className="relative flex h-fit w-full flex-col overflow-hidden rounded-[2rem] lg:flex-row xl:h-[518px] mt-12 bg-white dark:bg-zinc-900 border border-white/10 shadow-2xl">
                        {/* Browser Chatbots */}
                        <div className="relative -my-0.5 flex w-full flex-col items-center justify-between gap-8 pt-14 pb-20 xl:w-1/2 bg-[radial-gradient(92.09%_124.47%_at_50%_99.24%,rgba(221,226,238,0.40)_58.91%,rgba(187,197,221,0.40)_100%)] shadow-inner">
                            <Image
                                src="/images/image_27.png"
                                alt=""
                                width={650}
                                height={442}
                                className="absolute -bottom-32 -left-24 aspect-[650/442] h-4/5 object-cover object-top-right md:h-[442px] md:w-[650px] opacity-50 grayscale"
                            />
                            <div className="flex flex-col items-center justify-center md:gap-2 z-10">
                                <h3 className="text-3xl leading-[49px] font-medium tracking-[-0.9px] md:text-4xl text-zinc-800">
                                    Browser Chatbots
                                </h3>
                                <p className="leading-[26.125px] text-[#4E5667] flex items-center gap-2">
                                    Disruptive context switching
                                </p>
                            </div>
                            <div className="relative flex aspect-[420/278] w-4/5 items-center justify-center rounded-2xl border-2 border-white/20 bg-[radial-gradient(78.83%_54.26%_at_50%_45.74%,#3D5BA3_0%,#2C4F9B_100%)] shadow-2xl z-10">
                                <div className="flex size-16 items-center justify-center rounded-full bg-white p-3">
                                    <Image src="/images/image_4.png" alt="" width={44} height={44} />
                                </div>
                                <div className="absolute bottom-2 left-4 flex items-center gap-2">
                                    <span className="font-medium text-white">Browser Tab</span>
                                </div>
                            </div>
                        </div>

                        {/* Cluely */}
                        <div className="relative flex w-full flex-col items-center justify-between gap-8 pt-14 pb-20 xl:w-1/2 bg-[linear-gradient(169deg,#898AA1_-28.62%,#555571_91.7%)] shadow-inner">
                            <Image
                                src="/images/image_9.png"
                                alt=""
                                width={540}
                                height={330}
                                className="absolute right-0 -bottom-12 left-0 mx-auto aspect-[1.6] w-[378px] opacity-20"
                            />
                            <div className="flex flex-col items-center justify-center gap-2 z-10">
                                <div className="text-white text-3xl font-serif font-medium tracking-tight">
                                    Navi
                                </div>
                                <div className="flex items-start gap-2">
                                    <p className="leading-tight text-white flex items-center">
                                        <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-white/20">
                                            <Check size={12} className="text-white" strokeWidth={3} />
                                        </span>
                                        Always available, one keystroke away
                                    </p>
                                </div>
                            </div>

                            <div className="relative aspect-[420/278] w-4/5 overflow-hidden rounded-2xl backdrop-blur-[4px] border border-white/20 shadow-2xl z-10 bg-black/40">
                                <div className="absolute inset-0 flex flex-col justify-between p-3 md:p-4">
                                    <div className="flex flex-col gap-4">
                                        <div className="w-fit rounded-full bg-white px-2 py-1 text-xs text-[#42425F] md:text-sm font-medium">Focused Work</div>
                                        <div className="flex flex-col gap-1">
                                            <div className="animate-pulse rounded-full bg-white/10 h-3 w-4/5"></div>
                                            <div className="animate-pulse rounded-full bg-white/10 h-3 w-1/2"></div>
                                            <div className="animate-pulse rounded-full bg-white/10 h-3 w-3/4"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
