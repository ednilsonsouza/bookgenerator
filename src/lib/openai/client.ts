import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não configurada.')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** gpt-4.1-mini: output máximo 32k tokens, melhor que 4o-mini para textos longos */
export const MODEL = 'gpt-4.1-mini'

/** Limite máximo de output tokens do modelo atual */
export const MODEL_MAX_OUTPUT_TOKENS = 32768
