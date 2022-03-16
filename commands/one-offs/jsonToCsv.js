import content_links from '../../data/content_links.js'
import fs from 'fs'
fs.writeFileSync('./data/urlRedirects.csv', 'original url, new url, status code\n')
content_links.forEach(link => {
    let regex = /case-studies\/|announcements\/|in-the-news\/|events\/|tutorials\/|forum-posts\/|video\//
    let newURL = link.replace(regex, '')
    newURL = newURL.replace(/www/, 'learn')
    fs.appendFileSync('./data/urlRedirects.csv', `${link},${newURL},307\n`)
});