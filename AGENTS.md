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
