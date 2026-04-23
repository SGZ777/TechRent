"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BoxesIcon, MonitorCogIcon, WrenchIcon } from "lucide-react"

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
import { formatStatus } from "@/lib/formatters"

const initialForm = {
  nome: "",
  categoria: "",
  patrimonio: "",
  status: "operacional",
  descricao: "",
}

export default function EquipamentosPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [equipamentos, setEquipamentos] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState("")

  const isAdmin = user?.nivel_acesso === "admin"

  const operacionais = useMemo(
    () => equipamentos.filter((item) => item.status === "operacional").length,
    [equipamentos]
  )
  const manutencao = useMemo(
    () => equipamentos.filter((item) => item.status === "em_manutencao").length,
    [equipamentos]
  )

  const loadEquipamentos = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const query = filterStatus ? `?status=${filterStatus}` : ""
      const data = await apiFetch(`/equipamentos${query}`)
      setEquipamentos(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      setError(fetchError.message || "Nao foi possivel carregar os equipamentos.")
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    if (!ready || !user) {
      return
    }

    loadEquipamentos()
  }, [loadEquipamentos, ready, user])

  if (!ready || !user) {
    return null
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
  }

  function handleEdit(item) {
    setEditingId(item.id)
    setForm({
      nome: item.nome || "",
      categoria: item.categoria || "",
      patrimonio: item.patrimonio || "",
      status: item.status || "operacional",
      descricao: item.descricao || "",
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      await apiFetch(editingId ? `/equipamentos/${editingId}` : "/equipamentos", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      })

      setSuccess(editingId ? "Equipamento atualizado com sucesso." : "Equipamento cadastrado com sucesso.")
      resetForm()
      await loadEquipamentos()
    } catch (submitError) {
      setError(submitError.message || "Nao foi possivel salvar o equipamento.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setError("")
    setSuccess("")

    try {
      await apiFetch(`/equipamentos/${id}`, {
        method: "DELETE",
      })

      setSuccess("Equipamento removido com sucesso.")
      if (editingId === id) {
        resetForm()
      }
      await loadEquipamentos()
    } catch (deleteError) {
      setError(deleteError.message || "Nao foi possivel remover o equipamento.")
    }
  }

  return (
    <AppPageShell
      user={user}
      title="Equipamentos"
      subtitle="Consulte o inventario, acompanhe a disponibilidade e gerencie o cadastro dos ativos."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total de equipamentos"
          value={equipamentos.length}
          description="Itens retornados pela rota /equipamentos."
          icon={BoxesIcon}
        />
        <SummaryCard
          title="Operacionais"
          value={operacionais}
          description="Equipamentos disponiveis para uso e abertura de chamados."
          icon={MonitorCogIcon}
        />
        <SummaryCard
          title="Em manutencao"
          value={manutencao}
          description="Ativos vinculados a atendimento tecnico em andamento."
          icon={WrenchIcon}
        />
      </div>

      <ErrorBanner message={error} />
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <SectionCard
        title="Filtros"
        subtitle="Refine a listagem dos equipamentos por status operacional."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xs space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="operacional">Operacional</option>
              <option value="em_manutencao">Em manutenção</option>
              <option value="desativado">Desativado</option>
            </select>
          </div>
          <Button type="button" variant="outline" onClick={() => setFilterStatus("")}>
            Limpar filtro
          </Button>
        </div>
      </SectionCard>

      {isAdmin ? (
        <SectionCard
          title={editingId ? "Editar equipamento" : "Novo equipamento"}
          subtitle="Administradores podem cadastrar, ajustar e desativar ativos do parque."
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Input
                value={form.categoria}
                onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                placeholder="Notebook, Impressora, Servidor..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Patrimonio</label>
              <Input
                value={form.patrimonio}
                onChange={(event) => setForm((current) => ({ ...current, patrimonio: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="operacional">Operacional</option>
                <option value="em_manutencao">Em manutenção</option>
                <option value="desativado">Desativado</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Atualizar equipamento" : "Cadastrar equipamento"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edicao
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Inventario"
        subtitle={isAdmin ? "Lista completa com acoes administrativas." : "Lista de consulta do parque de equipamentos."}
      >
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : equipamentos.length === 0 ? (
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Nenhum equipamento encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="grid gap-4">
            {equipamentos.map((item) => (
              <article key={item.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Equipamento #{item.id}</p>
                    <h3 className="text-lg font-semibold">{item.nome}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.categoria || "Sem categoria"} - {item.patrimonio}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    {formatStatus(item.status)}
                  </span>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  {item.descricao || "Sem descricao cadastrada."}
                </p>

                {isAdmin ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                      Remover
                    </Button>
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
