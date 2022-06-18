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

function spiderLink(url, content, nesting, cb) {
    if (nesting === 0)
        return process.nextTick(cb)

    const links = getPageLinks(url, content)
    if (links.length === 0)
        return process.nextTick(cb)

    let complete = 0;
    let hasError = false;

    function done (err) {
        if (err) {
            hasError = true;
            return cb(err);
        }
        if (++complete === nesting && !hasError)
            return cb();
    }

    links.forEach(link => {
        spider(link, nesting, cb)
    })
}

const spidering = new Set();
export function spider (url, nesting, cb) {
    if(spidering.has(url))
        return process.nextTick(cb)
    spidering.add(url);
    const filename = urlToFilename(url);
    fs.readFile(filename, 'utf8', (err, fileContent) => {
        if (err) {
            if (err.code === 'ENOENT')
                return cb(err)
            return download(url, filename, (err, requestContent) => {
                if (err)
                    return cb(err)
                
                spiderLink(url, requestContent, nesting, cb)
            })
        }
        spiderLink(url, fileContent, nesting, cb)
    })
}