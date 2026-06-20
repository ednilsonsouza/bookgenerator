import type { BookProject, Chapter } from '@/types/book'
import { LITERARY_GENRE_LABELS, ACADEMIC_SUBTYPE_LABELS } from '@/types/book'

export interface ChapterContext {
  book: BookProject
  chapter: Chapter
  allChapters: Chapter[]
  previousContent?: string   // últimas ~500 palavras do capítulo anterior
}

// ── Literário ─────────────────────────────────────────────────────────────────

export function buildLiteraryChapterSystem(book: BookProject): string {
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : 'Literária'
  return `Você é um escritor profissional especializado em ${genre}.
Escreva em português brasileiro com qualidade editorial.
Crie prosa envolvente, com ritmo, diálogos naturais quando aplicável e descrições vívidas.
Mantenha consistência com o tom, personagens e eventos dos capítulos anteriores.
Não use asteriscos, emojis nem formatação markdown — apenas texto corrido com parágrafos.
Escreva somente o conteúdo do capítulo, sem título nem número.`
}

export function buildLiteraryChapterUser(ctx: ChapterContext): string {
  const { book, chapter, allChapters, previousContent } = ctx
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : ''

  const planSummary = allChapters
    .map((c) => `Cap. ${c.order}: ${c.title} — ${c.description ?? ''}`)
    .join('\n')

  const prevSection = previousContent
    ? `\n\nCONTINUIDADE (final do capítulo anterior):\n"${previousContent.slice(-1200)}"`
    : ''

  return `Escreva o capítulo a seguir para a obra "${book.title}".

DADOS DA OBRA:
- Gênero: ${genre}
- Tema: ${book.theme}
- Descrição geral: ${book.description}

PLANO DA OBRA:
${planSummary}

CAPÍTULO A ESCREVER:
- Número: ${chapter.order} de ${allChapters.length}
- Título: ${chapter.title}
- Objetivo: ${chapter.description ?? ''}
- Meta: aproximadamente ${chapter.targetWords} palavras${prevSection}

INSTRUÇÃO: Escreva apenas o conteúdo do Capítulo ${chapter.order}. Não inclua o título. Aproxime-se de ${chapter.targetWords} palavras.`
}

// ── Acadêmico ─────────────────────────────────────────────────────────────────

export interface AcademicSource {
  chunkId: string
  citationKey: string       // Ex: "SILVA (2023)"
  abnt: string             // Referência completa ABNT
  excerpt: string          // Trecho relevante do texto
  score: number
}

/**
 * Detecta o tipo do capítulo pelo título/descrição para aplicar
 * instruções específicas da metodologia de Bardin.
 */
function detectChapterRole(chapter: Chapter): 'intro' | 'theoretical' | 'methodology' | 'analysis' | 'conclusion' | 'other' {
  const text = `${chapter.title} ${chapter.description ?? ''}`.toLowerCase()

  if (/introdu[cç][aã]o|apresenta[cç][aã]o|contextualiza[cç][aã]o/.test(text)) return 'intro'
  if (/referencial|fundamenta[cç][aã]o|revis[aã]o|te[oó]rico|literatura/.test(text)) return 'theoretical'
  if (/metodolog|m[eé]todo|procedimento|bardin|an[aá]lise de conte[uú]do|corpus|categoriz/.test(text)) return 'methodology'
  if (/resultado|discuss[aã]o|an[aá]lise|categoria|unidade de contexto|unidade de registro/.test(text)) return 'analysis'
  if (/conclus[aã]o|considera[cç][oõ]es|final|encerramento/.test(text)) return 'conclusion'
  return 'other'
}

/**
 * Retorna instrução adicional específica para cada tipo de capítulo
 * de um levantamento bibliográfico com Análise de Conteúdo de Bardin.
 */
function buildBardinChapterInstruction(role: ReturnType<typeof detectChapterRole>): string {
  switch (role) {
    case 'intro':
      return `
INSTRUÇÕES ESPECÍFICAS — INTRODUÇÃO:
- Apresente o tema, justificativa, relevância científica e social do estudo.
- Formule o problema de pesquisa como uma pergunta clara.
- Enuncie o objetivo geral e os objetivos específicos.
- Informe que a pesquisa é um levantamento bibliográfico com abordagem qualitativa.
- Mencione que a análise dos dados segue a metodologia de Análise de Conteúdo de Laurence Bardin.
- Descreva brevemente a estrutura dos capítulos da obra.`

    case 'theoretical':
      return `
INSTRUÇÕES ESPECÍFICAS — REFERENCIAL TEÓRICO:
- Desenvolva a fundamentação teórica a partir das fontes disponíveis.
- Apresente os principais conceitos, autores e teorias pertinentes ao tema.
- Organize em subtópicos coerentes e progressivos.
- Dialogue criticamente entre os autores, mostrando convergências e divergências.
- Use predominantemente citações indiretas (SOBRENOME, ano) para parafrasear ideias.
- Use citações diretas apenas para definições fundamentais ou frases marcantes.`

    case 'methodology':
      return `
INSTRUÇÕES ESPECÍFICAS — METODOLOGIA:
Escreva a metodologia descrevendo OBRIGATORIAMENTE os seguintes elementos:

1. TIPO DE PESQUISA: Caracterize como pesquisa qualitativa do tipo levantamento bibliográfico.
   Justifique a escolha: permite mapear e analisar sistematicamente a produção científica sobre o tema.

2. CORPUS DOCUMENTAL: Descreva os critérios de seleção das fontes:
   - Bases de dados e repositórios consultados (ex: SciELO, Google Scholar, CAPES, etc.)
   - Descritores/palavras-chave utilizados
   - Período de publicação adotado
   - Critérios de inclusão (artigos completos, idioma, relevância temática)
   - Critérios de exclusão (duplicatas, textos não relacionados ao tema)

3. ANÁLISE DE CONTEÚDO DE LAURENCE BARDIN (cite BARDIN como fonte):
   Descreva detalhadamente as três fases:

   a) PRÉ-ANÁLISE:
      - Leitura flutuante do corpus para contato inicial com os textos.
      - Constituição do corpus: seleção dos documentos que compõem o material analisado.
      - Formulação de hipóteses e objetivos de análise.
      - Preparação do material para análise.

   b) EXPLORAÇÃO DO MATERIAL (codificação):
      - Definição das unidades de registro: fragmentos de texto com significado próprio (palavras, frases, parágrafos).
      - Definição das unidades de contexto: segmentos maiores que dão sentido às unidades de registro.
      - Processo de codificação e enumeração dos dados.
      - Formação das categorias de análise: processo de categorização temática.
      - Apresente as categorias emergentes identificadas neste estudo.

   c) TRATAMENTO DOS RESULTADOS, INFERÊNCIA E INTERPRETAÇÃO:
      - Agrupamento das unidades de registro em categorias temáticas.
      - Análise das frequências e relevâncias.
      - Inferências e interpretações a partir do referencial teórico.

4. APRESENTAÇÃO DAS CATEGORIAS: Liste e defina as categorias de análise identificadas,
   que serão exploradas no capítulo de resultados.`

    case 'analysis':
      return `
INSTRUÇÕES ESPECÍFICAS — ANÁLISE E DISCUSSÃO DOS RESULTADOS:
Escreva os resultados OBRIGATORIAMENTE a partir das categorias da Análise de Conteúdo de Bardin:

- Organize o capítulo em seções, cada uma correspondente a uma categoria de análise identificada.
- Para CADA categoria:
  a) Enuncie e defina a categoria.
  b) Apresente as unidades de contexto relevantes encontradas no corpus — cite trechos representativos
     das fontes bibliográficas analisadas (entre aspas com citação ABNT).
  c) Analise as unidades de contexto: quais padrões, convergências, divergências ou contradições emergem.
  d) Discuta os resultados à luz do referencial teórico — relacione com os autores citados no capítulo de fundamentação.
  e) Construa inferências e interpretações sustentadas pelas evidências do corpus.

- Use linguagem analítica e crítica, não apenas descritiva.
- Cada seção de categoria deve conectar teoria e dados empíricos do corpus.
- Ao final, faça uma síntese integradora articulando todas as categorias.`

    case 'conclusion':
      return `
INSTRUÇÕES ESPECÍFICAS — CONSIDERAÇÕES FINAIS:
- Retome o problema de pesquisa e os objetivos enunciados na introdução.
- Sintetize os principais resultados encontrados em cada categoria da Análise de Conteúdo.
- Responda objetivamente se os objetivos foram alcançados e como.
- Discuta as contribuições da Análise de Conteúdo de Bardin para a compreensão do tema.
- Aponte as limitações do estudo (escopo do corpus, recorte temporal, etc.).
- Sugira direções para pesquisas futuras.
- Não apresente dados novos — apenas sintetize e interprete o que já foi discutido.`

    default:
      return ''
  }
}

export function buildAcademicChapterSystem(book: BookProject): string {
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : 'Acadêmica'
  return `Você é um redator acadêmico experiente especializado em ${subtype}.
A obra é um LEVANTAMENTO BIBLIOGRÁFICO que usa a ANÁLISE DE CONTEÚDO DE LAURENCE BARDIN como metodologia.
Escreva em português brasileiro formal, seguindo rigorosamente as normas ABNT.
REGRAS OBRIGATÓRIAS:
1. Todo parágrafo deve conter pelo menos uma citação das FONTES DISPONÍVEIS.
2. Citação indireta: (SOBRENOME, ano) — ex: (SILVA, 2023)
3. Citação direta curta (até 3 linhas): "texto" (SOBRENOME, ano) — sem número de página pois são fontes digitais.
4. Use APENAS as fontes fornecidas. NUNCA invente autores, anos ou páginas.
5. NUNCA escreva "p. X", "p. XX" ou qualquer indicador de página fictício.
6. Escreva em linguagem técnica e objetiva.
7. Não use markdown, asteriscos nem emojis.
8. Escreva somente o corpo do texto, sem título de capítulo.

QUADROS — USE SEMPRE QUE NECESSÁRIO:
Sempre que for útil organizar e sistematizar informações (comparações, sínteses, categorias, resultados, etapas metodológicas, critérios, etc.), insira um quadro usando EXATAMENTE este formato:

[QUADRO|Título descritivo do quadro|Fonte: Elaborado pelo autor (ano)]
Cabeçalho coluna 1 | Cabeçalho coluna 2 | Cabeçalho coluna 3
Dado linha 1 col 1 | Dado linha 1 col 2 | Dado linha 1 col 3
Dado linha 2 col 1 | Dado linha 2 col 2 | Dado linha 2 col 3
[/QUADRO]

Regras para quadros:
- O título deve ser numerado sequencialmente: Quadro 1, Quadro 2, etc.
- Sempre inclua linha de cabeçalho (primeira linha = nomes das colunas).
- Use | como separador de colunas.
- Fonte obrigatória: "Fonte: Elaborado pelo autor (ano)" ou cite a fonte original.
- Após o quadro, escreva um parágrafo de análise referenciando-o: "Conforme o Quadro X, ...".
- Use quadros para: categorias de análise, critérios de inclusão/exclusão, síntese de autores, etapas de Bardin, comparação de estudos, resultados por categoria.`
}

export function buildAcademicChapterUser(ctx: ChapterContext, sources: AcademicSource[]): string {
  const { book, chapter, allChapters } = ctx
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : ''

  const planSummary = allChapters
    .map((c) => `Cap. ${c.order}: ${c.title}`)
    .join(' | ')

  const sourcesBlock = sources.length > 0
    ? sources
        .map(
          (s, i) =>
            `[FONTE ${i + 1}] ${s.citationKey}\nReferência: ${s.abnt}\nTrecho: "${s.excerpt.slice(0, 600)}"`
        )
        .join('\n\n')
    : 'Nenhuma fonte disponível para este capítulo.'

  const role = detectChapterRole(chapter)
  const specificInstruction = buildBardinChapterInstruction(role)

  return `Escreva o seguinte capítulo acadêmico para a obra "${book.title}".

DADOS DA OBRA:
- Tipo: ${subtype} — Levantamento Bibliográfico com Análise de Conteúdo de Bardin
- Tema: ${book.theme}
- Descrição: ${book.description}
- Estrutura: ${planSummary}

CAPÍTULO A ESCREVER:
- Número: ${chapter.order} de ${allChapters.length}
- Título: ${chapter.title}
- Objetivo: ${chapter.description ?? ''}
- Meta: aproximadamente ${chapter.targetWords} palavras
${specificInstruction}

FONTES DISPONÍVEIS PARA CITAÇÃO:
${sourcesBlock}

INSTRUÇÃO FINAL: Escreva o corpo do Capítulo ${chapter.order} usando obrigatoriamente as fontes acima. Cada parágrafo deve citar pelo menos uma fonte. Alvo: ${chapter.targetWords} palavras.`
}
