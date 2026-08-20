import type { LanguageCode } from './types'

export interface Glyph {
  /** what shows on the button, big */
  glyph: string
  /** what TTS says (letter name in that language) */
  say: string
}

export const ALPHABETS: Record<LanguageCode, Glyph[]> = {
  en: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((c) => ({ glyph: c, say: c })),
  es: [
    ['A', 'a'], ['B', 'be'], ['C', 'ce'], ['D', 'de'], ['E', 'e'], ['F', 'efe'],
    ['G', 'ge'], ['H', 'hache'], ['I', 'i'], ['J', 'jota'], ['K', 'ka'], ['L', 'ele'],
    ['M', 'eme'], ['N', 'ene'], ['Ñ', 'eñe'], ['O', 'o'], ['P', 'pe'], ['Q', 'cu'],
    ['R', 'erre'], ['S', 'ese'], ['T', 'te'], ['U', 'u'], ['V', 'uve'],
    ['W', 'uve doble'], ['X', 'equis'], ['Y', 'i griega'], ['Z', 'zeta'],
  ].map(([glyph, say]) => ({ glyph, say })),
  ko: [
    // 14 basic consonants with their names, then 10 basic vowels
    ['ㄱ', '기역'], ['ㄴ', '니은'], ['ㄷ', '디귿'], ['ㄹ', '리을'], ['ㅁ', '미음'],
    ['ㅂ', '비읍'], ['ㅅ', '시옷'], ['ㅇ', '이응'], ['ㅈ', '지읒'], ['ㅊ', '치읓'],
    ['ㅋ', '키읔'], ['ㅌ', '티읕'], ['ㅍ', '피읖'], ['ㅎ', '히읗'],
    ['ㅏ', '아'], ['ㅑ', '야'], ['ㅓ', '어'], ['ㅕ', '여'], ['ㅗ', '오'],
    ['ㅛ', '요'], ['ㅜ', '우'], ['ㅠ', '유'], ['ㅡ', '으'], ['ㅣ', '이'],
  ].map(([glyph, say]) => ({ glyph, say })),
  ru: [
    ['А', 'а'], ['Б', 'бэ'], ['В', 'вэ'], ['Г', 'гэ'], ['Д', 'дэ'], ['Е', 'е'],
    ['Ё', 'ё'], ['Ж', 'жэ'], ['З', 'зэ'], ['И', 'и'], ['Й', 'и краткое'],
    ['К', 'ка'], ['Л', 'эль'], ['М', 'эм'], ['Н', 'эн'], ['О', 'о'], ['П', 'пэ'],
    ['Р', 'эр'], ['С', 'эс'], ['Т', 'тэ'], ['У', 'у'], ['Ф', 'эф'], ['Х', 'ха'],
    ['Ц', 'цэ'], ['Ч', 'че'], ['Ш', 'ша'], ['Щ', 'ща'], ['Ъ', 'твёрдый знак'],
    ['Ы', 'ы'], ['Ь', 'мягкий знак'], ['Э', 'э'], ['Ю', 'ю'], ['Я', 'я'],
  ].map(([glyph, say]) => ({ glyph, say })),
}

export const NUMBER_WORDS: Record<LanguageCode, string[]> = {
  en: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
    'eighteen', 'nineteen', 'twenty'],
  es: ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
    'dieciocho', 'diecinueve', 'veinte'],
  ko: ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
    '열하나', '열둘', '열셋', '열넷', '열다섯', '열여섯', '열일곱', '열여덟',
    '열아홉', '스물'],
  ru: ['один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
    'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
    'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
    'двадцать'],
}

export interface Swatch {
  /** css color for the dot/glyph */
  hex: string
  /** display glyph for shapes ('' for colors — a colored dot renders instead) */
  glyph: string
  /** the word per language, as shown and spoken */
  word: Record<LanguageCode, string>
  /** the word with its article where the "I found" comment needs one */
  withArticle: Record<LanguageCode, string>
}

const color = (
  hex: string,
  en: string,
  es: string,
  ko: string,
  ru: string,
): Swatch => ({
  hex,
  glyph: '',
  word: { en, es, ko, ru },
  withArticle: { en, es: `el ${es}`, ko, ru },
})

export const COLORS: Swatch[] = [
  color('#e63946', 'red', 'rojo', '빨강', 'красный'),
  color('#f77f00', 'orange', 'naranja', '주황', 'оранжевый'),
  color('#fcbf49', 'yellow', 'amarillo', '노랑', 'жёлтый'),
  color('#2a9d34', 'green', 'verde', '초록', 'зелёный'),
  color('#1d6fd8', 'blue', 'azul', '파랑', 'синий'),
  color('#7b2cbf', 'purple', 'morado', '보라', 'фиолетовый'),
  color('#f472b6', 'pink', 'rosado', '분홍', 'розовый'),
  color('#8a5a2b', 'brown', 'café', '갈색', 'коричневый'),
  color('#222222', 'black', 'negro', '검정', 'чёрный'),
  color('#f5f2ea', 'white', 'blanco', '하양', 'белый'),
]

export const SHAPES: Swatch[] = [
  {
    hex: '#e63946',
    glyph: '●',
    word: { en: 'circle', es: 'círculo', ko: '동그라미', ru: 'круг' },
    withArticle: { en: 'a circle', es: 'un círculo', ko: '동그라미', ru: 'круг' },
  },
  {
    hex: '#1d6fd8',
    glyph: '■',
    word: { en: 'square', es: 'cuadrado', ko: '네모', ru: 'квадрат' },
    withArticle: { en: 'a square', es: 'un cuadrado', ko: '네모', ru: 'квадрат' },
  },
  {
    hex: '#2a9d34',
    glyph: '▲',
    word: { en: 'triangle', es: 'triángulo', ko: '세모', ru: 'треугольник' },
    withArticle: { en: 'a triangle', es: 'un triángulo', ko: '세모', ru: 'треугольник' },
  },
  {
    hex: '#fcbf49',
    glyph: '★',
    word: { en: 'star', es: 'estrella', ko: '별', ru: 'звезда' },
    withArticle: { en: 'a star', es: 'una estrella', ko: '별', ru: 'звезду' },
  },
  {
    hex: '#f472b6',
    glyph: '♥',
    word: { en: 'heart', es: 'corazón', ko: '하트', ru: 'сердце' },
    withArticle: { en: 'a heart', es: 'un corazón', ko: '하트', ru: 'сердце' },
  },
  {
    hex: '#7b2cbf',
    glyph: '◆',
    word: { en: 'diamond', es: 'rombo', ko: '다이아몬드', ru: 'ромб' },
    withArticle: { en: 'a diamond', es: 'un rombo', ko: '다이아몬드', ru: 'ромб' },
  },
  {
    hex: '#f77f00',
    glyph: '☾',
    word: { en: 'moon', es: 'luna', ko: '달', ru: 'луна' },
    withArticle: { en: 'a moon', es: 'una luna', ko: '달', ru: 'луну' },
  },
]

export type GlyphKind = 'letter' | 'number' | 'color' | 'shape'

/** Declarative "I found ___!" comment — itself a mitigable gestalt, never a quiz. */
export function foundComment(lang: LanguageCode, kind: GlyphKind, say: string): {
  display: string
  speak: string
} {
  const wrap = (text: string) => ({ display: text, speak: text })
  switch (lang) {
    case 'en':
      if (kind === 'color' || kind === 'shape') return wrap(`I found ${say}!`)
      return wrap(`I found the ${kind} ${say}!`)
    case 'es':
      if (kind === 'letter') return wrap(`¡Encontré la letra ${say}!`)
      if (kind === 'number') return wrap(`¡Encontré el número ${say}!`)
      return wrap(`¡Encontré ${say}!`)
    case 'ko':
      return wrap(`${say} 찾았다!`)
    case 'ru':
      if (kind === 'letter') return wrap(`Я нашёл букву ${say}!`)
      if (kind === 'number') return wrap(`Я нашёл число ${say}!`)
      return wrap(`Я нашёл ${say}!`)
  }
}
