"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ClipboardCheckIcon, HistoryIcon, WrenchIcon } from "lucide-react"

import {
  AppPageShell,
  ErrorBanner,
  SectionCard,
  SummaryCard,
} from "@/components/app-page-shell"
import { Button } from "@/components/ui/button"
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user"
import { apiFetch } from "@/lib/api"
import { formatDate, formatStatus } from "@/lib/formatters"

export default function OperacaoPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fila, setFila] = useState([])
  const [historico, setHistorico] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [assignedTechnicians, setAssignedTechnicians] = useState({})
  const [descriptions, setDescriptions] = useState({})

  const canManageQueue = user?.nivel_acesso === "tecnico" || user?.nivel_acesso === "admin"
  const canRegisterMaintenance = user?.nivel_acesso === "tecnico"
  const isAdmin = user?.nivel_acesso === "admin"

  const chamadosAtivos = useMemo(
    () => fila.filter((item) => item.status !== "resolvido" && item.status !== "cancelado"),
    [fila]
  )

  const loadPageData = useCallback(async () => {
    if (!user) {
      return
    }

    setLoading(true)
    setError("")

    try {
      if (!canManageQueue) {
        setFila([])
        setHistorico([])
        setTechnicians([])
        setAssignedTechnicians({})
        setLoading(false)
        return
      }

      const requests = [apiFetch("/chamados"), apiFetch("/manutencao")]

      if (isAdmin) {
        requests.push(apiFetch("/usuarios"))
      }

      const [chamadosData, historicoData, usuariosData = []] = await Promise.all(requests)

      setFila(
        (Array.isArray(chamadosData) ? chamadosData : []).filter((item) =>
          ["aberto", "em_atendimento"].includes(item.status)
        )
      )
      setHistorico(Array.isArray(historicoData) ? historicoData : [])
      setTechnicians(
        (Array.isArray(usuariosData) ? usuariosData : []).filter(
          (item) => item.nivel_acesso === "tecnico"
        )
      )
      setAssignedTechnicians((current) => {
        const next = { ...current }

        ;(Array.isArray(chamadosData) ? chamadosData : []).forEach((item) => {
          if (item.tecnico_id && next[item.id] === undefined) {
            next[item.id] = String(item.tecnico_id)
          }
        })

        return next
      })
    } catch (fetchError) {
      setError(fetchError.message || "Não foi possivel carregar a operação.")
    } finally {
      setLoading(false)
    }
  }, [canManageQueue, isAdmin, user])

  useEffect(() => {
    if (!ready || !user) {
      return
    }

    loadPageData()
  }, [loadPageData, ready, user])

  if (!ready || !user) {
    return null
  }

  async function handleStatusUpdate(id, status) {
    setError("")
    setSuccess("")

    try {
      const payload = { status }

      if (status === "em_atendimento" && isAdmin) {
        const tecnicoId = assignedTechnicians[id]

        if (!tecnicoId) {
          setError("Selecione um tecnico responsavel antes de iniciar o atendimento.")
          return
        }

        payload.tecnico_id = Number(tecnicoId)
      }

      await apiFetch(`/chamados/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      setSuccess("Fila atualizada com sucesso.")
      await loadPageData()
    } catch (updateError) {
      setError(updateError.message || "Não foi possivel atualizar o status.")
    }
  }

  async function handleRegisterMaintenance(chamado) {
    const descricao = descriptions[chamado.id]?.trim()

    if (!descricao) {
      setError("Descreva a manutenção realizada antes de concluir o chamado.")
      return
    }

    setError("")
    setSuccess("")

    try {
      await apiFetch("/manutencao", {
        method: "POST",
        body: JSON.stringify({
          chamado_id: chamado.id,
          equipamento_id: chamado.equipamento_id,
          descricao,
        }),
      })

      setDescriptions((current) => ({ ...current, [chamado.id]: "" }))
      setSuccess("Manutencao registrada e chamado resolvido.")
      await loadPageData()
    } catch (submitError) {
      setError(submitError.message || "Não foi possivel registrar a manutenção.")
    }
  }

  return (
    <AppPageShell
      user={user}
      title="Operação"
      subtitle="Gerencie a fila tecnica, acompanhe o historico de manutenções e conclua reparos."
    >
      {!canManageQueue ? (
        <SectionCard
          title="Acesso restrito"
          subtitle="Esta pagina e destinada a administradores e equipe tecnica."
        >
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Seu perfil não possui acesso operacional. Use a página de chamados para acompanhar suas solicitações.
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Fila ativa"
              value={chamadosAtivos.length}
              description="Chamados aguardando atendimento ou em execucao."
              icon={WrenchIcon}
            />
            <SummaryCard
              title="Em atendimento"
              value={fila.filter((item) => item.status === "em_atendimento").length}
              description="Chamados com tecnico atuando no reparo."
              icon={ClipboardCheckIcon}
            />
            <SummaryCard
              title="Historico"
              value={historico.length}
              description="Registros de manutencao persistidos no banco."
              icon={HistoryIcon}
            />
          </div>

          <ErrorBanner message={error} />
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <SectionCard
            title="Fila de atendimento"
            subtitle="Chamados operacionais que exigem acao da equipe."
          >
            {loading ? (
              <div className="grid gap-4">
                {[1, 2].map((item) => (
                  <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : fila.length === 0 ? (
              <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                Nenhum chamado pendente no momento.
              </div>
            ) : (
              <div className="grid gap-4">
                {fila.map((item) => (
                  <article key={item.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Chamado #{item.id}</p>
                        <h3 className="text-lg font-semibold">{item.titulo}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.cliente_nome} - {item.equipamento_nome}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-muted px-3 py-1">{formatStatus(item.status)}</span>
                        <span className="rounded-full bg-muted px-3 py-1">Prioridade {formatStatus(item.prioridade).toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <p><strong>Patrimonio:</strong> {item.equipamento_patrimonio || "Nao informado"}</p>
                      <p><strong>Categoria:</strong> {item.equipamento_categoria || "Nao informada"}</p>
                      <p><strong>Tecnico:</strong> {item.tecnico_nome || "Nao atribuido"}</p>
                      <p><strong>Abertura:</strong> {formatDate(item.criado_em)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isAdmin && item.status === "aberto" ? (
                        <select
                          className="h-9 min-w-56 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm"
                          value={assignedTechnicians[item.id] || ""}
                          onChange={(event) =>
                            setAssignedTechnicians((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione um tecnico</option>
                          {technicians.map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.nome} - {technician.email}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {item.status === "aberto" ? (
                        <>
                          <Button size="sm" onClick={() => handleStatusUpdate(item.id, "em_atendimento")}>
                            Assumir chamado
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(item.id, "cancelado")}>
                            Cancelar
                          </Button>
                        </>
                      ) : null}
                    </div>

                    {canRegisterMaintenance && item.status === "em_atendimento" ? (
                      <div className="mt-4 rounded-xl bg-muted/40 p-4">
                        <label className="text-sm font-medium">Descricao da manutencao</label>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                          value={descriptions[item.id] || ""}
                          onChange={(event) =>
                            setDescriptions((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Explique o reparo executado."
                        />
                        <div className="mt-3">
                          <Button size="sm" onClick={() => handleRegisterMaintenance(item)}>
                            Registrar manutenção e resolver
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Historico de manutencao"
            subtitle="Ultimos registros gravados em historico_manutencao."
          >
            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            ) : historico.length === 0 ? (
              <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                Nenhuma manutenção registrada até agora.
              </div>
            ) : (
              <div className="grid gap-4">
                {historico.map((item) => (
                  <article key={item.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Registro #{item.id}</p>
                        <h3 className="text-lg font-semibold">{item.chamado_titulo}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.equipamento_nome} - {item.patrimonio}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(item.registrado_em)}</p>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{item.descricao}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      <strong>Tecnico:</strong> {item.tecnico_nome || "Nao informado"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </AppPageShell>
  )
}
