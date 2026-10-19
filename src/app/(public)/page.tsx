// import { type Metadata } from "next"

import ThreeDMarqueeDemo from "./components/3d-marquee-demo"

export default async function Home({}: Readonly<{}>) {
  return (
    <section className='h-dvh'>
      <ThreeDMarqueeDemo />
    </section>
  )
}
