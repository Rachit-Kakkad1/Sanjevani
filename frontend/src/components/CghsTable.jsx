import React from 'react';

const CghsTable = ({ data, loading }) => {
  if (loading && (!data || data.length === 0)) {
    return (
      <div className="w-full space-y-3 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-card/60 rounded-xl w-full border border-border/30" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-card/40 rounded-3xl border border-border/40 backdrop-blur-md shadow-sm">
        <svg className="w-16 h-16 mb-4 opacity-30 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl font-bold text-text-main">No procedures found</p>
        <p className="text-sm text-text-muted mt-1">Try adjusting your search or classification filter</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-card/90 backdrop-blur-xl z-10 border-b border-border/40">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Code</th>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Procedure Name</th>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-right">Non-NABH</th>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-right">NABH</th>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-right">Super Speciality</th>
            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Classification</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {data.map((item) => (
            <tr 
              key={item._id} 
              className="group hover:bg-emerald-500/10 transition-colors duration-200"
            >
              <td className="px-6 py-4 text-sm font-mono text-text-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-semibold">
                {item.code}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-semibold text-text-main group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  {item.canonicalName}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-text-main">
                ₹{(item.nonNABH ?? item.pricing?.tier1?.nonNABH)?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-text-main">
                ₹{(item.NABH ?? item.pricing?.tier1?.NABH)?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(item.superSpeciality ?? item.pricing?.tier1?.superSpeciality)?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-background border border-border/40 text-text-muted group-hover:border-emerald-500/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all">
                  {item.classification}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CghsTable;
