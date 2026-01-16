import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const ebGaramond = EB_Garamond({
    subsets: ["latin"],
    variable: "--font-serif",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Navi - Live AI Meeting Assistant",
    description: "AI meeting assistant that provides live meeting notes, instant answers, and real-time insights during calls.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${ebGaramond.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
                {children}
            </body>
        </html>
    );
}
