/** 'Delete {name}?' + { name: 'x' } -> 'Delete x?' */
export const format = (template: string, params: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
