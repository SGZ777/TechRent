"use client"

import { useCallback, useEffect, useState } from "react"
import { ShieldCheckIcon, UserCogIcon, UsersIcon } from "lucide-react"

import {
  AppPageShell,
  ErrorBanner,
  SectionCard,
  SummaryCard,
} from "@/components/app-page-shell"
import { Button } from "@/components/ui/button"
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user"
import { apiFetch } from "@/lib/api"
import { formatDate, formatRole } from "@/lib/formatters"

export default function UsuariosPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [usuarios, setUsuarios] = useState([])
  const [pendingUserId, setPendingUserId] = useState(null)

  const isAdmin = user?.nivel_acesso === "admin"

  const loadUsuarios = useCallback(async () => {
    if (!isAdmin) {
      setUsuarios([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/usuarios")
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      setError(fetchError.message || "Nao foi possivel carregar os usuarios.")
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!ready || !user) {
      return
    }

    loadUsuarios()
  }, [loadUsuarios, ready, user])

  if (!ready || !user) {
    return null
  }

  async function handleRoleChange(usuarioId, nivelAcesso) {
    setPendingUserId(usuarioId)
    setError("")
    setSuccess("")

    try {
      await apiFetch(`/usuarios/${usuarioId}/nivel-acesso`, {
        method: "PUT",
        body: JSON.stringify({ nivel_acesso: nivelAcesso }),
      })

      setSuccess("Perfil atualizado com sucesso.")
      await loadUsuarios()
    } catch (updateError) {
      setError(updateError.message || "Nao foi possivel atualizar o perfil.")
    } finally {
      setPendingUserId(null)
    }
  }

  const totalUsuarios = usuarios.length
  const totalAdmins = usuarios.filter((item) => item.nivel_acesso === "admin").length
  const totalTecnicos = usuarios.filter((item) => item.nivel_acesso === "tecnico").length

  return (
    <AppPageShell
      user={user}
      title="Usuarios"
      subtitle="Gerencie os perfis de acesso da equipe para manter o fluxo do MVP sob controle administrativo."
    >
      {!isAdmin ? (
        <SectionCard
          title="Acesso restrito"
          subtitle="Somente administradores podem gerenciar perfis de usuario."
        >
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Seu perfil nao possui permissao para administrar usuarios.
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Usuarios cadastrados"
              value={totalUsuarios}
              description="Total de contas registradas no sistema."
              icon={UsersIcon}
            />
            <SummaryCard
              title="Administradores"
              value={totalAdmins}
              description="Perfis com acesso completo de gestao."
              icon={ShieldCheckIcon}
            />
            <SummaryCard
              title="Tecnicos"
              value={totalTecnicos}
              description="Perfis aptos a assumir e concluir chamados."
              icon={UserCogIcon}
            />
          </div>

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <SectionCard
            title="Gestao de perfis"
            subtitle="Defina quem atua como cliente, tecnico ou administrador."
          >
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : usuarios.length === 0 ? (
              <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                Nenhum usuario cadastrado no momento.
              </div>
            ) : (
              <div className="grid gap-4">
                {usuarios.map((item) => (
                  <article key={item.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Usuario #{item.id}</p>
                        <h3 className="text-lg font-semibold">{item.nome}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.email}</p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-sm">
                        {formatRole(item.nivel_acesso)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      <p><strong>Criado em:</strong> {formatDate(item.criado_em)}</p>
                      <p><strong>Perfil atual:</strong> {formatRole(item.nivel_acesso)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {["cliente", "tecnico", "admin"].map((nivel) => (
                        <Button
                          key={nivel}
                          size="sm"
                          variant={item.nivel_acesso === nivel ? "default" : "outline"}
                          disabled={pendingUserId === item.id}
                          onClick={() => handleRoleChange(item.id, nivel)}
                        >
                          {pendingUserId === item.id && item.nivel_acesso !== nivel
                            ? "Atualizando..."
                            : formatRole(nivel)}
                        </Button>
                      ))}
                    </div>
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
