import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Load role for downstream pages
    const { data: roles } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", data.user.id);

    const roleList = (roles ?? []).map((r: any) => r.role as string);
    const isOwner = roleList.includes("owner");

    return {
      user: data.user,
      roles: roleList,
      isOwner,
    };
  },
  component: () => <Outlet />,
});
