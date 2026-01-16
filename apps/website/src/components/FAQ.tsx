'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { clsx } from "clsx";

const faqs = [
    {
        q: "What platforms does Navi support?",
        a: "Navi is available natively on macOS, Windows, and Linux."
    },
    {
        q: "How do I open Navi?",
        a: "You can summon Navi from anywhere using the global shortcut `Cmd + /` (macOS) or `Alt + /` (Windows/Linux)."
    },
    {
        q: "Is it free to use?",
        a: "Navi offers a free tier with 20 messages per day. A Pro plan for unlimited usage is coming soon."
    },
    {
        q: "Does it work offline?",
        a: "Navi requires an internet connection to communicate with the Groq LLaMA models and perform web searches."
    }
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-24 bg-white dark:bg-black">
            <div className="mx-auto max-w-3xl px-5 md:px-8">
                <h2 className="text-center text-4xl font-serif font-medium mb-12 text-zinc-900 dark:text-white">
                    Frequently asked questions
                </h2>

                <div className="flex flex-col gap-4">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="border rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="flex w-full items-center justify-between p-6 text-left"
                            >
                                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{faq.q}</span>
                                {openIndex === i ? (
                                    <Minus className="text-blue-500" />
                                ) : (
                                    <Plus className="text-zinc-400" />
                                )}
                            </button>
                            <div
                                className={clsx(
                                    "px-6 pb-6 text-zinc-500 transition-all duration-300",
                                    openIndex === i ? "block opacity-100" : "hidden opacity-0"
                                )}
                            >
                                {faq.a}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
