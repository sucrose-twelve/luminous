"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Alert02Icon,
  LockPasswordIcon,
  UserIcon,
  ViewIcon,
  ViewOffSlashIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { signIn } from "@/actions/auth/sign-in"
import { formValidator, type FormValidator } from "@/actions/auth/validator.zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

/**
 * A tall, borderless field on dark glass that lights up in the primary color while focused. The focus and
 * invalid styles repeat `InputGroup`'s own `has-[…]` variants so they replace its ring and border.
 */
const FIELD_GROUP =
  "h-13 rounded-2xl border-transparent bg-white/6 transition-[border-color,box-shadow,background-color] hover:bg-white/8 dark:bg-white/6 dark:hover:bg-white/8 has-[[data-slot=input-group-control]:focus-visible]:border-primary/80 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/12 has-[[data-slot][aria-invalid=true]]:border-destructive/70"

const FIELD_INPUT = "text-[15px] placeholder:text-zinc-400"

/**
 * The sign-in form inside `SignInModal`. It validates with the action's own `formValidator`, then calls
 * `signIn`: field errors from the server land under their fields, and a refused sign-in (wrong credentials,
 * suspended account) shows above the button with the same message for every case.
 */
export function SignInForm({ onSuccess }: Readonly<{ onSuccess: () => void }>) {
  const identifierId = useId()
  const passwordId = useId()
  const keepLoggedInId = useId()
  const [message, setMessage] = useState<string | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const form = useForm<FormValidator>({
    resolver: zodResolver(formValidator),
    defaultValues: { identifier: "", password: "", keepLoggedIn: false }
  })
  const { errors, isSubmitting } = form.formState

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
    <form noValidate className='flex flex-col gap-4' onSubmit={handleSubmit}>
      <Field className='gap-1.5'>
        <FieldLabel htmlFor={identifierId} className='sr-only'>
          Username or email
        </FieldLabel>
        <InputGroup className={FIELD_GROUP}>
          <InputGroupInput
            id={identifierId}
            placeholder='Username or email'
            autoComplete='username'
            autoCapitalize='none'
            spellCheck={false}
            aria-invalid={!!errors.identifier}
            className={FIELD_INPUT}
            {...form.register("identifier")}
          />
          <InputGroupAddon className='pl-4 text-zinc-400'>
            <HugeiconsIcon className='size-5' icon={UserIcon} strokeWidth={1.6} />
          </InputGroupAddon>
        </InputGroup>
        <FieldError className='ps-1 text-xs'>{errors.identifier?.message}</FieldError>
      </Field>

      <Field className='gap-1.5'>
        <FieldLabel htmlFor={passwordId} className='sr-only'>
          Password
        </FieldLabel>
        <InputGroup className={FIELD_GROUP}>
          <InputGroupInput
            id={passwordId}
            type={isPasswordVisible ? "text" : "password"}
            placeholder='Password'
            autoComplete='current-password'
            aria-invalid={!!errors.password}
            className={FIELD_INPUT}
            {...form.register("password")}
          />
          <InputGroupAddon className='pl-4 text-zinc-400'>
            <HugeiconsIcon className='size-5' icon={LockPasswordIcon} strokeWidth={1.6} />
          </InputGroupAddon>
          <InputGroupAddon align='inline-end' className='pr-1.5'>
            <InputGroupButton
              size='icon-sm'
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              className='size-10 rounded-xl text-zinc-400 hover:text-white'
              onClick={togglePassword}>
              <HugeiconsIcon
                className='size-5'
                icon={isPasswordVisible ? ViewIcon : ViewOffSlashIcon}
                strokeWidth={1.6}
              />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldError className='ps-1 text-xs'>{errors.password?.message}</FieldError>
      </Field>

      <Controller
        control={form.control}
        name='keepLoggedIn'
        render={({ field }) => (
          <Field orientation='horizontal' className='w-fit'>
            <Checkbox
              id={keepLoggedInId}
              name={field.name}
              checked={field.value ?? false}
              inputRef={field.ref}
              onCheckedChange={field.onChange}
            />
            <FieldLabel htmlFor={keepLoggedInId} className='font-normal text-zinc-300'>
              Keep me signed in on this device
            </FieldLabel>
          </Field>
        )}
      />

      {message ? (
        <Alert variant='destructive' className='rounded-2xl'>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type='submit'
        disabled={isSubmitting}
        className='mt-3 h-13 w-full rounded-2xl text-[15px] font-semibold shadow-[0_8px_32px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]'>
        {isSubmitting ? <Spinner /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
