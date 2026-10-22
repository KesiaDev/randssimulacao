"""Authorization regression for Luis's explicitly minted local test session."""
import asyncio
import json
import os
from playwright.async_api import async_playwright

LUIS = "80eede29-0d42-492c-8c9b-826790ad50ea"
OUTSIDE_SELLER = "e92cf404-a186-4ea7-a32a-469fe7337dff"
PROPOSAL = "61e87a6a-5386-44c0-a0a9-a444331cb721"

async def main():
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as file:
        session = json.load(file)
    assert session["session"]["user"]["id"] == LUIS, "Mint Luis's session explicitly before running"
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [session["storage_key"], json.dumps(session["session"])])
        await page.goto("http://localhost:8080/gerencia")
        await page.get_by_role("heading", name="Multieixo", exact=True).wait_for()
        checks = await page.evaluate("""async ({outside, proposal, luis}) => {
          const {supabase} = await import('/src/integrations/supabase/client.ts');
          const [scope, other, annual, monthly, visits, reserves, admin, history, target] = await Promise.all([
            supabase.rpc('get_dealer_manager_context'),
            supabase.rpc('manager_can_read_seller',{_seller_id:outside}),
            supabase.from('mauricio_metas_anuais').select('revenda'),
            supabase.from('mauricio_resultados_mensais').select('revenda'),
            supabase.from('mauricio_eventos').select('revenda'),
            supabase.from('mauricio_reservas').select('revenda'),
            supabase.rpc('has_role',{_user_id:luis,_role:'admin'}),
            supabase.rpc('get_dealer_manager_history',{_client:'Furgão E commerce'}),
            supabase.from('proposals').select('client_name').eq('id',proposal).single()
          ]);
          const mutation=await supabase.from('proposals').update({client_name:target.data.client_name}).eq('id',proposal).select('id');
          const outsideRows=await supabase.from('simulations').select('id').eq('seller_id',outside);
          return {
            scope:scope.data?.map(d=>d.name), outsideAllowed:other.data,
            commercialOnly:[annual,monthly,visits,reserves].every(r=>!r.error && r.data.every(d=>d.revenda==='Multieixo')),
            annualCount:annual.data?.length, admin:admin.data,
            filtered:history.data?.entries?.every(e=>e.client_name==='Furgão E commerce'),
            filteredCount:history.data?.total,
            mutationBlocked:!!mutation.error || mutation.data?.length===0,
            outsideHidden:!outsideRows.error && outsideRows.data.length===0
          };
        }""", {"outside": OUTSIDE_SELLER, "proposal": PROPOSAL, "luis": LUIS})
        assert checks["scope"] == ["Multieixo"]
        assert checks["outsideAllowed"] is False
        assert checks["admin"] is False
        assert checks["commercialOnly"] and checks["annualCount"] > 0
        assert checks["filtered"] and checks["filteredCount"] == 1
        assert checks["mutationBlocked"] and checks["outsideHidden"]
        await page.goto(f"http://localhost:8080/proposta/{PROPOSAL}")
        await page.get_by_text("Furgão E commerce", exact=True).wait_for()
        assert await page.get_by_role("link", name="Editar", exact=True).count() == 0
        assert await page.get_by_role("button", name="Excluir", exact=True).count() == 0
        assert await page.locator('input[type="number"]').count() == 0
        async with page.expect_download() as download_info:
            await page.get_by_role("button", name="Baixar PDF", exact=True).click()
        download = await download_info.value
        path = await download.path()
        assert os.path.getsize(path) > 10000
        await page.screenshot(path="/tmp/browser/multieixo/proposal.png")
        await page.goto("http://localhost:8080/mauricio/revenda/Baldessar")
        await page.get_by_text("Nenhum dado encontrado", exact=False).wait_for()
        print("Passed: Multieixo-only team/history/results, denied external seller and global admin, read-only proposal, PDF download, denied external revenda.")
        await browser.close()

asyncio.run(main())