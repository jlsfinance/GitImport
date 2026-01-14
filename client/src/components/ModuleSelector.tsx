import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleSelectorProps {
    onSelect: (module: 'accounting' | 'records') => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect }) => {
    const y = useMotionValue(0);

    // Google-style springy transforms
    const ropeRotate = useTransform(y, [-200, 200], [-5, 5]);
    const manScale = useTransform(y, [0, 200], [1, 1.2]);
    const lionScale = useTransform(y, [0, -200], [1, 1.2]);

    // Background heights based on drag
    const topHeight = useTransform(y, (latest) => `calc(50% + ${latest}px)`);

    const handleDragEnd = () => {
        const currentY = y.get();
        if (currentY > 120) {
            animate(y, window.innerHeight, { type: 'spring', stiffness: 200, damping: 25 });
            setTimeout(() => onSelect('accounting'), 400);
        } else if (currentY < -120) {
            animate(y, -window.innerHeight, { type: 'spring', stiffness: 200, damping: 25 });
            setTimeout(() => onSelect('records'), 400);
        } else {
            animate(y, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-emerald-50 overflow-hidden font-sans select-none flex flex-col">

            {/* TOP SECTION: BILLING (Rose) */}
            <motion.div
                style={{ height: topHeight }}
                className="absolute top-0 left-0 right-0 z-10 flex flex-col"
            >
                {/* Solid Pink Part (Fills entire height) */}
                <div className="h-full w-full bg-rose-50 flex flex-col items-center justify-start pt-8 relative overflow-hidden">
                    <div className="text-center opacity-80">
                        <h2 className="text-[10px] font-bold text-rose-400 tracking-widest uppercase mb-1">Accounting</h2>
                        <h1 className="text-3xl font-black text-rose-900 tracking-tighter">BILLING</h1>
                    </div>

                    <div className="mt-4 flex flex-col items-center animate-bounce opacity-60">
                        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-0.5">Swipe Up</p>
                        <ChevronUp className="text-rose-400" size={18} />
                    </div>
                </div>

                {/* ANIMATED WAVE (ABSOLUTE BOTTOM + TRANSLATED DOWN TO CENTER) */}
                <div className="absolute bottom-0 w-full h-24 z-20 translate-y-1/2 pointer-events-none">
                    <motion.div
                        className="flex w-[200%] h-full"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ repeat: Infinity, ease: "linear", duration: 3 }}
                    >
                        {[0, 1].map((i) => (
                            <div key={i} className="w-1/2 h-full flex-shrink-0 relative">
                                <svg
                                    className="w-full h-full block"
                                    viewBox="0 0 100 40"
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" style={{ stopColor: '#f43f5e', stopOpacity: 1 }} />
                                            <stop offset="50%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                                            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                                        </linearGradient>
                                    </defs>
                                    {/* Pink Fill Area (Top half covers the Solid Pink bottom edge) */}
                                    <path
                                        d="M0 0 L0 20 Q 25 0, 50 20 T 100 20 L 100 0 Z"
                                        fill="#fff1f2"
                                        stroke="none"
                                    />
                                    {/* Gradient Wave Line */}
                                    <path
                                        d="M0 20 Q 25 0, 50 20 T 100 20"
                                        fill="none"
                                        stroke="url(#waveGradient)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>

            {/* BOTTOM SECTION CONTENT (Green) */}
            <div className="absolute bottom-0 inset-x-0 h-1/2 flex flex-col items-center justify-end pb-8 z-0 pointer-events-none">
                <div className="mb-2 flex flex-col items-center animate-bounce opacity-60">
                    <ChevronDown className="text-emerald-400" size={18} />
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Swipe Down</p>
                </div>

                <div className="text-center opacity-80 mb-4">
                    <h1 className="text-3xl font-black text-emerald-900 tracking-tighter">RECORDS</h1>
                    <h2 className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-1">Bookkeeping</h2>
                </div>

                {/* Disclaimer */}
                <div className="pb-4 px-6 text-center z-50">
                    <p className="text-[9px] font-bold text-black/20 uppercase tracking-wider leading-relaxed">
                        Digital Ledger App • Not a Bank/NBFC • No Loans Provided
                    </p>
                </div>
            </div>


            {/* INTERACTIVE DRAG LAYER (CENTERED) */}
            <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center cursor-grab active:cursor-grabbing"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                style={{ y, rotate: ropeRotate }}
                onDragEnd={handleDragEnd}
            >
                {/* Centered Cluster (Reduced height h-40 -> h-28 to fix overlap) */}
                <div className="relative w-2 h-28 bg-transparent flex flex-col items-center justify-center">

                    {/* The ROPE */}
                    <div className="absolute inset-y-0 w-2 bg-amber-800 rounded-full shadow-sm">
                        <div className="w-full h-full flex flex-col justify-between py-1 opacity-30">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="w-full h-1 bg-amber-950/20 rotate-45 transform" />
                            ))}
                        </div>
                    </div>
                    {/* Knot center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-amber-700 rounded-md shadow-md border border-amber-900/40 z-10" />

                    {/* Top Character (Billing Businessman) */}
                    <motion.div
                        className="absolute -top-24 bg-white p-3 rounded-3xl shadow-xl shadow-rose-900/10 border-[3px] border-rose-100 flex flex-col items-center gap-1 w-28"
                        style={{ scale: manScale }}
                        onClick={() => onSelect('accounting')}
                    >
                        <span className="text-4xl filter drop-shadow-sm transform hover:scale-110 transition-transform">👨‍💼</span>
                        <div className="bg-rose-100 px-3 py-1 rounded-full w-full text-center">
                            <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Billing</span>
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-800" />
                    </motion.div>

                    {/* Bottom Character (Loan Lion -> Ledger Lion) */}
                    <motion.div
                        className="absolute -bottom-24 bg-white p-3 rounded-3xl shadow-xl shadow-emerald-900/10 border-[3px] border-emerald-100 flex flex-col items-center gap-1 w-28"
                        style={{ scale: lionScale }}
                        onClick={() => onSelect('records')}
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-800" />
                        <div className="bg-emerald-100 px-3 py-1 rounded-full w-full text-center mb-1">
                            <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Ledger</span>
                        </div>
                        <span className="text-4xl filter drop-shadow-sm transform hover:scale-110 transition-transform">🦁</span>
                    </motion.div>

                </div>
            </motion.div>

        </div>
    );
};

export default ModuleSelector;
