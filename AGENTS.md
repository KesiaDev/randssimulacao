<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Proposal PDFs must render official vehicle photos with contain-style proportional fitting, never cropping or stretching them, because the product must remain fully visible.
- The admin overview must use the database summary RPC instead of loading complete simulation and profile tables, keeping dashboard reads bounded as data grows.
- Seller revenda visibility is the union of the primary profile revenda and admin-managed extra assignments, so all restricted configuration uses one access rule.
- History filters run inside the paginated database RPC before counting and limiting results, preserving RLS and bounded page reads.
- Commercial qualification is stored separately from proposal lifecycle status; qualified history RPCs filter before pagination, and the narrow write RPC authorizes owner/admin without widening simulation update policies or manager permissions.
- History date ranges use inclusive São Paulo civil dates through dedicated range RPCs; legacy RPC signatures remain available for deployed clients. Admin activity is summarized in an admin-verified RPC, counting proposal headers once and averaging total item credit including quantities, while simulation volume counts saved simulation rows.
- Proposal screen and PDF share installment-label formatting from the saved item snapshot, so displayed percentages remain consistent without querying current group settings.
- Commercial strategic indicators use a pure calculation module and bounded year-range reads under existing RLS; projections require complete monthly coverage and year-over-year comparisons use matched months, keeping imported annual history independent.
- Current-year commercial realized totals derive from recorded monthly results through the shared pure calculation module on every commercial surface; use the imported annual snapshot only when no monthly values exist, preserve closed-year history, and invalidate all monthly query families after edits so totals cannot stay stale.
- Calendar deletion is a verified hard delete under existing Mauricio RLS and invalidates every event surface; appointment reminders derive from live events using Sao Paulo date boundaries, with read receipts cascading on event deletion so deleted events cannot leave orphaned notices.
- Lance financial rules and editable percentage parsing remain centralized in lance-calc with workbook cell references and scenario regressions; UI and PDF consume its results rather than duplicating formulas, keeping both outputs consistent.
- Lance dialog drafts are created independently of saved item snapshots and reset on every opening; only explicit save/remove actions mutate persisted bids, keeping fresh negotiations separate from PDF results.
- Dealer management is delegated through protected dealer_managers assignments, never global admin or email domains; manager reads use explicit server-owned membership and read-only commercial RLS, with bounded safe-field team/history RPCs and owner-only proposal mutation controls to prevent cross-dealer escalation.
- Commercial consultant editing is delegated separately through protected commercial_consultants assignments and dealership-scoped RLS; it never elevates read-only dealer managers, and current-year monthly upserts preserve closed-year history. Shared commercial data is reused across consultants and Mauricio rather than duplicated.
