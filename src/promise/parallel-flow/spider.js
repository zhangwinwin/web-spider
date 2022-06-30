import { promises as fsPromises } from 'fs'
import { dirname } from 'path'
import superagent from 'superagent'
import mkdirp from 'mkdirp'
import { urlToFilename, getPageLinks } from './utils.js'
import { promisify } from 'util'
import { spider } from '../sequential-flow/spider.js'

const mkdirpPromises = promisify(mkdirp)

function download (url, filename) {
    console.log(`Downloading ${url}`)
    let content
    return superagent.get(url)
        .then(res => {
            content = res.text
            return mkdirpPromises(dirname(filename))
        })
        .then(() => fsPromises.writeFile(filename, content))
        .then(() => {
            console.log(`Downloaded and saved: ${url}`)
            return content
        })
}

function spiderLink (url, content, nesting) {
    if (nesting === 0)
        return Promise.resolve()
    
    const links = getPageLinks(url, content)
    const promises = links.map(link => spider(link, nesting - 1))
    return Promise.all(promises)
}

const spidering = new Set()
export function spider (url, nesting) {
    if (spidering.has(url))
        return Promise.resolve()
    spidering.add(url)

    const filename = urlToFilename(url)
    return fsPromises.readFile(filename, 'utf8')
    .catch(err => {
        if (err.code !== 'ENOENT')
            throw err
        return download(url, filename)
    })
    .then(content => spiderLink(url, content, nesting))
}