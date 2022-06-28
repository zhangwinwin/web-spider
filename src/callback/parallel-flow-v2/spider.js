import fs, { link } from 'fs'
import path from 'path'
import superagent from 'superagent'
import mkdirp from 'mkdirp'
import { urlToFilename, getPageLinks } from './utils.js'

function saveFile (filename, contents, cb) {
    mkdirp(path.dirname(filename), err => {
        if (err) {
            return cb(err)
        }
        fs.writeFile(filename, contents, cb)
    })
}

function download (url, filename, cb) {
    console.log(`Downloading ${url}`)
    superagent.get(url).end((err, res) => {
        if (err) {
            return cb(err)
        }
        saveFile(filename, res.text, err => {
            if (err) {
                return cb(err)
            }
            console.log(`Downloaded and saved: ${url}`)
            cb(null, res.text)
        })
    })
}

function spiderLink (url, content, nesting, queue) {
    if (nesting === 0)
        return
    const links = getPageLinks(url, content)
    if (links.length === 0  )
        return
    links.forEach(link => spider(lnk, nesting - 1, queue))
}

function spiderTask (url, nesting, queue, cb) {
    const filename = urlToFilename(url)
    fs.readFile(filename, 'utf8', (err, fileContent) => {
        if (err) {
            if (err.code === 'ENOENT')
                return cb(err)
        }
        return download(url, filename, (err, requireContent) => {
            if (err)
                return cb(err)
            spiderLink(url, requireContent, nesting, queue)
            return cb()
        })
    })
    spiderLink(url, fileContent, nesting, queue)
    return cb()
}

const spidering = new Set()
export function spider (url, nesting, queue) {
    if (spidering.has(url))
        return
    spidering.add(url)
    queue.pushTask((done) => {
        spiderTask(url, nesting, queue, done)
    })
}