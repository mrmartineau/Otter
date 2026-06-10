import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Journal,
  JournalEntry,
  JournalEntryFilters,
  JournalEntryInsert,
  JournalEntryUpdate,
  JournalInsert,
  JournalUpdate,
} from '@/types/db'
import { getErrorMessage } from '../get-error-message'

type SingleResponse<T> = {
  data: T
  error: null
}

type ListResponse<T> = {
  count: number
  data: T[]
  error: null
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as {
    error?: string
    reason?: string
  }

  if (!response.ok) {
    throw new Error(body.error || body.reason || 'Request failed')
  }

  return body as T
}

export const getJournals = async () => {
  const response = await fetch('/api/journals', { credentials: 'include' })
  return await parseJsonResponse<ListResponse<Journal>>(response)
}

export const getJournalsOptions = () => {
  return queryOptions({
    queryFn: () => getJournals(),
    queryKey: ['journals'],
    staleTime: 5 * 1000,
  })
}

export const getJournalEntries = async (filters: JournalEntryFilters = {}) => {
  const searchParams = new URLSearchParams()

  if (filters.journal) {
    searchParams.set('journal', String(filters.journal))
  }

  const queryString = searchParams.toString()
  const response = await fetch(
    `/api/journal-entries${queryString ? `?${queryString}` : ''}`,
    { credentials: 'include' },
  )
  return await parseJsonResponse<ListResponse<JournalEntry>>(response)
}

export const getJournalEntriesOptions = (filters: JournalEntryFilters = {}) => {
  return queryOptions({
    queryFn: () => getJournalEntries(filters),
    queryKey: ['journalEntries', filters],
    staleTime: 5 * 1000,
  })
}

export const getJournalEntry = async ({ id }: { id: number }) => {
  const response = await fetch(`/api/journal-entries/${id}`, {
    credentials: 'include',
  })
  return await parseJsonResponse<SingleResponse<JournalEntry>>(response)
}

export const getJournalEntryOptions = ({ id }: { id: number }) => {
  return queryOptions({
    queryFn: () => getJournalEntry({ id }),
    queryKey: ['journalEntries', id],
    staleTime: 5 * 1000,
  })
}

export const useCreateJournal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: JournalInsert) => {
      const response = await fetch('/api/journals', {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      return await parseJsonResponse<SingleResponse<Journal>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to create journal', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      toast.success('Journal created successfully')
    },
  })
}

export const useUpdateJournal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: JournalUpdate }) => {
      const response = await fetch(`/api/journals/${id}`, {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      return await parseJsonResponse<SingleResponse<Journal>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to update journal', {
        description: errorMessage,
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      toast.success(`${data?.data.name} updated successfully`)
    },
  })
}

export const useDeleteJournal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/journals/${id}`, {
        credentials: 'include',
        method: 'DELETE',
      })

      return await parseJsonResponse<SingleResponse<Journal>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to delete journal', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      toast.success('Journal deleted successfully')
    },
  })
}

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: JournalEntryInsert) => {
      const response = await fetch('/api/journal-entries', {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      return await parseJsonResponse<SingleResponse<JournalEntry>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to create journal entry', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      toast.success('Journal entry created successfully')
    },
  })
}

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: JournalEntryUpdate
    }) => {
      const response = await fetch(`/api/journal-entries/${id}`, {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      return await parseJsonResponse<SingleResponse<JournalEntry>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to update journal entry', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      toast.success('Journal entry updated successfully')
    },
  })
}

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/journal-entries/${id}`, {
        credentials: 'include',
        method: 'DELETE',
      })

      return await parseJsonResponse<SingleResponse<JournalEntry>>(response)
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error)
      toast.error('Failed to delete journal entry', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      toast.success('Journal entry deleted successfully')
    },
  })
}
