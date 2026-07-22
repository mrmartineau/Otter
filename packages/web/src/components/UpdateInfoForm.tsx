import emailValidator from 'email-validator'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { authClient } from '@/utils/auth/client'
import { useToggle } from '../hooks/useToggle'
import { getErrorMessage } from '../utils/get-error-message'
import { FormGroup } from './FormGroup'

export interface FormData {
  currentPassword?: string
  email?: string
  password?: string
}

interface UpdateInfoProps {
  user: {
    email: string
  } | null
}

export const UpdateInfoForm = ({ user }: UpdateInfoProps) => {
  const [formError, setFormError] = useState<string>('')
  const [formSubmitting, , setFormSubmitting] = useToggle()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      email: user?.email,
    },
  })
  const handleUpdateInfo = async (values: FormData) => {
    try {
      if (values.email && values.email !== user?.email) {
        const { error } = await authClient.changeEmail({
          newEmail: values.email,
        })

        if (error) {
          throw error
        }
      }

      if (values.password) {
        if (!values.currentPassword) {
          throw new Error('Current password is required to change password')
        }

        const { error } = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.password,
          revokeOtherSessions: true,
        })

        if (error) {
          throw error
        }
      }

      setFormSubmitting(false)
      setValue('currentPassword', '')
      setValue('password', '')
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      setFormError(errorMessage)
      setFormSubmitting(false)
    }
  }
  const onFormSubmit = async (formData: FormData) => {
    setFormSubmitting(true)
    setFormError('')
    handleUpdateInfo(formData)
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="flex flex-col gap-s"
      >
        <FormGroup
          label="Email"
          name="email"
          error={errors.email?.message as string}
        >
          <Input
            id="email"
            type="email"
            placeholder="Email"
            aria-invalid={errors.email ? 'true' : 'false'}
            // state={errors.email?.message ? 'error' : 'normal'}
            {...register('email', {
              validate: (value) =>
                emailValidator.validate(value as string)
                  ? undefined
                  : 'Invalid email',
            })}
            autoComplete="email"
          />
        </FormGroup>

        <FormGroup
          label="Current password"
          name="currentPassword"
          error={errors.currentPassword?.message as string}
        >
          <Input
            id="currentPassword"
            type="password"
            placeholder="Current password"
            aria-invalid={errors.currentPassword?.message ? 'true' : 'false'}
            {...register('currentPassword')}
            autoComplete="current-password"
          />
        </FormGroup>

        <FormGroup
          label="New password"
          name="password"
          error={errors.password?.message as string}
        >
          <Input
            id="password"
            type="password"
            placeholder="Password"
            aria-invalid={errors.password?.message ? 'true' : 'false'}
            // state={errors.password?.message ? 'error' : 'normal'}
            {...register('password')}
            autoComplete="new-password"
          />
        </FormGroup>

        <div>
          <Button disabled={formSubmitting} type="submit">
            Save
          </Button>
        </div>
      </form>
      {formError && <div className="mt-s">{formError}</div>}
    </div>
  )
}
