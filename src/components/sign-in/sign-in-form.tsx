"use client"

import {
  Alert,
  Button,
  Checkbox,
  FieldError,
  InputGroup,
  Label,
  Spinner,
  TextField
} from "@heroui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  LockPasswordIcon,
  UserIcon,
  ViewIcon,
  ViewOffSlashIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { signIn } from "@/actions/auth/sign-in"
import { formValidator, type FormValidator } from "@/actions/auth/validator.zod"

/**
 * A tall, borderless field on dark glass that lights up in the theme color while focused.
 */
const FIELD_GROUP =
  "h-13 rounded-2xl border border-transparent bg-white/6 shadow-none transition-[border-color,box-shadow] hover:bg-white/8 focus-within:border-theme/80 focus-within:shadow-[0_0_0_4px_rgb(5_214_162/0.12)] data-[invalid=true]:border-danger/70"

/**
 * The sign-in form inside `SignInModal`. It validates with the action's own `formValidator`, then calls
 * `signIn`: field errors from the server land under their fields, and a refused sign-in (wrong credentials,
 * suspended account) shows above the button with the same message for every case.
 *
 * The accent variables are pointed at the theme color so HeroUI's checkbox matches the rest of the form.
 */
export function SignInForm({ onSuccess }: Readonly<{ onSuccess: () => void }>) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const form = useForm<FormValidator>({
    resolver: zodResolver(formValidator),
    defaultValues: { identifier: "", password: "", keepLoggedIn: false }
  })
  const { isSubmitting } = form.formState

  const togglePassword = useCallback(
    () => setIsPasswordVisible((isVisible) => !isVisible),
    []
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    setMessage(null)
    const result = await signIn(values)

    if (result.ok) {
      onSuccess()
      return
    }

    if (result.errors) {
      const { identifier, password } = result.errors
      if (identifier?.[0]) form.setError("identifier", { message: identifier[0] })
      if (password?.[0]) form.setError("password", { message: password[0] })
      return
    }

    setMessage(result.message)
  })

  return (
    <form
      noValidate
      className='flex flex-col gap-4 [--accent-foreground:var(--color-background)] [--accent-hover:var(--color-theme-400)] [--accent:var(--color-theme)]'
      onSubmit={handleSubmit}>
      <Controller
        control={form.control}
        name='identifier'
        render={({ field, fieldState }) => (
          <TextField
            className='flex flex-col gap-1.5'
            name={field.name}
            value={field.value}
            isInvalid={fieldState.invalid}
            onChange={field.onChange}
            onBlur={field.onBlur}>
            <Label className='sr-only'>Username or email</Label>
            <InputGroup className={FIELD_GROUP}>
              <InputGroup.Prefix className='ps-4 text-zinc-400'>
                <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={1.6} />
              </InputGroup.Prefix>
              <InputGroup.Input
                ref={field.ref}
                placeholder='Username or email'
                autoComplete='username'
                autoCapitalize='none'
                spellCheck={false}
                className='text-[15px] placeholder:text-zinc-400'
              />
            </InputGroup>
            <FieldError className='ps-1 text-xs'>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        control={form.control}
        name='password'
        render={({ field, fieldState }) => (
          <TextField
            className='flex flex-col gap-1.5'
            name={field.name}
            value={field.value}
            isInvalid={fieldState.invalid}
            onChange={field.onChange}
            onBlur={field.onBlur}>
            <Label className='sr-only'>Password</Label>
            <InputGroup className={FIELD_GROUP}>
              <InputGroup.Prefix className='ps-4 text-zinc-400'>
                <HugeiconsIcon icon={LockPasswordIcon} size={20} strokeWidth={1.6} />
              </InputGroup.Prefix>
              <InputGroup.Input
                ref={field.ref}
                type={isPasswordVisible ? "text" : "password"}
                placeholder='Password'
                autoComplete='current-password'
                className='text-[15px] placeholder:text-zinc-400'
              />
              <InputGroup.Suffix className='pe-1.5'>
                <Button
                  isIconOnly
                  size='sm'
                  variant='ghost'
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  className='size-10 rounded-xl text-zinc-400 hover:text-white'
                  onPress={togglePassword}>
                  <HugeiconsIcon
                    icon={isPasswordVisible ? ViewIcon : ViewOffSlashIcon}
                    size={20}
                    strokeWidth={1.6}
                  />
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
            <FieldError className='ps-1 text-xs'>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        control={form.control}
        name='keepLoggedIn'
        render={({ field }) => (
          <Checkbox
            className='self-start'
            name={field.name}
            isSelected={field.value ?? false}
            onChange={field.onChange}>
            <Checkbox.Content className='text-sm text-zinc-300'>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Keep me signed in on this device
            </Checkbox.Content>
          </Checkbox>
        )}
      />

      {message ? (
        <Alert status='danger' className='rounded-2xl'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Button
        type='submit'
        fullWidth
        isPending={isSubmitting}
        className='bg-theme text-background hover:bg-theme-400 mt-3 h-13 rounded-2xl text-[15px] font-semibold shadow-[0_8px_32px_rgb(5_214_162/0.3)]'>
        {isSubmitting ? <Spinner color='current' size='sm' /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
