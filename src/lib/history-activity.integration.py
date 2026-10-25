import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  if minted.get('cookies'): await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in minted['cookies']])
  page=await context.new_page()
  errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  await page.goto('http://localhost:8080/historico',wait_until='networkidle')
  await page.get_by_label('De',exact=True).wait_for()
  async with page.expect_response(lambda r:'get_qualified_history' in r.url) as response:
   await page.get_by_label('De',exact=True).fill('2026-10-23')
  assert (await response.value).status==200
  async with page.expect_response(lambda r:'get_qualified_history' in r.url) as response:
   await page.get_by_label('Até',exact=True).fill('2026-10-23')
  result=await (await response.value).json()
  assert len(result['entries'])<=10
  assert all('2026-10-23'==r['created_at'][:10] for r in result['entries'])
  print('same-day inclusive filter:',result['total'],'results')
  await page.screenshot(path='/tmp/browser/history-admin/history.png')
  await page.get_by_label('De',exact=True).fill('2026-10-24')
  await page.get_by_role('alert').filter(has_text='posterior').wait_for()
  print('reversed range rejected')
  async with page.expect_response(lambda r:'get_admin_dashboard' in r.url) as response:
   await page.goto('http://localhost:8080/admin',wait_until='networkidle')
  r=await response.value; data=await r.json()
  assert r.status==200, data
  assert data['propostas_ano']>0
  assert abs(data['ticket_medio']*data['propostas_ano']-data['credito_proposto'])<0.01
  assert sum(m['total'] for m in data['propostas_mensais'])==data['propostas_ano']
  assert [m['mes'] for m in data['propostas_mensais']]==list(range(1,13))
  assert len(data['volume_vendedores'])<=20
  mes_atual=int(await page.evaluate("() => new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',month:'numeric'}).format(new Date())"))
  mes=[m for m in data['propostas_mensais'] if m['mes']==mes_atual][0]
  assert data['credito_proposto_mes'] is not None
  assert abs((mes['ticket_medio'] or 0)*mes['total']-data['credito_proposto_mes'])<0.01, (mes, data['credito_proposto_mes'])
  await page.get_by_text('Total proposto no mês',exact=False).first.wait_for()
  assert await page.get_by_text('Crédito total proposto',exact=True).count()==0
  print('current-month proposed credit matches the month row and is shown on screen')
  quals={q['qualification']:q['total'] for q in data['qualificacoes']}
  assert set(quals)=={'unqualified','hot','warm','cold','won','lost'}
  assert sum(quals.values())>=data['propostas_ano']
  creditos={q['qualification']:float(q['credito']) for q in data['qualificacoes']}
  assert all(c>=0 for c in creditos.values())
  assert sum(creditos.values())>=data['credito_proposto']-0.01
  await page.get_by_text('Qualificação comercial',exact=False).first.wait_for()
  print('qualification cards:',quals)
  print('qualification credit totals:',creditos)
  await page.get_by_text('Ticket médio · crédito por proposta',exact=True).wait_for()
  await page.screenshot(path='/tmp/browser/history-admin/admin.png')
  print('admin proposal totals, monthly counts and average credit are internally consistent')
  await page.get_by_role('combobox',name='Ano dos indicadores').click()
  async with page.expect_response(lambda r:'get_admin_dashboard' in r.url) as response:
   await page.get_by_role('option',name='2025',exact=True).click()
  past=await (await response.value).json()
  assert past['ano']==2025 and len(past['propostas_mensais'])==12
  await page.get_by_role('link',name='Quente').first.click()
  await page.wait_for_url('**/historico**')
  assert 'qualification=hot' in page.url, page.url
  print('qualification card opens the filtered history')
  print('year selector verified; page errors:',errors)
  await browser.close()
asyncio.run(main())
