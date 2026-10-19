"use client"

import { useState, useTransition } from "react"

import { createContent } from "@/actions/contents/create"
import { KINDS, SOURCES } from "@/constants"
import { genres } from "@/constants/data/genres"

type Result = Awaited<ReturnType<typeof createContent>>

export function ContentForm() {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const text = (name: string) => String(formData.get(name) ?? "") || undefined

    startTransition(async () => {
      const response = await createContent({
        title: text("title"),
        slug: text("slug"),
        kind: text("kind"),
        source: text("source"),
        altTitles: {
          EN: text("altTitles.EN"),
          JP: text("altTitles.JP"),
          TH: text("altTitles.TH")
        },
        synopsis: text("synopsis"),
        genres: formData.getAll("genres"),
        sourceDir: text("sourceDir")
      })

      setResult(response)
      if (response.ok) form.reset()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label>
          title <input name='title' required />
        </label>
      </p>
      <p>
        <label>
          slug <input name='slug' placeholder='empty = from title' />
        </label>
      </p>
      <fieldset>
        <legend>kind</legend>
        {KINDS.map((kind) => (
          <label key={kind}>
            <input type='radio' name='kind' value={kind} required /> {kind}{" "}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>source</legend>
        <label>
          <input type='radio' name='source' value='' defaultChecked /> none{" "}
        </label>
        {SOURCES.map((source) => (
          <label key={source}>
            <input type='radio' name='source' value={source} /> {source}{" "}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>alternative titles</legend>
        <p>
          <label>
            EN <input name='altTitles.EN' />
          </label>
        </p>
        <p>
          <label>
            JP <input name='altTitles.JP' />
          </label>
        </p>
        <p>
          <label>
            TH <input name='altTitles.TH' />
          </label>
        </p>
      </fieldset>
      <p>
        <label>
          synopsis
          <br />
          <textarea name='synopsis' rows={5} cols={80} />
        </label>
      </p>
      <fieldset>
        <legend>genres</legend>
        {genres.map((genre) => (
          <label key={genre.slug}>
            <input type='checkbox' name='genres' value={genre.slug} /> {genre.text}{" "}
          </label>
        ))}
      </fieldset>
      <p>
        <label>
          source dir{" "}
          <input
            name='sourceDir'
            size={80}
            placeholder='<CONTENTS_SOURCE_DIR>\Big Buck Bunny'
            required
          />
        </label>
      </p>
      <button type='submit' disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  )
}
