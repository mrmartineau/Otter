'use client';

import { Button } from '@/src/components/Button';
import { Input } from '@/src/components/Input';
import emailValidator from 'email-validator';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToggle } from '../hooks/useToggle';
import { getErrorMessage } from '../utils/get-error-message';
import { createBrowserClient } from '../utils/supabase/client';
import { FormGroup } from './FormGroup';

export interface FormData {
  email?: string;
  password?: string;
}

interface UpdateInfoProps {
  user: any;
}

export const UpdateInfoForm = ({ user }: UpdateInfoProps) => {
  const supabaseClient = createBrowserClient();
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, , setFormSubmitting] = useToggle();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      email: user.email,
    },
  });
  const handleUpdateInfo = async (values: FormData) => {
    try {
      const { error } = await supabaseClient.auth.updateUser({
        email: values.email,
        password: values.password,
      });
      if (error) {
        throw error;
      }
      setFormSubmitting(false);
      setValue('password', '');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setFormError(errorMessage);
      setFormSubmitting(false);
    }
  };
  const onFormSubmit = async (formData: FormData) => {
    setFormSubmitting(true);
    setFormError('');
    handleUpdateInfo(formData);
  };

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
          label="Password"
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
  );
};
