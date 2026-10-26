"""Run with an explicitly minted Patricia or Anderson preview session."""
import asyncio
import json
import os
from playwright.async_api import async_playwright

SCOPES = {
    'de900447-92aa-4522-a39a-b7c7c6fb4c08': {'Rodan': 18784221, 'Rodocap': 41149898.578545205, 'Rodorib RP': 31270384.7984417, 'Rodorib SJRP': 29828593.759460147},
    '7737cc54-3c99-49ba-9c5e-7e937250727e': {'Compasi': 72139649.35656379, 'Redemil': 94907104.3038247},
}

async def main():
    with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:
        session = json.load(f)
    user_id = session['session']['user']['id']
    expected = SCOPES[user_id]
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
        page = await context.new_page()
        await page.goto('http://localhost:8080')
        await page.evaluate('([k,v])=>localStorage.setItem(k,v)', [session['storage_key'], json.dumps(session['session'])])
        await page.goto('http://localhost:8080/mauricio/metas')
        await page.get_by_role('heading', name='Metas e Resultados', exact=True).wait_for()
        check = await page.evaluate('''async(id)=>{
          const {supabase:s}=await import('/src/integrations/supabase/client.ts');
          const [scope,annual,monthly,events,reservations,admin,denied,old] = await Promise.all([
            s.rpc('get_commercial_consultant_context'),
            s.from('mauricio_metas_anuais').select('revenda,meta').eq('ano',2026),
            s.from('mauricio_resultados_mensais').select('revenda,ano,mes,valor'),
            s.from('mauricio_eventos').select('revenda'),
            s.from('mauricio_reservas').select('revenda'),
            s.rpc('has_role',{_user_id:id,_role:'admin'}),
            s.from('mauricio_resultados_mensais').upsert({ano:2026,mes:12,revenda:'Multieixo',valor:123},{onConflict:'ano,mes,revenda'}).select('id'),
            s.from('mauricio_resultados_mensais').upsert({ano:2024,mes:12,revenda:id==='de900447-92aa-4522-a39a-b7c7c6fb4c08'?'Rodan':'Redemil',valor:123},{onConflict:'ano,mes,revenda'}).select('id')
          ]);
          return {scope:scope.data,annual:annual.data,monthly:monthly.data,events:events.data,reservations:reservations.data,admin:admin.data,denied:!!denied.error,oldDenied:!!old.error,errors:[scope,annual,monthly,events,reservations].filter(r=>r.error).map(r=>r.error.message)};
        }''', user_id)
        assert not check['errors'], check['errors']
        assert {d['name'] for d in check['scope']} == set(expected)
        assert {r['revenda']:r['meta'] for r in check['annual']} == expected
        assert all(r['revenda'] in expected for family in ['monthly','events','reservations'] for r in check[family])
        assert check['admin'] is False and check['denied'] and check['oldDenied']
        if 'Compasi' in expected:
            assert next(r['valor'] for r in check['monthly'] if r['revenda']=='Compasi' and r['ano']==2026 and r['mes']==10) == 330000
        print('PASS exact six workbook targets, scoped rows, denied external writes, denied closed-year mutation, no global admin, existing Compasi October preserved')
        await browser.close()

asyncio.run(main())
