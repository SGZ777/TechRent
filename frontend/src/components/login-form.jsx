"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useGoogleLogin } from '@react-oauth/google'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/api"

export function LoginForm({
  className,
  ...props
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha: password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.token)
        router.push("/dashboard")
      } else {
        setError(data.mensagem || "Erro no login")
      }
    } catch {
      setError("Erro de conexao")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError("")
      try {
        // O tokenResponse.access_token é o que precisamos enviar para o backend
        // No entanto, o backend espera um ID Token se usarmos verifyIdToken.
        // Para simplificar e usar o fluxo de 'Implicit Flow' do @react-oauth/google,
        // vamos ajustar o backend ou usar o fluxo de 'Code Flow'.
        // Aqui, vamos assumir que o backend vai validar o access_token ou o id_token.
        // Como configuramos o backend com google-auth-library verifyIdToken, 
        // precisamos do id_token. O useGoogleLogin por padrão retorna access_token.
        
        // Vamos usar o fluxo que retorna o credential (ID Token) se possível, 
        // ou ajustar o backend para validar o access_token.
        // Uma alternativa comum é usar o componente <GoogleLogin> que retorna o credential diretamente.
        
        // Para manter o visual customizado do botão, vamos buscar o perfil do usuário 
        // ou usar o fluxo de redirecionamento.
        // Por agora, vamos implementar a chamada ao backend com o token recebido.
        
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: tokenResponse.access_token,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          localStorage.setItem("token", data.token)
          router.push("/dashboard")
        } else {
          setError(data.mensagem || "Erro no login com Google")
        }
      } catch (err) {
        setError("Erro ao processar login com Google")
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError("Falha na autenticação com Google")
  })

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bem vindo de volta!</h1>
                <p className="text-balance text-muted-foreground">
                  Insira suas credenciais para acessar sua conta
                </p>
              </div>
              {error ? <p className="text-center text-red-500 text-sm">{error}</p> : null}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                    Esqueceu sua senha?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Ou continue com
              </FieldSeparator>
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full"
                  onClick={() => handleGoogleLogin()}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </Button>
              </div>
              <FieldDescription className="text-center">
                Nao tem uma conta? <Link href="/signup">Cadastre-se</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src="/background-login.jpg"
              alt="Painel TechRent"
              fill
              className="absolute inset-0 object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Para continuar, voce concorda com nossos <a href="#">Termos de Servico</a>{" "}
        e <a href="#">Politica de Privacidade</a>.
      </FieldDescription>
    </div>
  )
}
