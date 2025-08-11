import { expect, describe, test } from 'vitest'
import { typeChecker } from './type-checker'
describe('typeChecker', () => {
  test('video', () => {
    expect(typeChecker('zander.mp4')).toBe('video')
    expect(typeChecker('zander.mov')).toBe('video')
    expect(typeChecker('zander-something.foo.mov')).toBe('video')
    expect(typeChecker('https://www.youtube.com/watch?v=1Cz8_6aZ248')).toBe(
      'video'
    )
    expect(typeChecker('https://youtu.be/1Cz8_6aZ248')).toBe('video')
    expect(typeChecker('https://vimeo.com/746423508')).toBe('video')
  })
  test('image', () => {
    expect(typeChecker('zander.jpg')).toBe('image')
    expect(typeChecker('zander.gif')).toBe('image')
    expect(typeChecker('zander-something.foo.png')).toBe('image')
    expect(typeChecker('https://imgur.com/gallery/zjWRx8y')).toBe('image')
  })
  test('audio', () => {
    expect(typeChecker('zander.aac')).toBe('audio')
    expect(typeChecker('zander.mp3')).toBe('audio')
    expect(
      typeChecker(
        'https://www.mixcloud.com/TheBlessedMadonna/we-still-believe-episode-090-it-couldnt-happen-here/'
      )
    ).toBe('audio')
    expect(
      typeChecker(
        'https://soundcloud.com/thisislegang/riviera-maya?si=083fb734554e4a1a8d16846be4eb5a2e&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing'
      )
    ).toBe('audio')
  })
  test('document', () => {
    expect(typeChecker('zander.doc')).toBe('document')
    expect(typeChecker('zander.pdf')).toBe('document')
  })
  test('file', () => {
    expect(typeChecker('zander.otf')).toBe('file')
  })
  test('unknown', () => {
    expect(typeChecker('zander.html')).toBe(undefined)
    expect(typeChecker('zander.com')).toBe(undefined)
  })
})
