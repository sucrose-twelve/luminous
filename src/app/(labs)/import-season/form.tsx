"use client"

import { useState, useTransition } from "react"

import { createSeason } from "@/actions/contents/create"
import { SEASON_KINDS, SEASON_STATUSES } from "@/constants"
import { Locales } from "@/constants/enum"

type Result = Awaited<ReturnType<typeof createSeason>>

/**
 * Source rows: the original audio, then this many dubs. A row left without a path is not sent, so a season
 * may have only dubs.
 */
const DUB_ROWS = 2

const LANGUAGES = Object.values(Locales)

export function SeasonForm({
  contents
}: Readonly<{ contents: { id: string; title: string }[] }>) {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const text = (name: string) => String(formData.get(name) ?? "") || undefined

    const sources = Array.from({ length: DUB_ROWS + 1 }, (_, index) => ({
      language: text(`sources.${index}.language`),
      pathname: text(`sources.${index}.pathname`),
      isDubbed: index > 0
    })).filter((source) => source.pathname)

    startTransition(async () => {
      const response = await createSeason({
        contentId: text("contentId"),
        kind: text("kind"),
        seasonNo:
          text("seasonNo") === undefined ? undefined : Number(formData.get("seasonNo")),
        title: text("title"),
        synopsis: text("synopsis"),
        status: text("status"),
        sources,
        poster: text("poster"),
        releasedOn: text("releasedOn")
      })

      setResult(response)
      if (response.ok) form.reset()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label>
          content{" "}
          <select name='contentId' required defaultValue=''>
            <option value='' disabled>
              -- select --
            </option>
            {contents.map((content) => (
              <option key={content.id} value={content.id}>
                {content.title}
              </option>
            ))}
          </select>
        </label>
      </p>
      <fieldset>
        <legend>kind</legend>
        {SEASON_KINDS.map((kind) => (
          <label key={kind}>
            <input
              type='radio'
              name='kind'
              value={kind}
              defaultChecked={kind === "season"}
            />{" "}
            {kind}{" "}
          </label>
        ))}
      </fieldset>
      <p>
        <label>
          seasonNo{" "}
          <input type='number' name='seasonNo' min={0} step={1} defaultValue={1} />
        </label>{" "}
        (required for season, empty for movie)
      </p>
      <p>
        <label>
          title <input name='title' />
        </label>
      </p>
      <p>
        <label>
          synopsis
          <br />
          <textarea name='synopsis' rows={5} cols={80} />
        </label>
      </p>
      <fieldset>
        <legend>status</legend>
        {SEASON_STATUSES.map((status) => (
          <label key={status}>
            <input
              type='radio'
              name='status'
              value={status}
              defaultChecked={status === "finished"}
            />{" "}
            {status}{" "}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>
          sources (a folder of 01.mp4, 02.mp4, … or, for a movie, the .mp4 file)
        </legend>
        {Array.from({ length: DUB_ROWS + 1 }, (_, index) => (
          <p key={index}>
            {index === 0 ? "original" : `dub ${index}`}{" "}
            <select
              name={`sources.${index}.language`}
              defaultValue={index === 0 ? Locales.JP : Locales.TH}>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>{" "}
            <input
              name={`sources.${index}.pathname`}
              size={80}
              placeholder={
                index === 0
                  ? String.raw`<CONTENTS_SOURCE_DIR>\Big Buck Bunny\1`
                  : String.raw`<CONTENTS_SOURCE_DIR>\Big Buck Bunny\Thai Dub\1`
              }
            />
          </p>
        ))}
      </fieldset>
      <p>
        <label>
          poster{" "}
          <input
            name='poster'
            size={80}
            placeholder='<CONTENTS_SOURCE_DIR>\Big Buck Bunny\poster-[1].webp'
            required
          />
        </label>
      </p>
      <p>
        <label>
          releasedOn <input type='date' name='releasedOn' required />
        </label>
      </p>
      <button type='submit' disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  )
}
