export const statusLabels = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
  operacional: "Operacional",
  em_manutencao: "Em manutencao",
  desativado: "Desativado",
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
}

export function formatStatus(status) {
  if (!status) {
    return "Nao informado"
  }

  return statusLabels[status] || status.replaceAll("_", " ")
}

export function formatDate(value) {
  if (!value) {
    return "Nao informado"
  }

  return new Date(value).toLocaleString("pt-BR")
}

export function formatRole(role) {
  if (role === "admin") {
    return "Administrador"
  }

  if (role === "tecnico") {
    return "Tecnico"
  }

  if (role === "cliente") {
    return "Cliente"
  }

  return "Usuario"
}
