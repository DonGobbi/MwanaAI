import React, { useEffect, useState } from 'react';
import { FiAward } from 'react-icons/fi';
import { classService } from '../services/classService';

const rankLabel = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

// Class leaderboard — ranks classmates by points (their quiz scores added up).
const Leaderboard = ({ classId, className, meId }) => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const members = await classService.getMembers(classId);
        const withScores = await Promise.all(
          members.map(async (m) => {
            const s = await classService.getStudentSummary(m.studentId);
            return {
              id: m.studentId,
              name: m.studentName,
              quizCount: s.quizCount,
              avg: s.avgScore || 0,
              points: Math.round(((s.avgScore || 0) * s.quizCount) / 10),
            };
          })
        );
        const ranked = withScores
          .filter((r) => r.quizCount > 0)
          .sort((a, b) => b.points - a.points || b.avg - a.avg);
        if (active) setRows(ranked);
      } catch (err) {
        if (active) setRows([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [classId]);

  if (!rows || !rows.length) return null;

  const myIndex = rows.findIndex((r) => r.id === meId);
  const top = rows.slice(0, 5);

  const Row = ({ r, i }) => (
    <li className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.id === meId ? 'bg-primary-50' : ''}`}>
      <span className="flex items-center gap-2 min-w-0">
        <span className="w-6 text-center">{rankLabel(i)}</span>
        <span className={`truncate ${r.id === meId ? 'font-semibold text-primary-700' : 'text-gray-700'}`}>
          {r.name}{r.id === meId ? ' (You)' : ''}
        </span>
      </span>
      <span className="font-semibold text-gray-600 flex-shrink-0">{r.points} pts</span>
    </li>
  );

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FiAward className="text-amber-500" />
        <h2 className="font-bold text-gray-900">
          Leaderboard <span className="text-xs font-normal text-gray-400">· {className}</span>
        </h2>
      </div>
      <ul className="space-y-1.5">
        {top.map((r, i) => <Row key={r.id} r={r} i={i} />)}
        {myIndex >= 5 && <Row r={rows[myIndex]} i={myIndex} />}
      </ul>
      <p className="text-xs text-gray-400 mt-2">Points come from your quiz scores — do more quizzes and score higher to climb! 🚀</p>
    </div>
  );
};

export default Leaderboard;
