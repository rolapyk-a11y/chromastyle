import { createClient } from '@/lib/supabase/server'

const FASHN_API_KEY = process.env.FASHN_API_KEY

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!FASHN_API_KEY) {
      return Response.json({
        error: 'FASHN API key not configured. Please add FASHN_API_KEY to environment variables.',
        needsApiKey: true
      }, { status: 500 })
    }

    const { modelImage, garmentImage, clothingItemId, category = 'auto' } = await req.json()

    if (!modelImage || !garmentImage) {
      return Response.json({ error: 'Model image and garment image are required' }, { status: 400 })
    }

    // Step 1: Start the try-on job
    const runResponse = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FASHN_API_KEY}`,
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: modelImage,
          garment_image: garmentImage,
          category,
          garment_photo_type: 'flat-lay',
          mode: 'balanced',
          return_base64: true,
          output_format: 'jpeg',
        },
      }),
    })

    if (!runResponse.ok) {
      const errorData = await runResponse.json().catch(() => ({}))
      console.error('FASHN API error:', errorData)
      return Response.json({
        error: 'Failed to start try-on job',
        details: errorData
      }, { status: 500 })
    }

    const runData = await runResponse.json()
    const predictionId = runData.id

    if (!predictionId) {
      return Response.json({ error: 'No prediction ID returned' }, { status: 500 })
    }

    // Step 2: Poll for completion
    let resultData = null
    const maxAttempts = 60 // ~2 minutes with 2 second intervals

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${FASHN_API_KEY}`,
        },
      })

      if (!statusResponse.ok) {
        continue
      }

      const statusData = await statusResponse.json()

      if (statusData.status === 'completed') {
        resultData = statusData
        break
      } else if (statusData.status === 'failed') {
        return Response.json({
          error: 'Try-on generation failed',
          details: statusData.error
        }, { status: 500 })
      }
    }

    if (!resultData || !resultData.output || resultData.output.length === 0) {
      return Response.json({ error: 'Try-on timed out or returned no results' }, { status: 500 })
    }

    const resultImage = resultData.output[0]

    if (clothingItemId) {
      await supabase
        .from('try_on_history')
        .insert({
          user_id: user.id,
          clothing_item_id: clothingItemId,
          original_photo_url: modelImage.substring(0, 500),
          result_photo_url: resultImage.substring(0, 500),
        })
    }

    return Response.json({
      success: true,
      resultImage,
      predictionId
    })
  } catch (error) {
    console.error('Try-on error:', error)
    return Response.json({ error: 'An error occurred during try-on' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const predictionId = url.searchParams.get('id')

  if (!predictionId) {
    return Response.json({ error: 'Prediction ID is required' }, { status: 400 })
  }

  if (!FASHN_API_KEY) {
    return Response.json({ error: 'FASHN API key not configured' }, { status: 500 })
  }

  try {
    const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${FASHN_API_KEY}`,
      },
    })

    if (!statusResponse.ok) {
      return Response.json({ error: 'Failed to fetch status' }, { status: 500 })
    }

    const statusData = await statusResponse.json()
    return Response.json(statusData)
  } catch (error) {
    console.error('Status check error:', error)
    return Response.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
