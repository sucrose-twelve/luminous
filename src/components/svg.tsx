import { type SVGAttributes } from "react"

import { cls } from "@/libs/utils"

export function SVG({
  children,
  fill = "currentColor",
  viewBox = "0 0 16 16",
  width = 16,
  height = 16,
  ...rest
}: Readonly<SVGAttributes<SVGElement>>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={cls("svg", rest.className)}
      width={width}
      height={height}
      fill={fill}
      viewBox={viewBox}>
      {children}
    </svg>
  )
}
