import { expect, openBible, signInLocally, test } from './fixtures'

test('the photo is uploaded from the avatar menu, made small, and taken away', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)

  // a 40×30 picture, drawn in the page
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 30
    const context = canvas.getContext('2d')!
    context.fillStyle = '#c33'
    context.fillRect(0, 0, 40, 30)
    return canvas.toDataURL('image/png')
  })
  const png = Buffer.from(dataUrl.split(',')[1]!, 'base64')

  const avatar = page.getByRole('button', { name: 'E2E' })
  await expect(avatar).toContainText('E')

  await avatar.click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Завантажити фото' }).click()
  await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png })

  const image = avatar.locator('img')
  await expect(image).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  await expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')

  await avatar.click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Прибрати фото' }).click()
  await expect(image).toHaveCount(0)
  await expect(avatar).toContainText('E')
})
