"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ShieldCheckIcon, UserCogIcon, WrenchIcon } from "lucide-react"

import {
  AppPageShell,
  ErrorBanner,
  SectionCard,
  SummaryCard,
} from "@/components/app-page-shell"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user"
import { apiFetch } from "@/lib/api"
import { formatRole } from "@/lib/formatters"

const INITIAL_FORM = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  nivel_acesso: "tecnico",
}

function UsuarioList({ items }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
        Nenhuma conta cadastrada neste perfil.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{item.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.email}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {formatRole(item.nivel_acesso)}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function UsuariosPage() {
  const { user, ready } = useAuthenticatedUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)

  const isAdmin = user?.nivel_acesso === "admin"

  const admins = useMemo(
    () => usuarios.filter((item) => item.nivel_acesso === "admin"),
    [usuarios]
  )
  const tecnicos = useMemo(
    () => usuarios.filter((item) => item.nivel_acesso === "tecnico"),
    [usuarios]
  )

  const loadUsuarios = useCallback(async () => {
    if (!isAdmin) {
      setUsuarios([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const data = await apiFetch("/auth/usuarios")
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      setError(fetchError.message || "Nao foi possivel carregar os usuarios internos.")
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

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (form.senha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      return
    }

    if (form.senha !== form.confirmarSenha) {
      setError("As senhas nao coincidem.")
      return
    }

    setSaving(true)

    try {
      const data = await apiFetch("/auth/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          nivel_acesso: form.nivel_acesso,
        }),
      })

      setSuccess(data?.mensagem || "Conta interna criada com sucesso.")
      setForm(INITIAL_FORM)
      await loadUsuarios()
    } catch (submitError) {
      setError(submitError.message || "Não foi possivel criar a conta.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppPageShell
      user={user}
      title="Usuarios"
      subtitle="Separe o acesso entre administradores e tecnicos e mantenha as contas internas sob controle."
    >
      {!isAdmin ? (
        <SectionCard
          title="Acesso restrito"
          subtitle="Somente administradores podem gerenciar contas internas."
        >
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Seu perfil nao possui permissao para criar administradores ou tecnicos.
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Usuarios internos"
              value={usuarios.length}
              description="Contas com acesso administrativo ou técnico."
              icon={UserCogIcon}
            />
            <SummaryCard
              title="Administradores"
              value={admins.length}
              description="Responsaveis pela gestão do sistema."
              icon={ShieldCheckIcon}
            />
            <SummaryCard
              title="Tecnicos"
              value={tecnicos.length}
              description="Equipe operacional que atende os chamados."
              icon={WrenchIcon}
            />
          </div>

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <SectionCard
              title="Nova conta interna"
              subtitle="Crie um administrador ou técnico com credenciais próprias."
            >
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="nivel_acesso">Perfil</FieldLabel>
                    <select
                      id="nivel_acesso"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                      value={form.nivel_acesso}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          nivel_acesso: event.target.value,
                        }))
                      }
                    >
                      <option value="tecnico">Tecnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <FieldDescription>
                      O perfil define se a conta terá acesso operacional ou administrativo.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="nome">Nome</FieldLabel>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Nome completo"
                      required
                      value={form.nome}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, nome: event.target.value }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@techrent.com"
                      required
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="senha">Senha</FieldLabel>
                    <Input
                      id="senha"
                      type="password"
                      required
                      value={form.senha}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, senha: event.target.value }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmar-senha">Confirmar senha</FieldLabel>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      required
                      value={form.confirmarSenha}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          confirmarSenha: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Criando conta..." : "Criar conta interna"}
                  </Button>
                </FieldGroup>
              </form>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                title="Administradores"
                subtitle="Contas com acesso total a dashboard, equipamentos, operação e usuários."
              >
                {loading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                ) : (
                  <UsuarioList items={admins} />
                )}
              </SectionCard>

              <SectionCard
                title="Técnicos"
                subtitle="Contas focadas na fila operacional e registro de manutenções."
              >
                {loading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                ) : (
                  <UsuarioList items={tecnicos} />
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </AppPageShell>
  )
}
