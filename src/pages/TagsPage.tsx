import { useEffect, useState } from 'react';
import { HiPencil, HiTrash, HiPlus, HiX } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from '../components/common/Toast';
import { getTags, createTag, updateTag, deleteTag } from '../services/tagService';
import type { Tag } from '../types';

const PRESET_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

const hexToHsl = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const getComplementaryColor = (hexColor: string): string => {
  const [h, s, l] = hexToHsl(hexColor);
  const complementaryHue = (h + 180) % 360;
  return hslToHex(complementaryHue, s, l);
};

interface TagFormState {
  name: string;
  color: string;
  defaultAccountId: string;
  defaultCategoryId: string;
  colorManuallySet: boolean;
  importKeywords: string;
  excludeFromBudget: boolean;
}

const emptyForm: TagFormState = {
  name: '',
  color: PRESET_COLORS[0],
  defaultAccountId: '',
  defaultCategoryId: '',
  colorManuallySet: false,
  importKeywords: '',
  excludeFromBudget: false,
};

const TagsPage = () => {
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTags = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getTags(currentUser.uid);
      setTags(data);
    } catch (err) {
      console.error('Error loading tags:', err);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleAdd = () => {
    setEditingTag(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      color: tag.color || PRESET_COLORS[0],
      defaultAccountId: tag.defaultAccountId || '',
      defaultCategoryId: tag.defaultCategoryId || '',
      colorManuallySet: true,
      importKeywords: (tag.importKeywords || []).join(', '),
      excludeFromBudget: tag.excludeFromBudget || false,
    });
    setShowForm(true);
  };

  const handleColorChange = (color: string) => {
    setForm((prev) => ({ ...prev, color, colorManuallySet: true }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setForm((prev) => {
      if (prev.colorManuallySet) {
        return { ...prev, defaultCategoryId: categoryId };
      }
      const category = categories.find((c) => c.id === categoryId);
      if (category?.color) {
        return { ...prev, defaultCategoryId: categoryId, color: getComplementaryColor(category.color) };
      }
      return { ...prev, defaultCategoryId: categoryId };
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!form.name.trim()) {
      toast.error('Tag name is required');
      return;
    }
    setSaving(true);
    try {
      const importKeywords = form.importKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        color: form.color,
        defaultAccountId: form.defaultAccountId || undefined,
        defaultCategoryId: form.defaultCategoryId || undefined,
        importKeywords: importKeywords.length > 0 ? importKeywords : undefined,
        excludeFromBudget: form.excludeFromBudget,
      };
      if (editingTag) {
        await updateTag(editingTag.id, payload);
        toast.success('Tag updated');
      } else {
        await createTag(currentUser.uid, payload);
        toast.success('Tag created');
      }
      setShowForm(false);
      setEditingTag(null);
      await loadTags();
    } catch (err) {
      console.error('Error saving tag:', err);
      toast.error('Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag(id);
      toast.success('Tag deleted');
      await loadTags();
    } catch (err) {
      console.error('Error deleting tag:', err);
      toast.error('Failed to delete tag');
    }
  };

  const accountName = (id?: string) => (id ? accounts.find((a) => a.id === id)?.name : undefined);
  const categoryName = (id?: string) => (id ? categories.find((c) => c.id === id)?.name : undefined);

  if (loading) return <LoadingSpinner message="Loading tags..." />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage tags and their default account/category presets
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary text-sm">
          <HiPlus className="w-4 h-4" /> Add Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No tags yet"
          description="Create a tag to speed up categorizing transactions."
          action={
            <button onClick={handleAdd} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Add Tag
            </button>
          }
        />
      ) : (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="card p-3.5 flex items-center justify-between group hover:shadow-md transition-all duration-150"
              style={{ borderLeft: `3px solid ${tag.color || '#6366f1'}` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#6366f1' }} />
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{tag.name}</div>
                  {tag.excludeFromBudget && (
                    <span className="badge text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700 flex-shrink-0">
                      Excluded from budget
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                  {accountName(tag.defaultAccountId) && <div>Account: {accountName(tag.defaultAccountId)}</div>}
                  {categoryName(tag.defaultCategoryId) && <div>Category: {categoryName(tag.defaultCategoryId)}</div>}
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => handleEdit(tag)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                  <HiPencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => setDeleteTarget(tag.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                  <HiTrash className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTag ? 'Edit Tag' : 'Add Tag'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <HiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="form-label">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., Office, Travel"
                />
              </div>

              <div>
                <label className="form-label">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-1 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="form-label">Default account <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={form.defaultAccountId}
                  onChange={(e) => setForm((prev) => ({ ...prev, defaultAccountId: e.target.value }))}
                  className="form-input"
                >
                  <option value="">None</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Default category <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={form.defaultCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">None</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon || '📌'} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Import matching keywords <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={form.importKeywords}
                  onChange={(e) => setForm((prev) => ({ ...prev, importKeywords: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., amazon, flipkart, delivery"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used only during CSV import to auto-suggest this tag — not the old text-matching rules engine.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.excludeFromBudget}
                    onChange={(e) => setForm((prev) => ({ ...prev, excludeFromBudget: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-500 focus:ring-primary-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Exclude tagged transactions from budget</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Transactions with this tag won't count toward category budget spend (dashboard totals are unaffected).
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTag ? 'Save changes' : 'Add tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete tag"
        message="This will permanently delete the tag. Existing transactions won't be affected."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
};

export default TagsPage;
