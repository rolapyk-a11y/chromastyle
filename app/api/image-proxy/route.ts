import { NextRequest, NextResponse } from 'next/server'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported image URL protocol' }, { status: 400 })
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Outfitter image proxy/1.0',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Could not fetch image' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'URL did not return an image' }, { status: 415 })
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    const imageBuffer = await response.arrayBuffer()
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image proxy failed' }, { status: 502 })
  }
}
