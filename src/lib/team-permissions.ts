// Stable account identity: editable profile fields never grant access-management powers.
const ACCESS_OWNER_ID = "d58f0c77-e079-4c01-aba5-b3dda75d8071";

export function canManageUserAccess(userId: string, isAdmin: boolean, active: boolean) {
  return userId === ACCESS_OWNER_ID && isAdmin && active;
}

export async function assertUserAccessOwner(context: {
  userId: string;
  supabase: any;
}) {
  const [{ data: admin, error: roleError }, { data: profile, error: profileError }] =
    await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.from("profiles").select("active").eq("id", context.userId).maybeSingle(),
    ]);
  if (roleError || profileError || !canManageUserAccess(context.userId, admin === true, profile?.active === true)) {
    throw new Error("Somente Kesia pode gerenciar o acesso de usuários.");
  }
}