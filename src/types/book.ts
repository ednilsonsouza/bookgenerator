export type BookType = 'academic' | 'literary'

export type AcademicSubtype =
  | 'article'
  | 'monograph'
  | 'dissertation'
  | 'thesis'
  | 'other_academic'

export type LiteraryGenre =
  | 'romance'
  | 'sci_fi'
  | 'fantasy'
  | 'children'
  | 'religious'
  | 'short_story'
  | 'novella'
  | 'chronicle'
  | 'drama'
  | 'thriller'
  | 'horror'
  | 'adventure'
  | 'poetry'
  | 'fictional_biography'
  | 'self_help_narrative'
  | 'historical_fiction'
  | 'young_adult'
  | 'fable'
  | 'dystopia'
  | 'mystery'
  | 'comedy'
  | 'magical_realism'
  | 'epic'
  | 'family_saga'
  | 'other_literary'

export type BookStatus =
  | 'draft'
  | 'plan_pending'
  | 'plan_ready'
  | 'generating'
  | 'review'
  | 'completed'
  | 'published'
  | 'failed'

export type BookVisibility = 'private' | 'public'

export interface SectionPlan {
  order: number
  title: string
}

export interface BookProject {
  id: string
  userId: string
  title: string
  theme: string
  type: BookType
  academicSubtype?: AcademicSubtype
  literaryGenre?: LiteraryGenre
  description: string
  chapterCount: number
  sectionsPerChapter: number
  status: BookStatus
  visibility: BookVisibility
  coverFileId?: string
  finalPdfFileId?: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  bookProjectId: string
  title: string
  order: number
  targetPages: number
  targetWords: number
  description?: string
  sections?: SectionPlan[]
  status: 'pending' | 'generating' | 'completed' | 'failed'
}

export interface WritingPlan {
  id: string
  bookProjectId: string
  chapters: Chapter[]
  status: 'pending' | 'ready' | 'edited'
  generatedAt: string
  editedAt?: string
}

export const ACADEMIC_SUBTYPE_LABELS: Record<AcademicSubtype, string> = {
  article: 'Artigo Científico',
  monograph: 'Monografia',
  dissertation: 'Dissertação',
  thesis: 'Tese',
  other_academic: 'Outro tipo acadêmico',
}

export const LITERARY_GENRE_LABELS: Record<LiteraryGenre, string> = {
  romance: 'Romance',
  sci_fi: 'Ficção Científica',
  fantasy: 'Fantasia',
  children: 'Infantil',
  religious: 'Religioso',
  short_story: 'Conto',
  novella: 'Novela',
  chronicle: 'Crônica',
  drama: 'Drama',
  thriller: 'Suspense',
  horror: 'Terror',
  adventure: 'Aventura',
  poetry: 'Poesia',
  fictional_biography: 'Biografia Ficcional',
  self_help_narrative: 'Autoajuda Narrativa',
  historical_fiction: 'Ficção Histórica',
  young_adult: 'Literatura Jovem Adulta',
  fable: 'Fábula',
  dystopia: 'Distopia',
  mystery: 'Mistério',
  comedy: 'Comédia',
  magical_realism: 'Realismo Mágico',
  epic: 'Épico',
  family_saga: 'Saga Familiar',
  other_literary: 'Outros',
}

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  draft: 'Rascunho',
  plan_pending: 'Aguardando plano',
  plan_ready: 'Plano pronto',
  generating: 'Gerando',
  review: 'Em revisão',
  completed: 'Concluída',
  published: 'Publicada',
  failed: 'Falha',
}
