import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Receipt, Landmark, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleSelectorProps {
    onSelect: (module: 'accounting' | 'loan') => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect }) => {

    const handleDragEnd = (event: any, info: PanInfo, module: 'accounting' | 'loan') => {
        const threshold = 50;
        if (module === 'accounting' && info.offset.y > threshold) {
            onSelect('accounting');
        } else if (module === 'loan' && info.offset.y < -threshold) {
            onSelect('loan');
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-50 overflow-hidden font-sans flex flex-col">

            {/* Top Half - Billing (Pink Theme) */}
            <motion.div
                className="flex-1 relative bg-gradient-to-b from-rose-50 to-white flex flex-col items-center justify-end pb-12 z-10 cursor-pointer"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, i) => handleDragEnd(e, i, 'accounting')}
                onClick={() => onSelect('accounting')}
            >
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-60 h-60 bg-rose-400/10 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-10 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="w-12 h-1 bg-rose-200 rounded-full mx-auto mb-4" />
                        <h1 className="text-4xl font-black text-rose-900 tracking-tighter">Billing</h1>
                        <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1 animate-pulse">
                            Swipe Down <ChevronDown className="w-3 h-3" />
                        </p>
                    </div>

                    {/* Card Mockup */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        className="w-full bg-white rounded-[32px] p-6 shadow-xl shadow-rose-200/50 border border-rose-100"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-rose-300 uppercase">Due Today</p>
                                <p className="text-lg font-black text-slate-800">$124.00</p>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-rose-400 rounded-full" />
                        </div>
                    </motion.div>
                </div>
            </motion.div>


            {/* Center Separator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-14 h-14 bg-white rounded-full shadow-lg shadow-slate-200 flex items-center justify-center border-4 border-slate-50"
                >
                    <Plus className="w-6 h-6 text-slate-400" />
                </motion.div>
            </div>


            {/* Bottom Half - Loan (Green Theme) */}
            <motion.div
                className="flex-1 relative bg-gradient-to-t from-emerald-50 to-white flex flex-col items-center justify-start pt-12 z-10 cursor-pointer"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, i) => handleDragEnd(e, i, 'loan')}
                onClick={() => onSelect('loan')}
            >
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
                    {/* Card Mockup */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        className="w-full bg-white rounded-[32px] p-6 shadow-xl shadow-emerald-200/50 border border-emerald-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-1.5 bg-emerald-400 rounded-full" />
                        </div>
                        <div className="space-y-1 mb-4">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase">Available Credit</p>
                            <h2 className="text-2xl font-black text-slate-800">+$15,000</h2>
                        </div>
                        <div className="flex justify-end">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Landmark className="w-4 h-4" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <div className="text-center space-y-2">
                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1 animate-pulse">
                            <ChevronUp className="w-3 h-3" /> Swipe Up
                        </p>
                        <h1 className="text-4xl font-black text-emerald-900 tracking-tighter">Loans</h1>
                        <div className="w-12 h-1 bg-emerald-200 rounded-full mx-auto mt-4" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ModuleSelector;
