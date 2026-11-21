export async function GET() {
  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: 'men casual peach linen shirt spring', gl: 'dk', num: 3 }),
  })

  const data = await res.json()
  return Response.json({
    status: res.status,
    ok: res.ok,
    items: (data.shopping ?? []).map((item: any) => ({
      title: item.title,
      source: item.source,
      price: item.price,
      link: item.link,
      has_image: !!item.imageUrl,
    })),
  })
}
