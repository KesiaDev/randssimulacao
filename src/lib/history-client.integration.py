import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  cookies=minted.get('cookies',[])
  for c in cookies: c['url']='http://localhost:8080'
  if cookies: await context.add_cookies(cookies)
  page=await context.new_page()
  await page.goto('http://localhost:8080',wait_until='domcontentloaded')
  await page.evaluate('(v)=>localStorage.setItem(v.key,v.session)',{'key':minted['storage_key'],'session':json.dumps(minted['session'])})
  await page.goto('http://localhost:8080/simular',wait_until='networkidle')
  import re
  await page.get_by_role('button',name=re.compile(r'^Grupo\s*920')).click()
  await page.get_by_role('button',name=re.compile('Crédito por cota')).first.click()
  await page.get_by_role('button',name=re.compile(r'^Taxa')).first.click()
  await page.get_by_role('button',name=re.compile('Integral',re.I)).click()
  await page.get_by_role('button',name=re.compile('Não incluir')).click()
  await page.get_by_role('button',name='Adicionar à proposta').click()
  client='Validação Busca Cliente 08102026'
  await page.get_by_label('Nome do cliente (opcional)').fill(client)
  await page.get_by_role('button',name='Gerar proposta final').click()
  await page.wait_for_url('**/proposta/**')
  proposal_id=page.url.split('/')[-1]
  await page.goto('http://localhost:8080/historico',wait_until='networkidle')
  async with page.expect_response(lambda r:'get_history_page' in r.url) as response:
   await page.get_by_label('Cliente',exact=True).fill('BUSCA CLIENTE 08102026')
  r=await response.value
  result=await r.json()
  assert r.status==200 and result['total']==1 and result['entries'][0]['id']==proposal_id
  await page.get_by_text(client,exact=True).wait_for()
  await page.screenshot(path='/tmp/browser/history-client/found.png')
  print('PASS: partial uppercase client search returned saved proposal, total 1')
  async with page.expect_response(lambda r:'get_history_page' in r.url) as response:
   await page.get_by_label('Vendedor',exact=True).fill('zzzz_vendedor_inexistente')
  r=await response.value
  assert (await r.json())['total']==0
  print('PASS: combined seller filter returns zero')
  await page.get_by_label('Vendedor',exact=True).fill('')
  await page.get_by_text(client,exact=True).wait_for()
  await page.get_by_role('button',name='Excluir',exact=True).click()
  await page.get_by_role('button',name='Excluir definitivamente').click()
  await page.get_by_text('Proposta excluída.',exact=True).wait_for()
  print('PASS: temporary proposal removed through UI')
  await browser.close()
asyncio.run(main())
