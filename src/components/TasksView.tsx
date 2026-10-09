import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Tag,
  Check,
  X,
  Volume2
} from 'lucide-react';
import { TaskItem } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface TasksViewProps {
  tasks: TaskItem[];
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onTestReminder: (task: TaskItem) => void;
}

const CATEGORIES = [
  'প্যাকিং ও কুরিয়ার',
  'কারিগর ও সাপ্লায়ার',
  'সোশ্যাল মিডিয়া ও মার্কেটিং',
  'অ্যাকাউন্টিং ও স্টক',
  'মেসেঞ্জার ও গ্রাহক সেবা',
  'অন্যান্য কাজ',
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onTestReminder,
}) => {
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState('12:00');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState(CATEGORIES[0]);

  // Open add modal
  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDate(todayStr);
    setTime('12:00');
    setPriority('medium');
    setCategory(CATEGORIES[0]);
    setEditingTask(null);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDate(task.date);
    setTime(task.time);
    setPriority(task.priority);
    setCategory(task.category);
    setIsAddModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        priority,
        category,
      });
    } else {
      onAddTask({
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        priority,
        category,
        completed: false,
      });
    }
    setIsAddModalOpen(false);
    setEditingTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'completed') return t.completed;
    if (filter === 'today') return !t.completed && t.date === todayStr;
    if (filter === 'upcoming') return !t.completed && t.date > todayStr;
    return true; // all
  });

  const todayCount = tasks.filter((t) => !t.completed && t.date === todayStr).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Add Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                দৈনন্দিন কাজের সময়সূচি ও অ্যালার্ম
              </span>
              <span className="text-xs text-slate-300">
                আজকের কাজ বাকি: <strong className="text-amber-400">{todayCount}</strong> টি
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              দৈনন্দিন কাজের তালিকা ও রিমাইন্ডার
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              আজ কী কী কাজ কখন করবেন তা ঠিক করে রাখুন। নির্ধারিত সময়ে অ্যাপ্লিকেশন আপনাকে অডিও অ্যালার্ম ও পপআপ বার্তার মাধ্যমে মনে করিয়ে দেবে।
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            নতুন কাজ যোগ করুন
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            আজকের কাজ ({tasks.filter((t) => !t.completed && t.date === todayStr).length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            আসন্ন কাজ ({tasks.filter((t) => !t.completed && t.date > todayStr).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            সম্পন্ন কাজ ({tasks.filter((t) => t.completed).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            সকল কাজ ({tasks.length})
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-bold text-slate-800">কোন কাজ অবশিষ্ট নেই!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === 'today'
                ? 'আজকের জন্য নির্ধারিত কোনো কাজ বাকি নেই। নতুন কাজ যোগ করতে উপরের বাটনে চাপুন।'
                : 'নির্বাচিত ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি।'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                task.completed
                  ? 'border-slate-200 bg-slate-50/70 opacity-70'
                  : task.priority === 'high'
                  ? 'border-rose-200 shadow-xs hover:border-rose-300'
                  : 'border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <button
                  type="button"
                  onClick={() => onToggleComplete(task.id)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                  ) : (
                    <Circle className="w-6 h-6 hover:stroke-emerald-600" />
                  )}
                </button>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-bold text-sm sm:text-base ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {/* Priority badge */}
                    {task.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                        জরুরি
                      </span>
                    )}
                    {task.priority === 'medium' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-700">
                        মধ্যম
                      </span>
                    )}

                    {/* Category tag */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {task.category}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.date === todayStr ? (
                        <strong className="text-emerald-700">আজকে ({task.date})</strong>
                      ) : (
                        task.date
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      সময়: <strong className="text-slate-800">{task.time}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                {!task.completed && (
                  <button
                    type="button"
                    onClick={() => onTestReminder(task)}
                    className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    title="রিমাইন্ডার অ্যালার্ম টেস্ট করুন"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(task)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="সম্পাদনা করুন"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingTaskId(task.id)}
                  className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingTask ? 'কাজ সম্পাদনা করুন' : 'নতুন কাজ ও রিমাইন্ডার সেট করুন'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কাজের শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: ৫টি কুরিয়ার পার্সেল প্যাকিং ও ইনভয়েস প্রিন্ট"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিস্তারিত বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="কাজের বিস্তারিত নোট বা কারিগরদের নাম..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    নির্দিষ্ট সময় (HH:mm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাজের বিভাগ (Category)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    গুরুত্ব (Priority)
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="high">উচ্চ / জরুরি</option>
                    <option value="medium">মধ্যম</option>
                    <option value="low">সাধারণ</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTaskId}
        title="কাজটি মুছে ফেলতে চান?"
        message="এই কাজটি মুছে ফেললে এর পূর্বনির্ধারিত রিমাইন্ডার বন্ধ হয়ে যাবে। এটি কি নিশ্চিত করতে চান?"
        confirmText="হ্যাঁ, মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingTaskId) {
            onDeleteTask(deletingTaskId);
            setDeletingTaskId(null);
          }
        }}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
};
