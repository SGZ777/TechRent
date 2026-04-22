"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock3Icon, PlusCircleIcon, TicketIcon } from "lucide-react"

import {
  AppPageShell,
  ErrorBanner,
  SectionCard,
  SummaryCard,
} from "@/components/app-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user"
import { apiFetch } from "@/lib/api"
import { formatDate, formatStatus } from "@/lib/formatters"

const initialForm = {
  titulo: "",
  descricao: "",
  equipamento_id: "",
  prioridade: "media",
}

export default function ChamadosPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [chamados, setChamados] = useState([])
  const [equipamentos, setEquipamentos] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [assignedTechnicians, setAssignedTechnicians] = useState({})
  const [form, setForm] = useState(initialForm)

  const canCreate = user?.nivel_acesso === "cliente" || user?.nivel_acesso === "admin"
  const canUpdateStatus = user?.nivel_acesso === "tecnico" || user?.nivel_acesso === "admin"
  const isAdmin = user?.nivel_acesso === "admin"

  const chamadosAbertos = useMemo(
    () => chamados.filter((item) => item.status === "aberto").length,
    [chamados]
  )
  const chamadosEmAtendimento = useMemo(
    () => chamados.filter((item) => item.status === "em_atendimento").length,
    [chamados]
  )

  const loadPageData = useCallback(async () => {
    if (!user) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const requests = [apiFetch("/chamados")]

      if (canCreate) {
        requests.push(apiFetch("/equipamentos?status=operacional"))
      }

      if (isAdmin) {
        requests.push(apiFetch("/usuarios"))
      }

      const [chamadosData, equipamentosData = [], usuariosData = []] = await Promise.all(requests)
      const tecnicos = (Array.isArray(usuariosData) ? usuariosData : []).filter(
        (item) => item.nivel_acesso === "tecnico"
      )

      setChamados(Array.isArray(chamadosData) ? chamadosData : [])
      setEquipamentos(Array.isArray(equipamentosData) ? equipamentosData : [])
      setTechnicians(tecnicos)
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
      setError(fetchError.message || "Nao foi possivel carregar os chamados.")
    } finally {
      setLoading(false)
    }
  }, [canCreate, isAdmin, user])

  useEffect(() => {
    if (!ready || !user) {
      return
    }

    loadPageData()
  }, [loadPageData, ready, user])

  if (!ready || !user) {
    return null
  }

  async function handleCreateChamado(event) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await apiFetch("/chamados", {
        method: "POST",
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao,
          equipamento_id: Number(form.equipamento_id),
          prioridade: form.prioridade,
        }),
      })

      setForm(initialForm)
      setSuccess("Chamado criado com sucesso.")
      await loadPageData()
    } catch (submitError) {
      setError(submitError.message || "Nao foi possivel abrir o chamado.")
    } finally {
      setSubmitting(false)
    }
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

      setSuccess("Status do chamado atualizado com sucesso.")
      await loadPageData()
    } catch (updateError) {
      setError(updateError.message || "Nao foi possivel atualizar o chamado.")
    }
  }

  return (
    <AppPageShell
      user={user}
      title="Chamados"
      subtitle="Abra novas solicitacoes, acompanhe o andamento e atualize a fila de atendimento."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total de chamados"
          value={chamados.length}
          description="Itens retornados pela rota /chamados."
          icon={TicketIcon}
        />
        <SummaryCard
          title="Abertos"
          value={chamadosAbertos}
          description="Chamados aguardando inicio do atendimento."
          icon={PlusCircleIcon}
        />
        <SummaryCard
          title="Em atendimento"
          value={chamadosEmAtendimento}
          description="Demandas que ja estao sob acompanhamento tecnico."
          icon={Clock3Icon}
        />
      </div>

      <ErrorBanner message={error} />
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {canCreate ? (
        <SectionCard
          title="Novo chamado"
          subtitle="Abra um chamado vinculando o problema ao equipamento afetado."
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateChamado}>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Titulo</label>
              <Input
                value={form.titulo}
                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                placeholder="Ex: Notebook sem conectar na rede"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Equipamento</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm"
                value={form.equipamento_id}
                onChange={(event) => setForm((current) => ({ ...current, equipamento_id: event.target.value }))}
                required
              >
                <option value="">Selecione</option>
                {equipamentos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} - {item.patrimonio}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm"
                value={form.prioridade}
                onChange={(event) => setForm((current) => ({ ...current, prioridade: event.target.value }))}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Descricao</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Descreva o problema encontrado."
                required
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting || equipamentos.length === 0}>
                {submitting ? "Salvando..." : "Abrir chamado"}
              </Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Lista de chamados"
        subtitle="Visualizacao filtrada pelo seu perfil de acesso."
      >
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : chamados.length === 0 ? (
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Nenhum chamado encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {chamados.map((item) => (
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
                    <span className="rounded-full bg-muted px-3 py-1">
                      {formatStatus(item.status)}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1">
                      Prioridade {formatStatus(item.prioridade).toLowerCase()}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{item.descricao}</p>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                  <p><strong>Patrimonio:</strong> {item.equipamento_patrimonio || "Nao informado"}</p>
                  <p><strong>Categoria:</strong> {item.equipamento_categoria || "Nao informada"}</p>
                  <p><strong>Tecnico:</strong> {item.tecnico_nome || "Nao atribuido"}</p>
                  <p><strong>Abertura:</strong> {formatDate(item.criado_em)}</p>
                </div>

                {canUpdateStatus ? (
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
                          Iniciar atendimento
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(item.id, "cancelado")}>
                          Cancelar
                        </Button>
                      </>
                    ) : null}

                    {item.status === "em_atendimento" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(item.id, "cancelado")}>
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </AppPageShell>
  )
}
