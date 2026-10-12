import { computed } from 'vue'
import { defineStore } from 'pinia'

import { languages, type Languages } from '@/configs/language'
import type { Lang, Localized } from '@/types'

import { useUserStore } from './user'

/** { title: { ua: 'Вхід', en: 'Sign In' } } -> { title: 'Вхід' } */
type Translated<T> = { [K in keyof T]: T[K] extends Localized<infer V> ? V : never }

function translate<T extends Record<string, Localized<unknown>>>(section: T, lang: Lang) {
  return Object.fromEntries(
    Object.entries(section).map(([key, value]) => [key, value[lang]])
  ) as Translated<T>
}

/** UI texts in the current language: `language.common.noData`, `language.signIn.title`, ... */
export const useLanguageStore = defineStore('language', () => {
  const user = useUserStore()
  const lang = computed<Lang>(() => user.lang ?? 'ua')

  const section = <K extends keyof Languages>(name: K) =>
    computed(() => translate(languages[name] as Languages[K], lang.value))

  return {
    admin: section('admin'),
    common: section('common'),
    header: section('header'),
    keywords: section('keywords'),
    messages: section('messages'),
    nestedDraggable: section('nestedDraggable'),
    notes: section('notes'),
    pages: section('pages'),
    publish: section('publish'),
    search: section('search'),
    selector: section('selector'),
    showControls: section('showControls'),
    signIn: section('signIn'),
    signUp: section('signUp'),
    topics: section('topics')
  }
})
