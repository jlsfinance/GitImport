import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleSelectorProps {
    onSelect: (module: 'accounting' | 'loan') => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect }) => {
    const y = useMotionValue(0);

    // Google-style springy transforms
    const ropeRotate = useTransform(y, [-200, 200], [-5, 5]);
    const manScale = useTransform(y, [0, 200], [1, 1.2]);
    const lionScale = useTransform(y, [0, -200], [1, 1.2]);

    // Background heights based on drag
    const topHeight = useTransform(y, (latest) => `calc(50% + ${latest}px)`);
    const bottomHeight = useTransform(y, (latest) => `calc(50% - ${latest}px)`);

    const handleDragEnd = () => {
        const currentY = y.get();
        if (currentY > 120) {
            animate(y, window.innerHeight, { type: 'spring', stiffness: 200, damping: 25 });
            setTimeout(() => onSelect('accounting'), 400);
        } else if (currentY < -120) {
            animate(y, -window.innerHeight, { type: 'spring', stiffness: 200, damping: 25 });
            setTimeout(() => onSelect('loan'), 400);
        } else {
            animate(y, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-900 overflow-hidden font-sans select-none flex flex-col">

            {/* TOP SECTION: BILLING (Google Red/Pink) */}
            <motion.div
                style={{ height: topHeight }}
                className="relative w-full bg-rose-50 flex flex-col items-center justify-start pt-12 border-b-0 z-10"
            >
                {/* Content moved safely inside */}
                <div className="text-center opacity-80">
                    <h2 className="text-xs font-bold text-rose-400 tracking-widest uppercase mb-1">Accounting</h2>
                    <h1 className="text-4xl font-black text-rose-900 tracking-tighter">BILLING</h1>
                </div>

                <div className="mt-8 flex flex-col items-center animate-bounce opacity-60">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Swipe Down</p>
                    <ChevronDown className="text-rose-400" size={20} />
                </div>
            </motion.div>

            {/* ZIGZAG DIVIDER */}
            <motion.div
                className="absolute left-0 right-0 z-20 h-6 flex items-center justify-center pointer-events-none"
                style={{ top: '50%', y, marginTop: '-12px' }}
            >
                <div className="w-[120%] -ml-[10%] h-12 bg-transparent relative flex items-center">
                    <svg className="w-full h-full text-rose-50 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 10">
                        <polygon points="0,0 2,10 4,0 6,10 8,0 10,10 12,0 14,10 16,0 18,10 20,0 22,10 24,0 26,10 28,0 30,10 32,0 34,10 36,0 38,10 40,0 42,10 44,0 46,10 48,0 50,10 52,0 54,10 56,0 58,10 60,0 62,10 64,0 66,10 68,0 70,10 72,0 74,10 76,0 78,10 80,0 82,10 84,0 86,10 88,0 90,10 92,0 94,10 96,0 98,10 100,0 100,0 0,0" fill="currentColor" />
                    </svg>
                </div>
            </motion.div>

            {/* BOTTOM SECTION: LOANS (Google Green) */}
            <motion.div
                style={{ height: bottomHeight }}
                className="relative w-full bg-emerald-50 flex flex-col items-center justify-end pb-12 z-10"
            >
                <div className="mb-8 flex flex-col items-center animate-bounce opacity-60">
                    <ChevronUp className="text-emerald-400" size={20} />
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Swipe Up</p>
                </div>

                <div className="text-center opacity-80">
                    <h1 className="text-4xl font-black text-emerald-900 tracking-tighter">LOANS</h1>
                    <h2 className="text-xs font-bold text-emerald-400 tracking-widest uppercase mt-1">Management</h2>
                </div>
            </motion.div>


            {/* INTERACTIVE DRAG LAYER (CENTERED) */}
            <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center cursor-grab active:cursor-grabbing"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                style={{ y, rotate: ropeRotate }}
                onDragEnd={handleDragEnd}
            >
                {/* Centered Cluster */}
                <div className="relative w-2 h-40 bg-transparent flex flex-col items-center justify-center">

                    {/* The ROPE */}
                    <div className="absolute inset-y-0 w-2 bg-amber-800 rounded-full shadow-sm">
                        {/* Rope texture/strands */}
                        <div className="w-full h-full flex flex-col justify-between py-1 opacity-30">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-full h-1 bg-amber-950/20 rotate-45 transform" />
                            ))}
                        </div>
                    </div>
                    {/* Knot center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-amber-700 rounded-md shadow-md border border-amber-900/40 z-10" />

                    {/* Top Character (Billing Businessman) - Attached to Top of Rope */}
                    <motion.div
                        className="absolute -top-28 bg-white p-4 rounded-3xl shadow-xl shadow-rose-900/10 border-[3px] border-rose-100 flex flex-col items-center gap-2 w-32"
                        style={{ scale: manScale }}
                        onClick={() => onSelect('accounting')}
                    >
                        <span className="text-5xl filter drop-shadow-sm transform hover:scale-110 transition-transform">👨‍💼</span>
                        <div className="bg-rose-100 px-3 py-1 rounded-full w-full text-center">
                            <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Billing</span>
                        </div>
                        {/* Rope Connector */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-800" />
                    </motion.div>

                    {/* Bottom Character (Loan Lion) - Attached to Bottom of Rope */}
                    <motion.div
                        className="absolute -bottom-28 bg-white p-4 rounded-3xl shadow-xl shadow-emerald-900/10 border-[3px] border-emerald-100 flex flex-col items-center gap-2 w-32"
                        style={{ scale: lionScale }}
                        onClick={() => onSelect('loan')}
                    >
                        {/* Rope Connector */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-800" />
                        <div className="bg-emerald-100 px-3 py-1 rounded-full w-full text-center mb-1">
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Loans</span>
                        </div>
                        <span className="text-5xl filter drop-shadow-sm transform hover:scale-110 transition-transform">🦁</span>
                    </motion.div>

                </div>
            </motion.div>

        </div>
    );
};

export default ModuleSelector;
