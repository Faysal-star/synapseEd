import { unfurl as unfurlUrl } from 'unfurl.js'

export async function unfurl(url: string) {
  try {
    const result = await unfurlUrl(url)
    return {
      title: result.title,
      description: result.description,
      image: result.open_graph?.images?.[0]?.url,
      favicon: result.favicon,
    }
  } catch (error) {
    console.error('Error unfurling URL:', error)
    return null
  }
} 