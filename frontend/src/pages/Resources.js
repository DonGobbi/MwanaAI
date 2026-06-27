import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import { resourceService } from '../services/resourceService';
import EmptyState from '../components/EmptyState';
import ResourceAI from '../components/ResourceAI';
import Markdown from '../components/Markdown';
import { getGradeLevel } from '../config/curriculum';
import { PageLoader } from '../components/Spinner';
import { FiFolder, FiFileText, FiImage, FiYoutube, FiChevronDown, FiExternalLink } from 'react-icons/fi';

const KIND_ICON = { image: FiImage, youtube: FiYoutube, file: FiFileText, text: FiFileText };
const KIND_LABEL = {
  youtube: 'Video transcript', image: 'Image', text: 'Notes', file: 'Document',
  lesson: 'Lesson plan', quiz: 'Quiz', notes: 'Revision notes', questions: 'Exam questions',
};

const ResourceRow = ({ r, level }) => {
  const [open, setOpen] = useState(false);
  const Icon = KIND_ICON[r.kind] || FiFileText;
  return (
    <div className="px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 text-left">
        <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
          <p className="text-xs text-gray-400">
            {KIND_LABEL[r.kind] || 'Resource'}
            {r.chars ? ` · ${r.chars.toLocaleString()} chars` : ''}
            {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString()}` : ''}
          </p>
        </div>
        <FiChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 animate-fade-in">
          {r.kind === 'youtube' && r.sourceName && (
            <a href={r.sourceName} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mb-2">
              <FiExternalLink /> Open the video
            </a>
          )}
          {r.text ? (
            <div className="max-h-80 overflow-y-auto rounded-lg bg-gray-50 border border-gray-100 p-3">
              <Markdown content={r.text} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">No readable text for this resource.</p>
          )}

          <ResourceAI resource={r} level={level} />
        </div>
      )}
    </div>
  );
};

const Resources = () => {
  const { currentUser, userProfile } = useAuth();
  const level = getGradeLevel(
    userProfile?.gradeLevel || localStorage.getItem('mwanaai_grade_level')
  )?.label;
  const [groups, setGroups] = useState([]); // [{ cls, resources }]
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const classes = await classService.listClassesForStudent(currentUser.uid);
      const withResources = await Promise.all(
        classes.map(async (c) => ({
          cls: c,
          resources: await resourceService.listForClass(c.classId),
        }))
      );
      setGroups(withResources);
    } catch (err) {
      console.error('Could not load resources:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const totalResources = groups.reduce((n, g) => n + g.resources.length, 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Class resources</h1>
        <p className="text-gray-600 text-sm mb-6">Materials your teachers have shared with your classes.</p>

        {loading ? (
          <PageLoader />
        ) : groups.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={FiFolder}
              title="You haven't joined a class yet"
              description="Join a class with the code from your teacher to see the resources they share."
            >
              <Link to="/progress" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg">
                Join a class
              </Link>
            </EmptyState>
          </div>
        ) : totalResources === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={FiFolder}
              title="No resources shared yet"
              description="When your teacher adds resources to your class, they'll appear here."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.cls.classId}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-900">{g.cls.className}</h2>
                  <span className="text-xs text-gray-400">
                    {g.resources.length} resource{g.resources.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {g.resources.length === 0 ? (
                  <p className="text-sm text-gray-400 card p-4">Nothing shared yet.</p>
                ) : (
                  <div className="card divide-y divide-gray-100">
                    {g.resources.map((r) => <ResourceRow key={r.id} r={r} level={level} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
