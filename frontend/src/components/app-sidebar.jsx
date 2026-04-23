"use client"

import { useRouter } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { clearStoredToken } from "@/lib/auth"
import { formatRole } from "@/lib/formatters"
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
  UsersIcon,
  Settings2Icon,
  ShieldCheckIcon,
  TicketsIcon,
} from "lucide-react"

export function AppSidebar({
  user,
  role,
  ...props
}) {
  const router = useRouter()
  const isAdmin = role === "admin"
  const canAccessOperations = role === "admin" || role === "tecnico"

  const navMain = [
    {
      title: "Painel",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Chamados",
          url: "/chamados",
        },
      ],
    },
    {
      title: "Ativos",
      url: "/equipamentos",
      icon: <MonitorCogIcon />,
      items: [
        {
          title: "Equipamentos",
          url: "/equipamentos",
        },
      ],
    },
  ]

  if (canAccessOperations) {
    navMain.push({
      title: "Operacao",
      url: "/operacao",
      icon: <TicketsIcon />,
      items: [
        {
          title: "Fila de atendimento",
          url: "/operacao",
        },
      ],
    })
  }

  if (isAdmin) {
    navMain.push({
      title: "Administracao",
      url: "/usuarios",
      icon: <ShieldCheckIcon />,
      items: [
        {
          title: "Usuarios internos",
          url: "/usuarios",
        },
      ],
    })
  }

  const projects = [
    {
      name: "Chamados",
      url: "/chamados",
      icon: <ClipboardListIcon />,
    },
    {
      name: "Equipamentos",
      url: "/equipamentos",
      icon: <MonitorCogIcon />,
    },
  ]

  if (canAccessOperations) {
    projects.push({
      name: "Operacao",
      url: "/operacao",
      icon: <Settings2Icon />,
    })
  }

  if (isAdmin) {
    projects.push({
      name: "Usuarios",
      url: "/usuarios",
      icon: <UsersIcon />,
    })
  }

  const data = {
    user: {
      name: user?.nome || "Usuario",
      email: user?.email || "sem-email@techrent.local",
      avatar: "",
    },
    teams: [
      {
        name: "TechRent",
        logo: <ShieldCheckIcon />,
        plan: formatRole(role),
      },
    ],
    navMain,
    projects,
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
