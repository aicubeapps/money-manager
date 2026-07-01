import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import CategoryList from '../components/categories/CategoryList';
import CategoryForm from '../components/categories/CategoryForm';
import { createCategory, updateCategory, disableCategory, enableCategory, deleteCategory } from '../services/categoryService';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Category } from '../types';

const CategoriesPage = () => {
  const { currentUser } = useAuth();
  const { categories, loading, error } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleAdd = () => { setEditingCategory(null); setShowForm(true); };
  const handleEdit = (category: Category) => { setEditingCategory(category); setShowForm(true); };

  const handleSave = async (data: any) => {
    if (!currentUser) return;
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
        toast.success('Category updated');
      } else {
        await createCategory(currentUser.uid, data);
        toast.success('Category created');
      }
      setShowForm(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Failed to save category');
    }
  };

  const handleDisable = async (id: string) => {
    try {
      await disableCategory(id);
      toast.info('Category hidden');
    } catch { toast.error('Failed to disable category'); }
  };

  const handleEnable = async (id: string) => {
    try {
      await enableCategory(id);
      toast.success('Category enabled');
    } catch { toast.error('Failed to enable category'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
    } catch { toast.error('Failed to delete category'); }
  };

  if (loading) return <LoadingSpinner message="Loading categories..." />;
  if (error) return <div className="card p-6 text-red-500 text-center">Error: {error}</div>;

  return (
    <>
      <CategoryList
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDisable={handleDisable}
        onEnable={handleEnable}
        onDelete={handleDelete}
      />
      {showForm && (
        <CategoryForm
          category={editingCategory}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingCategory(null); }}
        />
      )}
    </>
  );
};

export default CategoriesPage;
