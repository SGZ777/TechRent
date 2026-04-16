import Image from "next/image"

import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <Image
        src="/logo-techrent.png"
        alt="TechRent"
        width={280}
        height={120}
        className="mb-10 w-40 md:w-72"
      />
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
