"use client"

import { useRouter } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { clearStoredToken } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  MonitorCogIcon,
  ShieldCheckIcon,
  TicketsIcon,
} from "lucide-react"

export function AppSidebar({
  user,
  role,
  ...props
}) {
  const router = useRouter()
  const roleLabel = role === "admin" ? "Administrador" : role === "tecnico" ? "Técnico" : "Cliente"

  const data = {
    user: {
      name: user?.nome || "Usuário",
      email: user?.email || "sem-email@techrent.local",
      avatar: "",
    },
    teams: [
      {
        name: "TechRent",
        logo: <ShieldCheckIcon />,
        plan: roleLabel,
      },
    ],
    navMain: [
      {
        title: "Painel",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        isActive: true,
        items: [
          {
            title: "Visão geral",
            url: "/dashboard",
          },
          {
            title: "Chamados",
            url: "#",
          },
        ],
      },
      {
        title: "Operação",
        url: "#",
        icon: <TicketsIcon />,
        items: [
          {
            title: "Fila de atendimento",
            url: "#",
          },
          {
            title: "Histórico",
            url: "#",
          },
        ],
      },
    ],
    projects: [
      {
        name: "Chamados",
        url: "#",
        icon: <ClipboardListIcon />,
      },
      {
        name: "Equipamentos",
        url: "#",
        icon: <MonitorCogIcon />,
      },
    ],
  }

  const handleLogout = () => {
    clearStoredToken()
    router.push("/")
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} onLogout={handleLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
