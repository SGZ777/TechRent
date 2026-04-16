"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppPageShell({
  user,
  title,
  subtitle,
  children,
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} role={user?.nivel_acesso} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              TechRent
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          </section>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm ${className}`.trim()}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export function SummaryCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        {Icon ? (
          <div className="rounded-xl bg-muted p-3 text-muted-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) {
    return null
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
