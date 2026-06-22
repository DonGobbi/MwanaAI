import React from 'react';
import { FiAward } from 'react-icons/fi';

const Badges = ({ badges }) => {
  if (!badges || !badges.length) return null;
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FiAward className="text-amber-500" />
        <h2 className="font-bold text-gray-900">
          Achievements <span className="text-xs font-normal text-gray-400">· {earned} earned</span>
        </h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.desc}
            className={`text-center p-2 rounded-lg transition-all ${
              b.earned ? 'bg-amber-50' : 'opacity-40 grayscale'
            }`}
          >
            <div className="text-3xl">{b.icon}</div>
            <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{b.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Badges;
