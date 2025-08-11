import { expect, describe, test } from 'vitest'
import { linkType } from './link-type'
describe('linkType', () => {
  test('video', () => {
    expect(linkType('http://youtube.com')).toBe('video')
    expect(linkType('https://www.youtube.com/watch?v=1Cz8_6aZ248')).toBe(
      'video'
    )
    expect(linkType('https://youtu.be/1Cz8_6aZ248')).toBe('video')
    expect(linkType('https://youtu.be/1Cz8_6aZ248', true)).toBe('video')
    expect(linkType('https://vimeo.com/746423508')).toBe('video')
    expect(linkType('https://vimeo.com/746423508', true)).toBe('video')
  })
  test('audio', () => {
    expect(
      linkType(
        'https://www.mixcloud.com/TheBlessedMadonna/we-still-believe-episode-090-it-couldnt-happen-here/'
      )
    ).toBe('audio')
    expect(
      linkType(
        'https://soundcloud.com/thisislegang/riviera-maya?si=083fb734554e4a1a8d16846be4eb5a2e&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing'
      )
    ).toBe('audio')
  })
  test('article', () => {
    expect(
      linkType(
        'https://medium.com/@x_TomCooper_x/ukraine-war-4-september-2022-ukrainian-attacks-in-kherson-oblast-ed25239f3116'
      )
    ).toBe('article')
  })
  test('image', () => {
    expect(linkType('https://imgur.com/gallery/zjWRx8y')).toBe('image')
  })
  test('link', () => {
    expect(linkType('https://zander.wtf')).toBe('link')
    expect(linkType('https://lexica.art/')).toBe('link')
    expect(linkType(' https://yoyotricks.com/')).toBe('link')
  })
})
