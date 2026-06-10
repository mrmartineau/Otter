import { CircleIcon, NotebookIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import type { Journal, JournalEntryInsert } from '@/types/db'
import { IconControl } from './IconControl'

type JournalEntryFormValues = Omit<JournalEntryInsert, 'journal'> & {
  journal: string
}

interface JournalEntryFormProps extends Omit<ComponentProps<'div'>, 'id'> {
  type: 'new' | 'edit'
  initialValues?: Partial<JournalEntryInsert>
  journals?: Journal[]
  onFormSubmit?: (data: JournalEntryInsert) => void
}

export const JournalEntryForm = ({
  className,
  type,
  initialValues,
  journals = [],
  onFormSubmit,
  ...rest
}: JournalEntryFormProps) => {
  const isNew = type === 'new'

  const { register, handleSubmit } = useForm<JournalEntryFormValues>({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      entry: '',
      ...initialValues,
      journal:
        initialValues?.journal != null ? String(initialValues.journal) : '',
    },
  })

  const handleSubmitForm = (formData: JournalEntryFormValues) => {
    onFormSubmit?.({
      ...formData,
      journal: formData.journal ? Number(formData.journal) : null,
    })
  }

  return (
    <div className="journal-entry-form" {...rest}>
      <h2 className="mb-s">{isNew ? 'New journal entry' : 'Edit entry'}</h2>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className="flex flex-col gap-s"
      >
        {/* ENTRY */}
        <FormGroup label="Entry" name="entry" labelIsVisible={false}>
          <Textarea
            id="entry"
            placeholder="What happened?"
            minRows={6}
            autoFocus
            {...register('entry', { required: true })}
          />
        </FormGroup>

        {/* DATE */}
        <FormGroup label="Date" name="date">
          <Input id="date" type="date" {...register('date')} />
        </FormGroup>

        {/* JOURNAL */}
        {journals.length ? (
          <FormGroup label="Journal" name="journal">
            <div className="flex items-center gap-xs flex-wrap">
              <IconControl
                type="radio"
                value=""
                label="None"
                {...register('journal')}
              >
                <CircleIcon size={18} weight="duotone" />
              </IconControl>
              {journals.map((journalItem) => (
                <IconControl
                  key={journalItem.id}
                  type="radio"
                  value={String(journalItem.id)}
                  label={journalItem.name}
                  {...register('journal')}
                >
                  <NotebookIcon size={18} weight="duotone" />
                </IconControl>
              ))}
            </div>
          </FormGroup>
        ) : null}

        <div>
          <Button type="submit">{isNew ? 'Save' : 'Update'}</Button>
        </div>
      </form>
    </div>
  )
}
