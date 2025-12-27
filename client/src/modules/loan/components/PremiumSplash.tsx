import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, PieChart, CheckCircle, Coins, Sparkles, CreditCard, Banknote } from 'lucide-react';
import { APP_NAME } from '../constants';

const PremiumSplash: React.FC = () => {
    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">

            {/* Background Blobs for Soft Glow Effect */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-200/30 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-[100px] animate-pulse delay-700" />

            {/* Floating 3D-style Elements (Props) */}
            <FloatingElement delay={0} x={-120} y={-80} rotate={-10}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-xl shadow-yellow-500/20 flex items-center justify-center border border-white/50">
                    <Coins className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
            </FloatingElement>

            <FloatingElement delay={0.5} x={120} y={-60} rotate={10}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-xl shadow-indigo-500/20 flex items-center justify-center border border-white/50">
                    <Wallet className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
            </FloatingElement>

            <FloatingElement delay={1} x={-100} y={100} rotate={-15}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/20 flex items-center justify-center border border-white/50">
                    <CheckCircle className="w-6 h-6 text-white drop-shadow-sm" />
                </div>
            </FloatingElement>

            <FloatingElement delay={1.5} x={110} y={90} rotate={15}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-xl shadow-rose-500/20 flex items-center justify-center border border-white/50">
                    <PieChart className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
            </FloatingElement>

            {/* Sparkles */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute top-1/3 right-1/3 text-yellow-400"
            >
                <Sparkles className="w-6 h-6" />
            </motion.div>


            {/* Main Center Logo */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="relative z-10 flex flex-col items-center"
            >
                <div className="w-32 h-32 rounded-[32px] bg-white dark:bg-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center relative overflow-hidden border border-white/50">
                    {/* Inner Gradient Diagonal */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5" />

                    {/* App Logo / Icon */}
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
                        ₹
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic drop-shadow-sm">
                        {APP_NAME}
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 animate-pulse">
                        Premium Finance
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// Helper for generic floating animation
const FloatingElement = ({ children, delay, x, y, rotate }: { children: React.ReactNode, delay: number, x: number, y: number, rotate: number }) => (
    <motion.div
        initial={{ opacity: 0, y: y + 20 }}
        animate={{
            opacity: 1,
            y: [y, y - 10, y],
            rotate: [rotate, rotate - 5, rotate]
        }}
        transition={{
            opacity: { duration: 0.5, delay },
            y: { repeat: Infinity, duration: 3, ease: "easeInOut", delay },
            rotate: { repeat: Infinity, duration: 4, ease: "easeInOut", delay }
        }}
        className="absolute z-0"
        style={{ x }} // Fixed X position, animating Y
    >
        {children}
    </motion.div>
);

export default PremiumSplash;
