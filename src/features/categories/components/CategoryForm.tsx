import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoryRepository, generateId } from '@/db'
import { categoryFormSchema, type CategoryFormValues } from '../categorySchema'
import { CATEGORY_COLORS, getCategoryIcon } from '../categoryConfig'
import { IconPicker } from './IconPicker'
import { Button, Input, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Category, CategoryType } from '@/types/entities'

interface CategoryFormProps {
  category?: Category
  defaultType?: CategoryType
  onDone: () => void
}

export function CategoryForm({ category, defaultType = 'expense', onDone }: CategoryFormProps) {
  const { showToast } = useToast()
  const isEdit = !!category
  const [submitting, setSubmitting] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      type: category?.type ?? defaultType,
      icon: category?.icon ?? 'Tag',
      color: category?.color ?? CATEGORY_COLORS[0],
      description: category?.description ?? '',
    },
  })

  const type = watch('type')
  const icon = watch('icon')
  const color = watch('color')
  const Icon = getCategoryIcon(icon)

    async function onSubmit(values: CategoryFormValues) {
    setSubmitting(true)
    try {
      const siblings = await categoryRepository.getByType(values.type)
      const isDuplicate = siblings.some(
        (c) =>
          c.isActive &&
          c.id !== category?.id &&
          c.name.trim().toLowerCase() === values.name.trim().toLowerCase()
      )
      if (isDuplicate) {
        showToast(`An active ${values.type} category named "${values.name.trim()}" already exists.`, 'error')
        setSubmitting(false)
        return
      }

      if (isEdit && category) {
        await categoryRepository.update(category.id, {
          name: values.name,
          icon: values.icon,
          color: values.color,
          description: values.description,
        })
        showToast('Category updated', 'success')
      } else {
        const now = Date.now()
        const newCategory: Category = {
          id: generateId(),
          name: values.name,
          type: values.type,
          icon: values.icon,
          color: values.color,
          description: values.description,
          parentId: null,
          isDefault: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        await categoryRepository.create(newCategory)
        showToast('Category created', 'success')
      }
      onDone()
    } catch {
      showToast('Could not save the category. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      {!isEdit && (
        <div className="flex rounded-xl border border-border bg-surface-elevated p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('type', t)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-150',
                type === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIconPickerOpen(true)}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left transition-colors active:bg-border/30"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Icon</p>
          <p className="text-xs text-muted-foreground">Tap to change</p>
        </div>
      </button>

      <Input label="Category name" placeholder="e.g. Office Lunch" error={errors.name?.message} {...register('name')} />

      <Input
        label="Description (optional)"
        placeholder="What this category is for"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Color</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              aria-label={`Use color ${c}`}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform active:scale-90',
                color === c ? 'border-foreground' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add category'}
      </Button>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        color={color}
        onSelect={(name) => setValue('icon', name)}
      />
    </form>
  )
}