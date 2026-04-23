"use client"

import { useEffect, useState } from "react"
import {
  Clock3Icon,
  PackageIcon,
  ShieldAlertIcon,
  TicketIcon,
  WrenchIcon,
} from "lucide-react"

import {
  AppPageShell,
  ErrorBanner,
  SectionCard,
  SummaryCard,
} from "@/components/app-page-shell"
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user"
import { apiFetch } from "@/lib/api"
import { formatDate, formatStatus } from "@/lib/formatters"

export default function DashboardPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [adminData, setAdminData] = useState(null)
  const [technicianData, setTechnicianData] = useState([])

  useEffect(() => {
    if (!ready || !user) {
      return
    }

    async function loadDashboard() {
      setLoading(true)
      setError("")

      try {
        if (user.nivel_acesso === "admin") {
          const data = await apiFetch("/dashboard/admin")
          setAdminData(data)
          setTechnicianData([])
          return
        }

        if (user.nivel_acesso === "tecnico") {
          const data = await apiFetch("/dashboard/tecnico")
          setTechnicianData(Array.isArray(data) ? data : [])
          setAdminData(null)
          return
        }

        setAdminData(null)
        setTechnicianData([])
      } catch (fetchError) {
        setError(fetchError.message || "Nao foi possivel carregar o dashboard.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [ready, user])

  if (!ready || !user) {
    return null
  }

  const chamadosResumo = adminData?.chamados || []
  const equipamentosResumo = adminData?.equipamentos || []
  const totalChamados = chamadosResumo.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const totalEquipamentos = equipamentosResumo.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const chamadosCriticos = technicianData.filter((item) => item.prioridade === "alta").length
  const chamadosEmAtendimento = technicianData.filter((item) => item.status === "em_atendimento").length

  return (
    <AppPageShell
      user={user}
      title="Dashboard"
      subtitle="Acompanhe os indicadores principais do TechRent e o estado atual da operacao."
    >
      <ErrorBanner message={error} />

      {loading ? (
        <SectionCard
          title="Carregando dados"
          subtitle="Buscando informacoes mais recentes do backend."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {!loading && !error && user.nivel_acesso === "admin" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Chamados cadastrados"
              value={totalChamados}
              description="Total consolidado a partir da view de resumo de chamados."
              icon={TicketIcon}
            />
            <SummaryCard
              title="Equipamentos monitorados"
              value={totalEquipamentos}
              description="Total de ativos registrados no inventario."
              icon={PackageIcon}
            />
            <SummaryCard
              title="Status monitorados"
              value={chamadosResumo.length + equipamentosResumo.length}
              description="Categorias retornadas pelas views do administrador."
              icon={Clock3Icon}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Resumo de chamados"
              subtitle="Distribuicao por status da operacao de suporte."
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
              subtitle="Situacao operacional dos equipamentos cadastrados."
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

      {!loading && !error && user.nivel_acesso === "tecnico" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Chamados na fila"
              value={technicianData.length}
              description="Demandas abertas ou em atendimento no painel técnico."
              icon={WrenchIcon}
            />
            <SummaryCard
              title="Em atendimento"
              value={chamadosEmAtendimento}
              description="Chamados que já estão sob acompanhamento técnico."
              icon={Clock3Icon}
            />
            <SummaryCard
              title="Prioridade alta"
              value={chamadosCriticos}
              description="Itens que exigem ação mais rápida."
              icon={ShieldAlertIcon}
            />
          </div>

          <SectionCard
            title="Fila técnica"
            subtitle="Visão operacional retornada por /dashboard/tecnico."
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
                          {item.solicitante} - {item.equipamento}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-muted px-3 py-1">
                          {formatStatus(item.status)}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1">
                          Prioridade {formatStatus(item.prioridade).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <p><strong>Categoria:</strong> {item.categoria || "Não informada"}</p>
                      <p><strong>Patrimonio:</strong> {item.patrimonio || "Não informado"}</p>
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

      {!loading && !error && user.nivel_acesso === "cliente" ? (
        <SectionCard
          title="Perfil do cliente"
          subtitle="Seu foco principal fica na abertura e acompanhamento de chamados.">
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Use a página de chamados para abrir novas solicitações e acompanhar o andamento.
          </div>
        </SectionCard>
      ) : null}
    </AppPageShell>
  )
}
