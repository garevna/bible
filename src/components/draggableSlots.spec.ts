import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-core'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

/**
 * vuedraggable throws "Item slot must have only one child" when the #item slot has more than one node.
 * The dev server keeps HTML comments, the production build drops them, so e2e on the build cannot see it.
 */
const vueFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? vueFiles(join(dir, entry.name))
      : entry.name.endsWith('.vue')
        ? [join(dir, entry.name)]
        : []
  )

const isItemSlot = (node: TemplateChildNode): node is ElementNode =>
  node.type === NodeTypes.ELEMENT &&
  node.tag === 'template' &&
  node.props.some(
    (prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === 'slot' && prop.arg?.loc.source === 'item'
  )

function itemSlots(nodes: TemplateChildNode[]): ElementNode[] {
  return nodes.flatMap((node) => {
    if (node.type !== NodeTypes.ELEMENT) return []
    return [...(isItemSlot(node) ? [node] : []), ...itemSlots(node.children)]
  })
}

const draggables = vueFiles('src').filter((file) => readFileSync(file, 'utf8').includes('vuedraggable'))

describe('vuedraggable item slots', () => {
  it.each(draggables)('%s has one root node, no comments next to it', (file) => {
    const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
    const slots = itemSlots(descriptor.template?.ast?.children ?? [])

    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      const nodes = slot.children.filter((node) => node.type !== NodeTypes.TEXT || node.content.trim())
      expect(nodes.map((node) => node.loc.source.slice(0, 40))).toHaveLength(1)
    }
  })
})
