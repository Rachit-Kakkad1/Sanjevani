import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

function AnimatedNumber({ value = 0, prefix = '', suffix = '', duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    const endValue = Number(value) || 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(endValue * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{(Number(displayValue) || 0).toLocaleString('en-IN')}{suffix}</span>;
}

// Component to display the summary and itemized details of the current medical bill
export default function CurrentBillCard({ bill }) {
  const [showDetails, setShowDetails] = useState(true);
  
  if (!bill) {
    return (
      <div className="p-8 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-[#8D7B68]/20 shadow-md">
        <p className="text-lg font-bold text-[#1a1a1a]">No Recent Medical Bill Selected</p>
        <p className="text-sm text-[#8D7B68] mt-1">Upload a medical bill to see AI-powered audit results.</p>
      </div>
    );
  }

  // Safe extraction of fields across all bill formats
  const totalCharged = Number(bill.totalCharged ?? bill.summary?.totalCharged ?? 0);
  const totalOvercharge = Number(bill.totalOvercharge ?? bill.summary?.potentialSavings ?? 0);
  const calculatedTotal = Number(bill.calculatedTotal ?? bill.summary?.expectedTotal ?? (totalCharged - totalOvercharge));
  const hospitalName = bill.hospitalName || 'Apex Healthcare Centre';
  const jobId = (bill.jobId || bill.id || 'AUDIT-8921').toString();
  
  const savingsPercent = totalCharged > 0 ? Math.round((totalOvercharge / totalCharged) * 100) : 0;

  const cardData = [
    {
      label: 'Total Billed Amount',
      value: totalCharged,
      prefix: '₹',
      icon: DollarSign,
      color: '#1a1a1a',
      bgColor: 'rgba(141, 123, 104, 0.1)'
    },
    {
      label: 'Fair Benchmark Price',
      value: calculatedTotal,
      prefix: '₹',
      icon: TrendingDown,
      color: '#2563eb',
      bgColor: 'rgba(37, 99, 235, 0.1)'
    },
    {
      label: 'Potential Savings / Refund',
      value: totalOvercharge,
      prefix: '₹',
      icon: AlertTriangle,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)'
    }
  ];

  const items = Array.isArray(bill.items) ? bill.items : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-xl" style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(200,182,166,0.4))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(141, 123, 104, 0.25)'
      }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8D7B68]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ef4444]/5 rounded-full blur-2xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1a1a1a' }}>
                Bill Audit Report
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <CheckCircle2 size={22} className="text-[#22c55e]" />
                </motion.div>
              </h3>
              <p className="text-sm font-medium text-[#8D7B68] mt-1">{hospitalName} • ID: {jobId.slice(0, 12)}</p>
            </div>

            {savingsPercent > 0 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="self-start sm:self-auto px-4 py-2 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30 text-sm font-extrabold shadow-sm" 
                style={{ color: '#ef4444' }}
              >
                {savingsPercent}% OVERCHARGED DETECTED
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {cardData.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="p-5 rounded-2xl border border-white/50 shadow-sm transition-all"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={18} style={{ color: card.color }} />
                    <span className="text-xs md:text-sm font-bold" style={{ color: card.color }}>
                      {card.label}
                    </span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black" style={{ color: card.color }}>
                    <AnimatedNumber value={card.value} prefix={card.prefix} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6">
            <motion.button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-[#8D7B68] rounded-xl hover:bg-[#8D7B68]/10 transition-colors border border-[#8D7B68]/20 bg-white/40 cursor-pointer"
            >
              {showDetails ? (
                <>Hide Itemized Audit Breakdown <ChevronUp size={18} /></>
              ) : (
                <>Show Itemized Audit Breakdown ({items.length} Items) <ChevronDown size={18} /></>
              )}
            </motion.button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 border-t border-[#8D7B68]/20 pt-4">
                    {items.length === 0 ? (
                      <div className="py-8 text-center bg-white/30 rounded-2xl border border-dashed border-[#8D7B68]/30">
                        <p className="text-sm font-bold text-[#1a1a1a]">No Line Items Extracted</p>
                        <p className="text-xs text-[#8D7B68] mt-1">Detailed breakdown unavailable for this bill.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-[#8D7B68]/20 bg-white/50">
                        <table className="w-full text-left min-w-[550px]">
                          <thead>
                            <tr className="text-xs uppercase tracking-wider text-[#1a1a1a] font-bold border-b border-[#8D7B68]/20 bg-[#D4C3B5]/50">
                              <th className="py-3 px-4">Procedure / Description</th>
                              <th className="py-3 px-4 text-center">Billed Price</th>
                              <th className="py-3 px-4 text-center">CGHS Limit</th>
                              <th className="py-3 px-4 text-right">Overcharge Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#8D7B68]/15">
                            {items.map((item, idx) => {
                              const rawName = item.rawName || item.name || 'Medical Procedure Item';
                              const totalPrice = Number(item.totalPrice ?? item.charged ?? 0);
                              const overchargeAmount = Number(item.overchargeAmount ?? item.overcharge ?? 0);
                              const cghsLimit = Number(item.cghsLimit ?? (totalPrice - overchargeAmount));
                              const flag = item.flag || item.matchMethod || (overchargeAmount > 0 ? 'Overcharge' : 'Verified');
                              const isOvercharged = item.isOvercharged ?? (overchargeAmount > 0);

                              return (
                                <tr key={idx} className="hover:bg-[#8D7B68]/10 transition-colors">
                                  <td className="py-3 px-4">
                                    <p className="text-sm font-bold text-[#1a1a1a]">{rawName}</p>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#8D7B68]/15 text-[#5c4d3e] inline-block mt-0.5">
                                      {flag}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-sm text-[#1a1a1a]">
                                    ₹{totalPrice.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-sm text-[#2563eb]">
                                    ₹{cghsLimit.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {isOvercharged ? (
                                      <span className="text-sm font-black text-[#ef4444]">
                                        +₹{overchargeAmount.toLocaleString('en-IN')}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-bold text-[#22c55e]">Fair Price</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}