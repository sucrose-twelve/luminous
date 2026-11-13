import type { NextRequest } from "next/server"

import { withGuard } from "@/actions/auth"
import {
  currentImport,
  subscribeImport,
  type ImportEvent
} from "@/actions/imports/runner"
import { ROOT_ROLES } from "@/constants"

/**
 * A comment line every so often, so nothing between the browser and the server closes a quiet stream.
 */
const HEARTBEAT_MS = 20_000

/**
 * Streams the control panel's import to its status card as Server-Sent Events: the job first, then every
 * `ImportEvent` until the card closes the stream. Root only, like the import.
 *
 * `no-transform` keeps compression from buffering the events.
 */
export async function GET(request: NextRequest) {
  const account = await withGuard(request)
  if (!account) return new Response(null, { status: 401 })
  if (!ROOT_ROLES.includes(account.role)) return new Response(null, { status: 403 })

  const encoder = new TextEncoder()
  /**
   * Stops the timer and the listener once the browser leaves. The stream itself never ends on its own.
   */
  let stop = () => {}

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isStopped = false
      const write = (chunk: string) => {
        if (!isStopped) controller.enqueue(encoder.encode(chunk))
      }
      const send = (event: ImportEvent) => write(`data: ${JSON.stringify(event)}\n\n`)

      send({ type: "job", job: currentImport() })
      const unsubscribe = subscribeImport(send)
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS)

      stop = () => {
        isStopped = true
        clearInterval(heartbeat)
        unsubscribe()
      }
      request.signal.addEventListener("abort", stop)
    },
    cancel() {
      stop()
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  })
}
