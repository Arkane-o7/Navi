import { clsx } from "clsx";
import Image from "next/image";

interface FeatureCardProps {
    title: string;
    description: string;
    className?: string;
    children?: React.ReactNode;
}

function FeatureCard({ title, description, className, children }: FeatureCardProps) {
    return (
        <div className={clsx("relative flex flex-col justify-end overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/50 p-8", className)}>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_100%)]" />
            <div className="relative z-10 flex flex-col gap-3">
                <h3 className="text-2xl lg:text-3xl font-medium tracking-tight text-white">{title}</h3>
                <p className="text-lg text-zinc-400 leading-relaxed max-w-[90%]">{description}</p>
            </div>
            {children}
        </div>
    );
}

export function FeatureGrid() {
    return (
        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <div className="flex flex-col gap-12">
                <h2 className="text-4xl lg:text-6xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 max-w-2xl">
                    Why use Navi?
                </h2>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                    <FeatureCard
                        title="Instant Access"
                        description="Summon Navi anywhere with a single keyboard shortcut (`Cmd + /`). Always there when you need it."
                        className="h-[400px] lg:h-[500px] bg-[radial-gradient(167.08%_140.48%_at_79.5%_0%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%),radial-gradient(120.74%_124.92%_at_7.26%_100%,#497EE9_0%,#749CFF_100%)]"
                    >
                        <Image
                            src="/images/image_30.png"
                            alt="Instant Access"
                            width={600}
                            height={400}
                            className="absolute top-0 right-0 w-auto h-full object-cover rounded-tr-[2rem] opacity-90"
                        />
                    </FeatureCard>

                    <FeatureCard
                        title="Powered by Groq"
                        description="Leveraging LLaMA 3.3 70B for lightning-fast, intelligent responses to any query."
                        className="h-[400px] lg:h-[500px] bg-[radial-gradient(92.09%_124.47%_at_50%_99.24%,rgba(221,226,238,0.40)_58.91%,rgba(187,197,221,0.40)_100%)] bg-white"
                    >
                        <div className="absolute right-0 bottom-0 top-12 w-full lg:w-auto h-full lg:h-auto overflow-hidden rounded-tl-3xl">
                            <Image
                                src="/images/image_6.png"
                                alt="Groq Speed"
                                width={500}
                                height={400}
                                className="object-cover object-left-top shadow-2xl"
                            />
                        </div>
                    </FeatureCard>

                    <FeatureCard
                        title="Real-time Web Search"
                        description="Navi automatically searches the web via Tavily to provide the most current information."
                        className="h-[400px] lg:h-[330px] lg:col-span-2 flex flex-col lg:flex-row items-start lg:items-center !justify-between bg-[radial-gradient(92.09%_124.47%_at_50%_99.24%,rgba(221,226,238,0.40)_58.91%,rgba(187,197,221,0.40)_100%)] bg-white"
                    >
                        <div className="w-full lg:w-1/2 h-full relative mt-8 lg:mt-0">
                            <Image
                                src="/images/image_28.png"
                                alt="Web Search"
                                fill
                                className="object-contain object-left-bottom lg:object-left"
                            />
                        </div>
                    </FeatureCard>

                    <FeatureCard
                        title="Cross-Platform"
                        description="Available natively on macOS, Windows, and Linux."
                        className="h-[400px] lg:h-[330px] lg:col-span-2 flex-col-reverse lg:flex-row !justify-end bg-[radial-gradient(92.09%_124.47%_at_50%_99.24%,rgba(221,226,238,0.40)_58.91%,rgba(187,197,221,0.40)_100%)] bg-white"
                    >
                        <div className="absolute top-0 right-0 w-full lg:w-[60%] h-full">
                            <Image
                                src="/images/image_8.png"
                                alt="Cross Platform"
                                fill
                                className="object-contain object-right-top"
                            />
                        </div>
                    </FeatureCard>
                </div>
            </div>
        </section>
    );
}
