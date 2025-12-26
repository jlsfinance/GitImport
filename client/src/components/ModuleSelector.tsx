```
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Receipt, Landmark, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleSelectorProps {
    onSelect: (module: 'accounting' | 'loan') => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect }) => {
    const y = useMotionValue(0);
    const [selected, setSelected] = useState<'accounting' | 'loan' | null>(null);

    // Dynamic transforms based on drag
    const manScale = useTransform(y, [0, 200], [1, 1.5]);
    const lionScale = useTransform(y, [0, -200], [1, 1.5]);
    
    // The "loser" gets pulled depending on drag direction
    const lionY = useTransform(y, [0, 300], [0, 300]); // Lion gets pulled up (towards man) when dragging down (positive Y) ? 
    // Wait, dragging down (positive Y) moves content down. 
    // If I pull DOWN (Billing), I want the top content to expand.
    // So the Rope should move DOWN.
    // The Lion (bottom) should be pulled UP towards the rope? No, if rope moves down, Lion moves down. 
    // Let's visualize: 
    // Man is at Top. Lion is at Bottom. Rope connects them.
    // Swipe DOWN -> Man pulls rope DOWN. Lion gets pulled DOWN (off screen?) OR Lion resists?
    // User said: "oposite side vala haar jaye ya vo istaraf aaye" (Opposite side loses or comes this side).
    // If I select Top (Billing), Lion should be pulled UP to the Top? or Man pulls rope to him?
    // Let's do: Rope and characters follow the drag. 
    // Drag Down (Billing Wins) -> Whole assembly moves Down. Lion disappears off bottom? Or Man takes over screen?
    // Let's go with: Man takes over screen.
    
    // Adjusted logic:
    // Drag Down (Positive Y) -> Man enters more.
    // Drag Up (Negative Y) -> Lion enters more.
    
    const handleDragEnd = () => {
        const currentY = y.get();
        if (currentY > 100) {
            // Billing Wins
            setSelected('accounting');
            // Animate completion
            animate(y, window.innerHeight, { duration: 0.5 });
            setTimeout(() => onSelect('accounting'), 500);
        } else if (currentY < -100) {
            // Loans Wins
            setSelected('loan');
            animate(y, -window.innerHeight, { duration: 0.5 });
            setTimeout(() => onSelect('loan'), 500);
        } else {
            // Reset
            animate(y, 0, { type: 'spring' });
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-100 overflow-hidden font-sans flex flex-col select-none">
            
            {/* Background Split */}
            <motion.div style={{ height: useTransform(y, (latest) => `calc(50 % + ${ latest }px)`) }} className="absolute top-0 inset-x-0 bg-rose-50 border-b border-slate-200" />
            <motion.div style={{ height: useTransform(y, (latest) => `calc(50 % - ${ latest }px)`) }} className="absolute bottom-0 inset-x-0 bg-emerald-50" />

            {/* Central Interactive Layer */}
            <motion.div 
                className="relative w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-20"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }} // Elastic drag
                dragElastic={0.6}
                style={{ y }}
                onDragEnd={handleDragEnd}
            >
                
                {/* ROPE SVG */}
                <div className="absolute top-0 bottom-0 w-2 bg-transparent flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-1 h-full bg-amber-700/80 shadow-sm relative">
                        {/* Knot */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-amber-800 rounded-full shadow-lg border-2 border-amber-600" />
                    </div>
                </div>

                {/* Top Player: Businessman (Billing) */}
                <motion.div 
                    className="absolute top-[15%] flex flex-col items-center gap-4 p-4"
                    style={{ scale: manScale }}
                >
                    <div 
                        onClick={() => onSelect('accounting')}
                        className="w-32 h-32 bg-white rounded-full shadow-2xl shadow-rose-900/20 border-4 border-rose-500 flex items-center justify-center text-7xl relative z-10 hover:scale-105 transition-transform cursor-pointer"
                    >
                        👨‍💼
                        <div className="absolute -bottom-4 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            Billing
                        </div>
                    </div>
                </motion.div>

                {/* VISUAL HINT */}
                {!selected && (
                   <motion.div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl border border-white/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                   >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                         <ChevronUp size={12} /> VS <ChevronDown size={12} />
                      </p>
                   </motion.div>
                )}


                {/* Bottom Player: Lion (Loans) */}
                <motion.div 
                    className="absolute bottom-[15%] flex flex-col items-center gap-4 p-4"
                    style={{ scale: lionScale }}
                >
                    <div 
                        onClick={() => onSelect('loan')}
                        className="w-32 h-32 bg-white rounded-full shadow-2xl shadow-emerald-900/20 border-4 border-emerald-500 flex items-center justify-center text-7xl relative z-10 hover:scale-105 transition-transform cursor-pointer"
                    >
                        🦁
                        <div className="absolute -top-4 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            Loans
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Victory/Defeat Messages */}
            <motion.div 
                className="absolute top-10 w-full text-center pointer-events-none"
                style={{ opacity: useTransform(y, [50, 200], [0, 1]) }}
            >
                <h1 className="text-4xl font-black text-rose-500 scale-125 transition-transform">BILLING WINS!</h1>
            </motion.div>

            <motion.div 
                className="absolute bottom-10 w-full text-center pointer-events-none"
                style={{ opacity: useTransform(y, [-50, -200], [0, 1]) }}
            >
                <h1 className="text-4xl font-black text-emerald-500 scale-125 transition-transform">LOANS WIN!</h1>
            </motion.div>

        </div>
    );
};

export default ModuleSelector;
```
