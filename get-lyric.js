#!/usr/bin/env node

const puppeteer = require('puppeteer')

function getGoogleLyric() {
  // utaten, utamap, j-lyric はタイムアウトするのでコメントアウト
  const lyricLinkPatterns = [
    // /^https:\/\/utaten.com\/lyric\//,
    /^https:\/\/www\.uta-net\.com\/song\//,
    // /^https:\/\/www\.utamap\.com\/showkasi\.php\?surl\=/,
    // /^https:\/\/j-lyric\.net\/artist\//,
  ]
  const googleLyric = [...document.querySelectorAll('div')]
    .filter((el) => el.innerText === '歌詞は印刷できません')?.[0]
    .nextSibling.innerText.replaceAll(/提供元.+$/g, '')
  if (googleLyric) return { lyric: googleLyric, success: true, altLink: '' }

  const lyricLink = [
    ...document.getElementById('search').getElementsByTagName('a'),
  ]
    .map((el) => el.href)
    .filter((href) =>
      lyricLinkPatterns.some((pattern) => pattern.exec(href))
    )?.[0]
  return { lyric: '', success: false, altLink: lyricLink }
}

function getLyric() {
  function utaNet() {
    const kashiArea = document.getElementById('kashi_area')
    return kashiArea.innerText.replaceAll(/\n+/g, '\n')
  }
  function utaten() {
    const lyrics = Array.from(document.querySelector('.hiragana').childNodes)
    return lyrics
      .map((node) => {
        if (node.nodeName === '#text') {
          return node.textContent
        } else if (node.nodeName === 'SPAN') {
          return node.children[0].innerText
        }
        return ''
      })
      .reduce((all, part) => all + part, '')
  }
  function utamap() {
    return document.querySelector('td.noprint.kasi_honbun').innerText
  }
  function jlyric() {
    return document.getElementById('Lyric').innerText
  }
  const functions = {
    'www.uta-net.com': utaNet,
    'utaten.com': utaten,
    'www.utamap.com': utamap,
    'j-lyric.net': jlyric,
  }
  const lyric = functions[location.host]()
    .replaceAll(/\n+/g, '\n')
    .replaceAll(/^\s+/g, '')
    .replaceAll(/　/g, ' ')
  return lyric
}

async function main() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(
    'https://www.google.com/search?q=' + process.argv?.[2] + '+歌詞'
  )
  const {
    lyric: googleLyric,
    success,
    altLink,
  } = await page.evaluate(getGoogleLyric)
  if (success) {
    console.log(googleLyric)
    await browser.close()
    process.exit(0)
  } else if (altLink) {
    console.log(altLink)
    await page.goto(altLink)
    const lyric = await page.evaluate(getLyric)
    if (lyric) {
      console.log(lyric)
      await browser.close()
      process.exit(0)
    }
  }
  await browser.close()
  process.exit(1)
}

main()
