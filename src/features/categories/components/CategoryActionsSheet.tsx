import { useState } from 'react'
import { Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { BottomSheet, Button, ConfirmationDialog, useToast } from '@/components/ui'
import { CategoryForm } from './CategoryForm'
import { getCategoryIcon } from '../categoryConfig'
import { categoryRepository } from '@/db'
import type { Category } from '@/types/entities'

interface CategoryActionsSheetProps {
  category: Category | null
  usageCount: number
  onClose: () => void
}

export function CategoryActionsSheet({ category, usageCount, onClose }: CategoryActionsSheetProps) {
  const { showToast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (!category) return null

  const Icon = getCategoryIcon(category.icon)
  const canDelete = !category.isDefault && usageCount === 0

  async function toggleArchive() {
    if (!category) return
    try {
      await categoryRepository.update(category.id, { isActive: !category.isActive })
      showToast(category.isActive ? 'Category archived' : 'Category restored', 'success')
      onClose()
    } catch {
      showToast('Could not update the category. Please try again.', 'error')
    }
  }

  async function deleteCategory() {
    if (!category) return
    try {
      await categoryRepository.delete(category.id)
      showToast('Category deleted', 'success')
      onClose()
    } catch {
      showToast('Could not delete the category. Please try again.', 'error')
    }
  }

  return (
    <>
      <BottomSheet open={!!category && !editOpen} onClose={onClose} title={category.name}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${category.color}20`, color: category.color }}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold capitalize text-foreground">
                {category.type} category{category.isDefault ? ' · Default' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {usageCount > 0 ? `Used in ${usageCount} transaction${usageCount === 1 ? '' : 's'}` : 'Not used yet'}
              </p>
            </div>
          </div>

          {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}

          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit category
            </Button>
            <Button variant="secondary" onClick={() => (category.isActive ? setArchiveConfirmOpen(true) : toggleArchive())}>
              {category.isActive ? (
                <>
                  <Archive className="h-4 w-4" /> Archive category
                </>
              ) : (
                <>
                  <ArchiveRestore className="h-4 w-4" /> Restore category
                </>
              )}
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete category
              </Button>
            )}
            {category.isDefault && (
              <p className="text-center text-xs text-muted-foreground">
                Default categories can be customized or archived, but not deleted.
              </p>
            )}
            {!category.isDefault && usageCount > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                This category has transaction history, so it's archived instead of deleted.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Category">
        <CategoryForm
          category={category}
          onDone={() => {
            setEditOpen(false)
            onClose()
          }}
        />
      </BottomSheet>

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this category?"
        description="Archived categories are hidden from selection lists, but their data and history stay safe."
        confirmLabel="Archive"
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteCategory}
        title="Delete this category?"
        description="This category has no transaction history, so it can be safely deleted. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}