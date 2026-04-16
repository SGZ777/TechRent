"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  Clock3Icon,
  PackageIcon,
  ShieldAlertIcon,
  TicketIcon,
  WrenchIcon,
} from "lucide-react"

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
import { apiFetch } from "@/lib/api"
import { clearStoredToken, getCurrentUser } from "@/lib/auth"

const statusLabels = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Em manutenção",
  indisponivel: "Indisponível",
}

function formatStatus(status) {
  if (!status) {
    return "Não informado"
  }

  return statusLabels[status] || status.replaceAll("_", " ")
}

function formatDate(value) {
  if (!value) {
    return "Não informado"
  }

  return new Date(value).toLocaleString("pt-BR")
}

function SummaryCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-xl bg-muted p-3 text-muted-foreground">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [adminData, setAdminData] = useState(null)
  const [technicianData, setTechnicianData] = useState([])

  useEffect(() => {
    async function loadDashboard() {
      const currentUser = getCurrentUser()

      if (!currentUser) {
        clearStoredToken()
        router.replace("/")
        return
      }

      setUser(currentUser)
      setLoading(true)
      setError("")

      try {
        if (currentUser.nivel_acesso === "admin") {
          const data = await apiFetch("/dashboard/admin")
          setAdminData(data)
          setTechnicianData([])
          return
        }

        if (currentUser.nivel_acesso === "tecnico") {
          const data = await apiFetch("/dashboard/tecnico")
          setTechnicianData(Array.isArray(data) ? data : [])
          setAdminData(null)
          return
        }

        setAdminData(null)
        setTechnicianData([])
      } catch (fetchError) {
        if (fetchError.status === 401 || fetchError.status === 403) {
          clearStoredToken()
          router.replace("/")
          return
        }

        setError(fetchError.message || "Não foi possível carregar o dashboard.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  const chamadosResumo = adminData?.chamados || []
  const equipamentosResumo = adminData?.equipamentos || []
  const totalChamados = chamadosResumo.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const totalEquipamentos = equipamentosResumo.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const chamadosCriticos = technicianData.filter((item) => item.prioridade === "alta").length
  const chamadosEmAndamento = technicianData.filter((item) => item.status === "em_andamento").length

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
                  <BreadcrumbPage>Dashboard TechRent</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Central de suporte técnico
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {user ? `Olá, ${user.nome}` : "Carregando dashboard"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Acompanhe chamados, equipamentos e prioridades do TechRent em tempo real a partir
              dos dados do backend.
            </p>
          </section>

          {loading ? (
            <SectionCard
              title="Carregando dados"
              subtitle="Buscando informações mais recentes do backend."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            </SectionCard>
          ) : null}

          {!loading && error ? (
            <SectionCard
              title="Falha ao carregar"
              subtitle="O backend respondeu com erro ou ficou indisponível."
            >
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
                <p>{error}</p>
              </div>
            </SectionCard>
          ) : null}

          {!loading && !error && user?.nivel_acesso === "admin" ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Chamados cadastrados"
                  value={totalChamados}
                  description="Total agregado pela view de resumo de chamados."
                  icon={TicketIcon}
                />
                <SummaryCard
                  title="Equipamentos monitorados"
                  value={totalEquipamentos}
                  description="Inventário agregado pela view de resumo de equipamentos."
                  icon={PackageIcon}
                />
                <SummaryCard
                  title="Status acompanhados"
                  value={chamadosResumo.length + equipamentosResumo.length}
                  description="Categorias de status retornadas pelo backend."
                  icon={Clock3Icon}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                  title="Resumo de chamados"
                  subtitle="Distribuição por status retornada por `/dashboard/admin`."
                >
                  <div className="space-y-3">
                    {chamadosResumo.map((item) => (
                      <div
                        key={`chamado-${item.status}`}
                        className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"
                      >
                        <span className="font-medium">{formatStatus(item.status)}</span>
                        <span className="text-sm text-muted-foreground">{item.total}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Resumo de equipamentos"
                  subtitle="Situação operacional dos ativos cadastrados."
                >
                  <div className="space-y-3">
                    {equipamentosResumo.map((item) => (
                      <div
                        key={`equipamento-${item.status}`}
                        className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"
                      >
                        <span className="font-medium">{formatStatus(item.status)}</span>
                        <span className="text-sm text-muted-foreground">{item.total}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </>
          ) : null}

          {!loading && !error && user?.nivel_acesso === "tecnico" ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Chamados na fila"
                  value={technicianData.length}
                  description="Itens retornados pela visão técnica do backend."
                  icon={WrenchIcon}
                />
                <SummaryCard
                  title="Em andamento"
                  value={chamadosEmAndamento}
                  description="Chamados que já estão sob atendimento."
                  icon={Clock3Icon}
                />
                <SummaryCard
                  title="Prioridade alta"
                  value={chamadosCriticos}
                  description="Demandas que exigem ação mais rápida."
                  icon={ShieldAlertIcon}
                />
              </div>

              <SectionCard
                title="Painel do técnico"
                subtitle="Fila operacional carregada da rota `/dashboard/tecnico`."
              >
                {technicianData.length === 0 ? (
                  <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                    Nenhum chamado pendente para atendimento no momento.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {technicianData.map((item) => (
                      <article key={item.chamado_id} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Chamado #{item.chamado_id}
                            </p>
                            <h3 className="text-lg font-semibold">{item.titulo}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.solicitante} • {item.equipamento}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="rounded-full bg-muted px-3 py-1">
                              {formatStatus(item.status)}
                            </span>
                            <span className="rounded-full bg-muted px-3 py-1">
                              Prioridade {item.prioridade}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                          <p><strong>Categoria:</strong> {item.categoria || "Não informada"}</p>
                          <p><strong>Patrimônio:</strong> {item.patrimonio || "Não informado"}</p>
                          <p><strong>Técnico:</strong> {item.tecnico_responsavel || "Não atribuído"}</p>
                          <p><strong>Abertura:</strong> {formatDate(item.aberto_em)}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          ) : null}

          {!loading && !error && user?.nivel_acesso === "cliente" ? (
            <SectionCard
              title="Perfil sem dashboard disponível"
              subtitle="O backend atual expõe painéis apenas para administração e equipe técnica."
            >
              <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                Seu login foi reconhecido, mas ainda não existe uma rota de dashboard para clientes.
              </div>
            </SectionCard>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
